# US-005: Normalize Event into Canonical Model (Idempotent)

**Epic:** EPIC-02 Integration & Events
**Actor:** Maria Alvarez, Control-Center Operator (consumer of the normalized event downstream)
**Status:** DRAFT — awaiting story owner approval
**Scope:** BACKEND_ONLY

## User Story
As a **control-center operator**, I want **incoming raw events normalized into one canonical event shape**, so that **alarm and incident rules work consistently regardless of the source system's original format**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Raw event is normalized into the canonical event model
  Given a raw event has been received and retained (US-004)
  When normalization runs
  Then a NormalizedEvent record is created with asset reference, event type, severity input fields and event time

Scenario: Idempotent processing prevents duplicate incidents
  Given a raw event with source message ID "MSG-1001" has already been normalized
  When the same source message is retried and reprocessed
  Then no second NormalizedEvent is created
  And no duplicate alarm/incident results

Scenario: Unparseable raw event does not silently disappear
  Given a raw event fails normalization validation
  When normalization runs
  Then the event is flagged as invalid/failed rather than discarded
```

## Edge Cases
- Out-of-order event delivery (a later timestamped event arrives before an earlier one) — normalization must use EventTime, not receipt order, for downstream sequencing.

## INVEST Self-Check
- [x] Independent (depends only on US-004 being in place, not blocking its own testability)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** BACKEND_ONLY — no direct UI; surfaced indirectly through the Alarm console (US-009).

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| N/A — backend-only story | N/A | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
