# US-006: Map Source Asset Identifier to Canonical Asset ID

**Epic:** EPIC-02 Integration & Events
**Actor:** Maria Alvarez, Control-Center Operator; reconciliation reviewed by Sam Whitfield, System Administrator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want the **event's source-system asset identifier automatically resolved to the platform's canonical Asset ID**, so that **I see the alarm against the real asset record, not a raw source code**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Known source identifier resolves cleanly
  Given source system "SCADA-PILOT" identifier "RTU-2231" is mapped to canonical Asset ID "TX-4587"
  When a normalized event references "RTU-2231"
  Then the event is linked to canonical asset "TX-4587"

Scenario: Unmapped source identifier creates a reconciliation task
  Given no mapping exists for source identifier "RTU-9999"
  When a normalized event references "RTU-9999"
  Then a reconciliation task is created
  And the event is not silently linked to an incorrect asset

Scenario: Administrator resolves a reconciliation task
  Given a reconciliation task exists for "RTU-9999"
  When an authorized user maps it to canonical Asset ID "TX-5000"
  Then the mapping is saved with an effective date
  And the audit trail records who made the mapping decision
```

## Edge Cases
- Conflicting mapping (two source identifiers claim the same canonical asset) — must be surfaced as a conflict, never silently overwritten (BRD §8.4: "never silently overwrite authoritative information without a configured rule and audit record").

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — this is the MVP's stated identity-mapping success metric ("percentage of events that resolve to the correct canonical asset without a manual reconciliation task," `MVP_Scope_Definition.docx` §10).
- [x] Estimable
- [x] Small — single source system per MVP boundary.
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Reconciliation queue list (source ID, candidate assets) | *(ARCH to fill)* | | | |
| Reconciliation resolution action | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
