/**
 * Same-exchange duplicate suppression.
 *
 * The runtime addendum offers the agent two delivery paths — the send_message
 * tool mid-turn, and <message to="..."> blocks in the final text — and presents
 * both as valid without making them exclusive. Agents routinely take both for
 * the same content, and the user sees the answer twice.
 *
 * Three observed shapes, all covered here:
 *   a. tool send, then the final text repeats it verbatim
 *   b. tool send, then bare text — the wrapping nudge used to fire and the
 *      retry became the second delivery
 *   c. tool send, then no text at all — the SDK's own "no visible output"
 *      retry produced a block, out of this codebase's reach
 *
 * Suppression is scoped to one exchange and to an exact (destination, body)
 * match, so a legitimate repeat in a later exchange still goes out.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { closeSessionDb, getInboundDb, getOutboundDb, initTestSessionDb } from './db/connection.js';
import { getMaxOutboundSeq } from './db/messages-out.js';
import { sendMessage } from './mcp-tools/core.js';
import { dispatchResultText } from './poll-loop.js';
import type { RoutingContext } from './formatter.js';

const chatRouting: RoutingContext = {
  platformId: 'telegram:99',
  channelType: 'telegram',
  threadId: null,
  inReplyTo: 'telegram:99:1',
  taskRun: false,
};

function seedDestination(name = 'michel', channelType = 'telegram', platformId = 'telegram:99'): void {
  getInboundDb()
    .prepare(
      `INSERT INTO destinations (name, display_name, type, channel_type, platform_id, agent_group_id)
       VALUES (?, ?, 'channel', ?, ?, NULL)`,
    )
    .run(name, name, channelType, platformId);
}

/** Bodies of every chat row written, oldest first. */
function deliveredTexts(): string[] {
  const rows = getOutboundDb()
    .prepare(`SELECT content FROM messages_out WHERE kind = 'chat' ORDER BY seq`)
    .all() as { content: string }[];
  return rows.map((r) => (JSON.parse(r.content) as { text: string }).text);
}

beforeEach(() => {
  initTestSessionDb();
  seedDestination();
});

afterEach(() => {
  closeSessionDb();
});

describe('duplicate delivery within one exchange', () => {
  it('drops a final-text block that repeats a tool send (shape a)', async () => {
    const start = getMaxOutboundSeq();
    await sendMessage.handler({ to: 'michel', text: 'Bonjour Michel !' });

    const result = dispatchResultText('<message to="michel">Bonjour Michel !</message>', chatRouting, start);

    expect(deliveredTexts()).toEqual(['Bonjour Michel !']);
    expect(result.sent).toBe(0);
    // The tool already delivered — nothing is pending, so no nudge.
    expect(result.hasUnwrapped).toBe(false);
  });

  it('does not nudge when the answer went out through the tool (shape b)', async () => {
    const start = getMaxOutboundSeq();
    await sendMessage.handler({ to: 'michel', text: 'Bonjour Michel !' });

    // Bare, unwrapped acknowledgement — previously `sent === 0` plus a
    // non-empty scratchpad, which armed the "not delivered" retry.
    const result = dispatchResultText('Message envoyé à Michel.', chatRouting, start);

    expect(result.hasUnwrapped).toBe(false);
    expect(deliveredTexts()).toEqual(['Bonjour Michel !']);
  });

  it('drops the block an out-of-band retry produces (shape c)', async () => {
    const start = getMaxOutboundSeq();
    await sendMessage.handler({ to: 'michel', text: 'Oui, je suis là !' });

    // First result carried no text at all; the retry arrives as a second
    // dispatch inside the SAME exchange, so the watermark is unchanged.
    dispatchResultText('', chatRouting, start);
    const retry = dispatchResultText('<message to="michel">Oui, je suis là !</message>', chatRouting, start);

    expect(deliveredTexts()).toEqual(['Oui, je suis là !']);
    expect(retry.sent).toBe(0);
  });

  it('suppresses a block repeated twice inside one final text', () => {
    const start = getMaxOutboundSeq();

    const result = dispatchResultText(
      '<message to="michel">Salut</message><message to="michel">Salut</message>',
      chatRouting,
      start,
    );

    expect(deliveredTexts()).toEqual(['Salut']);
    expect(result.sent).toBe(1);
  });
});

describe('deliveries that must still go through', () => {
  it('keeps a block whose text differs from the tool send', async () => {
    const start = getMaxOutboundSeq();
    await sendMessage.handler({ to: 'michel', text: 'Je regarde.' });

    const result = dispatchResultText('<message to="michel">C\'est fait.</message>', chatRouting, start);

    expect(deliveredTexts()).toEqual(['Je regarde.', "C'est fait."]);
    expect(result.sent).toBe(1);
  });

  it('keeps the same text sent again in a LATER exchange', async () => {
    const first = getMaxOutboundSeq();
    await sendMessage.handler({ to: 'michel', text: 'Bonjour Michel !' });
    dispatchResultText('<message to="michel">Bonjour Michel !</message>', chatRouting, first);

    // A new user batch moves the watermark; the greeting is legitimate again.
    const second = getMaxOutboundSeq();
    const result = dispatchResultText('<message to="michel">Bonjour Michel !</message>', chatRouting, second);

    expect(deliveredTexts()).toEqual(['Bonjour Michel !', 'Bonjour Michel !']);
    expect(result.sent).toBe(1);
  });

  it('delivers normally when no watermark is supplied', async () => {
    await sendMessage.handler({ to: 'michel', text: 'Bonjour Michel !' });

    const result = dispatchResultText('<message to="michel">Bonjour Michel !</message>', chatRouting);

    expect(deliveredTexts()).toEqual(['Bonjour Michel !', 'Bonjour Michel !']);
    expect(result.sent).toBe(1);
  });

  it('still nudges a bare answer when nothing was delivered at all', () => {
    const start = getMaxOutboundSeq();

    const result = dispatchResultText('Voilà ce que je pense.', chatRouting, start);

    expect(result.hasUnwrapped).toBe(true);
    expect(deliveredTexts()).toEqual([]);
  });
});
