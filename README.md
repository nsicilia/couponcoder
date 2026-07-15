<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" width="220" alt="Couponcoder, the lazy senior dev">
  </picture>
</p>

<h1 align="center">Couponcoder</h1>


## Before / after

You ask for a date picker. Your agent installs flatpickr, writes a wrapper component, adds a stylesheet, and starts a discussion about timezones.

With couponcoder:

```html
<!-- couponcoder: browser has one -->
<input type="date">
```

More survivors in [examples/](examples/).

## Numbers

The honest measurement is a real agent doing real work: a headless Claude Code session editing [tiangolo's full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template) (a real FastAPI + React repo), scored on the `git diff` it leaves behind. Twelve feature tickets, the same agent with and without the skill, n=4, Haiku 4.5.

<p align="center">
  <img src="assets/benchmark-agentic.svg" width="860" alt="Each arm as a percent of the no-skill baseline across LOC, tokens, cost and time (Haiku 4.5). couponcoder is lowest on every metric (LOC 46%, tokens 78%, cost 80%, time 73%); caveman rises above 100% on tokens, cost and time; yagni-oneliner LOC 67%. Safety, separate adversarial tier: baseline, caveman and couponcoder 100%, yagni-oneliner 95%.">
</p>

| vs no-skill baseline | LOC | tokens | cost | time | safe |
|---|--:|--:|--:|--:|--:|
| **couponcoder** | **-54%** | **-22%** | **-20%** | **-27%** | **100%** |
| caveman (terse-prose control) | -20% | +7% | +3% | +2% | 100% |
| "YAGNI + one-liners" prompt | -33% | -14% | -21% | -30% | 95% |

couponcoder is the only arm that cuts every metric, and the only one that stays fully safe while doing it. The cut is biggest where there is a real over-build trap (date picker 404 to 23 lines, color picker 287 to 23, because it reaches for a native `<input>` instead of a component) and near zero on code that is already minimal. Full method, per-task tables, and limitations: [benchmarks/results/2026-06-18-agentic.md](benchmarks/results/2026-06-18-agentic.md).

<details>
<summary><strong>Older single-shot numbers (isolated generation)</strong></summary>

Five everyday tasks, three models, three arms (no skill, [caveman](https://github.com/JuliusBrussee/caveman), couponcoder), ten runs, median reported. One prompt, one completion, counting lines of the answer:

<p align="center">
  <img src="assets/benchmark-3model.svg" width="860" alt="Median lines of code per arm across Haiku, Sonnet and Opus">
</p>

This showed **80-94% less code**. [#126](https://github.com/NickSicilianoSalazar/couponcoder/issues/126) fairly pointed out that the bare-model baseline pads its answer with prose and options, so that gap is partly a conversational-baseline artifact. The agentic numbers above are the corrected, defensible version. Reproduce the single-shot run with `npx promptfoo eval -c benchmarks/promptfooconfig.yaml`.

</details>

**The rule was never "fewest tokens."** It is: write only what the task needs, and never cut validation, error handling, security, or accessibility. The code ends up small because it is necessary, not golfed. Lower cost and latency are a side effect on the models that follow the ladder; a terse reasoning model that spends thinking tokens deliberating the rungs can go the other way (on GPT-5.5 it does).

## How it works

Before writing code, the agent stops at the first rung that holds:

```
1. Does this need to exist?   → no: skip it (YAGNI)
2. Already in this codebase?  → reuse it, don't rewrite
3. Stdlib does it?            → use it
4. Native platform feature?   → use it
5. Installed dependency?      → use it
6. One line?                  → one line
7. Only then: the minimum that works
```

The ladder runs *after* it understands the problem, not instead of it: it reads the code the change touches and traces the real flow before picking a rung. Lazy about the solution, never about reading.

Lazy, not negligent: trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

## Install

The most effort couponcoder will ever ask of you:

The Claude Code and Codex plugins run two tiny Node.js lifecycle hooks, so `node` needs to be on your PATH (note for Nix/nvm users: it must be on the non-interactive shell's PATH). If it isn't, the skills still work, the always-on activation just stays quiet instead of erroring on every prompt.

### Claude Code

```
/plugin marketplace add NickSicilianoSalazar/couponcoder
```
```
/plugin install couponcoder@couponcoder
```
(You have to send two separate prompts for the install to work) 

Same steps in the Claude Code Desktop app's Code tab: type the two `/plugin` commands above into the prompt box, or click the **+** button next to it, choose **Plugins** → **Add plugin** to browse your configured marketplaces, and manage marketplaces from **Customize** in the sidebar.

### Codex

```bash
codex plugin marketplace add NickSicilianoSalazar/couponcoder
codex plugin add couponcoder@couponcoder
```

Run `codex` and open `/hooks`, review and trust its two lifecycle hooks, and start a new thread.

This same install also covers the Codex desktop app: restart the app after installing and it picks up the plugin.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add NickSicilianoSalazar/couponcoder
copilot plugin install couponcoder@couponcoder
```

In an interactive Copilot CLI session, use the slash equivalents:

```
/plugin marketplace add NickSicilianoSalazar/couponcoder
/plugin install couponcoder@couponcoder
```

Copilot CLI namespaces plugin commands by plugin name. For example:

```text
/couponcoder:couponcoder ultra
/couponcoder:couponcoder-review
```

### Pi agent harness

```
pi install git:github.com/NickSicilianoSalazar/couponcoder
```

### OpenCode

Add to `opencode.json`:

```json
{ "plugin": ["@nicksicilianosalazar/couponcoder"] }
```

Run from a checkout instead (the plugin reuses `hooks/` and `skills/`):

```json
{ "plugin": ["./.opencode/plugins/couponcoder.mjs"] }
```

Injects the ruleset every turn at the active level; adds the `/couponcoder` commands (see [Commands](#commands)). OpenCode also auto-loads this repo's `AGENTS.md`, so the rules hold even without the plugin. The plugin adds the `lite/full/ultra/off` levels.

The `./` path resolves against your project's `opencode.json`; to share one checkout across projects, point it at the absolute path of the `.mjs` instead (it finds its `hooks/` and `skills/` relative to its own file).

### Gemini CLI

```bash
gemini extensions install https://github.com/NickSicilianoSalazar/couponcoder
```

Loads the ruleset as always-on context every session and registers the `/couponcoder` commands; the `skills/` ship too, activated when a task needs them.
The Gemini adapter intentionally does not ship a root `hooks/hooks.json`: Gemini auto-loads that path, while Couponcoder's lifecycle hooks use Claude/Codex event names.

### Qoder

Qoder auto-loads `AGENTS.md` from the repo root as always-on context, so running couponcoder from a checkout works with zero setup. For per-project rules, copy [`.qoder/rules/couponcoder.md`](.qoder/rules/couponcoder.md) into your project's `.qoder/rules/`. The six couponcoder skills (`/couponcoder`, `/couponcoder-review`, `/couponcoder-audit`, `/couponcoder-debt`, `/couponcoder-gain`, `/couponcoder-help`) are available via Qoder's Skill system; the plugin manifest at [`.qoder-plugin/plugin.json`](.qoder-plugin/plugin.json) points at the `skills/` directory.

For full plugin-tier support (automatic mode activation + ruleset injection on every prompt), add the hooks from [`hooks/qoder-hooks.json`](hooks/qoder-hooks.json) to your `.qoder/settings.json`. Replace `COUPONCODER_DIR` with the path to your couponcoder checkout. Qoder's `UserPromptSubmit` hook activates the default mode on first prompt and injects the ruleset every turn; `PreToolUse` with `task|Task` matcher injects the ruleset into subagents. Level switches (`/couponcoder lite|full|ultra|off`) work automatically.

### Antigravity CLI

Google is renaming Gemini CLI to Antigravity CLI (the `agy` binary); the same extension installs there:

```bash
agy plugin install https://github.com/NickSicilianoSalazar/couponcoder
```

It reuses this repo's `gemini-extension.json`. One difference: Antigravity converts the `/couponcoder` commands into skills, so you type them into the chat (e.g. `/couponcoder-review` as a message) instead of picking them from a slash menu. Until the migration completes (around June 18, 2026), `gemini extensions install` still works too. To run it as an always-on rule instead, drop the ruleset into `.agents/rules/`.

### Hermes Agent

```bash
hermes plugins install NickSicilianoSalazar/couponcoder --enable
```

Restart Hermes after installing. The plugin injects the active Couponcoder mode before each LLM turn, registers the bundled skills as `couponcoder:<skill>`, and adds `/couponcoder`, `/couponcoder-review`, `/couponcoder-audit`, `/couponcoder-debt`, `/couponcoder-gain`, and `/couponcoder-help`. In shared gateways, restrict `/couponcoder` to trusted users with Hermes slash-command access controls; runtime mode is process-local.

### CodeWhale

Reads `AGENTS.md` from the project root, zero setup. Copy [`AGENTS.md`](AGENTS.md) to your project, or run `codewhale` from a checkout of this repo. That's it.

### Swival

Stage the collection in your library first, then add the skills you want:

```bash
swival skills add --global https://github.com/NickSicilianoSalazar/couponcoder  # stage into ~/.config/swival/library
swival skills add couponcoder                                             # install the collection into this project
swival skills add --global couponcoder                                    # or activate it in every project
```

Swival also reads `AGENTS.md` from the project root and `~/.config/swival/AGENTS.md` globally, the instruction-only fallback.

On the command line, use a `$` prefix to explicitly activate a skill. For example: `$couponcoder-review`.

### Devin CLI

```bash
devin plugins install NickSicilianoSalazar/couponcoder
```

Installs couponcoder as a Devin plugin; skills are available as `/couponcoder:couponcoder`, `/couponcoder:couponcoder-review`, and so on.

### OpenClaw

```bash
clawhub install couponcoder
```

Installs couponcoder as an OpenClaw skill from ClawHub; the review, audit, debt, gain, and help skills install the same way (`clawhub install couponcoder-review`, and so on). OpenClaw applies it on coding tasks and also exposes it as a `/couponcoder` command. Without ClawHub, copy [`.openclaw/skills/couponcoder`](.openclaw/skills/) into `~/.openclaw/skills/`.

That was it. He'd be proud. He won't say it.

Active every session, with a handful of commands (see [Commands](#commands)). `/couponcoder ultra` exists for when the codebase has wronged you personally. Startup and mode-change text shows the current mode.

Set the level for every new session with the `COUPONCODER_DEFAULT_MODE` env var (`lite`/`full`/`ultra`/`off`), or a `defaultMode` field in `~/.config/couponcoder/config.json` (`%APPDATA%\couponcoder\config.json` on Windows). The default is `full`.

While active, the ruleset is also injected into every subagent spawned via the Agent tool. To scope that to specific agent types (say, keep it off read-only search agents), set the `COUPONCODER_SUBAGENT_MATCHER` env var to a regex tested against the subagent's `agent_type`. It is unanchored and case-insensitive: `explore|general` matches either, `^general$` is exact, and plugin agent types look like `plugin:name`. Unset means inject into every subagent (the default); an invalid regex, or a subagent whose type the platform doesn't report, also falls back to injecting.

Cursor, Windsurf, Cline, GitHub Copilot Chat (the VS Code, JetBrains, and Visual Studio editor extension, not the standalone Copilot CLI covered under [Install](#install)), Aider, Kiro, Zed, CodeWhale, Swival, Qoder: copy the matching rules file from this repo ([`.cursor/rules/`](.cursor/rules/), [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), [`.kiro/steering/`](.kiro/steering/), [`.qoder/rules/`](.qoder/rules/)).

Kiro: copy `.kiro/steering/couponcoder.md` to `~/.kiro/steering/` (global) or `.kiro/steering/` in your project.

GitHub Copilot CLI fallback (instruction-only mode): it reads `AGENTS.md` and `.github/copilot-instructions.md` in a project, or copy the rules into `~/.copilot/copilot-instructions.md` to run couponcoder in every project. This path keeps always-on guidance, but does not add plugin mode switches or hooks.

VS Code with the Codex extension reads `AGENTS.md`, which this repo ships, so it works from the repo root with no setup (`~/.codex/AGENTS.md` makes Codex global).

JetBrains Junie can read `AGENTS.md` once you point it there in Settings → Tools → Junie → Project Settings → Guidelines Path (it is not automatic yet). This repo ships `AGENTS.md`; `.junie/guidelines.md` is Junie's legacy path.

Amp (Sourcegraph) reads `AGENTS.md` from the working directory and parent directories up to `$HOME`, which this repo ships, so it works with no setup (`~/.config/amp/AGENTS.md` works globally).

Jules (Google) reads `AGENTS.md` from the repository root, which this repo ships, so it picks up the ruleset with no setup.

Which files map to which agent: [Agent portability](docs/agent-portability.md).

### Uninstall

| Host | Command |
|------|---------|
| Claude Code | `/plugin remove couponcoder` |
| Codex | `codex plugin remove couponcoder` |
| Devin CLI | `devin plugins remove couponcoder` |
| Pi agent | `pi uninstall couponcoder` |
| Cursor / Windsurf / Cline / Qoder / etc. | Delete the copied rule file |

These remove the plugin's own files. They leave behind a small amount of state couponcoder writes outside the plugin folder: the mode flag, `~/.config/couponcoder/config.json`, and (if you accepted the setup nudge) a `statusLine` entry in `~/.claude/settings.json`. Run `node scripts/uninstall.js` to clean those up too. **Run it before the host remove command above** — the script is itself a plugin file, so removing the plugin first deletes it (or run it from a separate clone of this repo). It only removes the statusLine entry if it points at couponcoder's own script, so a statusline you set up yourself is left untouched.

## Commands

| Command | What it does |
|---------|--------------|
| `/couponcoder [lite \| full \| ultra \| off]` | Set the intensity, or turn it off. No argument reports the current level. |
| `/couponcoder-review` | Review the current diff for over-engineering, hands back a delete-list. |
| `/couponcoder-audit` | Audit the whole repo for over-engineering, not just the diff. |
| `/couponcoder-debt` | Harvest the `couponcoder:` shortcuts you've deferred into a ledger, so "later" doesn't become "never". |
| `/couponcoder-gain` | Show the measured impact scoreboard (less code, less cost, more speed) from the benchmark. |
| `/couponcoder-help` | Quick reference for the commands above. |

Commands need a skill-capable host (Claude Code, Codex, Devin CLI, OpenCode, Gemini, pi, Swival, Hermes Agent, Qoder). In Codex they're skills, invoke with `@` (`@couponcoder-review`). The instruction-only adapters (Cursor, Windsurf, Cline, Copilot, Kiro, Antigravity) load the always-on ruleset without the commands.

## Development

When changing the compact rule text, keep the agent copies aligned:

```bash
node scripts/check-rule-copies.js
npm test
```

The OpenClaw skill package (`.openclaw/skills/`) is generated from `skills/`; rerun `node scripts/build-openclaw-skills.js` after changing a skill, the test suite fails if it is stale. To publish the skills to ClawHub, run `clawhub login` once, then `node scripts/publish-openclaw-skills.js` (it publishes all six at the `package.json` version; pass `--dry-run` to preview).

The correctness benchmark spawns Python for email and CSV checks; `python3` is tried before `python`. CSV checks need `pandas` installed locally.

## License

[MIT](LICENSE). The shortest license that works.
