# INF-006: CI stale-checks a story that becomes DONE in the PR

**Type:** Infrastructure / gap in the INF-002 Visual Evidence Gate
**Raised by:** CHG-008 (REVIEWER, INF-005 review), Option B recommended by LIBRARIAN and taken as approved when the project owner said "go" to the proposed fix on 2026-11-09
**Status:** APPLIED on branch `chore/INF-006-chg008-done-flip-stale-check`. Awaiting REVIEWER (separate session) and merge.
**Related:** INF-005, CHG-008, INF-002

## Problem

INF-005 exempts a DONE story from the evidence staleness check. A Bash edit (`sed -i`) that flips a story to DONE bypasses the PreToolUse guard, and CI `--all` used to be the backstop. With the exemption, a story flipped to DONE with stale evidence passes CI.

## Fix

- `check-visual-evidence.mjs --all --base <ref>`: reads Story_Map at `<ref>` (`git show`) and finds stories that are DONE now and were not DONE there (`newlyDoneStories`). Those are checked as if still in flight, so a stale capture fails. Stories already DONE at the base keep the INF-005 exemption.
- A base ref that cannot be read counts as an empty map, so every DONE story is stale-checked. That fails closed.
- `ci.yml`: on pull requests the gate runs with `--base <PR base sha>`. On push to main it runs plain `--all`, since the PR already passed.
- The sign-off flow is unchanged: LIBRARIAN captures after the last `frontend/src` commit, then flips to DONE.

## Verification

- `node --test scripts/visual-check/*.test.mjs`: 70 of 70 pass (3 added: `newlyDoneStories` diffing, and `checkAll` stale-checking a newly DONE story but not an already DONE one, and `mapAtRef` against a temp git repo).
- `--all --base HEAD~3` and `--all --base HEAD` both green on the current tree.

## Files in Scope

docs/changes/INF-006-ci-stale-checks-stories-flipped-to-done.md
docs/changes/CHG-008-done-flip-via-bash-skips-stale-check.md
scripts/visual-check/check-visual-evidence.mjs
scripts/visual-check/check-visual-evidence.test.mjs
.github/workflows/ci.yml
docs/project/Sprint_Log.md
docs/project/gate_log.csv
