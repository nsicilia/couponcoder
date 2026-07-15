// Email under couponcoder on Claude (couponcoder's primary target), baseline vs couponcoder.
const fs = require('fs'), path = require('path');
const { checkPy, pyBlock, TASKS } = require('./robustness-audit.js');
const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'couponcoder', 'SKILL.md'), 'utf8');
const email = TASKS.find(t => t.name === 'email');
const N = Number(process.env.CE_N) || 40;
const MODELS = (process.env.CE_MODELS || 'claude-haiku-4-5-20251001,claude-sonnet-4-6,claude-opus-4-8').split(',');

// The environment wins and .env is only a fallback: a managed runner injects the
// key from the secrets manager, and requiring a plaintext .env on disk would mean
// a long-lived credential sitting on every laptop that runs the benchmark.
function readEnvFile() {
  try {
    return Object.fromEntries(fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
      .split(/\r?\n/).filter(l => l.includes('=') && !l.trim().startsWith('#'))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  } catch (e) {
    return {}; // no .env — expected when the key comes from the environment
  }
}

const kv = readEnvFile();
const KEY = process.env.ANTHROPIC_API_KEY || kv.ANTHROPIC_API_KEY;
// Point at an approved gateway (Bedrock/Vertex proxy, internal egress) without
// editing code. Same var name the Anthropic SDKs use.
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || kv.ANTHROPIC_BASE_URL || 'https://api.anthropic.com')
  .replace(/\/+$/, '');

if (!KEY) {
  console.error('No ANTHROPIC_API_KEY in the environment or .env. Export it from your secrets manager, or see benchmarks/README.md.');
  process.exit(1);
}

async function call(model, system, user) {
  const body = { model, max_tokens: 1024, messages: [{ role: 'user', content: user }] };
  if (system) body.system = system;
  const r = await fetch(`${BASE_URL}/v1/messages`, { method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) return { err: r.status };
  const j = await r.json();
  return { text: (j.content || []).map(b => b.text || '').join('') };
}

(async () => {
  console.log(`email, n=${N}\n`);
  console.log('model                      baseline   couponcoder');
  for (const model of MODELS) {
    const rates = {};
    for (const [arm, sys] of [['baseline', null], ['couponcoder', skill]]) {
      let pass = 0, err = 0;
      for (let i = 0; i < N; i++) {
        const r = await call(model, sys, email.prompt);
        if (r.err) { err++; continue; }
        if (checkPy(pyBlock(r.text), email)) pass++;
      }
      rates[arm] = `${pass}/${N - err}`;
    }
    console.log(`${model.padEnd(26)} ${rates.baseline.padEnd(10)} ${rates.couponcoder}`);
  }
})();
