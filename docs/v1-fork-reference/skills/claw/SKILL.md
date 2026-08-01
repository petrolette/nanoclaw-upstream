---
name: claw
description: Install the claw CLI tool — run NanoClaw agent containers from the command line without opening a chat app.
---

# claw — NanoClaw CLI

`claw` is a Python CLI that sends prompts directly to a NanoClaw agent container from the terminal. Reads registered groups from the NanoClaw database, picks up secrets from `.env`, and pipes a JSON payload into a container run.

## What it does

- Send a prompt to any registered group by name, folder, or JID
- Default target is the main group (no `-g` needed for most use)
- Resume a previous session with `-s <session-id>`
- Read prompts from stdin (`--pipe`) for scripting
- List all registered groups with `--list-groups`
- Auto-detects `container` or `docker` runtime (or override with `--runtime`)
- Prints agent response to stdout; session ID to stderr
- Verbose mode (`-v`) shows command, redacted payload, and exit code

## Prerequisites

- Python 3.8+
- NanoClaw installed with a built and tagged container image (`nanoclaw-agent:latest`)
- `container` (Apple Container, macOS 15+) or `docker` in `PATH`

## Install

Run from within the NanoClaw directory. The script auto-detects its location, so the symlink always points to the right place.

### 1. Copy the script

```bash
mkdir -p scripts
cp "${CLAUDE_SKILL_DIR}/scripts/claw" scripts/claw
chmod +x scripts/claw
```

### 2. Symlink into PATH

```bash
mkdir -p ~/bin
ln -sf "$(pwd)/scripts/claw" ~/bin/claw
```

Add to `~/.zshrc` or `~/.bashrc` if `~/bin` is not in `PATH`:

```bash
export PATH="$HOME/bin:$PATH"
```

Reload: `source ~/.zshrc`

### 3. Verify

```bash
claw --list-groups
```

If NanoClaw isn't running or the database doesn't exist yet, the list will be empty — that's fine.

## Usage Examples

```bash
claw "What's on my calendar today?"
claw -g "family" "Remind everyone about dinner at 7"
claw -j "120363336345536173@g.us" "Hello"
claw -s abc123 "Continue where we left off"
echo "Summarize this" | claw --pipe -g dev
cat report.txt | claw --pipe "Summarize this report"
claw --list-groups
claw --runtime docker "Hello"
claw --image nanoclaw-agent:dev "Hello"
claw -v "Hello"
claw --timeout 600 "Run the full analysis"
```

## Troubleshooting

**"neither 'container' nor 'docker' found"** — Install Docker Desktop or Apple Container (macOS 15+), or pass `--runtime` explicitly.

**"no secrets found in .env"** — Script auto-detects NanoClaw directory and reads `.env` from it. Ensure it contains at least one of: `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`.

**Container times out** — Default timeout is 300s. Pass `--timeout 600` for longer tasks. If consistently hanging, rebuild: `./container/build.sh`.

**"group not found"** — Run `claw --list-groups`. Lookup does fuzzy partial match on name and folder; if multiple groups match, you'll get an error listing ambiguous matches.

**Container crashes mid-stream** — Containers run with `--rm` and are auto-removed. If the agent crashes before emitting the output sentinel, `claw` falls back to raw stdout. Use `-v` for details. Rebuild with `./container/build.sh` if consistent.

**Override NanoClaw directory** — If `claw` can't find your database or `.env`:

```bash
export NANOCLAW_DIR=/path/to/your/nanoclaw
```
