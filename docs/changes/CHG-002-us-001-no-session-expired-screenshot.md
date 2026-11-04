## CHG-002: No screenshot of the session-expired state

**Original Story:** US-001 (DONE, PR #7)
**Discovered By:** REVIEWER on 2026-10-27
**Root Cause:** The 14 evidence screenshots cover login, invalid, disabled and access-denied states in both themes and at 1280 and 390 widths. The session-expired banner is not among them, so the Visual Evidence Gate never looked at it.
**Technical Blocker:** None. The state exists and is covered by unit tests; it has not been viewed.

**Options:**
1. Option A: add a capture scenario to `scripts/visual-check/capture.mjs` for the session-expired return to Login, view it, and add it to `docs/project/evidence/US-001/`. Tracked as a backlog item.
2. Option B: new story for the session UX.

**Recommendation:** Option A.

**Next Steps:**
1. LIBRARIAN decides A or B.
2. CODER captures the screenshots at both widths and both themes.
3. REVIEWER opens them and logs a `VISUAL` row.

**Status:** CHG-002 OPEN (awaiting decision)
**Assign to:** LIBRARIAN
