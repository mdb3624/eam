# Personas — Utility Asset & Field Operations Platform (MVP)

Source: `docs/requirements/Utility_Asset_Field_Operations_Platform_Business_Requirements_v1.docx` (§5 Business Users & Roles, Table 1) and `docs/requirements/MVP_Scope_Definition.docx` (§6 MVP Roles). Narrowed to the five roles carried into MVP scope — Engineer, Inventory Manager, Procurement User and Executive are deferred with the capabilities that serve them.

---

## 1. Maria Alvarez — Control-Center Operator

**Role summary:** Monitors alarms and events from the control center, confirms severity, and opens incidents.

- **Context:** Sits in front of an alarm console for a full shift; handles a steady trickle of events that spikes hard during storms.
- **Goals:**
  - See an incoming event and immediately know which physical asset it's tied to and where it is.
  - Tell real problems from noise fast enough to act inside SLA.
  - Trust that the alarm severity shown reflects a rule she can see, not a black box.
- **Pain points today:** Alerts arrive from disconnected systems with no reliable link to a canonical asset; location data is often stale with no way to tell how stale.
- **Primary screens:** Alarm console, Incident view, Asset 360 (trimmed), basic asset search.
- **Tech comfort:** High — power user of console-style monitoring tools, low tolerance for extra clicks under pressure.

---

## 2. Dwayne Chen — Dispatcher

**Role summary:** Turns incidents into assigned field work.

- **Context:** Works the dispatch board alongside Maria; escalates to phone/radio only when the system can't tell him what he needs.
- **Goals:**
  - See all open work and crew status in one place.
  - Assign a crew that's actually qualified and available without cross-checking a spreadsheet.
  - Know instantly if a work order is stuck or a crew needs reassignment.
- **Pain points today:** Crew qualification/availability lives outside the system; work orders aren't reliably linked to a precise map location.
- **Primary screens:** Dispatch board, GIS map, Work order view.
- **Tech comfort:** High — comfortable with map-based tools, wants status at a glance over deep drill-downs.

---

## 3. Jess Okafor — Field Technician

**Role summary:** Executes the work in the field — travel, inspect, repair, document.

- **Context:** Often in poor-connectivity areas (substations, rural feeders); uses a phone or ruggedized tablet.
- **Goals:**
  - Get a complete work package (asset, location, safety info) without radioing back to dispatch.
  - Capture inspection evidence and photos without losing work if signal drops.
  - Mark work complete and trust it reaches the office the moment connectivity returns.
- **Pain points today:** Work orders arrive as a radio call or paper ticket with no asset history attached; evidence captured in the field is easy to lose.
- **Primary screens:** Mobile technician work list, mobile work order + inspection form.
- **Tech comfort:** Medium — needs a simple, guided mobile flow; not a systems power user.

---

## 4. Priya Raman — Maintenance Supervisor

**Role summary:** Reviews and closes completed work; confirms it was done right.

- **Context:** Reviews work orders at shift end or next morning, not in real time.
- **Goals:**
  - Confirm the required evidence exists before signing off.
  - See the asset's updated condition/history after closure.
  - Trust the closed record can answer "what happened and who did it" months later.
- **Pain points today:** No single place shows what happened, who did it, and whether it traces back to the original event.
- **Primary screens:** Work order approval/closure, Asset history view.
- **Tech comfort:** Medium-high — comfortable with structured review workflows.

---

## 5. Sam Whitfield — System Administrator

**Role summary:** Configures users, roles, and the pilot integration adapter; owns the audit trail.

- **Context:** Owns onboarding/offboarding and the health of the single MVP integration.
- **Goals:**
  - Onboard a user with the correct role in minutes, not a ticket.
  - Know immediately if the one integrated source system goes unhealthy — never have it fail silently.
  - Answer "who did what, when" for any record without digging through logs by hand.
- **Pain points today:** No visibility into whether the SCADA/IED feed is actually healthy; no unified audit trail across the workflow.
- **Primary screens:** Administration (users, roles, the single integration adapter), Audit trail.
- **Tech comfort:** High — technical user, first to notice a broken integration.

---

**Deferred personas (post-MVP, per `MVP_Scope_Definition.docx` §6):** Engineer, Inventory Manager, Procurement User, Manager/Executive.
