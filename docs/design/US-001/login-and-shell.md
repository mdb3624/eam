# US-001 HFD Design: Login and Role Shell

Status: READY_FOR_CODER once Mike Barnes signs off `docs/standards/style-guide.md`.
Inputs: US-001 ACs (approved), Architect design and Field Contract Table (signed), `docs/standards/style-guide.md`.
Scope: display and interaction only. API shape is in the story's Architect Design.

## Screens and wireframes

### 1. Login (`/login`)

```
+--------------------------------------------+
|                    EAM                     |
|        Asset and Field Operations          |
|  +--------------------------------------+  |
|  | Error: Invalid email or password.    |  |  <- only on failure, role="alert"
|  +--------------------------------------+  |
|  Email                                     |
|  [ name@utility.com                     ]  |
|  Password                                  |
|  [ ********                             ]  |
|  [            Sign in                    ]  |
+--------------------------------------------+
```

- Single column, card centered, max width 400px, `--space-6` padding.
- Field order: email, password, submit. Email first because it is what the user knows first; the tenant is derived from it, so there is no utility field (Rule 1).
- `autocomplete="username"` on email, `autocomplete="current-password"` on password so the browser fills both (Rule 1).
- Autofocus the email input on load. Enter submits.
- Submit disabled while the request is in flight and shows "Signing in...". Disabled also when email or password is empty.
- Banner messages come from the API `message` field verbatim: invalid credentials (401), disabled account (403, different text), and "Your session expired. Sign in again." when redirected after a 401.
- Client validation: required + email format on blur, message "Enter a valid email address." The password is never trimmed or echoed.

### 2. Role shell (all authenticated routes)

```
+----------------------------------------------------------+
| EAM    [ Dispatch board ]            Maria A. [Dispatcher] [Sign out] |
+----------------------------------------------------------+
|  <screen content>                                        |
+----------------------------------------------------------+
```

- Top bar: product name, navigation items for the user role, user email, role badge, Sign out button.
- Navigation items per role (only screens that exist; placeholders until their stories ship):

| Role | Home route | Nav items |
|---|---|---|
| OPERATOR | `/alarms` | Alarm console |
| DISPATCHER | `/dispatch` | Dispatch board |
| FIELD_TECHNICIAN | `/work` | My work |
| MAINTENANCE_SUPERVISOR | `/closure` | Work order closure |
| SYSTEM_ADMIN | `/admin` | Administration |

- Active item has a 3px bottom border in `--color-primary` plus `aria-current="page"` (not color alone, bold weight too).
- Role badge shows display names: Control-Center Operator, Dispatcher, Field Technician, Maintenance Supervisor, System Administrator.
- Placeholder screen body: heading with the screen name and the line "This screen is coming in a later release."
- Sign out clears the token and returns to `/login`.

### 3. Access denied (in shell, any role-gated route the user cannot open)

- Heading "Access denied" and the text "You do not have access to this screen." Shell stays visible with the nav the user is allowed to see. A user with no role sees the shell with no nav items, the badge reads "No role assigned", and this message on every route except `/login`.
- A "Go to your home screen" link appears only when the user has a role.

## Interaction rules

- After successful login, redirect to the role home route. Visiting `/` redirects to the home route when signed in, `/login` otherwise.
- Visiting `/login` while signed in redirects to the home route.
- Opening a route outside the role (e.g. an Operator opening `/dispatch`) renders Access denied, not a redirect, so the user sees why.
- Any API 401 clears the session and redirects to `/login` with the session-expired banner.

## Accessibility

- Labels bound to inputs with `htmlFor`. Error banner `role="alert"` so it is announced. Field errors tied by `aria-describedby`, inputs get `aria-invalid="true"`.
- Full keyboard path: tab order is email, password, submit. Visible focus ring everywhere (style guide).
- Contrast values in the style guide meet WCAG AA. Errors carry the "Error:" text label.
- Touch targets are at least 44px.

## States

| Element | Default | Hover | Focus | Disabled | Loading | Error |
|---|---|---|---|---|---|---|
| Sign in button | primary | primary darkened 8% | 2px ring | 50% opacity | "Signing in..." | n/a |
| Inputs | border | border darkened | 2px ring | n/a | n/a | danger border + message |

Responsive: single breakpoint at 640px. Below it the top bar wraps to two rows (brand and Sign out on the first, nav on the second); the login card goes full width with `--space-4` gutters.

## Test ids

`login-email`, `login-password`, `login-submit`, `login-error`, `shell-nav-<route>` (e.g. `shell-nav-dispatch`), `shell-role-badge`, `shell-user-email`, `shell-signout`, `screen-<name>` (e.g. `screen-dispatch`), `access-denied`.

## AC mapping

| AC | UI elements |
|---|---|
| Successful login routes to role home | Login form, redirect rule, shell nav table |
| Invalid credentials rejected, no session | `login-error` banner, no token stored |
| No role cannot access role-gated screens | Access denied state, empty nav, "No role assigned" badge |
| Edge: disabled account distinct message | `login-error` with the 403 message |
| Edge: session expiry | Session-expired banner on `/login` |

## Visual Definition of Done

- [x] ACs mapped to UI elements (table above)
- [x] Free-text fields checked for autofill/default (Rule 1): autocomplete attributes, no tenant field
- [x] Related fields grouped and ordered by task (Rule 2/3)
- [x] Wireframes provided
- [x] Colors, type, spacing sourced from the style guide
- [x] Responsive breakpoint defined
- [x] Interactive states documented
- [x] Accessibility verified on paper (contrast, ARIA, keyboard)
- [x] Field Contract Table reviewed row by row: every UI field has an API param and DB column or a written N/A, no type mismatches, no duplicate param names

## Open item for Mike

- Sign off `docs/standards/style-guide.md` (HFD role doc says no style guide exists; role docs are protected, so I did not edit them. Update the HFD role doc text once you approve.)
