# [AUTOMATION] Change Request (CHG-###) Protocol — Summary

Full templates, worked examples, decision options: `docs/roles/LIBRARIAN.md`.

## Trigger
Any role (CODER, ARCHITECT, HFD) discovers that input from a previous role is incorrect, incomplete, or impossible to implement mid-work.

## The Rule
1. **Escalate forward, never backward.** Don't ask BA to change AC or ARCH to redesign — escalate to LIBRARIAN.
2. **Document it** as a CHG-### ticket (template in `docs/roles/LIBRARIAN.md`).
3. **LIBRARIAN decides:** finish the story as-is with the CHG tracked separately (Option A), or pause the story and spin up a reworked `[ID]-v2` (Option B).
4. **Track it** in the Technical Debt Ledger.

If LIBRARIAN is unavailable: mark the story `BLOCKED: CHG-###`, file the ticket, and stop — don't proceed with rework or ask the previous role directly.

**Authority:** CLAUDE.md Sequential Lock Protocol.
