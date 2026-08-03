/**
 * Out-of-band alert for the post-boot channel assertion.
 *
 * LOCAL TO THIS INSTALL — this file does not exist upstream, and nothing in
 * the core is modified. `channel-boot-check.ts` calls `sendBootAlert()` once,
 * fire-and-forget, when a configured channel failed to start.
 *
 * ## Why email, and not a chat message
 *
 * The assertion exists to catch "Telegram is configured but did not start".
 * Alerting through Telegram in that situation is a loop with no exit — the
 * channel we would use to shout is the one that is down. WhatsApp shares the
 * same weakness for its own failures. Email is the only path on this host that
 * is independent of every channel adapter, so it is the one used here.
 *
 * ## Transport
 *
 * `~/scripts/lib/send-mail.py` — the same sender the host's shell automations
 * use since 03.08.2026 (`weekly-digest.sh`, `check-docker-images.sh`). It posts
 * to the Gmail API through the OneCLI gateway, which injects the
 * `nano@tksa.swiss` credentials at the proxy boundary: no token is read, held
 * or logged here.
 *
 * It replaced the n8n webhook `nanoclaw-email-v2`, deleted the same day. That
 * webhook required two distinct tokens — the standard `X-Webhook-Token` plus an
 * in-workflow `Authorization: Bearer` check — and the second was unreachable
 * from a container, which is what broke the AO planning mail on 03.08.2026.
 *
 * ## Failure posture
 *
 * Boot must never hang or fail because an alert could not be sent. Every path
 * here is caught, the request is bounded by a timeout, and the caller does not
 * await. When no alert transport is configured, that fact is logged as a
 * warning rather than passed over in silence — an alerting path that is
 * quietly absent is the failure mode this whole assertion exists to remove.
 */
import { execFile } from 'child_process';
import os from 'os';

import { TIMEZONE } from '../config.js';
import { readEnvFile } from '../env.js';
import { log } from '../log.js';
import { formatLocalStamp } from '../timezone.js';

/** How long the send may take before it is abandoned. */
export const BOOT_ALERT_TIMEOUT_MS = 15_000;

/** Host-side sender: Gmail API behind the OneCLI gateway. */
export const SEND_MAIL_BIN = `${process.env.HOME ?? '/home/nanoclaw'}/scripts/lib/send-mail.py`;

export interface BootAlertConfig {
  to: string;
}

/**
 * Read the alert recipient from `.env`.
 *
 * Only `ALERT_EMAIL_TO` is needed now: the transport carries no secret of its
 * own, so there is nothing else to configure. Returns `null` when the recipient
 * is missing — the caller then warns instead of failing.
 */
export function readBootAlertConfig(): BootAlertConfig | null {
  const env = readEnvFile(['ALERT_EMAIL_TO']);
  const to = env.ALERT_EMAIL_TO?.trim();
  if (!to) return null;
  return { to };
}

/**
 * Hand the message to `send-mail.py`. Rejects on a non-zero exit so the caller
 * can log it; the caller never lets that rejection escape.
 */
function runSendMail(to: string, subject: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      SEND_MAIL_BIN,
      ['--to', to, '--subject', subject],
      { timeout: BOOT_ALERT_TIMEOUT_MS },
      (err) => (err ? reject(err) : resolve()),
    );
    // The body travels on stdin: it is HTML, and an argv full of markup is a
    // quoting accident waiting to happen.
    child.stdin?.end(message);
  });
}

/** Minimal HTML escaping — channel names are ours, but the mail is not a place to be casual. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build the message. Pure — no env, no clock, no network — so the wording is
 * testable and the caller decides what "now" means.
 */
export function buildBootAlertEmail(params: { missing: readonly string[]; host: string; stamp: string }): {
  subject: string;
  message: string;
} {
  const { missing, host, stamp } = params;
  const list = missing.map((c) => `<li><code>${escapeHtml(c)}</code></li>`).join('');
  const plural = missing.length > 1 ? 's' : '';

  const subject = `NanoClaw ${host} — canal${plural} configuré${plural} non démarré${plural} : ${missing.join(', ')}`;

  const message = [
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:620px">',
    `<h2 style="margin:0 0 12px">Canal${plural} muet${plural} au démarrage</h2>`,
    `<p>Hôte <strong>${escapeHtml(host)}</strong> · ${escapeHtml(stamp)}</p>`,
    `<p>Ce${plural === 's' ? 's' : ''} canal${plural} ${plural === 's' ? 'sont configurés' : 'est configuré'} mais n'${plural === 's' ? 'ont' : 'a'} pas démarré :</p>`,
    `<ul>${list}</ul>`,
    "<p>Le processus hôte tourne toujours — il n'y a donc ni crash ni redémarrage automatique. ",
    "L'installation de l'adaptateur n'est retentée que sur erreur réseau ; toute autre cause ",
    "(jeton invalide, 409 d'un consommateur concurrent, permission) est définitive jusqu'au ",
    'redémarrage du service.</p>',
    '<p>À vérifier : <code>logs/nanoclaw.error.log</code>, ligne ',
    '<em>Failed to start channel adapter</em>.</p>',
    '<hr style="border:none;border-top:1px solid #eee;margin:20px 0">',
    '<p style="color:#999;font-size:11px">channel-boot-alert · assertion post-boot</p>',
    '</div>',
  ].join('');

  return { subject, message };
}

/**
 * Send the alert. Never rejects, never blocks boot.
 *
 * No-op when nothing is missing, so the caller can invoke it unconditionally.
 */
export async function sendBootAlert(missing: readonly string[]): Promise<void> {
  if (missing.length === 0) return;

  const config = readBootAlertConfig();
  if (!config) {
    log.warn('Configured channel did not start, but no alert transport is set — logs only', {
      missing: [...missing],
      hint: 'set ALERT_EMAIL_TO in .env to be told by email',
    });
    return;
  }

  const host = os.hostname();
  const stamp = formatLocalStamp(new Date(), TIMEZONE);
  const { subject, message } = buildBootAlertEmail({ missing, host, stamp });

  try {
    await runSendMail(config.to, subject, message);
    log.info('Post-boot channel alert sent', { missing: [...missing], to: config.to });
  } catch (err) {
    log.error('Post-boot channel alert could not be sent', { err, missing: [...missing] });
  }
}
