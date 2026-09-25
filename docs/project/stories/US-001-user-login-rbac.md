# US-001: User Login and Role-Based Access

**Epic:** EPIC-01 Platform Foundation
**Actor:** All MVP personas (Maria, Dwayne, Jess, Priya, Sam) — administered by Sam Whitfield, System Administrator
**Status:** DRAFT — awaiting story owner approval
**Scope:** FULL_STACK

## User Story
As a **platform user**, I want to **log in and be granted access scoped to my role**, so that **I only see the screens and actions relevant to my job, and every action I take is attributable to me**.

## Acceptance Criteria (Gherkin)
```gherkin
Scenario: Successful login routes to role-appropriate home screen
  Given a user account exists with role "Dispatcher"
  When the user logs in with valid credentials
  Then the user lands on the Dispatch board
  And the user sees only the navigation items permitted for the Dispatcher role

Scenario: Invalid credentials are rejected
  Given a user account exists
  When the user submits an incorrect password 
  Then login is denied
  And no session is created

Scenario: A user without a role cannot access role-gated screens
  Given a user is authenticated but has no role assigned
  When the user attempts to open the Dispatch board
  Then access is denied with a clear message
```

## Edge Cases
- Account locked/disabled by an administrator — login denied with a distinct message from "wrong password."
- Session expiry mid-task — user is prompted to re-authenticate without losing unsaved field-form data (see US-019 for offline nuance).

## INVEST Self-Check
- [x] Independent — no other story required for this to be valuable or testable.
- [x] Negotiable — describes login/RBAC outcome, not a specific auth provider.
- [x] Valuable — every other MVP story depends on knowing who is acting.
- [x] Estimable — standard RBAC pattern, well understood.
- [x] Small — fits one PR.
- [x] Testable — Gherkin ACs above are pass/fail unambiguous.

## Field Contract Table
**Scope:** FULL_STACK

| UI Field | API Param | DB Column | Type | Required |
|---|---|---|---|---|
| Username/email | *(ARCH to fill)* | | | |
| Password | *(ARCH to fill)* | | | |
| Role badge (post-login) | *(ARCH to fill)* | | | |

**BA sign-off:** [x] Mike Barnes — pending story-owner approval of ACs (flips status to `READY_FOR_DESIGN`)

## Decision Log
- None yet.
