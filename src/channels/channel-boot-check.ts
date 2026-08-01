/**
 * Post-boot channel assertion.
 *
 * LOCAL TO THIS INSTALL — this file does not exist upstream. It is additive:
 * nothing in `channel-registry.ts`, `adapter.ts` or `chat-sdk-bridge.ts` is
 * modified. `src/index.ts` calls `assertChannelsStarted()` once, right after
 * `initChannelAdapters()`.
 *
 * ## The hole this closes
 *
 * `initChannelAdapters` (`channel-registry.ts:235-284`) only retries a failed
 * `adapter.setup()` when the error duck-types as a `NetworkError`
 * (`isNetworkError`, `:16-18`; `SETUP_RETRY_DELAYS_MS`, `:11`). Every other
 * failure falls through to the outer catch (`:280-282`), which logs one
 * `error` line and continues the loop. The adapter is then absent from
 * `activeAdapters`, the host process stays alive, and nothing else fires.
 *
 * That is not hypothetical for Telegram: `throwTelegramApiError`
 * (`@chat-adapter/telegram/dist/index.js:1787-1809`) maps 401 to
 * `AuthenticationError`, 403 to `PermissionError`, 404 to
 * `ResourceNotFoundError`, 429 to `AdapterRateLimitError` and every other 4xx
 * — 409 included — to `ValidationError`. None of them is a `NetworkError`, so
 * a bad token or a conflicting `getUpdates` consumer at boot leaves the
 * channel dead until the host is restarted by hand.
 *
 * The NetworkError-only retry is upstream code, identical to `upstream/main`.
 * We do not patch it. We observe the outcome instead.
 *
 * ## The trap this avoids
 *
 * A channel whose credentials are absent is skipped *legitimately* —
 * `log.warn('Channel credentials missing, skipping')` (`:240`), because the
 * factory returned `null`. Shouting about that on every boot would make the
 * assertion pure noise, which is worse than no assertion at all.
 *
 * So "expected" is NOT "everything in the registry". It is "everything in the
 * registry whose credentials are actually present", decided by
 * `CHANNEL_CONFIGURED_PREDICATES` below — which mirrors, expression for
 * expression, the very condition each factory uses to return `null`. A channel
 * with no predicate is reported as *unchecked*, never as missing.
 *
 * ## What it does not do
 *
 * It never throws and never fails the boot: it observes and reports. It also
 * says nothing about a channel that dies *after* boot — steady-state polling
 * supervision is deliberately out of scope here.
 */
import fs from 'fs';
import path from 'path';

import { readEnvFile } from '../env.js';
import { log } from '../log.js';
import { getActiveAdapters, getRegisteredChannelNames } from './channel-registry.js';

/** Minimal shape the report needs from a live adapter. */
export interface ActiveChannelIdentity {
  channelType: string;
  instance?: string;
}

export interface ChannelBootReport {
  /** Registry names that are configured but produced no live adapter. */
  missing: string[];
  /** Registry names with no configured-predicate — coverage gap, not an anomaly. */
  unchecked: string[];
}

/**
 * Is this channel configured on this install?
 *
 * Each predicate mirrors the `return null` condition of the matching factory.
 * Keep them in sync when a channel module is re-copied from
 * `upstream/channels` — a predicate that is laxer than its factory produces a
 * false alarm on every boot, which is the one failure mode worth avoiding.
 */
export const CHANNEL_CONFIGURED_PREDICATES: Record<string, () => boolean> = {
  // `cli.ts:296` registers `createAdapter` directly — it reads no credentials
  // and can never return null, so the CLI channel is always expected.
  cli: () => true,

  // Mirrors `telegram.ts:213-215`.
  telegram: () => Boolean(readEnvFile(['TELEGRAM_BOT_TOKEN']).TELEGRAM_BOT_TOKEN),

  // Mirrors `whatsapp.ts:517-524`. `process.cwd()` (not PROJECT_ROOT) because
  // that is exactly what `AUTH_DIR` uses at `whatsapp.ts:104`; using anything
  // else here could disagree with the factory and invent an anomaly.
  whatsapp: () => {
    const env = readEnvFile(['WHATSAPP_PHONE_NUMBER', 'WHATSAPP_ENABLED']);
    const hasAuth = fs.existsSync(path.join(process.cwd(), 'store', 'auth', 'creds.json'));
    return hasAuth || Boolean(env.WHATSAPP_PHONE_NUMBER) || Boolean(env.WHATSAPP_ENABLED);
  },
};

/**
 * Pure core — no env, no registry, no logging. Compares what was supposed to
 * start against what actually did.
 *
 * `isConfigured` returns `undefined` for a channel we have no predicate for;
 * such a channel lands in `unchecked` and is never called missing.
 */
export function computeChannelBootReport(params: {
  registered: readonly string[];
  active: readonly ActiveChannelIdentity[];
  isConfigured: (channel: string) => boolean | undefined;
}): ChannelBootReport {
  const { registered, active, isConfigured } = params;

  // An adapter answers to its registry key (`instance ?? channelType`) and to
  // its bare channelType. Matching on both means a named instance
  // (`instance: 'telegram-2'`, `channelType: 'telegram'`) still satisfies the
  // `telegram` registration instead of being cried over.
  const liveIds = new Set<string>();
  for (const adapter of active) {
    liveIds.add(adapter.instance ?? adapter.channelType);
    liveIds.add(adapter.channelType);
  }

  const missing: string[] = [];
  const unchecked: string[] = [];

  for (const name of registered) {
    const configured = isConfigured(name);
    if (configured === undefined) {
      unchecked.push(name);
      continue;
    }
    // Not configured → the factory returned null and the channel was skipped
    // on purpose. Silence is the correct answer.
    if (!configured) continue;
    if (liveIds.has(name)) continue;
    missing.push(name);
  }

  return { missing, unchecked };
}

/** Emit the report. `log.error` per missing channel; one `info` line for gaps. */
export function reportChannelBoot(report: ChannelBootReport): void {
  for (const channel of report.missing) {
    log.error('Configured channel did not start — it is silent until the host is restarted', {
      channel,
      hint: 'look for "Failed to start channel adapter" earlier in this boot; setup() is only retried on NetworkError',
    });
  }
  if (report.unchecked.length > 0) {
    log.info('Channels not covered by the post-boot assertion (no configured-predicate)', {
      channels: report.unchecked,
    });
  }
}

/**
 * Wire the report to the live registry. Call once, after
 * `initChannelAdapters()`. Never throws — a broken assertion must not be able
 * to take the host down.
 */
export function assertChannelsStarted(): void {
  try {
    const report = computeChannelBootReport({
      registered: getRegisteredChannelNames(),
      active: getActiveAdapters(),
      isConfigured: (channel) => CHANNEL_CONFIGURED_PREDICATES[channel]?.(),
    });
    reportChannelBoot(report);
  } catch (err) {
    log.error('Post-boot channel assertion failed to run', { err });
  }
}
