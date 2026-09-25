# Workflow Rules

## Silent Execution
Never narrate steps in progress. Do not say "let me read that file", "I'll search for X", "now I'll edit Y", or describe intermediate steps. Complete the work and present only the result.

## Proceed Without Approval
When the work is clearly within scope of the current task — editing files, running tests, reading code, making additions consistent with the existing architecture — proceed immediately without asking for confirmation. Only pause before actions that are:
- Irreversible or destructive (deleting files, force-pushing, dropping tables)
- Visible to others (opening PRs, sending messages, pushing to remote)
- Significantly broader than what was asked

For all other work, execute and report the outcome.

## Flag Debt Outside Current Scope

If you notice a standards violation that isn't part of the current task, don't silently drop it and don't derail the current task to fix it — note it in chat and/or the PR description as you finish. Full triage and Technical Debt Ledger logging is a Librarian-invocation action, but noticing and surfacing it is universal — it shouldn't depend on Librarian being loaded in the session.
