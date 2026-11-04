## CHG-003: A disabled or deleted user keeps a valid token until it expires

**Original Story:** US-001 (DONE, PR #7)
**Discovered By:** ARCHITECT on 2026-10-20, recorded in `ARCHITECTURE.md` (Auth, known gaps)
**Root Cause:** Tokens are stateless JWTs (decision of 2026-10-20: access token only, no refresh tokens). Nothing checks `users.enabled` or `deleted_at` after login, so an administrator disabling an account does not take effect for up to the token TTL (default 1 hour).
**Technical Blocker:** None for US-001. This is a security gap in the delivered behavior and is Tier A (security, hard to reverse after an incident).

**Options:**
1. Option A: check `enabled` and `deleted_at` in `JwtAuthenticationFilter` on each request (one indexed read under RLS). Tracked as a backlog item.
2. Option B: new story introducing refresh tokens with revocation and a short access-token TTL.

**Recommendation:** Option A now. It is small and closes the window. Option B can follow if refresh tokens are wanted for other reasons.

**Next Steps:**
1. LIBRARIAN decides, with the Project Owner informed because this is Tier A.
2. ARCHITECT designs the per-request check and its performance cost.
3. CODER and REVIEWER as usual.

**Status:** CHG-003 OPEN (awaiting decision)
**Assign to:** LIBRARIAN
