---
name: couponcoder-debt
description: "Harvest every couponcoder: shortcut comment into one debt ledger, so deferrals get tracked instead of forgotten. One-shot report."
homepage: https://github.com/NickSicilianoSalazar/couponcoder
license: MIT
---

Every deliberate couponcoder shortcut is marked with a `couponcoder:` comment naming
its ceiling and upgrade path. This collects them into one ledger so a deferral
can't quietly become permanent.

## Scan

Grep the repo for comment markers, skipping `node_modules`, `.git`, and build
output:

`grep -rnE '(#|//) ?couponcoder:' .`  (add other comment prefixes if your stack uses them)

Each hit is one ledger row. The comment prefix keeps prose that merely mentions
the convention out of the ledger.

## Output

One row per marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <the limit named>. upgrade: <the trigger to revisit>.`

The convention is `couponcoder: <ceiling>, <upgrade path>`, so pull the ceiling
and the trigger straight from the comment. Want an owner per row too? add
`git blame -L<line>,<line>`.

Flag the rot risk: any `couponcoder:` comment that names no upgrade path or
trigger gets a `no-trigger` tag, those are the ones that silently rot.

End with `<N> markers, <M> with no trigger.` Nothing found: `No couponcoder: debt. Clean ledger.`

## Boundaries

Reads and reports only, changes nothing. To persist it, ask and it writes the
ledger to a file (e.g. `COUPONCODER-DEBT.md`). One-shot. "stop couponcoder-debt" or
"normal mode" to revert.
