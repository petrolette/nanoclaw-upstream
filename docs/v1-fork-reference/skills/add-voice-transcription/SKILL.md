# Add Voice Transcription

This skill adds automatic voice message transcription to NanoClaw's WhatsApp channel using OpenAI's Whisper API. When a voice note arrives, it is downloaded, transcribed, and delivered to the agent as `[Voice: <transcript>]`.

## Phase 1: Pre-flight

### Check if already applied

Check if `src/transcription.ts` exists. If it does, skip to Phase 3 (Configure).

### Ask the user

Use `AskUserQuestion` to collect information:

AskUserQuestion: Do you have an OpenAI API key for Whisper transcription?

If no, direct them to create one at https://platform.openai.com/api-keys.

## Phase 2: Apply Code Changes

**Prerequisite:** WhatsApp must be installed first (`skill/whatsapp` merged). This skill modifies WhatsApp channel files.

### Ensure WhatsApp fork remote

```bash
git remote -v
```

If `whatsapp` is missing:

```bash
git remote add whatsapp https://github.com/qwibitai/nanoclaw-whatsapp.git
```

### Merge the skill branch

```bash
git fetch whatsapp skill/voice-transcription
git merge whatsapp/skill/voice-transcription || {
  git checkout --theirs package-lock.json
  git add package-lock.json
  git merge --continue
}
```

Merges: `src/transcription.ts`, voice handling in `src/channels/whatsapp.ts`, transcription tests, `openai` npm dependency, and `OPENAI_API_KEY` in `.env.example`.

### Validate code changes

```bash
npm install --legacy-peer-deps
npm run build
npx vitest run src/channels/whatsapp.test.ts
```

All tests must pass and build must be clean before proceeding.

## Phase 3: Configure

### Get OpenAI API key (if needed)

If the user lacks an API key:

> 1. Go to https://platform.openai.com/api-keys
> 2. Click "Create new secret key"
> 3. Give it a name (e.g., "NanoClaw Transcription")
> 4. Copy the key (starts with `sk-`)
>
> Cost: ~$0.006 per minute of audio (~$0.003 per typical 30-second voice note)

### Add to environment

Add to `.env`:

```bash
OPENAI_API_KEY=<their-key>
```

Sync to container:

```bash
mkdir -p data/env && cp .env data/env/env
```

### Build and restart

```bash
npm run build
launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
# Linux: systemctl --user restart nanoclaw
```

## Phase 4: Verify

### Test with a voice note

Tell the user:

> Send a voice note in any registered WhatsApp chat. The agent should receive it as `[Voice: <transcript>]` and respond to its content.

### Check logs if needed

```bash
tail -f logs/nanoclaw.log | grep -i voice
```

Look for:
- `Transcribed voice message` — successful transcription with character count
- `OPENAI_API_KEY not set` — key missing from `.env`
- `OpenAI transcription failed` — API error (check key validity, billing)
- `Failed to download audio message` — media download issue

## Troubleshooting

### Voice notes show "[Voice Message - transcription unavailable]"

1. Check `OPENAI_API_KEY` is set in `.env` AND synced to `data/env/env`
2. Verify key works: `curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | head -c 200`
3. Check OpenAI billing — Whisper requires a funded account

### Voice notes show "[Voice Message - transcription failed]"

Check logs for the specific error. Common causes:
- Network timeout — transient, will work on next message
- Invalid API key — regenerate at https://platform.openai.com/api-keys
- Rate limiting — wait and retry

### Agent doesn't respond to voice notes

Verify the chat is registered and the agent is running. Voice transcription only runs for registered groups.
