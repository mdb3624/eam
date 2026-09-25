# US-021: Lineage View — Source Event to Closure

**Epic:** EPIC-07 Closure & Traceability
**Actor:** Priya Raman, Maintenance Supervisor; Sam Whitfield, System Administrator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **maintenance supervisor**, I want to **see a single lineage view on the incident/work order showing every step from the original source event to closure**, so that **I can prove — to myself or an auditor — exactly what happened and who acted, without piecing it together from five screens**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Lineage view shows the full chain
  Given work order "WO-100" has been closed (US-020)
  When a user opens its lineage view
  Then it shows: source system, source message ID, raw event receipt, canonical asset resolution, alarm, incident, work order creation, crew assignment, field completion, and closure — each with timestamp and actor

Scenario: Lineage view has no gaps for a complete workflow
  Given the full reference workflow executed without manual intervention
  When the lineage view is inspected
  Then every step is present with no missing links

Scenario: Lineage view surfaces a reconciliation step if one occurred
  Given a reconciliation task was resolved during identity mapping (US-006)
  When the lineage view is inspected
  Then the reconciliation event and who resolved it are shown in the chain
```

## Edge Cases
- Work order created manually (no source event) — lineage view degrades gracefully, starting from the manual-creation step rather than showing a broken "no source event" error.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — this is explicitly named the MVP's "proof point for the platform's differentiator" (`MVP_Scope_Definition.docx` §3.5) and a named success metric ("percentage of work orders closed with complete lineage... with no gaps," §10).
- [x] Estimable
- [x] Small — single lineage view only; full BRD §8.5 lineage viewer/dashboard is explicitly deferred.
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Lineage timeline (step, timestamp, actor, source reference) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
