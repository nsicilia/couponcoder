# Couponcoder for VS Code

Lazy senior dev mode as a chat participant, for VS Code 1.90+ — versions too old
for the Claude Code extension.

Talk to `@couponcoder` in the Chat view. It runs the same ruleset as the rest of
the project (`skills/couponcoder/SKILL.md`), so the answers match what you get in
Claude Code or Codex.

```
@couponcoder add a date picker to the settings form
```

| Command | Effect |
|---------|--------|
| `/lite` | Nudge, not enforcement |
| `/full` | The ladder enforced (default) |
| `/ultra` | For when the codebase has wronged you personally |
| `/off` | Stop responding in this workspace |

The level persists per workspace. Send `@couponcoder` with no prompt to see the
current one.

## Install

Not published to the Marketplace — this fork is internal-only. Build and sideload:

```bash
npm run package
code --install-extension couponcoder-4.8.4.vsix
```

Requires GitHub Copilot Chat, installed and signed in — the participant borrows a
model from it rather than shipping its own.
