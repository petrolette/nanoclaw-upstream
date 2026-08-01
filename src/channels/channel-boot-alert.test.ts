/**
 * Tests for the post-boot email alert (local addition, not upstream).
 *
 * Two properties matter more than the wording of the mail:
 *   1. it never rejects — boot must survive a dead or slow webhook;
 *   2. an unconfigured transport is *announced*, not passed over in silence,
 *      because a quietly absent alert is exactly the failure this assertion
 *      was written to remove.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { log } from '../log.js';
import {
  buildBootAlertEmail,
  readBootAlertConfig,
  sendBootAlert,
  BOOT_ALERT_TIMEOUT_MS,
} from './channel-boot-alert.js';
import { readEnvFile } from '../env.js';

vi.mock('../env.js', () => ({ readEnvFile: vi.fn(() => ({})) }));

const readEnvFileMock = vi.mocked(readEnvFile);

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
  it('returns null when the webhook is missing', () => {
    envWith({ ALERT_EMAIL_TO: 'someone@example.com' });
    expect(readBootAlertConfig()).toBeNull();
  });

  it('returns null when the recipient is missing', () => {
    envWith({ ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail' });
    expect(readBootAlertConfig()).toBeNull();
  });

  it('treats a whitespace-only value as absent', () => {
    envWith({ ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail', ALERT_EMAIL_TO: '   ' });
    expect(readBootAlertConfig()).toBeNull();
  });

  it('carries the bearer secret when one is set, and omits it otherwise', () => {
    envWith({
      ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail',
      ALERT_EMAIL_TO: 'someone@example.com',
      WEBHOOK_SECRET: 's3cret',
    });
    expect(readBootAlertConfig()).toEqual({
      webhook: 'https://hook.example/mail',
      to: 'someone@example.com',
      secret: 's3cret',
    });

    envWith({
      ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail',
      ALERT_EMAIL_TO: 'someone@example.com',
    });
    expect(readBootAlertConfig()?.secret).toBeUndefined();
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
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await sendBootAlert([]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(readEnvFileMock).not.toHaveBeenCalled();
  });

  it('warns loudly rather than failing when no transport is configured', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    envWith({});

    await expect(sendBootAlert(['telegram'])).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[1]).toMatchObject({ missing: ['telegram'] });
  });

  it('posts the documented payload, with the bearer header and a timeout', async () => {
    vi.spyOn(log, 'info').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    envWith({
      ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail',
      ALERT_EMAIL_TO: 'someone@example.com',
      WEBHOOK_SECRET: 's3cret',
    });

    await sendBootAlert(['telegram']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://hook.example/mail');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer s3cret');
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(Object.keys(body).sort()).toEqual(['message', 'subject', 'to']);
    expect(body.to).toBe('someone@example.com');
    expect(body.subject).toContain('telegram');
    expect(BOOT_ALERT_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('omits the Authorization header when no secret is set', async () => {
    vi.spyOn(log, 'info').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    envWith({
      ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail',
      ALERT_EMAIL_TO: 'someone@example.com',
    });

    await sendBootAlert(['telegram']);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('logs and returns when the webhook refuses, without leaking the response', async () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    envWith({
      ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail',
      ALERT_EMAIL_TO: 'someone@example.com',
    });

    await expect(sendBootAlert(['telegram'])).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[1]).toMatchObject({ status: 401 });
  });

  it('never rejects when the transport itself throws', async () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ETIMEDOUT')));
    envWith({
      ALERT_EMAIL_WEBHOOK: 'https://hook.example/mail',
      ALERT_EMAIL_TO: 'someone@example.com',
    });

    await expect(sendBootAlert(['telegram'])).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
