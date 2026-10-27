# Sprint 01 Backlog: eam (1 week)

**Status:** PROPOSED. Not started. Sprint_Log entry is added by LIBRARIAN when the sprint is accepted.
**Sprint goal:** Foundation is approved, decided and in build: EPIC-01 stories approved, the blocking decisions made, and US-001 and US-002 through design into implementation.
**Capacity assumption:** 1 week, one builder (Mike) with AI roles. No velocity history exists, so the committed scope is deliberately small. Adjust after Sprint 01 actuals.

## Why this shape

All 22 stories are DRAFT. None can enter ARCHITECT or CODER work until the story owner approves its ACs (BA Gate 1). Four decisions also block later stories. So the first sprint front-loads gates and decisions, then starts the two stories that block everything else.

The real build order (from the story content, not declared in the docs):
`US-001 login` then `US-002 asset record` and `US-003 audit` then `US-004 ingest` then `US-005 normalize` then `US-006 identity map` then `US-009 alarm` then `US-010` then `US-011 incident` then `US-013 work order` then `US-015 assign` then `US-017 to US-019 mobile` then `US-020 close` then `US-021 lineage`. Side branches: `US-007/008 map` after US-002, `US-012` after US-011, `US-014` after US-013, `US-016` after US-009, `US-022` after US-004.

## Committed

| # | Item | Type | Owner role | Done when |
|---|---|---|---|---|
| 1 | Approve ACs for US-001, US-002, US-003 | Gate 1 | Mike (story owner) / BA | Status flips to READY_FOR_DESIGN in story docs and Story_Map (LIBRARIAN) |
| 2 | Decide pilot source system | Decision | Mike | Recorded in Sprint_Log; unblocks US-004, US-009, US-011, US-013 |
| 3 | Decide tech stack and scaffold (repo layout, CI with 65% branch floor) | Decision + enabler | Mike / ARCHITECT | Gap: no story exists for scaffold. BA to add a story (or fold into US-001) before CODER starts |
| 4 | US-001 User Login and Role-Based Access | Story, FULL_STACK | ARCH, HFD, CODER, REVIEWER | DoD met, merged, Story_Map DONE in same PR |
| 5 | US-002 Canonical Asset Record and Search | Story, FULL_STACK | ARCH, HFD, CODER, REVIEWER | DoD met, merged, Story_Map DONE in same PR |

## Stretch (only if committed items finish early)

| # | Item | Notes |
|---|---|---|
| 6 | US-003 Audit Trail | Needs US-001 identity. Can start ARCH design in parallel. |
| 7 | Approve ACs for US-004 to US-006 | Gate 1 only, keeps Sprint 02 unblocked |

## Not in this sprint, needs a decision before the sprint that needs it

| Decision | Blocks | Needed by |
|---|---|---|
| Notification channel (email or SMS) | US-016 | before EPIC-05 |
| Target mobile platform(s) | US-017, US-018, US-019 | before EPIC-06 |
| Initial event types, severity and emergency work order rule content | US-009, US-011, US-013 | before EPIC-04 |

## Risks

- HFD role docs say "no style guide yet". US-001 and US-002 are UI stories, so an HFD style guide or an explicit exception is needed first. Add to item 3.
- AC approval is the single point of failure. If item 1 slips, nothing else in the sprint can start.
- Two UI stories plus scaffold in one week is aggressive for a first sprint. Item 5 is the first to drop.

## Next sprints (indicative)

- Sprint 02: US-003, US-004, US-005, US-006 (integration spine)
- Sprint 03: US-007, US-008, US-009, US-010 (asset context, alarms)
- Sprint 04: US-011 to US-016 (incident to dispatch)
- Sprint 05: US-017 to US-022 (mobile, closure, lineage)
