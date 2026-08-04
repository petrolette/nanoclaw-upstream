/**
 * Anthropic subscription auth for agent containers (opt-in).
 *
 * Default behaviour: the container talks to api.anthropic.com through the
 * OneCLI gateway, which injects the vault's Anthropic secret as `x-api-key`.
 * Every token is then billed to the organisation's API credits — the gateway
 * even hands the container a literal `ANTHROPIC_API_KEY=placeholder` so the
 * SDK produces a request the proxy can rewrite.
 *
 * With `NANOCLAW_ANTHROPIC_SUBSCRIPTION` set we hand the container a Claude
 * subscription OAuth token instead and take api.anthropic.com out of the proxy
 * path, so inference is drawn from the subscription rather than API credits.
 * The value is `true` for every group, or a comma-separated list of agent group
 * ids to switch them over one at a time.
 *
 * Three things must hold at once for the Agent SDK to actually pick the
 * subscription. All three are enforced here, because getting two out of three
 * right fails *silently* — the agent answers normally, still billed per token:
 *
 *  1. `CLAUDE_CODE_OAUTH_TOKEN` is set. The CLI's auth-source resolver checks
 *     it immediately after ANTHROPIC_AUTH_TOKEN, ahead of anything on disk.
 *  2. `ANTHROPIC_API_KEY` is *absent*. In non-interactive mode (which is what
 *     the SDK runs) the CLI's key resolver returns ANTHROPIC_API_KEY
 *     unconditionally, and its "should I use OAuth" branch is skipped whenever
 *     that resolver yields a key. Leaving the gateway's `placeholder` in place
 *     keeps the whole session on x-api-key no matter what else is set.
 *  3. api.anthropic.com is in `NO_PROXY`. Otherwise the request still goes
 *     through the OneCLI gateway, which matches the host pattern and injects
 *     the vault key over the top of our Authorization header.
 *
 * Token source, in order:
 *   a. `CLAUDE_CODE_OAUTH_TOKEN` in .env — a long-lived token from
 *      `claude setup-token`. This is the durable source; prefer it.
 *   b. `~/.claude/.credentials.json` (`claudeAiOauth.accessToken`) — the token
 *      the interactive `claude` CLI maintains. Short-lived (hours) and only
 *      refreshed when a human runs the CLI, so it is a stop-gap, not a source
 *      you can leave running unattended. Expiry is checked and logged loudly.
 *
 * Rollback: unset NANOCLAW_ANTHROPIC_SUBSCRIPTION in .env and restart the
 * groups. Nothing in the OneCLI vault is touched either way.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ANTHROPIC_SUBSCRIPTION_SCOPE, CLAUDE_CODE_OAUTH_TOKEN } from './config.js';
import { log } from './log.js';

/**
 * Hosts that must bypass the credential proxy for subscription auth to hold.
 * Three spellings because clients differ on whether they strip `:443` or accept
 * a leading-dot suffix before matching.
 *
 * Known limit, measured 04.08.2026: this does NOT take *all* Anthropic traffic
 * off the proxy. The claude binary keeps sending `/mcp-registry/v0/servers`
 * through the gateway whatever the spelling — it evidently uses a second HTTP
 * client that ignores NO_PROXY. That endpoint is MCP discovery, not inference,
 * so nothing is billed by it; `/v1/messages` does bypass, verified twice
 * against the gateway's `request_logs`. Don't read a `request_logs` row for
 * this agent as proof the switch failed — check the path.
 */
const ANTHROPIC_NO_PROXY = ['api.anthropic.com', 'api.anthropic.com:443', '.anthropic.com'];

/** Refuse a token with less than this left on it — a container outlives a spawn. */
const MIN_REMAINING_MS = 5 * 60 * 1000;

export type SubscriptionToken = {
  token: string;
  /** Epoch ms, or null when the source doesn't carry an expiry (setup-token). */
  expiresAt: number | null;
  source: 'env' | 'credentials-file';
  subscriptionType?: string;
  rateLimitTier?: string;
};

/** Where the interactive CLI keeps its OAuth credentials. */
export function credentialsPath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(configDir, '.credentials.json');
}

/**
 * Resolve a subscription token, newest source first. Returns null (with a
 * logged reason) rather than throwing — a missing token must degrade to the
 * existing gateway path, not block the spawn.
 */
