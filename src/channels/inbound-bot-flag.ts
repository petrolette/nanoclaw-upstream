/**
 * Author bot-flag extraction for inbound messages.
 *
 * LOCAL TO THIS INSTALL — this file does not exist upstream. It is purely
 * additive and read-only: nothing in `adapter.ts`, `channel-registry.ts` or
 * `chat-sdk-bridge.ts` is modified, and no adapter is patched.
 *
 * ## Why this exists
 *
 * v1 carried an `is_bot_message` boolean on every stored message and used it
 * as the load-bearing guard of the `/host` command — the one that stops a
 * NanoClaw agent from escalating out of its container onto the host
 * (v1 `src/host-task.ts:71`, `if (isBotMessage) return false;`). v2's
 * `InboundMessage` (`adapter.ts:68-91`) carries no bot marker, so the guard
 * has no porter on the new base.
 *
 * The information is not lost, only unexposed: the upstream Telegram adapter
 * already puts it on the message author
 * (`@chat-adapter/telegram/dist/index.js:1528`, `isBot: user.is_bot`) and
 * `Message.toJSON()` preserves it verbatim (`chat/dist/index.js:333-346`),
 * which is what the bridge hands us as `InboundMessage.content`
 * (`chat-sdk-bridge.ts:163,211-218`). The upstream adapter's own comment
 * (`dist/index.js:551-553`) points callers needing bot detection at
 * `message.author.isBot`. So we read it there rather than rebuild v1's
 * plumbing: no `is_bot_message` column, no field of that name on any type.
 *
 * ## Tri-state, on purpose
 *
 * Upstream types the flag `boolean | "unknown"` (`chat/dist/…d.ts:1458`) and
 * really does emit the string on two fallback paths — channel-post authors
 * (`dist/index.js:1165-1172`) and reaction actors (`:1538`). v1 never saw
 * that case (`ctx.from?.is_bot ?? false`).
 *
 * We keep the three states here instead of flattening to a boolean at the
 * source, and apply the fail-closed collapse at the point of use
 * (`isBotForPrivilege`). Reason: "we could not tell" and "definitely a human"
 * are different facts, and only the caller knows which way to resolve the
 * doubt. A privileged path must refuse; a display or logging path may not
 * want to call an unidentified channel post a bot.
 *
 * Every degraded input — wrong `kind`, missing/!object `content`,
 * missing/!object `author`, missing or non-conforming `isBot` — resolves to
 * `'unknown'`, never to `false`. Combined with the fail-closed collapse,
 * that means a degraded message can never read as "human" on a privilege
 * path.
 *
 * ## No consumer is wired
 *
 * `/host` is not ported to v2. This module is the prerequisite that
 * `.nanoclaw-migrations/01-src-overlap.md:576` asks for before `/host` may be
 * re-enabled, nothing more.
 */
import type { InboundMessage } from './adapter.js';

/**
 * Author bot state, mirroring upstream's `Author.isBot` type
 * (`chat/dist/chat-D9UYaaNO.d.ts:1458`): `true` / `false` / `'unknown'`.
 */
export type AuthorBotFlag = boolean | 'unknown';

/** Upstream's literal for "the adapter could not determine this". */
const UNKNOWN: AuthorBotFlag = 'unknown';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Read the author bot flag off an inbound message, faithfully tri-state.
 *
 * Only `kind: 'chat-sdk'` messages carry a chat-sdk author. Native adapters
 * (`kind: 'chat'`, e.g. WhatsApp) shape `content` themselves and are not
 * handled here — they read as `'unknown'`, which is the safe side.
 */
export function readAuthorBotFlag(message: InboundMessage): AuthorBotFlag {
  if (message.kind !== 'chat-sdk') return UNKNOWN;
  if (!isRecord(message.content)) return UNKNOWN;
  const author = message.content.author;
  if (!isRecord(author)) return UNKNOWN;
  const isBot = author.isBot;
  if (isBot === true || isBot === false) return isBot;
  // Includes upstream's explicit 'unknown' and anything unexpected (absent,
  // null, a number, some future literal) — all mean "not established".
  return UNKNOWN;
}

/**
 * Collapse the flag for a privilege decision: fail-closed.
 *
 * Only a positively established `false` counts as "not a bot". `'unknown'`
 * resolves to bot, i.e. refuse. This mirrors v1's behavior on a privileged
 * path (`host-task.ts:71` refuses every bot message without nuance) and
 * extends it to the case v1 never had to answer: when in doubt, refuse.
 *
 * Do not use this for display or history filtering — those may legitimately
 * want to resolve `'unknown'` the other way, which is exactly why the
 * collapse lives at the point of use and not in `readAuthorBotFlag`.
 */
export function isBotForPrivilege(flag: AuthorBotFlag): boolean {
  return flag !== false;
}

/**
 * Convenience composition of the two above — the single call a privileged
 * path (a future `/host` port) should make, so the fail-closed collapse
 * cannot be re-derived incorrectly at the call site.
 */
export function messageIsBotForPrivilege(message: InboundMessage): boolean {
  return isBotForPrivilege(readAuthorBotFlag(message));
}
