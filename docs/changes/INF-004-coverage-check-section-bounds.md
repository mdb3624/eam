# INF-004: Coverage check missed states under `###` subsections

**Type:** Infrastructure / defect in INF-002 tooling
**Raised by:** HFD, during US-002 (2026-11-04), approved by the project owner
**Status:** APPLIED on branch `chore/INF-004-coverage-section-bounds`. Awaiting REVIEWER and merge.
**Related:** INF-002, US-002

## Problem

`coverageProblems` in `scripts/visual-check/lib.mjs` read the "Architect Design" section up to the next heading of level 2 or 3. A story whose `## Architect Design` holds `###` subsections (US-002 does: Schema, API contract, Frontend) therefore ended the section at the first subsection. The `state:<name>` bullets under `### Frontend` were never read, so the check reported nothing even when a state had no shot. INF-002's tests used flat designs, so none caught it.

## Fix

A section now runs to the next heading of the same or a higher level, so `###` subsections belong to their `##` parent. A `###`-level "Architect Design" still ends at the next `###`.

Review round 1 (KICK_BACK, 2026-11-04) found three more faults in the same function, all fixed here: a `# comment` line inside a fenced block ended the section (a regression from the first cut), a `## ` line inside a fenced block ended it (older), and the heading match was by prefix so `## Architect Designs` could be read instead (older). Headings inside ``` fences are now ignored and the heading text must match exactly, with only an optional `(...)` suffix. One test each, all red first.

Review round 2 (KICK_BACK, 2026-11-04) found the function could still pass silently, all fixed here: `~~~` fences were not tracked; a fence closed on any line starting with three backticks instead of the same character and at least the same length; an unclosed fence before the Architect Design heading hid it and produced zero states; and an unreadable Architect Design heading (`## Architect Design ##`, `##Architect Design`) did the same. Now: both fence kinds are tracked with CommonMark closing rules, ATX closing hashes are accepted, an unclosed fence is a reported problem, and `state:` tokens with no readable Architect Design heading are a reported problem. The function is a small line scanner, not a full markdown parser. Any remaining silent case found in review means switching to a real parser, decided by the owner.

Review round 3 (KICK_BACK, 2026-11-04) found no silent pass on a realistic story but five exotic silent cases, all fixed here: a commented-out `## Architect Design` hid the real one (HTML comments are now blanked); a second Architect Design section was ignored (all matching sections now count); `- Scenario:`, `> Scenario:`, `**Scenario:**` and `Example:` counted as zero ACs; `state: name` with a space was not read; and a malformed `visual-checks.json` (`shots` not an array, a null shot, `covers` not an array of strings) or a non-string story text crashed or was silently accepted (now reported as problem lines). Round 4 is the last patch round: a further silent miss on a realistic story means the owner decides on a real markdown parser.

Review round 4 (KICK_BACK, 2026-11-04) found no silent miss and no false positive on any real story (all 44 story files on this branch and the US-002 branch gave AC counts equal to a plain `Scenario:` count) but listed gaps with no CHG. Fixed here: a `<!--` inside a code fence swallowed the fence close and later states (comments are now blanked outside fences only); an unclosed HTML comment is now a reported problem; an Acceptance Criteria section that yields zero readable scenarios is now a reported problem, so any unlisted scenario spelling fails loudly; `state:` needs a word boundary, dots stay in names, and `state: name` with a space is read only as a bullet so prose is not a state. Capitalised `State:` stays unread by design (ARCHITECT.md uses lowercase). The remaining loud over-reports and the slow pathological input are filed as CHG-007, owned by LIBRARIAN.

## Verification

- Red first: the new test `coverageProblems reads states under ### subsections of ## Architect Design` failed with `actual: []`. Round 1 added three tests that failed before the fix.
- Round 2 added 7 tests, round 3 added 6 and round 4 added 5, all red first.
- `node --test scripts/visual-check/*.test.mjs`: 62 of 62 pass.
- `check-visual-evidence.mjs --all` green; `scripts/scope-guard/test.sh` 14 of 14.
- Control on the real US-002 story and `visual-checks.json` (from the US-002 branch): no problems. With the session-expired shots removed, it names `state:session-expired`.

## Files in Scope

docs/changes/INF-004-coverage-check-section-bounds.md
docs/changes/CHG-007-coverage-check-loud-over-reports.md
scripts/visual-check/lib.mjs
scripts/visual-check/lib.test.mjs
docs/project/Sprint_Log.md
docs/project/gate_log.csv
