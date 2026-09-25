# US-022: Integration Failure Visibility (No False-Normal State)

**Epic:** EPIC-07 Closure & Traceability
**Actor:** Sam Whitfield, System Administrator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **system administrator**, I want to **clearly see when the pilot integration adapter is down or degraded**, so that **operators never mistake "no new alarms" for "everything is fine" when it's actually the feed that's broken**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Healthy adapter shows a healthy status
  Given the integration adapter is receiving events normally
  When the administrator views the integration adapter status
  Then it shows "healthy" with the last successful receipt time

Scenario: Adapter outage is visibly flagged
  Given the adapter has not received an event within the configured expected interval
  When the administrator (or any user viewing adapter-dependent screens) checks status
  Then it shows a degraded/down state, not "healthy" or blank

Scenario: Degraded state does not imply asset normalcy
  Given the adapter is down
  When an operator views an asset that would normally show live telemetry
  Then the asset view indicates the data may be stale due to the integration issue, rather than implying the asset itself is fine
```

## Edge Cases
- Adapter flaps rapidly (repeated brief connect/disconnect) — status should reflect actual current state without spamming duplicate down/up notifications.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — directly implements MVP Definition of Done: "integration failure... never silently implies a normal/healthy asset state" (`MVP_Scope_Definition.docx` §9) and BRD Table 4 failure-mode requirements.
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Integration adapter status indicator | *(ARCH to fill)* | | | |
| Stale-data warning on asset/alarm views | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
