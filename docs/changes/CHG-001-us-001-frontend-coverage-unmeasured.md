## CHG-001: Frontend coverage is not measured

**Original Story:** US-001 (DONE, PR #7)
**Discovered By:** REVIEWER on 2026-10-27
**Root Cause:** `@vitest/coverage-v8` is not installed, so `npm run test` reports no coverage. `docs/standards/Definition_of_Done.md` and `testing_standards.md` set a frontend unit target of 60% or more, which cannot be checked.
**Technical Blocker:** None for US-001, which is merged. Every later frontend story inherits the same blind spot.

**Options:**
1. Option A: add `@vitest/coverage-v8`, report coverage in CI, then ratchet to a 60% floor once the baseline is known. Tracked as a backlog item.
2. Option B: new story US-001-v2 covering the frontend test setup.

**Recommendation:** Option A. It is tooling only and touches no AC. Run it before US-002's CODER step so the new screens are measured.

**Next Steps:**
1. LIBRARIAN decides A or B and logs the decision in `Sprint_Log.md`.
2. CODER adds the dependency and CI step.
3. REVIEWER confirms the first measured baseline.

**Status:** CHG-001 OPEN (awaiting decision)
**Assign to:** LIBRARIAN
