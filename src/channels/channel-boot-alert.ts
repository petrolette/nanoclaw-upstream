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
 * The existing n8n webhook (`nanoclaw-email-v2`) — the same one the host's
 * shell automations already use (`~/scripts/weekly-digest.sh`,
 * `check-docker-images.sh`). Contract: `POST {to, subject, message}` as JSON,
 * `message` being HTML, with an optional `Authorization: Bearer <secret>`.
 * No new dependency: Node's global `fetch`.
 *
 * ## Failure posture
 *
 * Boot must never hang or fail because an alert could not be sent. Every path
 * here is caught, the request is bounded by a timeout, and the caller does not
 * await. When no alert transport is configured, that fact is logged as a
 * warning rather than passed over in silence — an alerting path that is
 * quietly absent is the failure mode this whole assertion exists to remove.
 */
import os from 'os';

import { TIMEZONE } from '../config.js';
import { readEnvFile } from '../env.js';
import { log } from '../log.js';
import { formatLocalStamp } from '../timezone.js';

/** How long the webhook call may take before it is abandoned. */
export const BOOT_ALERT_TIMEOUT_MS = 15_000;

export interface BootAlertConfig {
  webhook: string;
  to: string;
  secret?: string;
}

/**
 * Read the alert transport from `.env`.
 *
 * `WEBHOOK_SECRET` is the same key the host's shell automations already read;
 * it is optional here because the webhook may be left unauthenticated.
 * Returns `null` when the mandatory pair is incomplete — the caller then warns
 * instead of failing.
 */
export function readBootAlertConfig(): BootAlertConfig | null {
  const env = readEnvFile(['ALERT_EMAIL_WEBHOOK', 'ALERT_EMAIL_TO', 'WEBHOOK_SECRET']);
  const webhook = env.ALERT_EMAIL_WEBHOOK?.trim();
  const to = env.ALERT_EMAIL_TO?.trim();
  if (!webhook || !to) return null;
  return { webhook, to, secret: env.WEBHOOK_SECRET?.trim() || undefined };
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
      hint: 'set ALERT_EMAIL_WEBHOOK and ALERT_EMAIL_TO in .env to be told by email',
    });
    return;
  }

  const host = os.hostname();
  const stamp = formatLocalStamp(new Date(), TIMEZONE);
  const { subject, message } = buildBootAlertEmail({ missing, host, stamp });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.secret) headers.Authorization = `Bearer ${config.secret}`;

  try {
    const response = await fetch(config.webhook, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: config.to, subject, message }),
      signal: AbortSignal.timeout(BOOT_ALERT_TIMEOUT_MS),
    });
    if (!response.ok) {
      // Never log the body: the request carried a bearer token and the
      // response may echo request context back.
      log.error('Post-boot channel alert was refused by the webhook', {
        status: response.status,
        missing: [...missing],
      });
      return;
    }
    log.info('Post-boot channel alert sent', { missing: [...missing], to: config.to });
  } catch (err) {
    log.error('Post-boot channel alert could not be sent', { err, missing: [...missing] });
  }
}
