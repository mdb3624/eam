# US-002 HFD Design: Asset Search and Asset 360

Status: READY_FOR_CODER. Style guide v1 (`docs/standards/style-guide.md`), tokens in `frontend/src/styles/tokens.css`.
Inputs: US-002 ACs (approved), Architect Design and Field Contract Table (signed 2026-11-03).
Scope: display and interaction only. No API or schema decisions are made here.

## Navigation

Every role gets a second nav item after its home item: **Assets** (`/assets`, icon: search), test id `shell-nav-assets`. The Asset 360 route `/assets/:id` keeps the Assets item active. `roles.ts` gains the item; the five existing role home items are unchanged.

## Screens and wireframes

### 1. Asset search (`/assets`)

```
+-----------------------------------------------------+
| Asset search                                        |
| Enter an Asset ID to open its record.               |
| Asset ID                                            |
| [ TX-4587                       ] [ Search ]        |
| (inline message here: blank, or no match)           |
+-----------------------------------------------------+
```

- Single card, one field, one button. Autofocus the field, Enter submits (Rule 1: nothing else to type).
- `autocomplete="off"`. The value is trimmed before sending; case is ignored by the API, so the UI does not change case.
- Submit is never disabled, so a blank submit can show the message. Blank shows "Enter an Asset ID." under the field (`role="alert"`, `aria-describedby`, `aria-invalid`).
- One match: navigate to `/assets/:id` (AC 1).
- No match: stay on the page and show "No matching asset for "<entered text>". Check the Asset ID and try again." in a banner (AC 3). Never a blank or error screen.
- Button label "Searching..." and field read-only while the request is in flight.

### 2. Asset 360 (`/assets/:id`)

```
+-----------------------------------------------------+
| < Asset search                                      |
| TX-4587                          [IN SERVICE] [HIGH]|
| Main St Transformer                                 |
| Location  40.71280, -74.00600                       |
+-----------------------------------------------------+
| Hierarchy                                           |
| Metro Power  >  SUB-3  >  F-12  >  TX-4587          |
+-----------------------------------------------------+
| Details                                             |
| Manufacturer   ABB        Model   TX-200            |
| Serial number  SN-99812                             |
+-----------------------------------------------------+
```

- Header card: Asset ID in mono, name, status chip, criticality chip, location line. Order follows what the operator needs first when confirming which physical asset an alarm means: ID, name, state, importance, where (Rule 3).
- Status and criticality are chips with a word and a shape icon, never color alone (style guide severity chip). Mapping: IN_SERVICE ok, OUT_OF_SERVICE major, RETIRED muted; LOW minor, MEDIUM minor, HIGH major, CRITICAL critical.
- Location: `latitude, longitude` to 5 decimal places in mono. When null: "Not recorded" in muted text (state:location-not-recorded). No map (US-007).
- Hierarchy card: root first, each entry shows type label (Utility, Substation, Feeder, Transformer) and code or name. The current asset is last, bold, not a link. Ancestors link to `/assets/:id` except the utility entry, which is plain text. Below 760px the path stacks vertically with the type label above each entry.
- Details card: manufacturer, model, serial number in a two-column list. Each missing value shows "Not recorded".
- Back link "Asset search" returns to `/assets`.

### 3. Asset not found (`/assets/:id`, 404)

Same card as Access denied: heading "Asset not found", text "No matching asset.", link "Back to asset search". Shell stays visible.

## Interaction rules

- A 401 on any asset request clears the session and redirects to `/login` with "Your session expired. Sign in again." (existing US-001 handler, `state:session-expired`).
- A user with no role sees Access denied on `/assets` and `/assets/:id` (`state:access-denied`).
- Loading uses the existing `Loading` component. Unexpected failures show the existing shared error text in a `role="alert"` banner.

## Accessibility

- Label bound to the input with `htmlFor`. Banners and field errors use `role="alert"`.
- Heading order: h1 is the asset ID on Asset 360 and "Asset search" on the search page; cards use h2.
- Hierarchy is an ordered list in a `nav` with `aria-label="Asset hierarchy"`; the current item has `aria-current="page"`.
- Visible focus ring, tab order: field, Search. 44px minimum touch targets. Chips carry text.

## Test ids

`asset-search-input`, `asset-search-submit`, `asset-search-error`, `asset-search-no-match`, `asset-header-code`, `asset-header-name`, `asset-status`, `asset-criticality`, `asset-location`, `asset-hierarchy`, `asset-hierarchy-item`, `asset-manufacturer`, `asset-model`, `asset-serial`, `asset-not-found`, `shell-nav-assets`.

## Capture fixtures (CODER builds with the fixture builder in the test plan)

- `TX-4587`: transformer under feeder `F-12` under substation `SUB-3`, with location 40.7128, -74.0060, manufacturer, model, serial.
- `TX-NOLOC`: transformer with no location and no manufacturer, model or serial.
- Tokens for the capture run: `operator` (any role), `norole`, `expired` (a validly signed token whose `exp` is in the past).

## AC and state mapping

| Covers | UI |
|---|---|
| AC1 | Search page, one match opens Asset 360 header |
| AC2 | Hierarchy card |
| AC3 | `asset-search-no-match` banner |
| state:search-idle | Search page, empty |
| state:search-blank-blocked | Blank submit message |
| state:search-no-match | No-match banner |
| state:asset-loaded | Asset 360 |
| state:asset-not-found | Asset not found card |
| state:location-not-recorded | `TX-NOLOC` header |
| state:access-denied | No-role user on `/assets` |
| state:session-expired | Expired token on `/assets/:id` |

## Visual Definition of Done

- [x] ACs mapped to UI elements
- [x] Free-text fields checked for a default (Rule 1): one field, nothing to autofill
- [x] Related data grouped by task, ordered by what the operator needs first (Rule 2/3)
- [x] Wireframes provided
- [x] Colors, type and spacing sourced from the style guide (chip, card, mono, 760px breakpoint); no new tokens
- [x] Responsive breakpoint defined (760px)
- [x] Interactive states documented
- [x] Accessibility verified on paper
- [x] Field Contract Table reviewed row by row: every UI field has an API param and DB column or a written N/A, no type mismatches, no duplicate param names
- [x] `visual-checks.json` authored with `covers` for every AC and every `state:` name
