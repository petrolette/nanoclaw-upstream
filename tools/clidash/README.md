# clidash

CLI-agnostic **read-only** web dashboard. Point it at any CLI that can list
resources as JSON and it derives the dashboard at runtime: one tab per
resource, a generic table over whatever columns the rows have. New resource →
new tab; new column → new table column; **zero code changes**.

It ships pre-wired for NanoClaw's `ncl` CLI (agent groups, sessions, messaging
groups, wirings, users, roles, …) plus `docker`, but the same config shape
works for any list-as-JSON CLI.

- **Zero dependencies** — Node built-ins only (Node ≥ 22.5, for `node:sqlite`),
  no build step,
  vanilla-JS frontend.
- **Read-only by construction** — the server can only `execFile` the configured
  argv templates; `{resource}` is the sole substitution and is validated
  against the discovered/static resource allowlist. Never a shell.
- **Standalone** — no imports from NanoClaw source; the core is extractable to
  its own repo. The NanoClaw-specific knowledge lives entirely in the config
  and in the `views/ncl-overview.js` view plugin.

## Run

```bash
cp clidash.config.example.json clidash.config.json   # then edit paths if needed
node server.js                                        # uses ./clidash.config.json
CLIDASH_CONFIG=/path/to.json node server.js
PORT=4690 BIND=127.0.0.1 node server.js               # env overrides
```

Run it from `tools/clidash/`; the example config uses paths relative to the
NanoClaw root two levels up, so it works out of the box once `ncl` is built.

## Configure (`clidash.config.json`)

```jsonc
{
  "port": 4690,
  "bind": "127.0.0.1",          // never a public interface; a tailnet IP at most
  "refreshSeconds": 60,
  "clis": {
    "ncl": {
      "bin": "bin/ncl",                                        // relative to cwd below
      "cwd": "../..",                                           // the NanoClaw root
      "discover": { "args": ["help"], "parser": "ncl-help" },   // runtime resource discovery
      "list": ["{resource}", "list", "--json"],                 // argv template
      "output": "json",          // or "jsonlines" (docker/kubectl style)
      "unwrap": "data"           // dot-path into a response envelope
    },
    "docker": {
      "bin": "docker",
      "resources": ["ps", "images"],          // static alternative to discover
      "list": ["{resource}", "--format", "{{json .}}"],
      "output": "jsonlines"
    }
  }
}
```

`{resource}` may appear as a whole argv element or inside one — e.g. a remote
CLI via ssh: `"list": ["-i", "key.pem", "user@host", "ncl {resource} list --json"]`.

Per-CLI `env` (merged over the server's env) and `cwd` are supported. See
`clidash.config.example.json` for the full NanoClaw config, including the
`enrich`/`badges`/`summary` table decorations and the `activity`/`logs`/`docs`
sections.

## Languages (i18n)

The UI ships in **French (default) and English**. The picker sits under the
refresh/pause controls in the sidebar; the choice is stored in `localStorage`
(`clidash.locale`) and applied to `<html lang>`. Without a stored choice the UI
opens in French — the browser language is deliberately not consulted, so an
English-locale browser still lands in French. English remains the reference
dictionary: a key missing from another locale falls back to it.

All UI copy lives in `public/i18n.js` — one flat dictionary per locale, values
being strings or functions of the interpolated parts.

The CLIs' own vocabulary goes through a second layer in the same file, the
**glossary**: `resources` (nav entries, page titles), `fields` (table columns and
detail keys) and `values` (the short enum values shown as badges, applied only to
the columns listed in `ENUM_FIELDS`). Anything the glossary doesn't know falls
back to the raw CLI token, so a new `ncl` resource or column shows up
untranslated rather than blank. The English glossary is deliberately empty —
English shows exactly what `ncl` prints, which is what you would type back into a
terminal. Names, ids, timestamps, free text and `ncl … help` output are never
rewritten; hovering a translated column or tab shows the raw token as a tooltip.

The help panel under each table shows `ncl <resource> help`, which the CLI emits
in English. `public/help.js` re-renders it from `public/help-fr.js`: only the
sentences are looked up — the resource description, each verb's sentence, each
field's sentence. Verb names, flag names, enum tokens and the backticked command
are structure and stay verbatim, so you can still retype them into a terminal;
the `(required, updatable)` / `(values: …)` annotations are localised
mechanically rather than stored. A missing sentence stays English, one line at a
time. `test/help-i18n.test.js` checks the catalogue against captured fixtures of
the real CLI output (`test/fixtures/ncl-help/`) and fails both on an
untranslated sentence and on French written for a flag the CLI no longer prints
— refresh the fixtures when upstream reworks a help text.

Adding a locale is a dictionary + a glossary + a help catalogue + an entry in `LOCALES`;
`test/i18n.test.js` fails on any key present in one locale and missing in
another, on a key whose shape or arity drifts between locales, and on any
`t('…')` call in `app.js` with no dictionary entry.

Config-supplied labels (`logs.files[].label`, `docs.collections[].label`) accept
either a plain string — shown as-is everywhere — or a per-locale map:

```jsonc
{ "name": "nanoclaw.log", "label": { "en": "host log", "fr": "journal hôte" } }
```

> **Careful:** this translation lives in the installed copy under
> `tools/clidash/`, not in the upstream `/add-clidash` skill payload. Re-running
> `/add-clidash` or `/update-skills` overwrites `tools/clidash/` from upstream
> and drops it — re-apply this commit afterwards.

## API

| Route | Returns |
|---|---|
| `GET /api/clis` | configured CLIs + discovered/static resources (discovery cached 60s) |
| `GET /api/r/<cli>/<resource>` | `{ok, rows, fetchedAt}` — coalesced, 10s exec timeout |
| `GET /api/view/<cli>/<view>` | curated view plugin from `views/<cli>-<view>.js` |

View plugins are the only per-CLI *code*, and optional: a default-exported
async function receiving `{ fetch }` (bound to that CLI) returning JSON.
`views/ncl-overview.js` joins groups + sessions + messaging-groups + wirings
into per-agent status cards (green <15m / amber <2h / red older).

## Test

```bash
npm test            # unit + integration (node:test, stub CLI — no real CLI needed)
./test/smoke.sh     # against a running instance
```

## Deploy as a service

clidash binds `127.0.0.1` by default. To reach it from other devices, bind a
private (e.g. tailnet) IP — **never a public interface**; the network is the
auth boundary. Example systemd user service:

```ini
# ~/.config/systemd/user/clidash.service
[Unit]
Description=clidash read-only CLI dashboard

[Service]
WorkingDirectory=%h/nanoclaw/tools/clidash
ExecStart=/usr/bin/node %h/nanoclaw/tools/clidash/server.js
Environment=BIND=127.0.0.1
Restart=on-failure

[Install]
WantedBy=default.target
```

Then `systemctl --user enable --now clidash`.
