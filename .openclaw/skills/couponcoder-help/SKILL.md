---
name: couponcoder-help
description: "Quick reference for couponcoder's modes, skills, and commands. One-shot display."
homepage: https://github.com/NickSicilianoSalazar/couponcoder
license: MIT
---

# Couponcoder Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What change |
|-------|---------|-------------|
| **Lite** | `/couponcoder lite` | Build what's asked, name the lazier alternative in one line. |
| **Full** | `/couponcoder` | The ladder enforced: YAGNI → stdlib → native → one line → minimum. Default. |
| **Ultra** | `/couponcoder ultra` | YAGNI extremist. Deletion before addition. Challenges requirements before building. |

Level sticks until changed or session end.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **couponcoder** | `/couponcoder` | Lazy mode itself. Simplest solution that works. |
| **couponcoder-review** | `/couponcoder-review` | Over-engineering review: `L42: yagni: factory, one product. Inline.` |
| **couponcoder-audit** | `/couponcoder-audit` | Whole-repo over-engineering audit: ranked list of what to delete. |
| **couponcoder-debt** | `/couponcoder-debt` | Harvest `couponcoder:` shortcut comments into a tracked ledger. |
| **couponcoder-gain** | `/couponcoder-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| **couponcoder-help** | `/couponcoder-help` | This card. |

Codex uses `@couponcoder`, `@couponcoder-review`, and `@couponcoder-help`; Claude Code
and OpenCode use the slash-command forms above (OpenCode ships all six as
slash commands).

## Deactivate

Say "stop couponcoder" or "normal mode". Resume anytime with `/couponcoder`.
`/couponcoder off` also works.

## Configure Default Mode

Default mode = `full`, auto-active every session. Change it:

**Environment variable** (highest priority):
```bash
export COUPONCODER_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/couponcoder/config.json`, Windows: `%APPDATA%\couponcoder\config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start, activate manually
with `/couponcoder` when wanted.

Resolution: env var > config file > `full`.

## Update

Enable auto-update once: open `/plugin`, go to Marketplaces, pick couponcoder, Enable auto-update. Claude Code then pulls new versions at startup (run `/reload-plugins` when it prompts). Manual refresh: `/plugin marketplace update couponcoder` then `/reload-plugins`.

If `/plugin` is not recognized, your Claude Code is out of date. Update it (`npm install -g @anthropic-ai/claude-code@latest`, or `brew upgrade claude-code`) and restart. Other hosts use their own update flow.

## More

Full docs + examples: https://github.com/NickSicilianoSalazar/couponcoder
