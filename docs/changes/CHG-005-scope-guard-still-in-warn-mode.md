## CHG-005: Scope guard runs in warn mode

**Original Story:** INF-001 (follow-up), originating from US-001 scope drift
**Discovered By:** REVIEWER on 2026-10-27
**Root Cause:** `.claude/hooks/story-scope-guard.sh` defaults to `warn`. After INF-001 it reads Files in Scope correctly, but an out-of-scope edit is still allowed and only logged. US-001 drifted by 20 files before the hook was repaired.
**Technical Blocker:** None. Switching to `block` is a workflow decision: it stops legitimate cross-cutting edits until ARCHITECT amends scope.

**Options:**
1. Option A: keep `warn` for one more story (US-002) to confirm there are no false positives, then switch the default to `block`. Tracked as a backlog item.
2. Option B: switch to `block` now.

**Recommendation:** Option A. US-002 is the first story to ship with the repaired hook and a bare-line scope list, so it is the right test.

**Next Steps:**
1. LIBRARIAN decides.
2. After US-002, REVIEWER reports `CODER_SCOPE` rows from its gate log.
3. If none are false positives, flip the default in the hook and `settings.json`.

**Status:** CHG-005 OPEN (awaiting decision)
**Assign to:** LIBRARIAN
