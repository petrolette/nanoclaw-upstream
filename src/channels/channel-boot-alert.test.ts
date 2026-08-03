/**
 * Tests for the post-boot email alert (local addition, not upstream).
 *
 * Two properties matter more than the wording of the mail:
 *   1. it never rejects — boot must survive a dead or slow sender;
 *   2. an unconfigured transport is *announced*, not passed over in silence,
 *      because a quietly absent alert is exactly the failure this assertion
 *      was written to remove.
 */
import { execFile } from 'child_process';

import { describe, it, expect, vi, afterEach } from 'vitest';

import { log } from '../log.js';
import {
  buildBootAlertEmail,
  readBootAlertConfig,
  sendBootAlert,
  BOOT_ALERT_TIMEOUT_MS,
  SEND_MAIL_BIN,
} from './channel-boot-alert.js';
import { readEnvFile } from '../env.js';

vi.mock('../env.js', () => ({ readEnvFile: vi.fn(() => ({})) }));
vi.mock('child_process', () => ({ execFile: vi.fn() }));

const readEnvFileMock = vi.mocked(readEnvFile);
const execFileMock = vi.mocked(execFile);

/** What the production call actually passes: binary, argv, options, callback. */
type ExecFileCall = [string, string[], { timeout: number }, (err: Error | null) => void];

/** Stand in for the child process: capture stdin, then answer with `err`. */
function execFileAnswers(err: Error | null) {
  const chunks: string[] = [];
  execFileMock.mockImplementation(((...args: unknown[]) => {
    const cb = args[3] as (e: Error | null) => void;
    queueMicrotask(() => cb(err));
    return { stdin: { end: (body: string) => chunks.push(body) } };
  }) as unknown as typeof execFile);
  return chunks;
}

/** Typed view of a recorded call — `execFile`'s own signature is far wider. */
function callArgs(index = 0): ExecFileCall {
  return execFileMock.mock.calls[index] as unknown as ExecFileCall;
}

/** Make `.env` answer with exactly these keys for the next call. */
function envWith(values: Record<string, string>) {
  readEnvFileMock.mockReturnValue(values);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // `restoreAllMocks` does not touch a module mock's call history — reset it
  // explicitly, or "was .env never read?" assertions see the previous tests.
  readEnvFileMock.mockReset();
  readEnvFileMock.mockReturnValue({});
});

describe('readBootAlertConfig', () => {
  it('returns null when the recipient is missing', () => {
    envWith({});
    expect(readBootAlertConfig()).toBeNull();
  });

  it('treats a whitespace-only value as absent', () => {
    envWith({ ALERT_EMAIL_TO: '   ' });
    expect(readBootAlertConfig()).toBeNull();
  });

  it('returns the recipient, and nothing else — the transport holds no secret', () => {
    envWith({ ALERT_EMAIL_TO: 'someone@example.com' });
    expect(readBootAlertConfig()).toEqual({ to: 'someone@example.com' });
  });
});

describe('buildBootAlertEmail', () => {
  it('names every missing channel in the subject', () => {
    const { subject } = buildBootAlertEmail({
      missing: ['telegram', 'whatsapp'],
      host: 'vps4',
      stamp: '2026-08-01 10:00:00',
    });
    expect(subject).toContain('telegram');
    expect(subject).toContain('whatsapp');
    expect(subject).toContain('vps4');
  });

  it('escapes channel names instead of interpolating them raw', () => {
    const { message } = buildBootAlertEmail({
      missing: ['<script>x</script>'],
      host: 'vps4',
      stamp: '2026-08-01 10:00:00',
    });
    expect(message).not.toContain('<script>');
    expect(message).toContain('&lt;script&gt;');
  });
});

describe('sendBootAlert', () => {
  it('does nothing at all when no channel is missing', async () => {
    execFileAnswers(null);

    await sendBootAlert([]);

    expect(execFileMock).not.toHaveBeenCalled();
    expect(readEnvFileMock).not.toHaveBeenCalled();
  });

  it('warns loudly rather than failing when no recipient is configured', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    execFileAnswers(null);
    envWith({});

    await expect(sendBootAlert(['telegram'])).resolves.toBeUndefined();

    expect(execFileMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[1]).toMatchObject({ missing: ['telegram'] });
  });

  it('calls the host sender with the recipient, a subject and a bounded timeout', async () => {
    vi.spyOn(log, 'info').mockImplementation(() => {});
    execFileAnswers(null);
    envWith({ ALERT_EMAIL_TO: 'someone@example.com' });

    await sendBootAlert(['telegram']);

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [bin, args, opts] = callArgs();
    expect(bin).toBe(SEND_MAIL_BIN);
    expect(args[0]).toBe('--to');
    expect(args[1]).toBe('someone@example.com');
    expect(args[2]).toBe('--subject');
    expect(args[3]).toContain('telegram');
    expect(opts.timeout).toBe(BOOT_ALERT_TIMEOUT_MS);
  });

  it('passes the HTML body on stdin rather than through argv', async () => {
    vi.spyOn(log, 'info').mockImplementation(() => {});
    const bodies = execFileAnswers(null);
    envWith({ ALERT_EMAIL_TO: 'someone@example.com' });

    await sendBootAlert(['telegram']);

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('<code>telegram</code>');
    const [, args] = callArgs();
    expect(args.join(' ')).not.toContain('<code>');
  });

  it('never rejects when the sender fails, and says so in the log', async () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    execFileAnswers(new Error('exit 1'));
    envWith({ ALERT_EMAIL_TO: 'someone@example.com' });

    await expect(sendBootAlert(['telegram'])).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[1]).toMatchObject({ missing: ['telegram'] });
  });
});
