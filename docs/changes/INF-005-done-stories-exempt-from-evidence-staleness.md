# INF-005: A DONE story's visual evidence no longer goes stale

**Type:** Infrastructure / defect in the INF-002 Visual Evidence Gate
**Raised by:** CODER during US-002 (2026-11-06), design approved by the project owner
**Status:** APPLIED and REVIEWER PASS on branch `chore/INF-005-done-stories-exempt-from-staleness`. Awaiting merge. Review mutation checks: removing the exemption fails 3 tests, exempting any non-empty status fails 2. One gap filed as CHG-008 (a Bash edit that flips a story to DONE skips the hook and now also the CI stale check).
**Related:** INF-002, US-001, US-002

## Problem

`check-visual-evidence.mjs` marks a story's evidence stale when any file under `frontend/src` changed after the capture. CI runs it with `--all`, so US-001 (DONE, evidence from 2026-10-21) failed the gate the moment US-002 added an Assets nav item. Every later UI story would do the same, forcing a re-capture and re-review of every older story.

## Options considered

1. Re-capture US-001 inside US-002. Rejected: repeats for every future UI story.
2. Scope staleness to each story's Files in Scope. Rejected during design: US-001's scope is `frontend/src/**`, so it would still go stale.
3. **Chosen:** a story with status DONE is not held to staleness. Its evidence records the UI as shipped.

## Fix

`evaluateEvidence` takes the story's Story_Map `status`. When it is `DONE`, the stale-evidence check is skipped. Everything else still applies to a DONE story: the report and every screenshot must exist and match their hashes, desktop and phone widths, both themes, no overflow, expected text found, coverage of every AC and `state:`, and a REVIEWER `VISUAL PASS` newer than the evidence. `checkAll` passes the Story_Map status; `checkStory` reads it from the Story_Map when not given one. Stories still in flight stay stale-checked.

## Verification

- Red first: 3 new tests failed (`DONE` story stale after a later change, `checkAll` and `checkStory` on a DONE story).
- `node --test scripts/visual-check/*.test.mjs`: 67 of 67 pass (5 added).
- In-flight statuses (`CODE_REVIEW`, `REVIEW_PASSED`, `LIBRARIAN_VERIFICATION`, none) still report stale. A DONE story still fails a missing phone shot, a hash mismatch and a missing report.
- `check-visual-evidence.mjs --all` green; `scripts/scope-guard/test.sh` 14 of 14.

## Files in Scope

docs/changes/INF-005-done-stories-exempt-from-evidence-staleness.md
docs/changes/CHG-008-done-flip-via-bash-skips-stale-check.md
scripts/visual-check/lib.mjs
scripts/visual-check/lib.test.mjs
scripts/visual-check/check-visual-evidence.mjs
scripts/visual-check/check-visual-evidence.test.mjs
docs/standards/Definition_of_Done.md
docs/project/Sprint_Log.md
docs/project/gate_log.csv
