# US-011: Create Incident from Critical Alarm (with Manual Fallback)

**Epic:** EPIC-04 Alarm & Incident
**Actor:** Maria Alvarez, Control-Center Operator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want an **incident automatically created from a critical alarm, with the ability to create one manually**, so that **every emergency situation gets tracked as a manageable record even if automation doesn't catch it**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Critical alarm auto-creates an incident
  Given a critical alarm is created (US-009)
  When incident-creation rules evaluate the alarm
  Then an incident is created and linked to the alarm and its asset

Scenario: Operator manually creates an incident
  Given the operator observes a situation the system did not auto-escalate
  When the operator manually creates an incident and links it to an asset
  Then the incident is saved with the operator as creator

Scenario: Incident carries required fields
  Given an incident has been created
  Then it has severity, cause category, impact, location and status
```

## Edge Cases
- Duplicate incident creation from two related alarms for the same underlying event — out of MVP's automated duplicate-detection scope (BRD §17 AI duplicate detection is deferred); operator can manually link/merge is out of scope too — flag as technical debt for post-MVP.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — implements BRD §18 rule chain (critical alarm → incident) and the MVP reference workflow step 5.
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Incident severity | *(ARCH to fill)* | | | |
| Cause category | *(ARCH to fill)* | | | |
| Impact | *(ARCH to fill)* | | | |
| Location (inherited from asset) | *(ARCH to fill)* | | | |
| Status | *(ARCH to fill)* | | | |
| Manual-create form | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- Incident-creation rule specifics are an open decision per `MVP_Scope_Definition.docx` §11 ("one configured priority rule to flag an incident as emergency"). This story is written rule-agnostic pending that decision.
