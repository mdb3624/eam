# US-007: Asset Map and Location Display

**Epic:** EPIC-03 GIS & Asset Context
**Actor:** Maria Alvarez, Control-Center Operator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want to **see an asset's location on a map from the Asset 360 view**, so that **I understand exactly where the affected equipment is without switching to a separate GIS tool**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Asset location renders on the map
  Given asset "TX-4587" has stored coordinates
  When the operator opens the Asset 360 view
  Then a map pin shows the asset at its stored coordinates

Scenario: Asset without coordinates shows a clear gap, not a wrong pin
  Given asset "TX-9999" has no stored coordinates
  When the operator opens its Asset 360 view
  Then the map area indicates "location not available" rather than defaulting to an arbitrary point
```

## Edge Cases
- Coordinate precision/format mismatch from source data — validated at ingestion, not silently displayed as-is (ties to data-quality flag, US-008).

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
| Map pin (lat/long) | *(ARCH to fill)* | | | |
| "Location not available" state | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
