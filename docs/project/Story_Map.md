# Story Map — Utility Asset & Field Operations Platform (MVP)

Owned by LIBRARIAN. Protected document — no automated overwrite without going through the role's own update protocol.

Source: `docs/requirements/` (BRD v1.0, MVP Scope and Delivery Baseline, MVP Scope Definition) and `docs/product/Personas.md`.

| Story ID | Title | Epic | Actor | Scope | Status |
|---|---|---|---|---|---|
| US-001 | User Login and Role-Based Access | EPIC-01 Platform Foundation | All personas | FULL_STACK | DRAFT |
| US-002 | Canonical Asset Record and Search | EPIC-01 Platform Foundation | Maria Alvarez | FULL_STACK | DRAFT |
| US-003 | Audit Trail for Record and Privileged Actions | EPIC-01 Platform Foundation | Sam Whitfield | FULL_STACK | DRAFT |
| US-004 | Ingest and Retain Raw Source Event | EPIC-02 Integration & Events | Sam Whitfield | FULL_STACK | DRAFT |
| US-005 | Normalize Event into Canonical Model (Idempotent) | EPIC-02 Integration & Events | Maria Alvarez | BACKEND_ONLY | DRAFT |
| US-006 | Map Source Asset Identifier to Canonical Asset ID | EPIC-02 Integration & Events | Maria Alvarez | FULL_STACK | DRAFT |
| US-007 | Asset Map and Location Display | EPIC-03 GIS & Asset Context | Maria Alvarez | FULL_STACK | DRAFT |
| US-008 | Location Verification / Freshness Indicator | EPIC-03 GIS & Asset Context | Maria Alvarez | FULL_STACK | DRAFT |
| US-009 | Alarm Creation and Severity Classification | EPIC-04 Alarm & Incident | Maria Alvarez | FULL_STACK | DRAFT |
| US-010 | Acknowledge, Shelve and Close an Alarm | EPIC-04 Alarm & Incident | Maria Alvarez | FULL_STACK | DRAFT |
| US-011 | Create Incident from Critical Alarm (with Manual Fallback) | EPIC-04 Alarm & Incident | Maria Alvarez | FULL_STACK | DRAFT |
| US-012 | Incident Timeline and Linkage | EPIC-04 Alarm & Incident | Maria Alvarez | UI_ONLY | DRAFT |
| US-013 | Create Work Order from Incident | EPIC-05 Work Order & Dispatch | Maria Alvarez / Dwayne Chen | FULL_STACK | DRAFT |
| US-014 | Dispatch Board — View Open Work and Crew Status | EPIC-05 Work Order & Dispatch | Dwayne Chen | FULL_STACK | DRAFT |
| US-015 | Assign Crew to Work Order (Manual) | EPIC-05 Work Order & Dispatch | Dwayne Chen | FULL_STACK | DRAFT |
| US-016 | Notify on Critical Alarm/Incident Creation | EPIC-05 Work Order & Dispatch | Dwayne Chen | FULL_STACK | DRAFT |
| US-017 | Technician Receives Assigned Work Package on Mobile | EPIC-06 Field Mobile | Jess Okafor | FULL_STACK | DRAFT |
| US-018 | Safety Note, Inspection Form and Evidence Capture | EPIC-06 Field Mobile | Jess Okafor | FULL_STACK | DRAFT |
| US-019 | Offline Work Capture and Sync on Reconnect | EPIC-06 Field Mobile | Jess Okafor | FULL_STACK | DRAFT |
| US-020 | Supervisor Closes Work Order and Updates Asset History | EPIC-07 Closure & Traceability | Priya Raman | FULL_STACK | DRAFT |
| US-021 | Lineage View — Source Event to Closure | EPIC-07 Closure & Traceability | Priya Raman / Sam Whitfield | FULL_STACK | DRAFT |
| US-022 | Integration Failure Visibility (No False-Normal State) | EPIC-07 Closure & Traceability | Sam Whitfield | FULL_STACK | DRAFT |

## Epics

| Epic | Stories | MVP Reference |
|---|---|---|
| EPIC-01 Platform Foundation | US-001–US-003 | MVP Area A |
| EPIC-02 Integration & Events | US-004–US-006 | MVP Area B, C |
| EPIC-03 GIS & Asset Context | US-007–US-008 | MVP Area D |
| EPIC-04 Alarm & Incident | US-009–US-012 | MVP Area E |
| EPIC-05 Work Order & Dispatch | US-013–US-016 | MVP Area F |
| EPIC-06 Field Mobile | US-017–US-019 | MVP Area G |
| EPIC-07 Closure & Traceability | US-020–US-022 | MVP Area H |

## Status Key
`DRAFT` → `READY_FOR_DESIGN` → `DESIGN_APPROVED` → `IN_DEVELOPMENT` → `CODE_REVIEW` → `REVIEW_PASSED` → `LIBRARIAN_VERIFICATION` → `DONE`

All 22 stories are currently `DRAFT`, pending story-owner (Mike Barnes) approval of their Acceptance Criteria per the BA Governance Gate (`docs/roles/BUSINESS_ANALYST.md`) — that approval is what flips each to `READY_FOR_DESIGN` and hands off to ARCHITECT.

## Deferred / Not Yet Storied
Per `docs/requirements/MVP_Scope_Definition.docx` §4, these BRD capabilities are explicitly out of MVP scope and have no stories in this map: multi-source integration framework, full data-quality/lineage dashboards, outage management, weather correlation, preventive/condition-based maintenance plans, inventory/procurement, formal safety/LOTO workflow, GPS-based live crew tracking/route optimization, analytics/KPI dashboards/AI features beyond explainability constraints, document versioning, multi-tenant/multi-region support.
