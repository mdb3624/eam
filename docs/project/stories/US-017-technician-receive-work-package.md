# US-017: Technician Receives Assigned Work Package on Mobile

**Epic:** EPIC-06 Field Mobile
**Actor:** Jess Okafor, Field Technician
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **field technician**, I want to **see my assigned work order with the asset and location information on my mobile device**, so that **I can head straight to the job without radioing dispatch for details**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Assigned work appears on the technician's mobile work list
  Given work order "WO-100" is assigned to Jess's crew (US-015)
  When Jess opens the mobile work list
  Then "WO-100" appears with priority and asset summary

Scenario: Work order detail includes navigation-ready location
  Given Jess opens "WO-100" on mobile
  Then the asset's location is shown and can be used for navigation

Scenario: Work list is scoped to the technician's own assignments
  Given Jess is only assigned to "WO-100"
  When Jess views the mobile work list
  Then other technicians' work orders are not shown
```

## Edge Cases
- Work order reassigned away from Jess after her app already cached it — the app must reflect the reassignment on next sync, not leave a stale duplicate entry.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Mobile work list (assigned work orders) | *(ARCH to fill)* | | | |
| Work order detail (asset, location, priority) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- Target mobile platform(s) is an open decision per `MVP_Scope_Definition.docx` §11 — not yet resolved.
