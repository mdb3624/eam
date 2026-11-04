## CHG-007: Coverage check over-reports on unusual story markdown and is slow on pathological input

**Original Story:** INF-004 (coverage check, `scripts/visual-check/lib.mjs` `coverageProblems`)
**Discovered By:** REVIEWER on 2026-11-04 (INF-004 round 4)
**Root Cause:** `coverageProblems` is a line scanner, not a full markdown parser. It stays loud (it reports a problem) in these cases, none of which occur in any real EAM story today:
- A heading indented 1 to 3 spaces is not read as a heading, so it does not end the Architect Design section and later `state:` tokens are required.
- A bold, numbered or colon-suffixed Architect Design heading (`## **Architect Design**`, `## 4. Architect Design`, `## Architect Design:`) or a setext heading gives the "no Architect Design heading" problem.
- `Example:` at the start of a line inside Acceptance Criteria prose adds a phantom AC.
- Capitalised `State:` is not read (the ARCHITECT.md convention is lowercase `state:<name>`).
- Many unterminated `<!--` on one line take over a second per 40,000 occurrences.
- Found in review round 5, also absent from every real story:
  - An HTML comment opened in prose and closed many lines later hides everything between, including real states, with no problem. A line scanner cannot tell this from a deliberate comment, and CommonMark treats it the same way.
  - `<!--` inside inline code (`` `<!--` ``) opens a comment and reports "unclosed HTML comment" (loud false positive).
  - `<!-->` is a complete comment in CommonMark but is scanned as an open one, so a later `-->` hides the states between with no problem.
  - The state name pattern is ASCII only: `state:één` is not read, `state:one/two` is cut to `state:one`, and a trailing hyphen is kept in the name.
  - The space form `state: name` is read only after a `-` or `*` bullet, so `1. state: one`, a table cell and `**state:** one` are not read. The documented form is `state:<name>`.
**Technical Blocker:** None. Each case fails loudly or is unreachable in real stories, so the Visual Evidence Gate is not weakened.

**Options:**
1. Option A: leave as is. Real stories follow the BA and ARCHITECT formats, the checker names the problem when they do not, and the fix is to correct the story.
2. Option B: replace the scanner with a real markdown parser (new dev dependency for the harness), owner decision.

**Recommendation:** Option A until a real story hits one of these cases. Revisit B if the scanner needs another patch round.

**Next Steps:**
1. LIBRARIAN decides.
2. If B, file an INF ticket for the dependency and the swap.

**Status:** CHG-007 OPEN (awaiting decision)
**Assign to:** LIBRARIAN
