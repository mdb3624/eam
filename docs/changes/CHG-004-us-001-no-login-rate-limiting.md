## CHG-004: No login rate limiting or lockout

**Original Story:** US-001 (DONE, PR #7)
**Discovered By:** ARCHITECT on 2026-10-20, recorded in `ARCHITECTURE.md` (Auth, known gaps)
**Root Cause:** `POST /api/v1/auth/login` is the only public route and has no attempt limit. Equal 401 bodies and a timing-equalised dummy hash stop account probing, but not password guessing.
**Technical Blocker:** None for US-001. Security gap, Tier A.

**Options:**
1. Option A: per-email and per-IP attempt limit with a short lockout window, returning a distinct `429` or the same `401` body. Tracked as a backlog item.
2. Option B: new story covering lockout policy, unlock by an administrator, and audit rows (overlaps US-003).

**Recommendation:** Option B. The lockout policy (thresholds, unlock, notification) is a business decision, and it should be audited, which US-003 covers. Draft it through the BA role.

**Next Steps:**
1. LIBRARIAN decides, with the Project Owner informed (Tier A).
2. BA drafts the story if B; the owner approves ACs at Gate 1.

**Status:** CHG-004 OPEN (awaiting decision)
**Assign to:** LIBRARIAN
