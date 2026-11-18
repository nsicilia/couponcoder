#!/usr/bin/env node
// Every couponcoder command the pi extension registers must also ship as a
// file-based command for the hosts that need one: Claude Code (commands/*.toml,
// which Gemini CLI reuses) and OpenCode (.opencode/command/*.md). /couponcoder-help
// was advertised in the README and the help card but missing both files; this
// guards that drift -- a registered command with no adapter file fails here.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

// pi-extension registers the canonical command set.
const piSource = fs.readFileSync(path.join(root, 'pi-extension', 'index.js'), 'utf8');
const commands = [...piSource.matchAll(/registerCommand\(["']([\w-]+)["']/g)].map((m) => m[1]);

test('pi registers at least the base command', () => {
  assert.ok(commands.includes('couponcoder'), 'expected pi to register a couponcoder command');
});

test('every registered command ships a Claude commands/*.toml', () => {
  for (const name of commands) {
    assert.ok(
      fs.existsSync(path.join(root, 'commands', `${name}.toml`)),
      `missing commands/${name}.toml`,
    );
  }
});

test('every registered command ships an OpenCode .opencode/command/*.md', () => {
  for (const name of commands) {
    assert.ok(
      fs.existsSync(path.join(root, '.opencode', 'command', `${name}.md`)),
      `missing .opencode/command/${name}.md`,
    );
  }
});

test('debt scans include block comments and skip dependency and build directories', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'couponcoder-debt-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.writeFileSync(path.join(cwd, 'source.txt'), [
    '# couponcoder: hash comment',
    '//couponcoder: line comment',
    '/*\tcouponcoder: block comment */',
    'prose about couponcoder: markers',
  ].join('\n'));
  for (const dir of ['.git', 'node_modules', 'dist', 'build']) {
    fs.mkdirSync(path.join(cwd, dir));
    fs.writeFileSync(path.join(cwd, dir, 'ignored.txt'), '# couponcoder: ignored');
  }

  for (const file of ['skills/couponcoder-debt/SKILL.md', 'commands/couponcoder-debt.toml', '.opencode/command/couponcoder-debt.md']) {
    const command = fs.readFileSync(path.join(root, file), 'utf8').match(/grep ([-\w. =]+) '([^']+)' \./);
    assert.ok(command, `${file} must include the debt scan command`);
    const result = spawnSync('grep', [...command[1].split(' '), command[2], '.'], { cwd, encoding: 'utf8' });
    if (result.error?.code === 'ENOENT') return t.skip('grep is unavailable');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split(/\r?\n/).map(line => line.split(':')[1]), ['1', '2', '3'], file);
  }
});
