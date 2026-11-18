#!/usr/bin/env node
// couponcoder — Claude Code SessionStart activation hook
//
// Runs on every session start:
//   1. Writes flag file at $CLAUDE_CONFIG_DIR/.couponcoder-active (defaults to ~/.claude; statusline reads this)
//   2. Emits couponcoder ruleset as hidden SessionStart context
//   3. Detects missing statusline config and emits setup nudge

const fs = require('fs');
const path = require('path');
const { getDefaultMode, getClaudeDir, isShellSafe } = require('./couponcoder-config');
const { getCouponcoderInstructions } = require('./couponcoder-instructions');
const {
  clearMode,
  isCodex,
  isCopilot,
  readMode,
  setMode,
  writeHookOutput,
} = require('./couponcoder-runtime');

const claudeDir = getClaudeDir();
const settingsPath = path.join(claudeDir, 'settings.json');

function activate(mode, compacting) {
  if (!compacting) {
    try {
      if (mode === 'off') clearMode();
      else setMode(mode);
    } catch (e) {
      // The mode flag is best-effort. Keep running if the disk write fails.
    }
  }

  if (mode === 'off') {
    const hookOutput = (isCodex || isCopilot) ? '' : 'OK';
    writeHookOutput('SessionStart', 'off', hookOutput);
    return;
  }

  // Emit the couponcoder ruleset, filtered to the active intensity level.
  let output = getCouponcoderInstructions(mode);

  // Detect missing statusline config — nudge Claude to help set it up
  if (!isCodex && !isCopilot) try {
    let hasStatusline = false;
    if (fs.existsSync(settingsPath)) {
      // Strip UTF-8 BOM some editors prepend on Windows (breaks JSON.parse)
      const raw = fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '');
      const settings = JSON.parse(raw);
      if (settings.statusLine) {
        hasStatusline = true;
      }
    }

    // Nudge at most once — the flag file marks that the user has already seen
    // (and implicitly declined) the statusline setup offer. Repeating it every
    // session start turns a helpful hint into a nag.
    const nudgeFlagPath = path.join(claudeDir, '.couponcoder-statusline-nudged');
    if (!hasStatusline && !fs.existsSync(nudgeFlagPath)) {
      try { fs.writeFileSync(nudgeFlagPath, ''); } catch (e) { /* best-effort */ }
      const isWindows = process.platform === 'win32';
      const scriptName = isWindows ? 'couponcoder-statusline.ps1' : 'couponcoder-statusline.sh';
      const scriptPath = path.join(__dirname, scriptName);
      if (isShellSafe(scriptPath)) {
        const command = isWindows
          ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
          : `bash "${scriptPath}"`;
        const statusLineSnippet =
          '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
        output += "\n\n" +
          "STATUSLINE SETUP NEEDED: The couponcoder plugin includes a statusline badge showing active mode " +
          "(e.g. [COUPONCODER], [COUPONCODER:ULTRA]). It is not configured yet. " +
          "To enable, add this to " + settingsPath + ": " +
          statusLineSnippet + " " +
          "Proactively offer to set this up for the user on first interaction.";
      } else {
        // couponcoder: install path has shell metacharacters — don't embed it in a
        // command snippet; have the agent wire it up by hand instead.
        output += "\n\n" +
          "STATUSLINE SETUP NEEDED: The couponcoder plugin includes a statusline badge showing active mode. " +
          "Its install path contains characters unsafe to embed in a shell command, so configure it manually: " +
          "add a statusLine command of type \"command\" that runs " + scriptName +
          " from the plugin's hooks directory to " + settingsPath + ", quoting/escaping the path for your shell. " +
          "Proactively offer to set this up for the user on first interaction.";
      }
    }
  } catch (e) {
    // Silent fail — don't block session start over statusline detection
  }

  try {
    writeHookOutput('SessionStart', mode, output);
  } catch (e) {
    // Silent fail — stdout closed/EPIPE at hook exit must not surface as a hook failure
  }
}

let input = '';
let finished = false;

function finish() {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);

  let compacting = false;
  try {
    compacting = JSON.parse(input.replace(/^\uFEFF/, '')).source === 'compact';
  } catch (e) {
    // Hosts that send no usable payload start at the configured default.
  }
  activate(compacting ? readMode() || 'off' : getDefaultMode(), compacting);
}

// A host may leave the stdin pipe open. Release it so Node can flush stdout and exit.
const timeout = setTimeout(() => {
  process.stdin.destroy();
  finish();
}, 1000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.once('end', finish);
process.stdin.once('error', finish);
