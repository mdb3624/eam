# US-002: Canonical Asset Record and Search

**Epic:** EPIC-01 Platform Foundation
**Actor:** Maria Alvarez, Control-Center Operator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want to **search for a transformer asset and view its canonical record**, so that **I can confirm which physical asset an event or alarm refers to before I act on it**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Search by Asset ID returns the correct asset
  Given a transformer asset "TX-4587" exists in the platform
  When the operator searches "TX-4587"
  Then the Asset 360 view opens for that asset
  And the header shows Asset ID, status, criticality and location

Scenario: Asset hierarchy is visible
  Given the asset "TX-4587" is on feeder "F-12" under substation "SUB-3"
  When the operator opens the Asset 360 view
  Then the utility → substation → feeder → asset hierarchy is displayed

Scenario: Searching a non-existent Asset ID
  When the operator searches an Asset ID that does not exist
  Then the platform shows "no matching asset" rather than a blank/error screen
```

## Edge Cases
- Duplicate candidate assets from bulk import — out of scope for this story; see US-006 (identity mapping/reconciliation).
- Asset with missing/never-verified location — see US-008.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — foundational to every downstream workflow screen (alarm, incident, work order all link back to this record).
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Asset ID | *(ARCH to fill)* | | | |
| Status | *(ARCH to fill)* | | | |
| Criticality | *(ARCH to fill)* | | | |
| Manufacturer/model/serial | *(ARCH to fill)* | | | |
| Hierarchy path (utility→substation→feeder→asset) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
