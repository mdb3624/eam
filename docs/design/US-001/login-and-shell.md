# US-001 HFD Design: Login and Role Shell

Status: READY_FOR_CODER. Style guide v1 approved by Mike Barnes, 2026-10-20.
Inputs: US-001 ACs (approved), Architect design and Field Contract Table (signed), `docs/standards/style-guide.md`.
Scope: display and interaction only. API shape is in the story's Architect Design.

## Screens and wireframes

### 1. Login (`/login`)

Reference render: `style-guide-poc.html` (Login, Wrong password, Disabled account tabs).

```
+---------------------------+--------------------------+
| [hex bolt] EAM            |  Sign in                 |
|                           |  Use your utility email. |
|  grid + power-line art    |  [Error: ...]  (on fail) |
|                           |  Email                   |
|  Know the asset.          |  [ name@utility.com   ]  |
|  Act on the alarm.        |  Password                |
|  One canonical record...  |  [ ********           ]  |
|                           |  [      Sign in       ]  |
+---------------------------+--------------------------+
```

- Two-pane card per the style guide. Form pane is the only interactive area.
- Field order: email, password, submit. Email first because it is what the user knows first; the tenant is derived from it, so there is no utility field (Rule 1).
- `autocomplete="username"` on email and `autocomplete="current-password"` on password so the browser fills both (Rule 1). Autofocus email. Enter submits.
- Submit disabled while the request is in flight (label "Signing in...") and while email or password is empty.
- Banner text comes from the API `message` verbatim: invalid credentials (401), disabled account (403, different text), and "Your session expired. Sign in again." after a 401 redirect.
- Client validation: required and email format on blur, message "Enter a valid email address." The password is never trimmed or echoed.

### 2. Role shell (all authenticated routes)

Left sidebar per the style guide: logo, nav, user card (email, role badge, Sign out) at the bottom.

- Navigation items per role (only screens that exist; placeholders until their stories ship). Icons: bell (alarms), board (dispatch), wrench (work), check (closure), person (admin).

| Role | Home route | Nav items |
|---|---|---|
| OPERATOR | `/alarms` | Alarm console |
| DISPATCHER | `/dispatch` | Dispatch board |
| FIELD_TECHNICIAN | `/work` | My work |
| MAINTENANCE_SUPERVISOR | `/closure` | Work order closure |
| SYSTEM_ADMIN | `/admin` | Administration |

- Active item: fill, 3px left border, bold, `aria-current="page"` (not color alone).
- Role badge display names: Control-Center Operator, Dispatcher, Field Technician, Maintenance Supervisor, System Administrator.
- Placeholder body: eyebrow with role name, heading with the screen name, line "This screen is coming in a later release."
- Theme toggle (dark default, light option) lives in the user card; remembered in `localStorage` with a safe fallback.
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
- Full keyboard path: tab order is email, password, submit. Visible focus ring everywhere (style guide v1).
- Contrast values in the style guide meet WCAG AA. Errors carry the "Error:" text label.
- Touch targets are at least 44px.

## States

| Element | Default | Hover | Focus | Disabled | Loading | Error |
|---|---|---|---|---|---|---|
| Sign in button | primary | primary darkened 8% | 2px ring | 50% opacity | "Signing in..." | n/a |
| Inputs | border | border darkened | 2px ring | n/a | n/a | danger border + message |

Responsive: single breakpoint at 760px. Below it the sidebar becomes a top row with horizontally scrolling nav, and the login brand pane stacks above the form at reduced height.

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

## Note

- The HFD role doc still says no style guide exists. Role docs are protected; update that text to point at `docs/standards/style-guide.md`.
