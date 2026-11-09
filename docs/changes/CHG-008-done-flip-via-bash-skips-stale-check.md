## CHG-008: Flipping a story to DONE with a Bash edit skips the evidence staleness check in CI

**Original Story:** INF-005 (DONE stories exempt from evidence staleness)
**Discovered By:** REVIEWER on 2026-11-06 (INF-005 review)
**Root Cause:** The PreToolUse guard (`scripts/visual-check/guard.mjs`) stale-checks a story before an Edit or Write moves it to a gated status. A Bash edit such as `sed -i` bypasses that hook, as the guard's header already notes. CI `--all` used to be the backstop and caught stale evidence on such a story. With INF-005, a story that reads DONE in Story_Map is not stale-checked, so the backstop no longer fires for a story flipped to DONE that way.
**Technical Blocker:** None today. The REVIEWER VISUAL PASS requirement (newer than the evidence) and every other check still apply to a DONE story, and a human reviews the PR. The gap is only the stale check on the flip itself.

**Options:**
1. Option A: leave as is. DONE is signed off by LIBRARIAN with `check-visual-evidence.mjs --story <ID> --level 2` pasted into the sign-off, which still stale-checks a story that is not yet DONE in the map at that moment. Rely on that and on PR review.
2. Option B: in CI, compare Story_Map at the base ref and stale-check any story whose status changed to DONE in the PR.

**Recommendation:** Option B, small: it restores the backstop the hook comment promises. Option A is acceptable until a Bash flip is seen in practice.

**Next Steps:**
1. LIBRARIAN decides.
2. If B, file an INF for the CI base-ref comparison and its tests.

**Status:** CHG-008 CLOSED 2026-11-09. Option B, implemented as INF-006 (`docs/changes/INF-006-ci-stale-checks-stories-flipped-to-done.md`).
**Assign to:** LIBRARIAN
