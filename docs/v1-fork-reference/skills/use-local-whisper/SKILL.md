---
name: use-local-whisper
description: Use when the user wants local voice transcription instead of OpenAI Whisper API. Switches to whisper.cpp running on Apple Silicon. WhatsApp only for now. Requires voice-transcription skill to be applied first.
---

# Use Local Whisper

Switches voice transcription from OpenAI's Whisper API to local whisper.cpp. Runs entirely on-device — no API key, no network, no cost.

**Channel support:** WhatsApp only. `src/transcription.ts` uses Baileys types for audio download. Other channels need their own audio-download logic first.

**Note:** Homebrew package is `whisper-cpp`; CLI binary is `whisper-cli`.

## Prerequisites

- `voice-transcription` skill applied first (WhatsApp channel)
- macOS with Apple Silicon (M1+) recommended
- `brew install whisper-cpp ffmpeg`
- A GGML model file in `data/models/`

## Phase 1: Pre-flight

### Check if already applied

```bash
grep 'whisper-cli' src/transcription.ts && echo "Already applied" || echo "Not applied"
```

If already applied, skip to Phase 3 (Verify).

### Check dependencies

```bash
whisper-cli --help >/dev/null 2>&1 && echo "WHISPER_OK" || echo "WHISPER_MISSING"
ffmpeg -version >/dev/null 2>&1 && echo "FFMPEG_OK" || echo "FFMPEG_MISSING"
```

If missing: `brew install whisper-cpp ffmpeg`

### Check for model file

```bash
ls data/models/ggml-*.bin 2>/dev/null || echo "NO_MODEL"
```

If no model, download base model (148MB, good speed/accuracy balance):
```bash
mkdir -p data/models
curl -L -o data/models/ggml-base.bin "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
```

Alternatives: `ggml-small.bin` (466MB) or `ggml-medium.bin` (1.5GB) for better accuracy.

## Phase 2: Apply Code Changes

### Ensure WhatsApp fork remote

```bash
git remote -v
```

If `whatsapp` remote is missing:
```bash
git remote add whatsapp https://github.com/qwibitai/nanoclaw-whatsapp.git
```

### Merge the skill branch

```bash
git fetch whatsapp skill/local-whisper
git merge whatsapp/skill/local-whisper || {
  git checkout --theirs package-lock.json
  git add package-lock.json
  git merge --continue
}
```

Modifies `src/transcription.ts` to use `whisper-cli` instead of the OpenAI API.

### Validate

```bash
npm run build
```

## Phase 3: Verify

### Ensure launchd PATH includes Homebrew

The launchd service runs with a restricted PATH. `whisper-cli` and `ffmpeg` live in `/opt/homebrew/bin/` (Apple Silicon) or `/usr/local/bin/` (Intel).

```bash
grep -A1 'PATH' ~/Library/LaunchAgents/com.nanoclaw.plist
```

If `/opt/homebrew/bin` is missing, add it to the `PATH` key's `<string>` value, then reload:
```bash
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

### Build and restart

```bash
npm run build
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

### Test

Send a voice note in any registered group. The agent should receive it as `[Voice: <transcript>]`.

### Check logs

```bash
tail -f logs/nanoclaw.log | grep -i -E "voice|transcri|whisper"
```

- `Transcribed voice message` — success
- `whisper.cpp transcription failed` — check model path, ffmpeg, or PATH

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_BIN` | `whisper-cli` | Path to whisper.cpp binary |
| `WHISPER_MODEL` | `data/models/ggml-base.bin` | Path to GGML model file |

## Troubleshooting

**"whisper.cpp transcription failed"**: Ensure `whisper-cli` and `ffmpeg` are in PATH. The launchd service uses a restricted PATH — see Phase 3. Test manually:
```bash
ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 1 -f wav /tmp/test.wav -y
whisper-cli -m data/models/ggml-base.bin -f /tmp/test.wav --no-timestamps -nt
```

**Works in dev but not as service**: launchd plist PATH likely missing `/opt/homebrew/bin` — see Phase 3.

**Slow transcription**: Base model processes ~30s audio in <1s on M1+. If slower, check for competing CPU processes.

**Wrong language**: whisper.cpp auto-detects language. To force a language, set `WHISPER_LANG` and modify `src/transcription.ts` to pass `-l $WHISPER_LANG`.
