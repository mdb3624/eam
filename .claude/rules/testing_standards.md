# Testing Standards

**Authority:** CODER, REVIEWER, LIBRARIAN roles | **Status:** MANDATORY

## Process Efficiency

- **Full suite vs. targeted runs during iteration:** run the full pre-merge test protocol as the gate for **final verification before a PR/merge/deploy** — that's non-negotiable. During red/green TDD iteration on a single class/module, running the full suite every time wastes time without adding signal; use a targeted run against a single test file/class instead, and reserve the full protocol for the final pre-PR check.

- **Log inspection: grep first, never raw full-log dump.** Build/test tool output (especially cold dependency resolution) can run hundreds of lines of pure noise before the actual result. Filter at the source (grep for `ERROR|FAIL|BUILD (SUCCESS|FAILURE)` or your stack's equivalent) before falling back to a wider read of the full log.

## Mandatory Rules

- **Navigation specs must click through the real UI**, not `page.goto()` straight to the destination — `page.goto()` proves the destination renders, not that the button's click-handler/navigation path works.
- **A green mocked test suite proves logic, not wiring.** Any new external API key / env-var-backed config property needs, before sign-off: an unmocked call against the real test-environment endpoint with the response pasted in, confirmation the property is declared in every config profile used, and confirmation the env var is passed through every relevant deployment config.

## Selector Strategy

- Every interactive element gets a unique, stable test-id attribute. CSS selectors, XPath, and text-content matching are banned for test selectors — they break on refactor. PRs with new interactive elements and no test-id are rejected at Reviewer gate.

## Traceability

- Every test file references its Story ID + AC in a header comment.
- Failed tests must produce a trace/artifact for investigation.

## Coverage Targets

- Backend unit + integration: 80% branch target (CI-enforced floor is 65% branch, ratchets up over time). Frontend unit: ≥60%. E2E: golden path + critical edge cases per story. No story marked DONE below the CI-enforced floor.

## Coverage-Weighted Complexity (CRAP)

Raw cyclomatic complexity alone is a poor risk signal: a fully-tested complex method is safe, an untested one isn't. If your toolchain supports it, enforce **CRAP** (Change Risk Anti-Pattern: `cc² × (1-coverage)³ + cc`) instead of a flat complexity ceiling, for every method your complexity linter flags above its threshold.

- **What CODER does when it fails:** see the decision table in `docs/roles/CODER.md` — low coverage first (usually resolves it on its own, no logic change), decompose only if coverage is already high. Out-of-scope violations are a CHG-###, never a silent suppression.

## Enforcement

| Violation | Action |
|-----------|--------|
| Non-test-id selector instead of the project's stable selector convention | Reviewer-gate rejection |
| Test failure with no trace/artifact | Marked unreproducible, re-run required |
| Missing AC traceability comment | Rejected (missing requirement link) |
| Coverage < target | Story cannot be marked DONE |

## CI Quality Reports (report-only)

Both run in CI without blocking merge. Ratchet to blocking once the baseline is stable; never loosen a threshold to pass a build.

- **Mutation report (pitest):** `./mvnw test-compile pitest:mutationCoverage` in `backend/`. Unit tests only (`*Test`); `*IT` classes need Docker. Catches tests that pass without exercising the code, which JaCoCo cannot see. Baseline 2026-10-05: 35 mutations, 31% killed, 73% test strength (config classes are covered by ITs, which this run skips).
- **Endpoint overlap report:** `node scripts/endpoint-overlap/check-endpoint-overlap.mjs --base origin/main`. Flags a new endpoint whose resource already exists in another controller, and lists matching Story_Map lines. REVIEWER confirms the CODER.md Service Reuse Check step 5 was done or a CHG-### filed. `--strict` fails on controller overlap.
