---
name: add-pdf-reader
description: Add PDF reading to NanoClaw agents. Extracts text from PDFs via pdftotext CLI. Handles WhatsApp attachments, URLs, and local files.
---

# Add PDF Reader

Adds PDF reading capability to all container agents using poppler-utils (pdftotext/pdfinfo). PDFs sent as WhatsApp attachments are auto-downloaded to the group workspace.

## Phase 1: Pre-flight

1. Check if `container/skills/pdf-reader/pdf-reader` exists — skip to Phase 3 if already applied
2. Confirm WhatsApp is installed first (`skill/whatsapp` merged). This skill modifies WhatsApp channel files.

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
git fetch whatsapp skill/pdf-reader
git merge whatsapp/skill/pdf-reader || {
  git checkout --theirs package-lock.json
  git add package-lock.json
  git merge --continue
}
```

Merges in: `container/skills/pdf-reader/SKILL.md`, `container/skills/pdf-reader/pdf-reader`, `poppler-utils` in `container/Dockerfile`, PDF attachment download in `src/channels/whatsapp.ts`, PDF tests in `src/channels/whatsapp.test.ts`.

If conflicts occur, resolve by reading conflicted files and understanding the intent of both sides.

### Validate

```bash
npm run build
npx vitest run src/channels/whatsapp.test.ts
```

### Rebuild container

```bash
./container/build.sh
```

### Restart service

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
# Linux: systemctl --user restart nanoclaw
```

## Phase 3: Verify

Send a PDF in any registered WhatsApp chat. The agent should download it to `attachments/`, acknowledge it, and extract text when asked. For URL testing, ask the agent to read a PDF from a URL — it should use `pdf-reader fetch <url>`.

```bash
tail -f logs/nanoclaw.log | grep -i pdf
```

- `Downloaded PDF attachment` — successful download
- `Failed to download PDF attachment` — media download issue

## Troubleshooting

**pdf-reader command not found:** Run `./container/build.sh` and restart.

**Empty PDF text extraction:** PDF is image-based (scanned). pdftotext only handles text-based PDFs. Use agent-browser to open visually instead.

**WhatsApp PDF not detected:** Verify message has `documentMessage` with `mimetype: application/pdf`. Some apps send PDFs as generic files without the correct mimetype.
