import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * The failure mode this guards against is silent: get the arg surgery wrong and
 * the agent still answers, still on x-api-key, still billed per token. So the
 * assertions are about what is *absent* from the arg vector as much as what is
 * present.
 */

const gatewayArgs = () => [
  'run',
  '--rm',
  '-e',
  'TZ=Europe/Zurich',
  '-e',
  'HTTPS_PROXY=http://user:pass@host.docker.internal:10255',
  '-e',
  'ANTHROPIC_API_KEY=placeholder',
  '-e',
  'NODE_EXTRA_CA_CERTS=/tmp/onecli-gateway-ca.pem',
];

const GROUP = 'ag-test-1';

async function load(scope: string, envToken = 'sk-ant-oat01-env-token') {
  vi.resetModules();
  vi.doMock('./config.js', () => ({
    ANTHROPIC_SUBSCRIPTION_SCOPE: scope,
    CLAUDE_CODE_OAUTH_TOKEN: envToken,
  }));
  vi.doMock('./log.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
  return import('./anthropic-subscription.js');
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.doUnmock('./config.js'));

describe('subscriptionEnabledFor', () => {
  it('is off when the scope is empty', async () => {
    const m = await load('');
    expect(m.subscriptionEnabledFor(GROUP)).toBe(false);
  });

  it('covers every group on "true"', async () => {
    const m = await load('true');
    expect(m.subscriptionEnabledFor('anything')).toBe(true);
  });

  it('covers only the listed ids otherwise', async () => {
    const m = await load('ag-a, ag-test-1 ,ag-b');
    expect(m.subscriptionEnabledFor(GROUP)).toBe(true);
    expect(m.subscriptionEnabledFor('ag-other')).toBe(false);
  });
});

describe('applySubscriptionAuth', () => {
  it('leaves the arg vector untouched when out of scope', async () => {
    const m = await load('ag-other');
    const args = gatewayArgs();
    expect(m.applySubscriptionAuth(args, 'claude', GROUP)).toBe('disabled');
    expect(args).toEqual(gatewayArgs());
  });

  it('leaves non-claude providers on the gateway', async () => {
    const m = await load('true');
    const args = gatewayArgs();
    expect(m.applySubscriptionAuth(args, 'opencode', GROUP)).toBe('not-claude');
    expect(args).toContain('ANTHROPIC_API_KEY=placeholder');
  });

  it('removes the gateway placeholder key — leaving it silently keeps x-api-key', async () => {
    const m = await load('true');
    const args = gatewayArgs();
    expect(m.applySubscriptionAuth(args, 'claude', GROUP)).toBe('applied');
    expect(args.some((a) => a.startsWith('ANTHROPIC_API_KEY='))).toBe(false);
    expect(args.some((a) => a.startsWith('ANTHROPIC_AUTH_TOKEN='))).toBe(false);
  });

  it('sets the oauth token and keeps anthropic off the proxy', async () => {
    const m = await load('true');
    const args = gatewayArgs();
    m.applySubscriptionAuth(args, 'claude', GROUP);
    expect(args).toContain('CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-env-token');
    expect(args).toContain("NO_PROXY=api.anthropic.com,api.anthropic.com:443,.anthropic.com");
    expect(args).toContain("no_proxy=api.anthropic.com,api.anthropic.com:443,.anthropic.com");
    // The proxy itself stays, so every other host still goes through the vault.
    expect(args.some((a) => a.startsWith('HTTPS_PROXY='))).toBe(true);
  });

  it('merges into an existing NO_PROXY instead of replacing it', async () => {
    const m = await load('true');
    const args = [...gatewayArgs(), '-e', 'NO_PROXY=localhost,127.0.0.1'];
    m.applySubscriptionAuth(args, 'claude', GROUP);
    expect(args).toContain("NO_PROXY=localhost,127.0.0.1,api.anthropic.com,api.anthropic.com:443,.anthropic.com");
    expect(args.filter((a) => a.startsWith('NO_PROXY=')).length).toBe(1);
  });

  it('reports no-token rather than half-applying when no token resolves', async () => {
    vi.resetModules();
    vi.doMock('./config.js', () => ({
      ANTHROPIC_SUBSCRIPTION_SCOPE: 'true',
      CLAUDE_CODE_OAUTH_TOKEN: '',
    }));
    vi.doMock('./log.js', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
    vi.doMock('fs', () => ({
      default: {
        readFileSync: () => {
          throw new Error('ENOENT');
        },
      },
    }));
    const m = await import('./anthropic-subscription.js');
    const args = gatewayArgs();
    expect(m.applySubscriptionAuth(args, 'claude', GROUP)).toBe('no-token');
    // Critically: the placeholder is still there, so the gateway path is intact.
    expect(args).toEqual(gatewayArgs());
    vi.doUnmock('fs');
  });
});
