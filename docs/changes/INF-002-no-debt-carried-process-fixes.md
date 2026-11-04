# INF-002: Stop carrying debt: process and tooling fixes

**Type:** Infrastructure / governance
**Raised by:** Project owner (Mike Barnes), 2026-11-03, after the US-001 follow-ups became CHG-001 to CHG-005
**Status:** APPLIED on branch `chore/INF-002-no-debt-carried` 2026-11-03 (owner approved). Awaiting REVIEWER and merge.

**Applied notes:**
- Change 4: the coverage check is enforced when the story's Architect Design names a `state:<name>` or any shot declares `covers`. Stories with neither (US-001) are left alone, so `--all` stays green. 6 new tests, 35 of 35 pass.
- Change 6: the "Zero paths means the guard is silent" check was added to the AIOS-side `/sprint-run` skill, outside this repo.
**Related:** CHG-001 to CHG-006, INF-001

## Problem

US-001 reached DONE with five known gaps. Four of them were written down by ARCHITECT or REVIEWER at the time. The process allowed it:

- `docs/roles/REVIEWER.md` has a verdict "TECHNICAL DEBT (Approve but flag)" (lines 56 and 91). A reviewer can pass a story and carry the gap.
- `docs/roles/LIBRARIAN.md` "Technical Debt Logging Protocol" (line 132 onward) tells LIBRARIAN to log debt "silently in the background" in a ledger tagged `[DEBT:AUTO]`, and not to act on it.
- `docs/roles/ARCHITECT.md` has no rule for gaps found at design time, so US-001's design carried two Tier A security gaps as "not blocking".
- LIBRARIAN's Verification Checklist does not check for untracked gaps before DONE.
- `docs/design/US-001/visual-checks.json` did not list the session-expired state, although ARCHITECT's design named it. Nothing compares the design's named states with the capture list.
- The coverage target was unmeasurable (no tool installed) and the Definition of Done did not say that counts as a fail.
- The scope guard hook had no test and was never checked against a real story file (fixed by INF-001).

## Owner rule being enforced

1. Debt found before a story's design is approved is fixed inside the story, or the existing story that owns it is named.
2. Debt found after the design is approved is a CHG-### routed to LIBRARIAN.
3. A change to the approved ACs is always a CHG-###.
4. Tier A items (security, financial, legal or compliance, hard to reverse) go to the owner. No role rules them non-blocking.
5. No role approves a story with an untracked gap.

## Changes (exact wording)

### 1. `docs/roles/REVIEWER.md`

Replace line 56 with:

> **No debt carried:** a gap that does not break a hard gate is still not approved silently. REVIEWER files a CHG-### (template in `docs/roles/LIBRARIAN.md`) for it before issuing PASS, and the PASS row in `gate_log.csv` names the CHG id. A gap with no CHG id is a REJECT.

Replace the TECHNICAL DEBT bullet in Review Verdicts (line 91) with:

> - **APPROVED WITH CHG**: Hard gates pass; every remaining gap has a filed CHG-### id listed in the verdict.

Add to Hard Gates (Automatic REJECT):

> * ❌ **Unmeasurable target:** a coverage or metric target that cannot be measured in this run (tool missing, report not produced) is a fail, not a note.

### 2. `docs/roles/LIBRARIAN.md`

Replace the "Technical Debt Logging Protocol" section with:

> ## Gap Handling Protocol
>
> **Trigger:** a role finds a gap, a standards violation, or code that breaks a rule in `.claude/rules/` or `docs/standards/`.
>
> **Before the story's design is approved:** the gap is fixed inside the story, or the story that owns it is named in the story file. Do not log it as debt.
>
> **After the design is approved:** file a CHG-### and decide it under the Change Request protocol below. Add a row to the Technical Debt Ledger only as an index of open CHG ids: `| CHG-### | Story | Severity | Status |`.
>
> **Tier A (security, financial, legal or compliance, hard to reverse):** report to the Project Owner at once. No role may mark it non-blocking.
>
> A gap outside the current task is surfaced to the owner in the same message. It is never logged silently.

