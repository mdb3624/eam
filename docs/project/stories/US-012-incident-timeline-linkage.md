# US-012: Incident Timeline and Linkage

**Epic:** EPIC-04 Alarm & Incident
**Actor:** Maria Alvarez, Control-Center Operator
**Status:** DRAFT — awaiting story owner approval
**Scope:** UI_ONLY

## User Story
As a **control-center operator**, I want to **see an incident's linked alarm and a chronological timeline**, so that **I can understand how the situation developed without piecing it together from separate screens**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Incident view shows the linked alarm
  Given an incident was created from an alarm (US-011)
  When the operator opens the incident
  Then the source alarm is shown with a link back to it

Scenario: Timeline reflects state changes in order
  Given an incident has moved through multiple status changes
  When the operator views the incident timeline
  Then each change appears in chronological order with actor and timestamp
```

## Edge Cases
- Incident with a manually-created origin (no linked alarm, US-011) — timeline still renders correctly without a broken "linked alarm" reference.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** UI_ONLY — reads existing incident/alarm data; no new backend entities.

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Linked alarm reference | *(ARCH to fill)* | | | |
| Timeline entries | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
