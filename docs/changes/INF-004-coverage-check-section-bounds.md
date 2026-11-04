# INF-004: Coverage check missed states under `###` subsections

**Type:** Infrastructure / defect in INF-002 tooling
**Raised by:** HFD, during US-002 (2026-11-04), approved by the project owner
**Status:** APPLIED on branch `chore/INF-004-coverage-section-bounds`. Awaiting REVIEWER and merge.
**Related:** INF-002, US-002

## Problem

`coverageProblems` in `scripts/visual-check/lib.mjs` read the "Architect Design" section up to the next heading of level 2 or 3. A story whose `## Architect Design` holds `###` subsections (US-002 does: Schema, API contract, Frontend) therefore ended the section at the first subsection. The `state:<name>` bullets under `### Frontend` were never read, so the check reported nothing even when a state had no shot. INF-002's tests used flat designs, so none caught it.

## Fix

A section now runs to the next heading of the same or a higher level, so `###` subsections belong to their `##` parent. A `###`-level "Architect Design" still ends at the next `###`.

## Verification

- Red first: the new test `coverageProblems reads states under ### subsections of ## Architect Design` failed with `actual: []`.
- `node --test scripts/visual-check/*.test.mjs`: 41 of 41 pass.
- `check-visual-evidence.mjs --all` green; `scripts/scope-guard/test.sh` 14 of 14.
- Control on the real US-002 story and `visual-checks.json` (from the US-002 branch): no problems. With the session-expired shots removed, it names `state:session-expired`.

## Files in Scope

docs/changes/INF-004-coverage-check-section-bounds.md
scripts/visual-check/lib.mjs
scripts/visual-check/lib.test.mjs
docs/project/Sprint_Log.md
docs/project/gate_log.csv
