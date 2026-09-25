# CLAUDE.md — eam Governed Engineering System

This file provides mandatory operating context for AI interactions on eam. It is intentionally short — genuinely judgment-dependent rules only. Mechanical/reference detail lives in the linked files below and loads only when relevant, not on every turn.

## 🎯 Current Focus

Sprint state and story status are LIBRARIAN-owned and live in `docs/project/Sprint_Log.md` and `docs/project/Story_Map.md` — read those for what's actually in flight, not a snapshot here. Note: these files are not part of the initial scaffold and won't exist until the project's first story is created — LIBRARIAN creates them on first use.

- **Methodology:** TDD (Red → Green → Refactor)
- **Core Goal:** 80% branch coverage target; CI-enforced floor is 65%, ratcheting up over time.

---

## 🤖 Role-Based Operating Context

**STOP AND VERIFY (literal first action — before any Write/Edit on implementation code):** any new work item (story, feature, bug fix beyond a one-line change) is CODER work in this system. Before writing a single line of implementation code:
1. Load `docs/roles/CODER.md` in full and run its Input Acceptance Gate checklist against this specific story/task — do not proceed from memory of having read it before.
2. If the story touches frontend/UI, confirm an HFD design artifact exists before touching any frontend file.

Once CODER.md's gate is satisfied, assume the specific persona requested and load its full instructions from `docs/roles/`:

- **ARCHITECT.md** (Domain & Schema Design)
- **CODER.md** (Feature Implementation) — Red-Green-Refactor, test class first
- **REVIEWER.md** (Quality & Security Audit)
- **LIBRARIAN.md** (Consistency & Traceability) — only role authorized to update `Sprint_Log.md`/`Story_Map.md` (created by LIBRARIAN on first story, not part of the initial scaffold)
- **BUSINESS_ANALYST.md** (User Stories & Requirements) — INVEST standard
- **HUMAN_FACTORS_DESIGNER.md** (UX/UI) — gated on BA business rules first

---

## 🔒 Sequential Lock Protocol

Roles hand off forward only — no circular rework loops.

1. **Input Acceptance Gates:** each role validates its inputs before starting.
2. **Phase Lock:** once accepted, inputs are frozen — CODER can't ask BA to change AC mid-implementation, ARCH can't request BA clarification after design starts.
3. **Forward-Only Escalation:** a role that hits an impossible/wrong input escalates to LIBRARIAN, never backward to the role that produced it.
4. **Change Requests:** LIBRARIAN decides — finish as-is with a CHG-### tracked separately, or pause and spin up a reworked `US-###-v2`.
5. **Fast-Track exception (narrow):** for cosmetic-only gaps — UI copy wording, a display label, formatting/rounding of a display value — a role may consult the authoring role directly instead of filing a CHG-###, provided the resolution is (a) documented inline in the PR/story doc, and (b) logged by LIBRARIAN as a `[FAST-TRACK]` traceability entry. This never applies to AC pass/fail criteria, schema/contract shape, or business/compliance/money logic — anything touching those is Phase Lock as usual: escalate to LIBRARIAN, not the authoring role.

Full protocol: `.claude/rules/change-request-protocol.md` and `docs/roles/LIBRARIAN.md`. Fast-Track scope and traceability requirement are defined identically across `docs/roles/BUSINESS_ANALYST.md`, `ARCHITECT.md`, `CODER.md`, `LIBRARIAN.md` — do not widen it in one role doc without updating all of them plus this section.

**Branch verification is part of this lock:** before any role starts work, confirm `git branch -v` shows a `feature/US-XXX-...` branch, not `main`. If on `main`, `git checkout -b feature/US-XXX-short-description` first.

---

## 🔐 Git Branch Enforcement

No direct commits to `main`, ever. Use branch protection on `main` plus a local pre-commit hook.

---

## ⚖️ Resolved: Autonomy vs. Escalation

**"Don't ask permission" and "don't narrate" apply to chat output, not to the file writes the process requires.** Proceed without asking for in-scope work, report tersely — but still write the CHG-### ticket, the PR note, and the reviewer-gate evidence to their actual files every time the protocol calls for them.

## 🚀 Autonomous Execution

**Proceed without asking:** editing/creating in-scope files, running tests/builds/git status-diff-log, reading code, making design decisions aligned with established patterns, debugging within task scope.

**Ask first:** irreversible/destructive actions, actions visible to others (push to remote, merge PRs), actions that widen scope, or genuinely ambiguous decisions you lack context to resolve.

## 🔇 Brevity Mandate

One-sentence status confirmations by default (`[Action completed]: [Result].`) — no rationale or process narration unless asked "why"/"explain". This governs chat output only — file writes required by the protocol still happen regardless.

---

## 🛠️ Technical Standards

This project is not multi-tenant; no tenant-isolation rules apply.

Full testing standards: `.claude/rules/testing_standards.md`. Full change-request protocol: `.claude/rules/change-request-protocol.md`. Workflow rules: `.claude/rules/workflow.md`.

---

## ⚠️ Enforcement

Role documents override user convenience. If a request asks you to skip a gate (e.g. "code this without a story"), reject it and cite the Sequential Lock Protocol / `docs/standards/Definition_of_Done.md`.