export function readSubscriptionToken(): SubscriptionToken | null {
  if (CLAUDE_CODE_OAUTH_TOKEN) {
    return { token: CLAUDE_CODE_OAUTH_TOKEN, expiresAt: null, source: 'env' };
  }

  const file = credentialsPath();
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch (err) {
    log.warn('Anthropic subscription enabled but no credentials file readable', {
      path: file,
      error: (err as Error).message,
    });
    return null;
  }

  let oauth: Record<string, unknown> | undefined;
  try {
    oauth = (JSON.parse(raw) as { claudeAiOauth?: Record<string, unknown> }).claudeAiOauth;
  } catch (err) {
    log.warn('Credentials file is not valid JSON', { path: file, error: (err as Error).message });
    return null;
  }

  const token = typeof oauth?.accessToken === 'string' ? oauth.accessToken : '';
  if (!token) {
    log.warn('Credentials file carries no claudeAiOauth.accessToken', { path: file });
    return null;
  }

  const expiresAt = typeof oauth?.expiresAt === 'number' ? oauth.expiresAt : null;
  if (expiresAt !== null && expiresAt - Date.now() < MIN_REMAINING_MS) {
    log.warn(
      'Subscription access token is expired or about to expire — falling back to the OneCLI gateway (API credits)',
      { path: file, expiresAt: new Date(expiresAt).toISOString() },
    );
    return null;
  }

  return {
    token,
    expiresAt,
    source: 'credentials-file',
    subscriptionType: typeof oauth?.subscriptionType === 'string' ? oauth.subscriptionType : undefined,
    rateLimitTier: typeof oauth?.rateLimitTier === 'string' ? oauth.rateLimitTier : undefined,
  };
}

/** Drop every `-e NAME=...` pair for `name` from a docker arg vector. */
function stripEnvArg(args: string[], name: string): boolean {
  let removed = false;
  for (let i = args.length - 2; i >= 0; i--) {
    if (args[i] === '-e' && typeof args[i + 1] === 'string' && args[i + 1].startsWith(`${name}=`)) {
      args.splice(i, 2);
      removed = true;
    }
  }
  return removed;
}

/** Last `-e NAME=...` value in the vector, or undefined. */
function readEnvArg(args: string[], name: string): string | undefined {
  let value: string | undefined;
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '-e' && typeof args[i + 1] === 'string' && args[i + 1].startsWith(`${name}=`)) {
      value = args[i + 1].slice(name.length + 1);
    }
  }
  return value;
}

export type SubscriptionOutcome = 'applied' | 'disabled' | 'not-claude' | 'no-token';

/**
 * Is the switchover in force for this group? `true` means every group; a
 * comma-separated id list means only those, so the first group can be proven
 * in isolation before the rest follow.
 */
export function subscriptionEnabledFor(agentGroupId: string): boolean {
  const scope = ANTHROPIC_SUBSCRIPTION_SCOPE;
  if (!scope) return false;
  if (scope === 'true') return true;
  return scope
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(agentGroupId);
}

/**
 * Rewrite a docker arg vector so the container authenticates from the Claude
 * subscription. Must run *after* the OneCLI gateway has contributed its env,
 * because it removes one of the vars the gateway sets and appends overrides
 * that have to win (docker takes the last `-e` for a given name).
 */
export function applySubscriptionAuth(args: string[], provider: string, agentGroupId: string): SubscriptionOutcome {
  if (!subscriptionEnabledFor(agentGroupId)) return 'disabled';
  // Only the Anthropic-backed provider. OpenCode/Codex groups keep the gateway.
  if (provider && provider !== 'claude') return 'not-claude';

  const resolved = readSubscriptionToken();
  if (!resolved) return 'no-token';

  // (2) The gateway's placeholder key would otherwise win outright.
  stripEnvArg(args, 'ANTHROPIC_API_KEY');
  // Belt and braces: either of these would also short-circuit the OAuth branch.
  stripEnvArg(args, 'ANTHROPIC_AUTH_TOKEN');

  // (3) Keep Anthropic traffic off the credential proxy so nothing rewrites
  // the Authorization header back to the vault key.
  for (const name of ['NO_PROXY', 'no_proxy']) {
    const existing = readEnvArg(args, name) ?? '';
    const hosts = existing
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    for (const host of ANTHROPIC_NO_PROXY) if (!hosts.includes(host)) hosts.push(host);
    stripEnvArg(args, name);
    args.push('-e', `${name}=${hosts.join(',')}`);
  }

  // (1) The token itself, plus the two descriptors the CLI reports it under —
  // with an env token it has no credentials file to read them from.
  args.push('-e', `CLAUDE_CODE_OAUTH_TOKEN=${resolved.token}`);
  if (resolved.subscriptionType) {
    args.push('-e', `CLAUDE_CODE_SUBSCRIPTION_TYPE=${resolved.subscriptionType}`);
  }
  if (resolved.rateLimitTier) {
    args.push('-e', `CLAUDE_CODE_RATE_LIMIT_TIER=${resolved.rateLimitTier}`);
  }

  return 'applied';
}
