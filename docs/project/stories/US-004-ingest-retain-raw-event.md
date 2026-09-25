# US-004: Ingest and Retain Raw Source Event

**Epic:** EPIC-02 Integration & Events
**Actor:** Sam Whitfield, System Administrator (owns the integration); benefits Maria Alvarez downstream
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **system administrator**, I want the **integration adapter to receive an event from the pilot source system and retain the original payload unmodified**, so that **every downstream decision can be traced back to exactly what the source system sent**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Raw payload is retained immutably
  Given the pilot source system sends an event
  When the Integration Gateway receives it
  Then the original payload is stored unmodified
  And a receipt timestamp and source message ID are recorded

Scenario: Duplicate delivery does not create a duplicate raw event
  Given an event with source message ID "MSG-1001" was already received
  When the same message is delivered again (retry)
  Then no duplicate raw event record is created

Scenario: Administrator can view raw event retention
  Given raw events have been received
  When the administrator opens the integration adapter screen
  Then the count and most recent receipt time are visible
```

## Edge Cases
- Malformed/unparseable payload — must still be retained (for forensic traceability) and flagged as invalid rather than silently dropped.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — this is the platform's core differentiator per BRD §2 ("retains original inbound events... creates a traceable operational history").
- [x] Estimable
- [x] Small — scoped to one adapter, one source system per MVP boundary.
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Integration adapter status (admin screen) | *(ARCH to fill)* | | | |
| Raw event count / last receipt time | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- Which single source system provides the pilot feed is an open decision per `MVP_Scope_Definition.docx` §11 — not yet resolved. This story is written source-agnostic; the adapter's specific protocol is an ARCH/CODER concern once the source system is confirmed.
