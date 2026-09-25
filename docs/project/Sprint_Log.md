# Sprint Log — eam

Owned by LIBRARIAN. Append-only decision/status log.

## 2026-09-25 — MVP Backlog Created

- **Action:** Created 5 personas (`docs/product/Personas.md`) and 22 user stories (`docs/project/stories/US-001` through `US-022`) covering the MVP reference workflow, sourced from `docs/requirements/` (BRD v1.0, MVP Scope and Delivery Baseline, MVP Scope Definition).
- **Status:** All 22 stories are `DRAFT`. None have story-owner (Mike Barnes) approval of Acceptance Criteria yet, so none are `READY_FOR_DESIGN`. No ARCHITECT/CODER work should start against them until that approval happens per the BA Governance Gate.
- **Open decisions blocking full readiness (see individual story Decision Logs and `MVP_Scope_Definition.docx` §11):**
  - Pilot source system for the single integration adapter (US-004, US-009, US-011, US-013).
  - Notification channel — email or SMS (US-016).
  - Target mobile platform(s) (US-017).
  - Initial event types / severity and emergency-work-order rule content (US-009, US-011, US-013).
- **Not created:** Sprint assignments/points — no sprint has been planned yet; this log currently reflects backlog creation only.

## 2026-09-25 — Fast-Track Exception Adopted as Standard Pattern

- **Decision:** The Fast-Track exception (PR #1, PR #2) is now the standard, permanent pattern for resolving cosmetic-only ambiguities — UI copy wording, field/display labels, formatting/rounding of a display value — without a full CHG-### ticket. It is defined identically in `CLAUDE.md` (Sequential Lock Protocol, item 5) and in `docs/roles/BUSINESS_ANALYST.md`, `ARCHITECT.md`, `HUMAN_FACTORS_DESIGNER.md`, `CODER.md`, `REVIEWER.md`, and `LIBRARIAN.md`.
- **Boundary (non-negotiable):** Fast-Track never applies to AC pass/fail criteria, schema/contract shape, or business/compliance/money logic. Anything in that category is a CHG-### escalation to LIBRARIAN as before — a Fast-Track note covering a structural issue is a Sequential Lock violation, not a valid exception, and REVIEWER must reject it regardless of the inline note.
- **Traceability requirement:** Every Fast-Track use must produce a `[FAST-TRACK]` entry in the Technical Debt Ledger (or the story's own file) — LIBRARIAN logs this even when no CHG-### ticket exists, so the decision remains auditable.
- **Reference:** `docs/project/RACI_Design_Flow.md` reflects this pattern in its Fast-Track rows for BA, ARCHITECT, HFD, and CODER.
