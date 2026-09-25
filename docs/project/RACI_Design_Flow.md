# RACI — Story Design & Delivery Flow

Reflects the Sequential Lock Protocol (`CLAUDE.md`) and the Fast-Track exception added to `docs/roles/BUSINESS_ANALYST.md`, `ARCHITECT.md`, `HUMAN_FACTORS_DESIGNER.md`, `CODER.md`, `LIBRARIAN.md`. Stories with no UI component skip the HFD column entirely (ARCHITECT hands off directly to CODER — see `ARCHITECT.md` Field Contract Table Duties).

**R** = Responsible (does the work) · **A** = Accountable (owns the verdict, gate, or sign-off) · **C** = Consulted (input sought before/during) · **I** = Informed (told after the fact)

| Activity | BA | ARCHITECT | HFD | CODER | REVIEWER | LIBRARIAN | Project Owner |
|---|---|---|---|---|---|---|---|
| Draft story + AC, INVEST self-check | **R/A** | I | I | I | — | I | — |
| Story_Map placeholder row at ID assignment | C | — | — | — | — | **R/A** | — |
| Field Contract Table — populate `UI Field` | **R/A** | C | C | — | — | — | — |
| Tier A ambiguity (financial/legal/compliance/hard-to-reverse) | **R** | C | C | C | — | I | **A** |
| Tier B ambiguity (copy, field naming, display format) — BA's own story | **R/A** | I | I | I | — | I | — |
| ARCHITECT Input Acceptance Gate (accept/reject BA story) | I | **R/A** | — | — | — | I | — |
| Fast-Track Alignment (ARCH↔BA, cosmetic-only gap) | C | **R/A** | — | — | — | I (ledger entry) | — |
| Schema / domain model design | I | **R/A** | C | I | — | I | — |
| Platform Reuse Check (domain services) | — | **R/A** | — | C | C | I | — |
| Field Contract Table — fill `API Param`/`DB Column`/`Type` | I | **R/A** | C | — | — | — | — |
| HFD Visual Definition of Done (UI-touching stories only) | C | C | **R/A** | C | — | I | — |
| Field Contract Table final validation (HFD gate, UI stories) | I | C | **R/A** | — | — | — | — |
| Fast-Track exception (HFD↔BA/ARCH, cosmetic-only gap) | C | C | **R/A** | — | — | I (ledger entry) | — |
| CODER Input Acceptance Gate (accept/reject design + UI spec) | I | I | I | **R/A** | — | I | — |
| Fast-Track Clarification (CODER↔BA/ARCH/HFD, cosmetic-only gap) | C | C | C | **R/A** | — | I (ledger entry) | — |
| Service Reuse / Endpoint Overlap Check | — | C | — | **R/A** | C | I | — |
| Red-Green-Refactor implementation | — | — | — | **R/A** | I | — | — |
| Fail-Fast Boundary Validation | — | C | — | **R/A** | C | — | — |
| External Config/Secret Wiring Verification | — | — | — | **R/A** | C | I | — |
| CHG-### escalation (structural/AC/schema/compliance blocker) | C | C | C | **R** | I | **A** | I (Tier A only) |
| CHG-### decision (Option A finish-as-is / Option B rework `-v2`) | I | I | I | I | I | **R/A** | I |
| Code Review — hard gates, coverage, CI status | I | I | I | C | **R/A** | I | — |
| Sequential Lock Protocol violation check (no backward requests) | — | — | — | C | **R/A** | I | — |
| Technical Debt Ledger entry (standards violation found) | — | — | — | C | C | **R/A** | — |
| Sprint_Log / Story_Map close-out (same PR as code) | — | — | — | C | I | **R/A** | — |
| Librarian Sign-Off → story marked DONE | I | I | I | I | I | **R/A** | I |

## Notes

- **No cell is ever "R/A" for two roles on the same row.** Every gate has exactly one accountable owner — that's the Sequential Lock Protocol expressed as a RACI constraint, not just a process description.
- **Fast-Track rows are the only place accountability stays with the requesting role instead of moving to LIBRARIAN** — and only because the scope is capped at cosmetic/copy/formatting. Anything structural on those rows is not a Fast-Track case; it's a CHG-### escalation, and accountability moves to LIBRARIAN.
- **LIBRARIAN is Accountable for every escalation decision**, never Responsible for the underlying technical fix — LIBRARIAN decides the path (finish-as-is vs. rework), the role that hit the blocker still does the work.
- **Project Owner only appears on Tier A BA ambiguities** — everywhere else in this flow, the four roles + LIBRARIAN are self-sufficient by design.

---

**Authority:** CLAUDE.md Sequential Lock Protocol · `.claude/rules/change-request-protocol.md`
**Source docs:** `docs/roles/BUSINESS_ANALYST.md`, `ARCHITECT.md`, `HUMAN_FACTORS_DESIGNER.md`, `CODER.md`, `REVIEWER.md`, `LIBRARIAN.md`
