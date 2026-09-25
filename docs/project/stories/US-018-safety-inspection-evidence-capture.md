# US-018: Safety Note, Inspection Form and Evidence Capture

**Epic:** EPIC-06 Field Mobile
**Actor:** Jess Okafor, Field Technician
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **field technician**, I want to **record a safety note, complete an inspection form, and capture photos on my work order**, so that **there's evidence the work was done safely and correctly**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Technician records a safety note
  Given Jess has arrived at the asset for "WO-100"
  When she enters a free-text safety note
  Then it is saved against the work order

Scenario: Technician completes the inspection form
  Given "WO-100" has a configured inspection form
  When Jess completes the required fields
  Then the responses are saved against the work order

Scenario: Technician attaches a photo as evidence
  Given Jess is completing the inspection
  When she captures and attaches a photo
  Then the photo is saved and linked to the work order as completion evidence

Scenario: Work cannot be marked complete without required evidence
  Given the inspection form has required fields not yet completed
  When Jess attempts to mark the work order complete
  Then completion is blocked until required fields are filled
```

## Edge Cases
- Photo capture while offline — must queue locally and upload on reconnect (see US-019); it must not block the technician from continuing the inspection.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — MVP explicitly scopes formal LOTO/permit workflow out (`MVP_Scope_Definition.docx` §4) in favor of a free-text safety note, which this story implements.
- [x] Estimable
- [x] Small — one configurable inspection form per MVP boundary.
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Safety note (free text) | *(ARCH to fill)* | | | |
| Inspection form fields (configurable) | *(ARCH to fill)* | | | |
| Photo attachment | *(ARCH to fill)* | | | |
| Mark-complete action (gated on required fields) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
