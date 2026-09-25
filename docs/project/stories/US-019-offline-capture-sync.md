# US-019: Offline Work Capture and Sync on Reconnect

**Epic:** EPIC-06 Field Mobile
**Actor:** Jess Okafor, Field Technician
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **field technician**, I want to **continue working on my assigned work order when I have no connectivity, and have it sync automatically when I reconnect**, so that **poor signal at a substation doesn't stop me from doing my job**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Assigned work is cached for offline use
  Given "WO-100" is assigned to Jess and her app has been online at least once
  When Jess's device loses connectivity
  Then "WO-100" and its required asset data remain accessible in the app

Scenario: Offline changes sync on reconnect
  Given Jess completed inspection fields and photos while offline
  When her device regains connectivity
  Then those changes sync to the server without manual re-entry

Scenario: Sync conflict is visibly flagged
  Given the same work order was also modified by another user while Jess was offline
  When Jess's offline changes sync
  Then a conflict warning is shown per last-write-wins-plus-warning per MVP scope
```

## Edge Cases
- App killed/device restarted while offline changes are unsynced — data must persist locally and still sync once the app reopens and connectivity returns.

## INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable — MVP explicitly requires this: "basic offline cache of assigned work... conflict handling limited to last-write-wins plus a visible warning" (`MVP_Scope_Definition.docx` §3.4).
- [x] Estimable
- [x] Small
- [x] Testable

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Offline indicator | *(ARCH to fill)* | | | |
| Sync status / conflict warning | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs

## Decision Log
- None yet.
