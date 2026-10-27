**UTILITY ASSET & FIELD OPERATIONS PLATFORM**

**MVP Scope & Definition**

*Derived from Business & Product Requirements Document v1.0 | September 2026*

# 1. Purpose of This Document

The full Business & Product Requirements Document (BRD v1.0) describes the complete, eight-phase target platform. That scope is too large to build, test, or fund in a single release. This document defines the smallest release that still proves the platform's core differentiator — a traceable, integration-first path from a real-world event to a closed, auditable work order — so it can be built, demonstrated, and validated with real users before the remaining phases are funded.

The MVP is scoped to Phases 0–4 of the BRD roadmap (Discovery through Field), narrowed further to a single reference workflow: an electrical/equipment event detected on one integrated source system, resolved to a canonical asset, escalated through alarm and incident, converted to a work order, dispatched to a crew, and closed out in the field with evidence — with every step traceable back to its source.

# 2. MVP Vision Statement

Prove, end to end and with real data, that the platform can take one event from one integrated source system and carry it — without manual re-entry and without losing traceability — through identification, alarm, incident, work order, dispatch, and field closure, while continuing to function sensibly when that source system is degraded or unavailable.

# 3. MVP In Scope

Capabilities below are drawn from BRD sections 8 and 21, narrowed to what the reference workflow (BRD section 12) requires. Each capability is scoped to “works for one asset class, one integration, one geography” rather than the full multi-source, multi-tenant target state.

## 3.1 Core Platform

Canonical Asset record with a stable Asset ID, minimal hierarchy (utility → substation → feeder → asset), manufacturer/model/serial/criticality.

Basic asset search and an Asset 360 view (header, map, active alarms, incidents, work, timeline — trimmed from BRD section 11).

Single external identity mapping (one source system → canonical Asset ID) via the Asset Identity Engine, with a simple reconciliation queue for conflicts.

Users, roles and permissions for the MVP role set (below); audit log for create/update actions.

## 3.2 Integration & Events

One integration adapter for one real source system (e.g., a SCADA/IED feed or a relay event export) — not the full adapter framework.

Raw event store: immutable source payload, receipt timestamp, source message ID (BRD § 13.1 contract, applied to the single adapter).

Normalization of that one event type into the canonical event model, with idempotent processing to prevent duplicate incidents.

Minimal data-quality flag (verified / stale / missing) on asset location and event freshness — full lineage viewer is deferred.

## 3.3 Operations

Alarm creation and severity classification from the normalized event; acknowledge/shelve/close with permissions.

Incident creation from a critical alarm, with a manual-create fallback; incident linked to its source alarm.

One configured priority rule to flag an incident as emergency.

Manual or rule-triggered work order creation, linked to the incident and the asset.

Dispatch board showing open work and crew status; manual crew assignment (no GPS-optimized auto-dispatch).

Notification on critical alarm/incident creation via one channel (email or SMS).

## 3.4 Field

Technician login and a mobile work list scoped to assigned work orders.

Work status tracking: assigned → accepted → in progress → completed → closed.

One configurable inspection/evidence form with photo capture.

Basic offline cache of assigned work and required asset data, with sync on reconnect (conflict handling limited to last-write-wins plus a visible warning).

## 3.5 Closure & Traceability

Supervisor closure step; asset history entry created on closure.

A single “lineage” view on the incident/work order showing source system, source message ID, and each state transition with timestamp and actor — the proof point for the platform's differentiator.

# 4. Explicitly Out of Scope for MVP

*Deferring these is what makes the MVP buildable; they remain in the BRD's full roadmap (Phases 5–8) and should not be implied as “coming next release” without a separate scoping pass.*

Multiple simultaneous source-system integrations; the full adapter framework and integration health center (BRD § 8.3, § 21).

Full data-quality/lineage dashboards and reconciliation workbench (BRD § 8.5) — MVP ships a single lineage view only.

Outage management, weather/environmental correlation, and storm clustering (BRD § 8.8, § 8.17).

Preventive/condition-based maintenance plans and recurring work generation (BRD § 8.13).

Inventory, spare parts, and procurement (BRD § 8.14–§ 8.15).

Formal safety/permit/LOTO workflow enforcement (BRD § 8.16) — MVP allows a free-text safety note only.

GPS-based live crew tracking and route optimization (BRD § 8.10).

Analytics, KPI dashboards, asset health/risk scoring, and all AI/predictive-maintenance features (BRD § 8.20, § 17).

