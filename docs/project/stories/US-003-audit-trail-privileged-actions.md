# US-003: Audit Trail for Record and Privileged Actions

**Epic:** EPIC-01 Platform Foundation
**Actor:** Sam Whitfield, System Administrator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **system administrator**, I want **create/update actions and privileged actions logged with user, timestamp, and action type**, so that **I can answer "who did what, when" for any record without manual log digging**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Asset create/update is audited
  Given a user with permission edits asset "TX-4587"
  When the change is saved
  Then an audit record is created with user, timestamp, and the fields changed

Scenario: Administrator searches the audit trail
  Given audit records exist for asset "TX-4587"
  When the administrator searches the audit trail by Asset ID
  Then all related audit entries are returned in chronological order

Scenario: Audit trail cannot be edited or deleted by any role
  Given an audit record exists
  When any user attempts to modify or delete it through the application
  Then the action is rejected
```

## Edge Cases
- System-triggered actions (e.g., rule-generated alarm) must also be audited, attributed to "system" with the triggering rule identified — not just user actions.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — required for MVP Definition of Done ("all important actions are auditable," BRD §25) and for Priya/Sam's traceability goals.
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Audit search (by Asset ID / user / date range) | *(ARCH to fill)* | | | |
| Audit list row (user, timestamp, action, object) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
