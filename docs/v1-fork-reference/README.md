# Référence fork v1 — skills non portés

Ces skills viennent de l'install NanoClaw **v1** (`/home/nanoclaw/nanoclaw`, 282 commits d'écart
avec `upstream/main`). Ils ont été conservés ici **en référence uniquement** lors de la migration
v2 du 01.08.2026.

## Pourquoi ils ne sont pas installés

Chacun de ces skills patche l'architecture v1 : `src/` du host, `container/agent-runner/src/`, le
mécanisme IPC v1, `registered_groups` / `is_main`, la sender-allowlist, `store/messages.db`. Aucune
de ces surfaces n'existe en v2 — le host route désormais par entity model (users → messaging groups
→ agent groups → sessions) et les deux seules interfaces host/container sont `inbound.db` et
`outbound.db`.

**Les copier tels quels dans `.claude/skills/` ne marcherait pas.** Chacun demande une réécriture
contre l'architecture v2 avant de pouvoir servir.

## Ce que chacun faisait

| Skill | Rôle en v1 | Équivalent v2 |
|---|---|---|
| `add-compact` | Commande `/compact` manuelle, contre le context rot des longues sessions | La compaction est gérée par le harness |
| `add-image-vision` | Redimensionne les images WhatsApp et les passe à Claude en blocs multimodaux | À réécrire contre l'adaptateur WhatsApp v2 |
| `add-parallel` | (pas de description dans le SKILL.md v1) | À examiner |
| `add-pdf-reader` | Extraction de texte PDF via `pdftotext` — pièces jointes, URLs, fichiers locaux | Le skill container `pdf-reader` est déjà installé en v2 |
| `add-reactions` | Réactions emoji WhatsApp : réception, envoi, stockage, recherche | À réécrire contre l'adaptateur WhatsApp v2 |
| `add-telegram-swarm` | Agent Swarm sur Telegram — une identité de bot par subagent | À réécrire ; v2 gère plusieurs agent groups nativement |
| `add-voice-transcription` | (pas de description dans le SKILL.md v1) | À examiner |
| `channel-formatting` | Markdown → syntaxe native de chaque canal, avant livraison | v2 fournit `slack-formatting` et `whatsapp-formatting` comme skills container |
| `claw` | CLI pour lancer un container agent sans passer par une app de chat | v2 fournit `ncl` et le canal `cli` |
| `use-local-whisper` | Transcription vocale locale via whisper.cpp (Apple Silicon) au lieu de l'API Whisper | À réécrire ; dépend de `add-voice-transcription` |

## Le reste du fork

Le code source v1 (`src/`, `container/agent-runner/src/`) n'a **pas** été copié : il n'est pas
traduisible vers v2. L'install v1 reste intacte et lisible à
`/home/nanoclaw/nanoclaw` — c'est la référence en cas de besoin.

Les docs custom v1 (`APPLE-CONTAINER-NETWORKING.md`, `BRANCH-FORK-MAINTENANCE.md`,
`DEBUG_CHECKLIST.md`, `REQUIREMENTS.md`, `SDK_DEEP_DIVE.md`, `SECURITY.md`, `SPEC.md`,
`docker-sandboxes.md`, `skills-as-branches.md`) n'ont pas été copiées non plus — elles décrivent
l'architecture v1. Elles restent dans `/home/nanoclaw/nanoclaw/docs/`.