Add to the Verification Checklist:

> - [ ] No untracked gaps: every gap named in the story, design, review or evidence notes has a CHG-### id or was fixed
> - [ ] No open CHG-### on this story with a status of OPEN

LIBRARIAN refuses DONE if either box cannot be checked.

### 3. `docs/roles/ARCHITECT.md`

Add under Core Rules:

> - **No "known gaps" section.** A gap found during design is closed in the design, or sent to the owner as a decision if it changes ACs (CHG-###). Any Tier A gap (security, financial, legal or compliance, hard to reverse) goes to the owner before the design is signed. ARCHITECT never marks it non-blocking.
> - **Name every UI state.** The Frontend section lists every screen and state the design needs, including error, empty, expired and denied states. HFD's `visual-checks.json` must cover each (see HFD change below).

### 4. `docs/roles/HUMAN_FACTORS_DESIGNER.md` and `scripts/visual-check/`

HFD adds a `covers` field to each entry in `docs/design/<ID>/visual-checks.json` naming the AC, edge case, or ARCHITECT frontend state it shows (for example `"covers": ["AC3", "state:session-expired"]`).

`check-visual-evidence.mjs` gains a check: every state listed in the story's "Architect Design > Frontend" bullets of the form `state:<name>` and every AC id must appear in some `covers`. Missing coverage exits 1 and names the state. A test is added in `check-visual-evidence.test.mjs` with a fixture that omits one state.

### 5. `docs/standards/Definition_of_Done.md`

Add to the Test Suite Gate:

> **Unmeasurable is a fail.** If backend or frontend coverage cannot be produced in the run, the gate fails. CI publishes both reports.

Add a new gate:

> ## 🧾 No Debt Gate
> Before DONE: every gap found for the story is fixed or has a CHG-### id, and no CHG for this story is OPEN. Gaps are never recorded as "known" or "carried".

### 6. Hooks ship with tests

Add to `docs/standards/Definition_of_Done.md` Coding Gate:

> Any change to a file under `.claude/hooks/` ships with a test under `scripts/<hook-name>/test.sh` that passes on the new hook and fails on the previous one.

Add a start-of-story check to the sprint-run skill (AIOS repo, not this repo): after ARCHITECT writes Files in Scope, run the scope guard's parser against the story file and fail if it yields zero paths.

### 7. Cross-cutting edits during a story

Add to `docs/roles/CODER.md` Input Acceptance Gate:

> If the work needs a harness, hook, role-doc or standards edit that is not in Files in Scope, stop. File an INF-### first, then edit. The scope guard flags the edit if you do not.

### 8. CI

CHG-001 provides the frontend coverage report. CHG-005 decides when the scope guard moves to `block`.

## Order of work

1. Owner approves or edits this ticket.
2. LIBRARIAN applies changes 1, 2, 3, 5 and 7 (documents).
3. CODER applies change 4 (script change with test) and the sprint-run check in 6, test-first.
4. REVIEWER runs the full suite in a separate session.
5. Merge through a PR on its own chore branch.

## Files in Scope

docs/changes/INF-002-no-debt-carried-process-fixes.md
docs/roles/REVIEWER.md
docs/roles/LIBRARIAN.md
docs/roles/ARCHITECT.md
docs/roles/HUMAN_FACTORS_DESIGNER.md
docs/roles/CODER.md
docs/standards/Definition_of_Done.md
scripts/visual-check/check-visual-evidence.mjs
scripts/visual-check/check-visual-evidence.test.mjs
scripts/visual-check/lib.mjs
scripts/visual-check/lib.test.mjs
docs/project/Sprint_Log.md
docs/project/gate_log.csv

## Follow-ups

- Existing stories keep their current `visual-checks.json`. US-002's HFD step is the first to use `covers`.
- US-001's five gaps are CHG-001 to CHG-005. No other open gap exists in a DONE story.
