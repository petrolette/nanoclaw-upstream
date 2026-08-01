---
name: add-compact
description: Add /compact command for manual context compaction. Solves context rot in long sessions by forwarding the SDK's built-in /compact slash command. Main-group or trusted sender only.
---

# Add /compact Command

Adds a `/compact` session command that compacts conversation history to fight context rot in long-running sessions. Uses the Claude Agent SDK's built-in `/compact` slash command — no synthetic system prompts.

**Session contract:** `/compact` keeps the same logical session alive. The SDK returns a new session ID after compaction (via the `init` system message), which the agent-runner forwards to the orchestrator as `newSessionId`. No destructive reset occurs — the agent retains summarized context.

## Phase 1: Pre-flight

```bash
test -f src/session-commands.ts && echo "Already applied" || echo "Not applied"
```

If already applied, skip to Phase 3 (Verify).

## Phase 2: Apply Code Changes

```bash
git fetch upstream skill/compact
git merge upstream/skill/compact
```

> **Note:** `upstream` points to `qwibitai/nanoclaw`. Substitute if using a different remote name.

This adds:
- `src/session-commands.ts` (extract and authorize session commands)
- `src/session-commands.test.ts` (unit tests for command parsing and auth)
- Session command interception in `src/index.ts` (both `processGroupMessages` and `startMessageLoop`)
- Slash command handling in `container/agent-runner/src/index.ts`

### Validate

```bash
npm test
npm run build
./container/build.sh
```

### Restart service

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
# Linux: systemctl --user restart nanoclaw
```

## Phase 3: Verify

1. From **main group**, send `/compact`.
   - Agent acknowledges (e.g., "Conversation compacted.")
   - Session continues coherently after follow-up message
   - Archive written to `groups/{folder}/conversations/`
   - Container logs show `Compact boundary observed`; if not, response says "compact_boundary was not observed"

2. From **non-main group** as non-admin, send `@<assistant> /compact`.
   - Bot responds: "Session commands require admin access."
   - No compaction; no container spawned

3. From **non-main group** as admin (`is_from_me`), send `@<assistant> /compact`.
   - Compaction proceeds normally

4. With **active container** running, send `/compact`.
   - Active container is signaled to close (authorized senders only)
   - Compaction proceeds via new container after active one exits
   - Command is not dropped (no cursor race)

5. Send normal message, then `/compact`, then another normal message in same polling batch.
   - Pre-compact messages sent first (check logs for two `runAgent` calls)
   - Compaction proceeds after pre-compact messages
   - Post-compact messages preserved (cursor advances to `/compact`'s timestamp only) and processed next poll

6. From **non-main group** as non-admin, send `@<assistant> /compact`.
   - Denial message sent; `/compact` consumed (cursor advanced, no replay)
   - Other messages in batch also consumed (accepted tradeoff)
   - No container killed

7. From **non-main group** with `requiresTrigger` enabled, non-admin sends bare `/compact`.
   - No denial message (trigger policy prevents untrusted bot responses)
   - `/compact` consumed silently
   - Note: if `requiresTrigger` is `false`, denial IS sent

8. After compaction, verify no auto-compaction occurs.

### Validation on Fresh Clone

```bash
git clone <your-fork> /tmp/nanoclaw-test
cd /tmp/nanoclaw-test
claude  # then run /add-compact
npm run build
npm test
./container/build.sh
# Manual: send /compact from main group — verify compaction + continuation
# Manual: send @<assistant> /compact from non-main as non-admin — verify denial
# Manual: send @<assistant> /compact from non-main as admin — verify allowed
# Manual: verify no auto-compaction
```

## Security Constraints

- **Main-group or trusted/admin sender only.** Main group is private self-chat (trusted). Non-main groups are untrusted — users could wipe agent's short-term memory. Device owner (`is_from_me`) is always trusted and can compact from any group.
- **No auto-compaction.** Manual only; automatic threshold-based compaction is a separate skill.
- **No config file.** Customization through code, not configuration sprawl.
- **Transcript archived before compaction** via existing `PreCompact` hook in agent-runner.
- **Session continues after compaction** — not a destructive reset.

## What This Does NOT Do

- No automatic compaction threshold
- No `/clear` command (separate skill, destructive reset semantics)
- No cross-group compaction (each group's session is isolated)
- No changes to container image, Dockerfile, or build script

## Troubleshooting

- **"Session commands require admin access"**: Only `is_from_me` or main-group senders can use `/compact`.
- **No compact_boundary in logs**: SDK may not emit this in all versions. Compaction may still have succeeded.
- **Pre-compact failure**: Error says "Failed to process messages before /compact." Cursor advances past sent output; `/compact` remains pending for next attempt.
