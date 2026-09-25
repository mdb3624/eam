# US-020: Supervisor Closes Work Order and Updates Asset History

**Epic:** EPIC-07 Closure & Traceability
**Actor:** Priya Raman, Maintenance Supervisor
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **maintenance supervisor**, I want to **review a completed work order's evidence and close it**, so that **I confirm the work was done properly before it becomes part of the permanent asset record**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supervisor reviews completion evidence before closure
  Given work order "WO-100" is marked complete by the technician
  When Priya opens it for review
  Then she can see the inspection responses, photos and safety note

Scenario: Closing the work order updates asset history
  Given Priya approves and closes "WO-100"
  Then the linked incident is also closed per configured workflow
  And the asset's history reflects the completed event and work

Scenario: Closure is blocked without required evidence
  Given "WO-100" is missing a required inspection field
  When Priya attempts to close it
  Then closure is blocked until the evidence gap is resolved
```

## Edge Cases
- Work order with no linked incident (rare manual case) — closure still updates asset history correctly without requiring an incident reference.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — directly implements MVP Definition of Done: "closure updates asset history" (`MVP_Scope_Definition.docx` §9).
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Closure review screen (evidence summary) | *(ARCH to fill)* | | | |
| Close action | *(ARCH to fill)* | | | |
| Asset history entry (post-closure) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
