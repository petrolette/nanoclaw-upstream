/**
 * Behavior tests for the author bot-flag extraction.
 *
 * The two properties that matter, and why:
 *
 * 1. The flag stays tri-state end to end. Upstream really emits the string
 *    `'unknown'` (channel-post authors, reaction actors), so flattening it to
 *    a boolean at the source would erase a fact the caller needs.
 * 2. No degraded input can ever read as "human" on a privilege path. This is
 *    the whole point of the module: it stands in for v1's `is_bot_message`,
 *    which gates host escalation.
 *
 * Payload shapes below mirror what the bridge actually hands us: the output of
 * chat-sdk's `Message.toJSON()` (`chat/dist/index.js:333-346`) after the
 * bridge's own projection (`chat-sdk-bridge.ts:199-211`).
 */
import { describe, it, expect } from 'vitest';

import type { InboundMessage } from './adapter.js';
import { isBotForPrivilege, messageIsBotForPrivilege, readAuthorBotFlag } from './inbound-bot-flag.js';

/** A realistic chat-sdk inbound, with the author's `isBot` swapped in. */
function chatSdkMessage(isBot: unknown, opts: { omitIsBot?: boolean } = {}): InboundMessage {
  const author: Record<string, unknown> = {
    userId: '7822177081',
    userName: 'michel',
    fullName: 'Michel',
    isMe: false,
  };
  if (!opts.omitIsBot) author.isBot = isBot;
  return {
    id: 'telegram:-100123:456',
    kind: 'chat-sdk',
    content: {
      _type: 'chat:Message',
      text: 'hello',
      author,
      senderId: '7822177081',
      sender: 'Michel',
      senderName: 'Michel',
    },
    timestamp: '2026-08-01T10:00:00.000Z',
  };
}

/** A chat-sdk inbound whose `content` is replaced wholesale. */
function withContent(content: unknown): InboundMessage {
  return {
    id: 'telegram:-100123:456',
    kind: 'chat-sdk',
    content,
    timestamp: '2026-08-01T10:00:00.000Z',
  };
}

describe('readAuthorBotFlag', () => {
  it('reports false for a human author', () => {
    expect(readAuthorBotFlag(chatSdkMessage(false))).toBe(false);
  });

  it('reports true for a bot author', () => {
    expect(readAuthorBotFlag(chatSdkMessage(true))).toBe(true);
  });

  it("preserves upstream's 'unknown' instead of flattening it", () => {
    // Emitted by the upstream Telegram adapter for channel-post authors
    // (dist/index.js:1165-1172) and reaction actors (:1538).
    expect(readAuthorBotFlag(chatSdkMessage('unknown'))).toBe('unknown');
  });

  describe('degraded inputs all resolve to unknown, never to false', () => {
    it('non chat-sdk kind (native adapter, e.g. WhatsApp)', () => {
      const native: InboundMessage = {
        id: 'wa-1',
        kind: 'chat',
        // Deliberately shaped like a human author: kind alone must disqualify it.
        content: { text: 'hi', author: { isBot: false } },
        timestamp: '2026-08-01T10:00:00.000Z',
      };
      expect(readAuthorBotFlag(native)).toBe('unknown');
    });

    it('content undefined', () => {
      expect(readAuthorBotFlag(withContent(undefined))).toBe('unknown');
    });

    it('content null', () => {
      expect(readAuthorBotFlag(withContent(null))).toBe('unknown');
    });

    it('content not an object', () => {
      expect(readAuthorBotFlag(withContent('a raw string payload'))).toBe('unknown');
    });

    it('author absent', () => {
      expect(readAuthorBotFlag(withContent({ text: 'hello' }))).toBe('unknown');
    });

    it('author null', () => {
      expect(readAuthorBotFlag(withContent({ text: 'hello', author: null }))).toBe('unknown');
    });

    it('author not an object', () => {
      expect(readAuthorBotFlag(withContent({ text: 'hello', author: 'Michel' }))).toBe('unknown');
    });

    it('isBot absent', () => {
      expect(readAuthorBotFlag(chatSdkMessage(undefined, { omitIsBot: true }))).toBe('unknown');
    });

    it('isBot null', () => {
      expect(readAuthorBotFlag(chatSdkMessage(null))).toBe('unknown');
    });

    it.each([
      ['a truthy-but-wrong string', 'no'],
      ['a falsy number', 0],
      ['a truthy number', 1],
      ['an empty string', ''],
      ['an unexpected future literal', 'maybe'],
    ])('isBot is %s', (_label, value) => {
      expect(readAuthorBotFlag(chatSdkMessage(value))).toBe('unknown');
    });
  });
});

describe('isBotForPrivilege', () => {
  it('lets through only a positively established human', () => {
    expect(isBotForPrivilege(false)).toBe(false);
  });

  it('refuses an established bot', () => {
    expect(isBotForPrivilege(true)).toBe(true);
  });

  it("refuses 'unknown' — fail-closed on a privilege path", () => {
    expect(isBotForPrivilege('unknown')).toBe(true);
  });
});

describe('messageIsBotForPrivilege', () => {
  it('lets through a human-authored chat-sdk message', () => {
    expect(messageIsBotForPrivilege(chatSdkMessage(false))).toBe(false);
  });

  it('refuses a bot-authored message', () => {
    expect(messageIsBotForPrivilege(chatSdkMessage(true))).toBe(true);
  });

  it.each([
    ["upstream's 'unknown'", chatSdkMessage('unknown')],
    ['content undefined', withContent(undefined)],
    ['content null', withContent(null)],
    ['content not an object', withContent(42)],
    ['author absent', withContent({ text: 'hello' })],
    ['author null', withContent({ text: 'hello', author: null })],
    ['isBot absent', chatSdkMessage(undefined, { omitIsBot: true })],
    ['isBot non-conforming', chatSdkMessage('no')],
  ])('refuses on %s', (_label, message) => {
    expect(messageIsBotForPrivilege(message)).toBe(true);
  });

  it('refuses a native-adapter message even when it looks human', () => {
    const native: InboundMessage = {
      id: 'wa-1',
      kind: 'chat',
      content: { text: 'hi', isBotMessage: false },
      timestamp: '2026-08-01T10:00:00.000Z',
    };
    expect(messageIsBotForPrivilege(native)).toBe(true);
  });
});
