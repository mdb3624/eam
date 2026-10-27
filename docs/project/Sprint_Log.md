# Sprint Log — eam

Owned by LIBRARIAN. Append-only decision/status log.

## 2026-09-25 — MVP Backlog Created

- **Action:** Created 5 personas (`docs/product/Personas.md`) and 22 user stories (`docs/project/stories/US-001` through `US-022`) covering the MVP reference workflow, sourced from `docs/requirements/` (BRD v1.0, MVP Scope and Delivery Baseline, MVP Scope Definition).
- **Status:** All 22 stories are `DRAFT`. None have story-owner (Mike Barnes) approval of Acceptance Criteria yet, so none are `READY_FOR_DESIGN`. No ARCHITECT/CODER work should start against them until that approval happens per the BA Governance Gate.
- **Open decisions blocking full readiness (see individual story Decision Logs and `MVP_Scope_Definition.md` §11):**
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

## 2026-10-20 — Gate 1: US-001 and US-002 ACs Approved

- **Action:** Story owner (Mike Barnes) approved the ACs of US-001 and US-002 as written. Both move DRAFT → READY_FOR_DESIGN.
- **Build order decision:** US-001 first, then US-002. US-002 needs a tenant bound to web requests, which only US-001 provides.
- **US-001 scoping decisions:** stateless JWT access token (no refresh tokens yet); email is globally unique, so login finds the tenant from the email via `eam_login_lookup`; users are created by seed/test fixtures only (no admin create-user endpoint, to be storied later).
- **US-002 scoping decisions:** assets modeled as one self-referencing table (`asset_type` + `parent_id`) covering substation, feeder and transformer; the tenant is the utility, so no utility row; FULL_STACK, HFD included.
- **Branching:** scaffold is not on `main` yet; feature branches are cut from `chore/story-scope-guard-and-sprint-backlog`, which sits on `chore/quality-gates`.

## 2026-10-27 — US-001 REVIEW_PASSED

- **Action:** REVIEWER audited US-001 in a separate session. First verdict KICK_BACK (`OTHER`): the branch was not on origin, so CI could not be verified. Branch pushed; CI run 40553689502 green (Visual Evidence Gate, Backend build and verify, Frontend lint/test/build). REVIEWER PASS and VISUAL PASS are both in `gate_log.csv`. US-001 moves CODE_REVIEW → REVIEW_PASSED.
- **Evidence:** backend 34 unit + 31 integration, 0 failures, branch coverage about 92.9% (floor 65%, target 80%); frontend 41 tests, lint clean; all 14 screenshots opened.
- **Not yet DONE:** DONE needs the PR merged (merge state to be verified, not assumed), the Librarian Sign-Off section, and `check-visual-evidence.mjs --story US-001 --level 2` pasted in.
- **Carried to US-019 (BA to add at its Gate 1):** "no loss of unsaved form data on session expiry". No forms exist yet, so nothing to fix in US-001.
- **Open, owner decision:** scope drift. Files changed after the story's scope guard that are not in Files in Scope: `DataSourceIsolationIT`, `scripts/visual-check/*`, `.claude/hooks/visual-evidence-guard.sh`, `.claude/settings.json`, `.claude/rules/*`, root `CLAUDE.md`, `docs/roles/*`, `docs/standards/*`, the US-002 story doc, and US-001 evidence files. Mostly harness and governance work. Options: amend the story's Files in Scope, or file an INF ticket.
- **Debt:** frontend coverage tool (`@vitest/coverage-v8`) not installed, so frontend coverage is unmeasured. No screenshot of the session-expired banner. Scope-guard hook wrote no `CODER_SCOPE` rows for the out-of-scope files; check the hook.
- **Known and documented:** a disabled user keeps a valid token until expiry; no rate limiting.

## 2026-10-27 — US-001 DONE

- **Action:** PR #7 merged to `main` (merge commit 5b90e2c, verified on GitHub). Level 2 visual evidence check passed on `main`. Librarian Sign-Off appended to the story file. US-001 moves REVIEW_PASSED → DONE.
- **Unblocks:** US-002 (needs the tenant bound to web requests from US-001). Next gate: ARCHITECT design.
- **Still open from the REVIEWER pass:** scope drift decision (amend Files in Scope or INF ticket), session-expiry clause carried to US-019, frontend coverage tool missing, scope-guard hook wrote no CODER_SCOPE rows for out-of-scope files.
- **Process note:** this close-out is a follow-up commit after merge, not in the code PR, because DONE requires a verified merge. The LIBRARIAN rule says close-out ships in the same PR as the code, so for DONE-after-merge stories there is a tension to resolve in the role docs.
