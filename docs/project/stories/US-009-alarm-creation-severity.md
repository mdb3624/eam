# US-009: Alarm Creation and Severity Classification

**Epic:** EPIC-04 Alarm & Incident
**Actor:** Maria Alvarez, Control-Center Operator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want a **normalized event to automatically generate an alarm with a rule-based severity**, so that **I can prioritize my attention without manually triaging every raw event**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Critical event generates a critical alarm
  Given a normalized event matches the configured critical-fault rule
  And the event's asset identity is verified (US-006)
  When alarm classification runs
  Then a critical alarm is created and linked to the asset

Scenario: Non-critical event generates a lower-severity alarm
  Given a normalized event does not meet critical-fault criteria
  When alarm classification runs
  Then an alarm is created at the appropriate lower severity

Scenario: Operator sees the alarm on the console immediately
  Given a new alarm has been created
  When the operator views the Alarm console
  Then the alarm appears with its severity and linked asset
```

## Edge Cases
- Event whose asset identity is unresolved (reconciliation task pending, US-006) — alarm creation is held or flagged, not silently linked to the wrong asset.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — directly implements BRD §18 business rule: "IF critical internal-fault event is received AND asset identity is verified → create critical alarm and incident."
- [x] Estimable
- [x] Small — one configured severity rule per MVP boundary (`MVP_Scope_Definition.docx` §3.3).
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Alarm console row (severity, asset, time) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- Initial event types and severity rule are an open decision per `Business_Requirements_v1.docx` §29 — this story assumes at least one critical-fault rule is configured before build; exact rule content is an ARCH/BA follow-up once the pilot source system is confirmed.
