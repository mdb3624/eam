# US-010: Acknowledge, Shelve and Close an Alarm

**Epic:** EPIC-04 Alarm & Incident
**Actor:** Maria Alvarez, Control-Center Operator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want to **acknowledge, shelve, or close an alarm**, so that **the console reflects what I've already handled and my team doesn't duplicate work on the same alarm**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Operator acknowledges an alarm
  Given an unacknowledged alarm is on the console
  When the operator acknowledges it
  Then the alarm shows "acknowledged" with the operator's name and timestamp

Scenario: Only permitted roles can close an alarm
  Given a user without alarm-close permission views an alarm
  When they attempt to close it
  Then the action is denied

Scenario: Alarm timeline records every action
  Given an alarm has been acknowledged and later closed
  When the operator views the alarm timeline
  Then both actions appear in order with actor and timestamp
```

## Edge Cases
- Attempting to close an alarm still linked to an open incident — should warn or block per configured rule rather than silently orphaning the incident link.

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
| Acknowledge / shelve / close actions | *(ARCH to fill)* | | | |
| Alarm timeline entries | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
