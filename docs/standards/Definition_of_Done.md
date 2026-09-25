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

## 🎨 Visual Parity Gate (UI stories, if this project has a design reference)

Before marking any UI story DONE, the REVIEWER must perform a Visual Parity Audit against the design reference. Automated tests passing is NOT sufficient evidence for UI stories — REVIEWER must visually confirm parity before issuing a PASS verdict.
