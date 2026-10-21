# Definition of Done (DoD)
All features must pass these gates before being marked "DONE".

## 💻 Coding Gate
- Coverage clears the 65% CI floor (unit tests included); 80% is the target beyond the floor.
- Follows this project's data-layer conventions (see `.claude/rules/`).

## 🛡️ Security Gate
- No sensitive data (PII/secrets) in logs.

## 🔌 API Contract Gate (if this project has a frontend/backend split)
- Every frontend API call must resolve to an existing backend endpoint (correct version prefix, matching HTTP method).
- If the API client's base URL changes, ALL feature API files must be audited for breakage — not just the feature being developed.

## 🧪 Test Suite Gate
Before marking any story DONE, all automated test suites must be green:

- **Backend unit + integration tests:** 0 failures; coverage clears the 65% CI floor (80% is the target beyond the floor).
- **Frontend unit tests:** 0 failures.
- **Frontend e2e tests (if applicable):** 0 failures. Any UI feature touched by the story must have a corresponding golden-path test before sign-off.

A story cannot be marked DONE if any suite has a failing test.

## 🖥️ Integration Smoke Test Gate
Before marking any story DONE, the developer must verify the golden path end-to-end in a running dev environment:
1. **Login** (or equivalent entry point) with a valid account.
2. **Primary feature** — exercise the feature introduced or modified by the story.
3. **Adjacent flows** — confirm nearby features still render without errors.
4. **Logout/exit** — confirm the session/flow terminates cleanly.

A story cannot be marked DONE if any step above produces a console error, network 4xx/5xx, or blank UI.

## 🎨 Visual Evidence Gate (UI stories: Scope FULL_STACK or UI_ONLY)

Passing tests and an accessibility-tree check are NOT visual verification. US-001 was moved to CODE_REVIEW that way; real screenshots then showed overlapping text and a clipped phone layout, and an earlier "logged in" screenshot set was the login page because the dev proxy pointed at the wrong backend.

Mechanical, not optional (`scripts/visual-check/`, enforced by `.claude/hooks/visual-evidence-guard.sh` and a blocking CI job):

1. **HFD** defines `docs/design/<ID>/visual-checks.json`: every screen and state, a phone and a desktop width, every theme, and `expectText` that is only on the correct screen.
2. **CODER** runs `node scripts/visual-check/capture.mjs --story <ID> --base <frontend url> --token <name>=<jwt>` against the real test stack. Screenshots are written to `docs/project/evidence/<ID>/` with `visual-report.json` (size, hash, horizontal overflow, expected-text check). CODER then **opens and looks at every PNG** and fixes what is wrong. A story cannot move to `CODE_REVIEW` without valid, fresh evidence (the hook blocks the status edit).
3. **REVIEWER** opens every PNG, compares against the HFD design and style guide, and logs a `VISUAL` row in `gate_log.csv` (PASS or KICK_BACK). A story cannot move to `REVIEW_PASSED`, `LIBRARIAN_VERIFICATION` or `DONE` without a REVIEWER `VISUAL PASS` newer than the evidence. CODER cannot sign their own evidence.
4. Evidence goes stale when `frontend/src` changes after capture; re-capture and re-review.
5. Capture uses Playwright (devDependency of `frontend/`, also installed globally with `npm install -g playwright`) driving an installed Edge or Chrome, or bundled Chromium. If a screenshot tool saves somewhere you cannot open (for example the Docker MCP browser, which saves inside its container), use `capture.mjs`. Never fall back to the accessibility tree and call it done. Interactive states (error banners, validation) are captured with `steps` in `visual-checks.json`.

Check any time: `node scripts/visual-check/check-visual-evidence.mjs --story <ID> [--level 2]` or `--all`.
