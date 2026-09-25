# US-013: Create Work Order from Incident

**Epic:** EPIC-05 Work Order & Dispatch
**Actor:** Maria Alvarez, Control-Center Operator (creator/trigger); consumed by Dwayne Chen, Dispatcher
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want a **work order created (automatically for emergencies, or manually) from an incident**, so that **the incident turns into actionable field work without re-entering the same information**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Emergency incident auto-creates a work order
  Given an incident meets the configured emergency criteria
  When the emergency rule evaluates the incident
  Then a work order is created and linked to the incident and asset

Scenario: Operator manually creates a work order from a non-emergency incident
  Given an incident exists that does not meet emergency criteria
  When the operator manually creates a work order from it
  Then the work order is linked to the incident and asset

Scenario: Work order inherits required context
  Given a work order has been created from an incident
  Then it carries the asset, priority, and a status of "draft" or "assigned" per configured workflow
```

## Edge Cases
- Incident with no resolvable asset (identity unresolved, US-006 reconciliation pending) — work order creation should be blocked or flagged until the asset is resolved, never dispatched against a wrong/unknown asset.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — implements BRD §18 rule ("IF critical incident meets emergency criteria → create emergency work order") and MVP reference workflow step 6.
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Work order priority | *(ARCH to fill)* | | | |
| Required skill | *(ARCH to fill)* | | | |
| Status | *(ARCH to fill)* | | | |
| Linked incident/asset | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- Emergency criteria rule is the same open decision noted in US-011; work order creation depends on that rule being configured.
