# US-016: Notify on Critical Alarm/Incident Creation

**Epic:** EPIC-05 Work Order & Dispatch
**Actor:** Dwayne Chen, Dispatcher (recipient); triggered by system on critical alarm/incident
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **dispatcher**, I want to **be notified through one configured channel when a critical alarm or incident is created**, so that **I don't have to keep the dispatch board open and staring at it to catch emergencies**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Critical incident triggers a notification
  Given a critical incident is created (US-011)
  When the notification rule evaluates it
  Then a notification is sent to the configured recipient(s) via the configured channel

Scenario: Notification delivery status is recorded
  Given a notification was sent
  When delivery succeeds or fails
  Then the delivery status is recorded and visible to an administrator
```

## Edge Cases
- Notification provider unavailable — delivery failure must be visible (per BRD Table 4: "Queue messages and show delivery failure"), not silently dropped.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable — channel (email or SMS) is an open MVP decision, story describes outcome not the specific provider.
- [x] Valuable
- [x] Estimable
- [x] Small — one channel only per MVP boundary.
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Notification delivery status (admin view) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- Notification channel (email vs. SMS) is an open decision per `MVP_Scope_Definition.docx` §11 — not yet resolved.
