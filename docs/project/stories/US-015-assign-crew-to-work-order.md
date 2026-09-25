# US-015: Assign Crew to Work Order (Manual)

**Epic:** EPIC-05 Work Order & Dispatch
**Actor:** Dwayne Chen, Dispatcher
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **dispatcher**, I want to **manually assign a qualified, available crew to a work order**, so that **the right people get sent to the right job without a phone call to confirm**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Qualified crew can be assigned
  Given work order "WO-100" requires skill "transformer-repair"
  And crew "Crew-A" has that skill and is available
  When the dispatcher assigns "Crew-A" to "WO-100"
  Then the work order status changes to "assigned"
  And "Crew-A" availability updates accordingly

Scenario: Unqualified crew cannot be assigned
  Given work order "WO-100" requires skill "transformer-repair"
  And crew "Crew-B" does not have that skill
  When the dispatcher attempts to assign "Crew-B"
  Then the assignment is blocked with a clear reason

Scenario: Reassignment is supported
  Given work order "WO-100" is assigned to "Crew-A"
  When the dispatcher reassigns it to a different qualified, available crew
  Then the work order reflects the new assignment
  And the timeline records the reassignment
```

## Edge Cases
- Crew becomes unavailable between board load and assignment attempt (race condition) — assignment must re-validate availability at save time, not just at page load.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — implements BRD §18 rule: "IF work order requires a skill → only qualified crews may be assigned."
- [x] Estimable
- [x] Small — manual assignment only; GPS-optimized auto-dispatch is explicitly deferred (`MVP_Scope_Definition.docx` §4).
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Crew assignment action | *(ARCH to fill)* | | | |
| Required skill vs. crew skill match indicator | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
