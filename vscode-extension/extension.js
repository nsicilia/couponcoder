// Couponcoder — VS Code chat participant.
//
// Targets VS Code 1.90, the first release with a stable chat participant and
// language model API. Everything older has no AI extension point at all; those
// versions use the instruction-file path (.github/copilot-instructions.md).
// So: no request.model (1.95+), no bundler, plain CommonJS.

const vscode = require('vscode');

// vsce packages from the extension root, so `hooks/` and `skills/` are copied
// into bundled/ at prepublish. Fall back to the repo copies so F5 debugging and
// tests work straight from a checkout, without running the build first.
const fs = require('fs');
const hooks = fs.existsSync(`${__dirname}/bundled/hooks`) ? './bundled/hooks' : '../hooks';
const { getCouponcoderInstructions } = require(`${hooks}/couponcoder-instructions`);
const { DEFAULT_MODE, normalizeMode } = require(`${hooks}/couponcoder-config`);

const MODE_KEY = 'couponcoder.mode';

// Prior turns of this same participant, so multi-turn conversations keep context.
function historyMessages(history) {
  const messages = [];
  for (const turn of history) {
    if (turn instanceof vscode.ChatRequestTurn) {
      messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const text = turn.response
        .map((part) => (part.value && part.value.value) || '')
        .join('');
      if (text) messages.push(vscode.LanguageModelChatMessage.Assistant(text));
    }
  }
  return messages;
}

function makeHandler(state) {
  return async function handler(request, context, stream, token) {
    const switched = normalizeMode(request.command);
    if (switched) await state.update(MODE_KEY, switched);

    const mode = normalizeMode(state.get(MODE_KEY)) || DEFAULT_MODE;
    if (mode === 'off') {
      stream.markdown('Couponcoder is off. `/full` turns it back on.');
      return;
    }

    const prompt = request.prompt.trim();
    if (!prompt) {
      stream.markdown(`COUPONCODER MODE ACTIVE — level: **${mode}**`);
      return;
    }

    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!model) {
      stream.markdown('No language model available. GitHub Copilot Chat must be installed and signed in.');
      return;
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(getCouponcoderInstructions(mode)),
      ...historyMessages(context.history),
      vscode.LanguageModelChatMessage.User(prompt),
    ];

    try {
      const response = await model.sendRequest(messages, {}, token);
      for await (const chunk of response.text) stream.markdown(chunk);
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`Language model error: ${err.message}`);
        return;
      }
      throw err;
    }
  };
}

function activate(context) {
  const participant = vscode.chat.createChatParticipant(
    'couponcoder.chat',
    makeHandler(context.workspaceState),
  );
  context.subscriptions.push(participant);
}

module.exports = { activate, deactivate() {}, makeHandler, historyMessages };
