#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

test('root npm test covers bundled subprojects', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.match(packageJson.scripts.test, /npm test --prefix pi-extension/);
  assert.match(packageJson.scripts.test, /npm test --prefix couponcoder-mcp/);
});

test('CI installs MCP dependencies before root npm test', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'test.yml'), 'utf8');

  // npm ci, not npm install: install re-resolves the ^ ranges on every run, so a
  // compromised patch release lands with no diff and no review.
  assert.match(workflow, /npm ci --prefix couponcoder-mcp/);
  assert.ok(
    workflow.indexOf('npm ci --prefix couponcoder-mcp') < workflow.indexOf('npm test'),
    'MCP dependencies must be installed before the root test command runs',
  );
});

test('MCP lockfile is committed and matches package.json', () => {
  const dir = path.join(root, 'couponcoder-mcp');
  const lockPath = path.join(dir, 'package-lock.json');

  // npm ci hard-fails without a lockfile, so a missing one breaks CI rather than
  // silently reverting to floating installs — but fail here with a clear reason.
  assert.ok(fs.existsSync(lockPath), 'couponcoder-mcp/package-lock.json must be committed for npm ci');

  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

  for (const name of Object.keys(pkg.dependencies || {})) {
    assert.ok(lock.packages[`node_modules/${name}`], `${name} missing from lockfile — run npm install --package-lock-only`);
  }
});

test('CI actions are pinned to commit SHAs, not mutable tags', () => {
  for (const wf of ['test.yml', 'publish.yml']) {
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', wf), 'utf8');
    const uses = workflow.match(/uses:\s*\S+/g) || [];
    assert.ok(uses.length > 0, `${wf}: expected at least one action`);

    for (const u of uses) {
      assert.match(
        u,
        /@[0-9a-f]{40}$/,
        `${wf}: ${u} is pinned to a mutable tag — pin to a 40-char commit SHA`,
      );
    }
  }
});
