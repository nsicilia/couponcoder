import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MODE,
  RUNTIME_MODES,
  getDefaultMode,
  getQuietStartup,
  getHideStatus,
  normalizeMode,
  normalizePersistedMode,
  isDeactivationCommand,
  writeDefaultMode,
} = require("../hooks/couponcoder-config.js");
const { getCouponcoderInstructions, filterSkillBodyForMode } = require("../hooks/couponcoder-instructions.js");

export { filterSkillBodyForMode };
export const readDefaultMode = getDefaultMode;
export const readQuietStartup = getQuietStartup;

const RUNTIME_MODE_LIST = RUNTIME_MODES.join("|");
const COUPONCODER_COMMAND_DESCRIPTION = `Set mode: ${RUNTIME_MODE_LIST}. Commands: status, default <mode>`;

export function resolveSessionMode(entries, fallbackMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(fallbackMode) || DEFAULT_MODE;
  if (!Array.isArray(entries)) return fallback;

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type !== "custom" || entry?.customType !== "couponcoder-mode") continue;

    const mode = normalizePersistedMode(entry?.data?.mode);
    if (mode) return mode;
  }

  return fallback;
}

export function parseCouponcoderCommand(text, defaultMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(defaultMode) || DEFAULT_MODE;
  const normalizedText = String(text || "").trim().toLowerCase();

  if (!normalizedText) {
    return { type: "set-mode", mode: fallback === "off" ? "full" : fallback };
  }

  const [primary, secondary] = normalizedText.split(/\s+/);

  if (primary === "status") return { type: "status" };

  if (primary === "default") {
    // couponcoder: a default must be a runtime level; review is session-only (#377).
    const mode = normalizeMode(secondary);
    return mode ? { type: "set-default", mode } : { type: "invalid", reason: "invalid-default-mode" };
  }

  const mode = normalizeMode(primary);
  return mode ? { type: "set-mode", mode } : { type: "invalid", reason: "invalid-mode", mode: primary };
}

export { writeDefaultMode };

export default function couponcoderExtension(pi) {
  let currentMode = DEFAULT_MODE;
  let configuredDefaultMode = getDefaultMode();
  let hideStatus = getHideStatus();
  let isActive = false;
  let lastCtx = null;

  // -- Status bar --
  function syncStatus(ctx) {
    if (ctx) lastCtx = ctx;
    const c = ctx || lastCtx;
    // couponcoder: hide the indicator but keep the ruleset active (#324).
    if (hideStatus) return;
    if (!c?.ui?.setStatus) return;
    // couponcoder: try/catch guards against pi-web theme proxy throwing before initTheme
    let theme;
    try { theme = c.ui.theme; if (!theme?.fg) return; } catch { return; }
    if (currentMode === "off") {
      c.ui.setStatus("couponcoder", "");
      return;
    }
    const levelIcons = { lite: "🌿", full: "⚡", ultra: "🔥" };
    const icon = levelIcons[currentMode] || "";
    const label = currentMode.toUpperCase();
    const indicator = isActive ? theme.fg("accent", "●") : theme.fg("dim", "○");
    c.ui.setStatus("couponcoder", indicator + " 🐴 " + theme.fg("muted", "couponcoder: ") + theme.fg("text", icon + " " + label));
  }

  const setMode = (mode, ctx) => {
    const normalized = normalizePersistedMode(mode);
    if (!normalized) return;

    currentMode = normalized;
    pi.appendEntry("couponcoder-mode", { mode: normalized });
    syncStatus(ctx);
    ctx?.ui?.notify?.(`Couponcoder mode set to ${normalized}.`, "info");
  };

  const sendAlias = (skillName, args, ctx) => {
    const normalized = String(args || "").trim();
    const message = normalized ? `${skillName} ${normalized}` : skillName;

    if (ctx?.isIdle?.() === false) {
      pi.sendUserMessage(message, { deliverAs: "followUp" });
      ctx?.ui?.notify?.(`${skillName} queued as follow-up.`, "info");
      return;
    }

    pi.sendUserMessage(message);
  };

  pi.registerCommand("couponcoder", {
    description: COUPONCODER_COMMAND_DESCRIPTION,
    handler: async (args, ctx) => {
      const parsed = parseCouponcoderCommand(args, configuredDefaultMode);

      if (parsed.type === "status") {
        ctx?.ui?.notify?.(`Couponcoder: current ${currentMode} • default ${configuredDefaultMode}`, "info");
        return;
      }

      if (parsed.type === "set-default") {
        try {
          const written = writeDefaultMode(parsed.mode);
          if (written) {
            configuredDefaultMode = getDefaultMode();
            const message = configuredDefaultMode === written
              ? `Default Couponcoder mode set to ${written}.`
              : `Saved default ${written}, but env override keeps default at ${configuredDefaultMode}.`;
            ctx?.ui?.notify?.(message, "info");
          }
        } catch (e) {
          ctx?.ui?.notify?.(`Failed to save default mode: ${e.message}`, "error");
        }
        return;
      }

      if (parsed.type === "set-mode") {
        setMode(parsed.mode, ctx);
        return;
      }

      ctx?.ui?.notify?.("Unknown or unsupported /couponcoder mode.", "warning");
    },
  });

  pi.registerCommand("couponcoder-review", {
    description: "Run /skill:couponcoder-review",
    handler: (_args, ctx) => sendAlias("/skill:couponcoder-review", "", ctx),
  });

  pi.registerCommand("couponcoder-audit", {
    description: "Run /skill:couponcoder-audit",
    handler: (_args, ctx) => sendAlias("/skill:couponcoder-audit", "", ctx),
  });

  pi.registerCommand("couponcoder-gain", {
    description: "Run /skill:couponcoder-gain",
    handler: (_args, ctx) => sendAlias("/skill:couponcoder-gain", "", ctx),
  });

  pi.registerCommand("couponcoder-debt", {
    description: "Run /skill:couponcoder-debt",
    handler: (_args, ctx) => sendAlias("/skill:couponcoder-debt", "", ctx),
  });

  pi.registerCommand("couponcoder-help", {
    description: "Run /skill:couponcoder-help",
    handler: (_args, ctx) => sendAlias("/skill:couponcoder-help", "", ctx),
  });

  pi.on("input", async (event) => {
    if (event?.source === "extension") return;

    const text = String(event?.text || "");
    if (currentMode !== "off" && isDeactivationCommand(text)) {
      setMode("off");
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    configuredDefaultMode = getDefaultMode();
    hideStatus = getHideStatus();
    currentMode = resolveSessionMode(entries, configuredDefaultMode);
    syncStatus(ctx);
    if (!getQuietStartup()) {
      ctx?.ui?.notify?.(`Couponcoder loaded: ${currentMode}`, "info");
    }
  });

  pi.on("agent_start", async (_event, ctx) => {
    isActive = true;
    syncStatus(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    isActive = false;
    syncStatus(ctx);
  });

  pi.on("before_agent_start", async (event) => {
    if (!currentMode || currentMode === "off") return;
    // Guard a null/undefined event or a missing systemPrompt: don't crash, and
    // don't prepend the literal string "undefined" to the prompt (#439, #440).
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${getCouponcoderInstructions(currentMode)}` };
  });
}
