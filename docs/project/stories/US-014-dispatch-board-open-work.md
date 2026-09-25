# US-014: Dispatch Board — View Open Work and Crew Status

**Epic:** EPIC-05 Work Order & Dispatch
**Actor:** Dwayne Chen, Dispatcher
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **dispatcher**, I want to **see all open work orders and crew status on one board**, so that **I can decide who to assign without checking multiple systems or calling around**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Open work orders are listed
  Given work orders exist in status "draft" or "assigned"
  When the dispatcher opens the Dispatch board
  Then all open work orders are listed with priority and asset

Scenario: Crew status is visible
  Given crews have a recorded availability status
  When the dispatcher opens the Dispatch board
  Then each crew's availability and qualification is shown

Scenario: Board reflects real-time status changes
  Given a work order status changes (e.g., accepted by a crew)
  When the dispatcher refreshes or the board updates
  Then the new status is reflected without a page reload requirement being the only way to see it
```

## Edge Cases
- No crews currently available — board should clearly show "no available crew" rather than an empty/ambiguous list.

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
| Work order list (priority, asset, status) | *(ARCH to fill)* | | | |
| Crew status list (availability, qualification) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
