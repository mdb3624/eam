# US-008: Location Verification / Freshness Indicator

**Epic:** EPIC-03 GIS & Asset Context
**Actor:** Maria Alvarez, Control-Center Operator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **control-center operator**, I want to **see how fresh/verified an asset's location data is**, so that **I know whether to trust the map pin before dispatching a crew to it**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Verified location shows a verified indicator
  Given asset "TX-4587" location was field-verified on a recorded date
  When the operator views the Asset 360 map
  Then a "verified" status and the verification date are shown

Scenario: Stale location is flagged
  Given asset "TX-4587" location has not been verified within the configured freshness threshold
  When the operator views the Asset 360 map
  Then the location is flagged "stale" rather than shown as trustworthy by default
```

## Edge Cases
- Freshness threshold is configurable per BRD §8.5 — this story ships with one MVP default threshold, not a full configuration UI (deferred, matches BRD §8.5 dashboard being out of MVP scope).

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — directly supports MVP Definition of Done: "GIS unavailable/stale... clearly display freshness/status" (`Business_Requirements_v1.docx` Table 4).
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Verification status badge (verified/stale/unverified) | *(ARCH to fill)* | | | |
| Last verified date | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
