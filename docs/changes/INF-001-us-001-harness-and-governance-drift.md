# INF-001: Record US-001 scope drift and repair the scope guard

**Type:** Infrastructure / governance (retroactive record plus a tooling fix)
**Raised by:** REVIEWER, during the US-001 audit (2026-10-27)
**Status:** DONE (this ticket and its fix ship together)
**Related:** US-001 (DONE, PR #7), `docs/project/Sprint_Log.md` 2026-10-27

## Problem

REVIEWER found 20 files changed on the US-001 branch that were not in the story's Files in Scope. They are not login or RBAC work. They were harness and governance changes made while building US-001, after the story's scope list was written.

A second problem explains why nobody was warned: the scope-guard hook never flagged anything on US-001.

## Root cause of the silent guard

`docs/roles/ARCHITECT.md` tells ARCHITECT to write Files in Scope as "one path or glob per line". `.claude/hooks/story-scope-guard.sh` only read lines starting with `- `. US-001's list is bare lines, so the hook saw an empty scope and passed every edit through. That is why `gate_log.csv` has no `CODER_SCOPE` rows.

The 14 screenshots and `visual-report.json` under `docs/project/evidence/US-001/` were also reported as outside scope. They are a required output of the Visual Evidence Gate, not drift. The hook now always allows `docs/project/evidence/<story>/*`.

## The 20 files that were genuinely outside US-001 scope

**Visual evidence harness (9)**
- `scripts/visual-check/capture.mjs`
- `scripts/visual-check/check-visual-evidence.mjs`
- `scripts/visual-check/check-visual-evidence.test.mjs`
- `scripts/visual-check/guard.mjs`
- `scripts/visual-check/guard.test.mjs`
- `scripts/visual-check/lib.mjs`
- `scripts/visual-check/lib.test.mjs`
- `.claude/hooks/visual-evidence-guard.sh`
- `.claude/settings.json`

**Governance docs and rules (9)**
- `CLAUDE.md`
- `.claude/rules/postgres-native.md`
- `.claude/rules/testing_standards.md`
- `docs/roles/CODER.md`
- `docs/roles/HUMAN_FACTORS_DESIGNER.md`
- `docs/roles/LIBRARIAN.md`
- `docs/roles/REVIEWER.md`
- `docs/standards/Definition_of_Done.md`
- `docs/standards/Gate_Log.md`

**Test outside the scoped list (1)**
- `backend/src/test/java/com/eam/db/DataSourceIsolationIT.java` (story scoped only `MigrationIT.java` under `com/eam/db/`)

**Another story's document (1)**
- `docs/project/stories/US-002-canonical-asset-record-search.md`

## Decision

File this INF ticket. Do not amend US-001's Files in Scope.

- US-001 is DONE and merged. Amending its scope would rewrite the record of what that story covered.
- The changes are not login or RBAC work. They are cross-cutting harness and governance, which an INF ticket is for.
- All 20 files were already verified: CI run 40553689502 and PR #7's checks passed, and REVIEWER rated them minor drift, not a change request.

## Fix shipped with this ticket

- `.claude/hooks/story-scope-guard.sh` now reads bare lines, `- ` bullets and backticked paths, skips blank lines, code fences, comments and prose, and always allows the story's own evidence directory.
- `scripts/scope-guard/test.sh` covers both list styles, the evidence directory, placeholder lists and non-story branches. 14 cases pass. Run against the previous hook, 4 fail, including every bare-list case.

## Files in Scope

.claude/hooks/story-scope-guard.sh
scripts/scope-guard/test.sh
docs/changes/INF-001-us-001-harness-and-governance-drift.md
docs/project/stories/US-001-user-login-rbac.md
docs/project/Sprint_Log.md

## Follow-ups

- Existing story docs written with bare lists were never enforced. US-002 has no Files in Scope yet, so ARCHITECT's list will be enforced from the start.
- Scope guard runs in `warn` mode by default. Switching to `block` is a separate decision.
