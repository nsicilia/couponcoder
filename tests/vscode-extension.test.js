const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const Module = require('module');

// The `vscode` module only exists inside VS Code's extension host. Stub the
// handful of members the participant touches so the handler is runnable here.
class ChatRequestTurn { constructor(prompt) { this.prompt = prompt; } }
class ChatResponseTurn { constructor(text) { this.response = [{ value: { value: text } }]; } }
class LanguageModelError extends Error {}

const sent = [];
const vscodeStub = {
  ChatRequestTurn,
  ChatResponseTurn,
  LanguageModelError,
  LanguageModelChatMessage: {
    User: (content) => ({ role: 'user', content }),
    Assistant: (content) => ({ role: 'assistant', content }),
  },
  lm: {
    models: [{
      sendRequest: async (messages) => {
        sent.push(messages);
        return { text: (async function* () { yield 'ok'; })() };
      },
    }],
    selectChatModels: async () => vscodeStub.lm.models,
  },
};

const load = Module._load;
Module._load = (request, ...rest) =>
  (request === 'vscode' ? vscodeStub : load(request, ...rest));
const { makeHandler } = require(path.join(__dirname, '..', 'vscode-extension', 'extension.js'));
Module._load = load;

function fakeState(initial) {
  let mode = initial;
  return { get: () => mode, update: async (_k, v) => { mode = v; } };
}

function collect() {
  const out = [];
  return { out, stream: { markdown: (t) => out.push(t) } };
}

const noHistory = { history: [] };

test('slash command switches level and persists it', async () => {
  const state = fakeState(undefined);
  const handler = makeHandler(state);
  const { out, stream } = collect();

  await handler({ command: 'ultra', prompt: '' }, noHistory, stream, {});
  assert.match(out[0], /level: \*\*ultra\*\*/);

  sent.length = 0;
  await handler({ command: undefined, prompt: 'add a date picker' }, noHistory, stream, {});
  assert.match(sent[0][0].content, /level: ultra/);
  assert.equal(sent[0].at(-1).content, 'add a date picker');
});

test('off suppresses the model call', async () => {
  const handler = makeHandler(fakeState('off'));
  const { out, stream } = collect();
  sent.length = 0;

  await handler({ command: undefined, prompt: 'write me a factory' }, noHistory, stream, {});
  assert.equal(sent.length, 0);
  assert.match(out[0], /off/);
});

test('history is replayed into the request', async () => {
  const handler = makeHandler(fakeState('full'));
  const history = { history: [new ChatRequestTurn('earlier'), new ChatResponseTurn('reply')] };
  sent.length = 0;

  await handler({ command: undefined, prompt: 'now this' }, history, collect().stream, {});
  assert.deepEqual(
    sent[0].map((m) => m.content),
    [sent[0][0].content, 'earlier', 'reply', 'now this'],
  );
});

test('missing language model is reported, not thrown', async () => {
  const handler = makeHandler(fakeState('full'));
  const { out, stream } = collect();
  const models = vscodeStub.lm.models;
  vscodeStub.lm.models = [];

  await handler({ command: undefined, prompt: 'hi' }, noHistory, stream, {});
  vscodeStub.lm.models = models;
  assert.match(out[0], /Copilot Chat/);
});
