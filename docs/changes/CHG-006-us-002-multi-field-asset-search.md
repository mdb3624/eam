## CHG-006: Asset search by address, feeder, substation or coordinates

**Original Story:** US-002 (READY_FOR_DESIGN, ACs approved 2026-10-20)
**Discovered By:** ARCHITECT on 2026-11-03
**Root Cause:** The approved ACs cover search by Asset ID only. BRD section 8.2 (`docs/requirements/Utility_Asset_Field_Operations_Platform_Business_Requirements_v1.md`) also lists search by address, pole, feeder, substation or coordinates. No story covers it.
**Technical Blocker:** None. The design returns an array from `GET /api/v1/assets`, so more search fields can be added without breaking the contract. Adding them to US-002 would change its ACs, which Phase Lock forbids once ARCHITECT accepts the story.

**Options:**
1. Option A: finish US-002 as approved, and add the extra search as a new story. Tracked as a backlog item.
2. Option B: pause US-002, have the BA rewrite its ACs, and re-run design as US-002-v2.

**Recommendation:** Option A. The ACs stay stable, and the extra search can be sized separately once the location column (PostGIS point) exists.

**Next Steps:**
1. LIBRARIAN decides.
2. If A, BA drafts the search story and the owner approves its ACs at Gate 1.

**Status:** CHG-006 OPEN (awaiting decision)
**Assign to:** LIBRARIAN