Document versioning/control beyond attaching a photo or file to a record (BRD § 8.19).

Multi-tenant support, multi-region deployment, and formal DR/HA targets beyond a single-environment pilot (BRD § 21.29, § 8).

Autonomous or AI-driven changes to electrical operating state — out of scope for the full product, not just the MVP (BRD § 4.2).

# 5. MVP Reference Workflow

This is the single path the MVP must demonstrate, adapted from the BRD's critical transformer workflow (§ 12) and end-to-end process (§ 7):
1. Source system reports an event for one asset.

2. Integration adapter receives it, stores the raw payload, and stamps source/receipt metadata.

3. Asset Identity mapping resolves the source ID to the canonical Asset ID.

4. Event is normalized and classified; an alarm is generated if severity warrants it.

5. Incident is created from the alarm and linked back to it.

6. Work order is created (manually or by the configured emergency rule) and linked to the incident and asset.

7. Dispatcher assigns a crew from the dispatch board.

8. Technician receives the work package on mobile, travels, and works — online or offline.

9. Technician records inspection evidence/photos and marks the work complete.

10. Supervisor closes the work order; asset history and the lineage view are updated.

# 6. MVP Roles

| **Role** | **MVP Access** |
|---|---|
| Control-center operator | Alarm console, incident create/view, basic asset search |
| Dispatcher | Dispatch board, work order view, manual crew assignment |
| Field technician | Mobile work list, inspection form, offline capture |
| Maintenance supervisor | Work order approval/closure, asset history view |
| System administrator | Users/roles, the single integration adapter, audit log |

*Engineer, inventory manager, procurement user, and executive roles from BRD § 5 are deferred with the capabilities that serve them.*

# 7. MVP Screens

A narrowed subset of BRD section 10, sufficient to run the reference workflow end to end:

Login

Alarm console

Incident view (create/edit, linked alarm and work order)

Asset 360 (trimmed: header, map pin, active alarms/incidents, work, timeline, lineage)

Dispatch board

Work order detail

Mobile technician work list

Mobile work order + inspection form

Administration (users, roles, the one integration adapter)

Audit trail (basic list/search)

# 8. Minimum Non-Functional Bar for MVP

| **Area** | **MVP Target** |
|---|---|
| Availability | Single-environment pilot; no formal HA/DR target yet |
| Performance | Interactive screens respond within a few seconds under pilot load |
| Offline | Mobile app functions offline for assigned work; sync on reconnect |
| Security | RBAC, encrypted transit/at rest, audited privileged actions |
| Observability | Basic logs and an integration-health indicator for the one adapter |

# 9. MVP Definition of Done

Adapted from BRD § 25, narrowed to what the MVP must prove:

Source event is received and the raw payload is retained and traceable by source ID and timestamp.

Canonical asset is correctly identified, or a reconciliation task is created.

Alarm severity and incident creation follow the configured rule.

Work order is created, dispatched, and a qualified crew can be assigned.

Technician can complete the work offline and it syncs correctly on reconnect.

Inspection evidence/photos are retained against the work order.

Closure updates asset history, and the lineage view shows every step from source event to closure.

Integration failure (adapter down) is visibly shown and never silently implies a normal/healthy asset state.

# 10. MVP Success Metrics

A small subset of BRD § 19, chosen because they can be measured directly from the reference workflow:

Mean time to acknowledge (MTTA) an alarm.

Mean time to dispatch (MTTD) after incident creation.

Percentage of events that resolve to the correct canonical asset without a manual reconciliation task.

Percentage of work orders closed with complete lineage (source event through closure) with no gaps.

# 11. Open Decisions Before MVP Build Starts

Carried forward from BRD § 29, narrowed to what actually blocks MVP scoping:

Which single source system will provide the pilot integration (SCADA/IED export, or another feed).

Pilot utility footprint: how many assets and which asset class(es) are in scope.

Deployment target for the pilot (cloud, private cloud, or hybrid).

Required mobile platform(s) for the field technician app.

Which notification channel (email or SMS) is used for the MVP.

Retention period for raw events and audit records during the pilot.

# 12. Next Steps

Per BRD § 31, before coding starts on this narrowed scope: confirm the pilot source system and asset class, produce the MVP-scoped ER model and API surface for the entities listed in Section 3, and turn Section 5's reference workflow into a screen-by-screen UX spec and an MVP backlog with acceptance criteria.
