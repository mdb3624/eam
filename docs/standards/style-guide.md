# EAM Style Guide (v1)

Owner: HFD. Status: APPROVED by Mike Barnes, 2026-10-20 (look and feel, from `docs/design/US-001/style-guide-poc.html`). Add tokens deliberately; do not invent values in a screen design.

Users sit at control-center consoles for full shifts or use tablets in the field. Priorities: low glare, legibility, severity never by color alone.

## Themes

- **Dark (default)** for the control room.
- **Light** for tablets in daylight. Selected with `data-theme="light"` on `<html>`. Default `data-theme="dark"`. The choice is remembered per user in `localStorage` (convenience only; must work without it).

## Color tokens (CSS custom properties)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | #0a1120 | #eef2f7 | Page background |
| `--surface` | #111b2f | #ffffff | Panels, sidebar, cards |
| `--surface-2` | #17243d | #f4f7fb | Inputs, user card, hover rows |
| `--border` | #25365a | #cfd8e5 | Dividers, input borders |
| `--text` | #e8eef9 | #0e1a2c | Body text |
| `--muted` | #9db0cc | #44556e | Secondary text, labels |
| `--primary` | #22d3ee | #0369a1 | Actions, active nav, focus ring |
| `--primary-text` | #04222b | #ffffff | Text on primary |
| `--primary-soft` | rgba(34,211,238,.14) | rgba(3,105,161,.10) | Active nav fill, badge fill |
| `--critical` | #ff6b6b | #b42318 | Critical severity, errors |
| `--major` | #ffb020 | #8a4b00 | Major severity, high criticality, warnings |
| `--minor` | #60a5fa | #1d4ed8 | Minor severity |
| `--ok` | #34d399 | #0b7a4b | In service, success |
| `--critical-bg` `--major-bg` `--minor-bg` `--ok-bg` | 14% tint of the color | pale tint | Chip and banner fills |

Contrast (WCAG AA needs 4.5:1 for text), measured against `--surface`:

| Pair | Dark | Light |
|---|---|---|
| `--text` | 14.8 | 17.5 |
| `--muted` | 7.8 | 7.6 |
| `--primary` | 9.5 | 5.9 |
| `--primary-text` on `--primary` | 9.2 | 5.9 |
| `--critical` | 6.2 | 6.6 |
| `--major` | 9.4 | 6.8 |
| `--minor` | 6.8 | 6.7 |
| `--ok` | 8.9 | 5.4 |

## Typography

- Family: `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Inter is used if installed; no webfont is loaded in the MVP (system fallback is acceptable).
- Mono (`ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace`) for asset IDs, coordinates, ages and other identifiers.
- Scale: `--fs-sm` 13px, `--fs-base` 15px, `--fs-lg` 20px, `--fs-xl` 30px. Line height 1.5 body, 1.2 headings.
- Weights: 400 body, 600 labels, 650 headings. Heading letter spacing -0.01em.
- Eyebrow label: 11px, uppercase, 0.12em tracking, `--primary`, weight 650.

## Spacing and shape

- 4px base: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s6` 24, `--s8` 32.
- Radius: `--radius` 10px (cards, panels), `--radius-sm` 6px (inputs, buttons, nav items).
- Card shadow: dark `0 8px 24px rgba(0,0,0,.35)`, light `0 4px 16px rgba(14,26,44,.10)`.
- Minimum touch target 44x44px for buttons, inputs and nav items.

## Components

- **App shell:** 232px left sidebar (`--surface`, 1px right border) with logo, nav, user card pinned to the bottom. Main area `--bg` with `--s6` padding. Below 760px the sidebar becomes a top row with horizontally scrolling nav.
- **Logo:** hexagon outline with lightning bolt in `--primary`, wordmark "EAM", sub-label "ASSET AND FIELD OPS" 10px, 0.14em tracking, `--muted`.
- **Nav item:** 44px high, 18px stroke icon (1.8px stroke), `--muted` text. Hover `--surface-2`. Active: `--primary-soft` fill, 3px left border `--primary`, `--text`, weight 650, `aria-current="page"`, icon in `--primary`.
- **Button primary:** `--primary` fill, `--primary-text`, 44px, weight 600, hover brightness 1.08, disabled 45% opacity and `not-allowed`. **Ghost:** transparent, `--text`, 1px `--border`, hover `--surface-2`.
- **Input:** `--surface-2` fill, 1px `--border`, 44px, `--radius-sm`. Label above in `--muted` 13px weight 600. Error: `--critical` border plus message below linked with `aria-describedby` and `aria-invalid="true"`.
- **Error banner:** `--critical-bg` fill, 1px `--critical` border, `--critical` text, leading bold "Error:" label, `role="alert"`.
- **Role badge:** pill, `--primary-soft` fill, 1px `--primary` border, `--primary` text, 12px weight 650.
- **Severity chip:** pill with 1px currentColor border, tinted fill, 12px weight 650, a 12px shape icon and a word. Never color alone.

  | Level | Color | Shape | Word |
  |---|---|---|---|
  | Critical | `--critical` | diamond | Critical |
  | Major / high | `--major` | triangle | Major / High |
  | Minor | `--minor` | rounded square | Minor |
  | In service / ok | `--ok` | circle | In service |

- **Table:** header 11px uppercase `--muted`, 0.06em tracking, rows separated by 1px `--border`, 12px cell padding, IDs and ages in mono.
- **Card:** `--surface`, 1px `--border`, `--radius`, `--s6` padding, card shadow.
- **Login:** two panes in one rounded card. Brand pane (grid lines, power-line art, tagline) left; form pane right. Below 760px the brand pane stacks on top at reduced height.
- **Focus:** 2px `--primary` outline, 2px offset, on every interactive element. Never remove without replacing.

## Test ids

Every interactive element has `data-testid` (see `.claude/rules/testing_standards.md`). Pattern: `<screen>-<element>`, e.g. `login-email`, `login-submit`.
