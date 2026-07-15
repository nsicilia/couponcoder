# Agent Portability

Couponcoder is an agent-portable skill distribution. The skills in `skills/` hold
the core behavior; host-specific files are adapters that make that behavior easy
to load in a given agent.

## Supported Adapters

| Host | Files | Notes |
|------|-------|-------|
| Claude Code | `.claude-plugin/plugin.json`, `commands/`, `hooks/claude-codex-hooks.json`, `hooks/` | Full plugin install with session activation, mode tracking, commands, and statusline support. |
| Codex | `.codex-plugin/plugin.json`, `hooks/claude-codex-hooks.json`, `hooks/`, `skills/` | Plugin install with the same skills plus lifecycle hooks for activation and mode tracking. |
| OpenCode | `.opencode/plugins/couponcoder.mjs`, `.opencode/command/`, `hooks/`, `skills/` | Server plugin injects the ruleset each turn via `experimental.chat.system.transform` and persists `/couponcoder` switches; reuses the shared instruction builder. |
| pi | `pi-extension/`, `skills/`, `hooks/` | Package extension: injects the ruleset each turn through the shared instruction builder and registers the `/couponcoder` commands. |
| Gemini CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension manifest points `contextFileName` at `AGENTS.md` for always-on rules, and reuses the existing `commands/*.toml` and `skills/`, which Gemini CLI auto-discovers. The Claude/Codex hook map is not placed at Gemini's auto-discovered `hooks/hooks.json` path. |
| Cursor | `.cursor/rules/couponcoder.mdc` | Always-on project rule. |
| Windsurf | `.windsurf/rules/couponcoder.md` | Project rule. |
| GitHub Copilot | `.github/copilot-instructions.md` | Repository instruction file. |
| GitHub Copilot CLI | `.github/plugin/`, `AGENTS.md`, `.github/copilot-instructions.md`, `~/.copilot/copilot-instructions.md` | Plugin-supported (`copilot plugin marketplace add nsicilia/couponcoder` + `copilot plugin install couponcoder@couponcoder`). Fallback instruction mode remains: per-project from `AGENTS.md` or `.github/copilot-instructions.md`, or globally from `~/.copilot/copilot-instructions.md` (instruction-tier, no `/couponcoder` levels or hooks). |
| Antigravity | `AGENTS.md` | Reads `AGENTS.md` at the repo root as always-on rules (like `.cursorrules`/`CLAUDE.md`); `.agents/rules/` also works for workspace rules. Instruction-tier. |
| CodeWhale | `AGENTS.md` | Reads `AGENTS.md` from the repo root as project instructions; also reads `CLAUDE.md` and `.claude/instructions.md` as fallbacks. Instruction-tier. |
| VS Code + Codex extension | `AGENTS.md` | The Codex extension reads `AGENTS.md` (repo root, or `~/.codex/AGENTS.md` globally). Instruction-tier; the full Codex plugin row above adds `/couponcoder` levels and hooks. |
| JetBrains Junie | `AGENTS.md` | Junie reads `AGENTS.md` once you point it there in Settings → Tools → Junie → Project Settings → Guidelines Path (not automatic yet); this repo ships `AGENTS.md`, and `.junie/guidelines.md` is Junie's legacy path. Instruction-tier. |
| Jules (Google) | `AGENTS.md` | Jules automatically reads `AGENTS.md` from the repository root. Instruction-tier. |
| Generic agents | `AGENTS.md` or `skills/*/SKILL.md` | Copy the compact rule file or load the skill files directly. |

## Adapter Rule

Keep adapters thin. When a host supports skills or hooks, point it at the
existing `skills/` and `hooks/` files. When a host only supports project
instructions, keep its copied rule text aligned with `AGENTS.md`.

## Portable Behavior

- `skills/couponcoder/SKILL.md`: lazy senior dev mode
- `skills/couponcoder-review/SKILL.md`: over-engineering review
- `skills/couponcoder-audit/SKILL.md`: whole-repo over-engineering audit
- `skills/couponcoder-debt/SKILL.md`: harvest `couponcoder:` shortcuts into a tracked ledger
- `skills/couponcoder-gain/SKILL.md`: measured-impact scoreboard from the benchmark
- `skills/couponcoder-help/SKILL.md`: quick reference
- `AGENTS.md`: compact always-on instruction set for agents without skill support
