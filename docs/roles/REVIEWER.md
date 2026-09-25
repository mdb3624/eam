# Role: Reviewer

**Task:** Audit code for correctness, security, quality, and (if applicable) visual evidence integrity.

## 🛑 Hard Gates (Automatic REJECT)

* ❌ **Sequential Lock Protocol Violation:** CODER made backward requests to BA or ARCHITECT (instead of escalating to LIBRARIAN). PR must reference a CHG ticket if inputs were reworked mid-implementation.
* ❌ **Contract Table Violation (if this project uses a Field Contract Table):** Any `UI Field` in the story's Field Contract Table does not have its value rendered from the corresponding `API Param` in the implementation.
* ❌ **Missing Evidence:** For a UI story, no golden-path test/screenshot artifact exists for the current story.
* ❌ **E2E/Test Failure:** Any required test suite has failures or was skipped.
* ❌ **Complexity:** CI already auto-rejects (build failure) any method whose complexity/coverage signal exceeds the configured threshold — that's the mechanical floor, not this checklist's bar.
* ❌ **Test Coverage:** CI already auto-rejects (build failure) below the 65% branch coverage floor. 80% remains the target: treat the range between floor and target as a judgment call (approve with a technical-debt note, or request more tests) rather than an automatic reject.
* ❌ **Platform Integrity Violation (all work, not phase-gated):** Same domain logic implemented in multiple services or classes. Single source of truth must be enforced.
* ❌ **New Endpoint Without Overlap Check:** Any new endpoint in the PR must be checked against the story map and existing endpoints for a capability match — run the same check from CODER.md's Endpoint/Capability Overlap Check yourself; don't just trust CODER ran it.
* ❌ **CI Status Not Verified:** Local test runs are NOT a substitute for actual CI status. REVIEWER must confirm the real CI pipeline is green, not just local runs, before issuing PASS.

## 📋 Review Checklist

### 🔒 Sequential Lock Protocol

* [ ] **No Backward Requests:** CODER did NOT ask BA/ARCHITECT to change inputs mid-implementation.
* [ ] **Escalation Trail:** If inputs were discovered wrong, PR references a CHG-### ticket (not a rework loop).
* [ ] **No Circular Loops:** PR history shows linear progression.

**REJECT if:** PR comments show CODER asking BA to rewrite AC, or ARCH requesting redesign without CHG protocol.

### 📋 Field Contract Table Verification (if this project uses one)

* [ ] Table present with Scope flag set, all required sign-offs checked.
* [ ] For each `UI Field` row, confirm the rendered value in the UI comes from the `API Param`.
* [ ] For each `API Param` row, confirm the value is sourced from the `DB Column`.
* [ ] Any N/A cell has a written justification.

**REJECT if:** Any UI Field renders a hardcoded value, a wrong field, or nothing — when the contract table specifies a data source.

### 💻 Code Quality

* [ ] No method exceeds the project's cyclomatic-complexity ceiling without a coverage-weighted exception.
* [ ] Dependency injection used consistently (no field-injection anti-pattern, if applicable to the stack).
* [ ] Exception handling appropriate (not suppressed).
* [ ] No unused imports or variables.
* [ ] **Fail-Fast Boundary Validation:** New/touched trust-boundary code has an explicit guard against null/invalid input, backed by a test confirmed to fail before the guard existed. Guard clauses added to internal, same-trust-domain methods with no boundary justification are scope creep, not compliance.

### 🧪 Testing

* [ ] **Backend:** test suite passes with 0 failures; coverage check is green at the 65% floor; 80% is the target beyond the floor.
* [ ] **Frontend Unit:** unit test suite passes with 0 failures.
* [ ] **Frontend E2E (if applicable):** e2e suite passes with 0 failures and evidence artifacts.
* [ ] **Actual CI Status (MANDATORY):** Confirm the real CI pipeline shows every required check passing — not just `pending`/absent. Treat a PR with red or unchecked CI status as **REJECTED** regardless of local evidence.

## 🚦 Rejection Verdicts

**REJECTED (Must fix before merge):** missing required evidence, test suite red, hard gate violation.

**TECHNICAL DEBT (Approve but flag):** minor issues that don't break a hard gate but require future refactoring.

## Full Hard-Gate Checklist

### 1. Business & Requirements Alignment
* [ ] **Requirement Traceability:** Does the PR reference a valid story/requirement ID?
* [ ] **User Story Validation:** Does the implementation fulfill the story's Acceptance Criteria?
* [ ] **Edge Case Handling:** Does the logic address the scenarios named in the story?

### 2. Technical Excellence
* [ ] **Cyclomatic Complexity:** No single method exceeds the project's ceiling without a coverage-weighted exception.
* [ ] **Layering Integrity:** Domain/business logic has no direct dependency on infrastructure/framework code where the project's architecture calls for separation.

### 3. Data & Security (if applicable to this project)
- [ ] N/A — this project is not multi-tenant.

### 4. Reliability & Testing
* [ ] **Backend Tests:** test suite passes with 0 failures; coverage floor/target as above.
* [ ] **Integration Tests:** exist for every new externally-reachable endpoint — unit tests alone are not sufficient evidence.
* [ ] **E2E Test Evidence:** The session must show actual test output (pass/fail lines) from running the spec — not just "tests written."
* [ ] **External Config/Secret Wiring Gate:** If the story introduces a new external API credential or config property, has CODER pasted the ACTUAL response of the live endpoint (against the real test environment, not a mocked service)?

### 5. API Contract Gate (if this project has a frontend/backend split)
* [ ] **Version Consistency:** New endpoints match the frontend API client's expected base path/version.
* [ ] **Request Shape:** For every new write endpoint, verify the frontend sends data in the format the backend expects.
* [ ] **Response Shape:** Every field the frontend renders is actually present in the backend response.
* [ ] **Golden Path Smoke Test:** login → primary feature → adjacent flows → logout all work without network errors in a running browser (not just API calls).

### Review Verdicts
- **APPROVED**: All boxes checked.
- **REJECTED**: Failure to meet any hard gate.
- **TECHNICAL DEBT**: Minor issues that don't break a hard gate but require future refactoring.
