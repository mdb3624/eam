# EAM Style Guide (v0, minimal)

Owner: HFD. Status: DRAFT, awaiting Mike Barnes sign-off. Created with US-001 because HFD had no style guide to cite. Add tokens deliberately; do not invent values in a screen design.

Users sit at control-center consoles for a full shift or use tablets in the field. Priorities: legibility, low glare, status never by color alone.

## Color tokens (CSS custom properties on `:root`)

| Token | Light | Use |
|---|---|---|
| `--color-bg` | #f6f7f9 | Page background |
| `--color-surface` | #ffffff | Cards, forms |
| `--color-text` | #1b1f24 | Body text (contrast 16:1 on surface) |
| `--color-text-muted` | #4b5563 | Secondary text (7.5:1 on surface) |
| `--color-border` | #c3c9d1 | Inputs, dividers |
| `--color-primary` | #0b5cad | Primary button, links, focus ring (6.6:1 on white) |
| `--color-primary-text` | #ffffff | Text on primary |
| `--color-danger` | #b42318 | Error text and border (6.5:1 on white) |
| `--color-danger-bg` | #fdecea | Error banner background |
| `--color-warning` | #8a5a00 | Warning text (5.9:1 on white) |

Dark theme is out of scope for MVP.

## Typography

- Family: system UI stack, `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Scale: `--font-size-sm` 14px, `--font-size-base` 16px, `--font-size-lg` 20px, `--font-size-xl` 28px. Line height 1.5 for body, 1.25 for headings.
- Weights: 400 body, 600 labels and headings.

## Spacing

4px base. Tokens: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-6` 24px, `--space-8` 32px.

## Shape and elevation

- `--radius` 6px. Card shadow: `0 1px 3px rgba(0,0,0,0.12)`.
- Minimum touch target 44x44px for buttons and inputs.

## Components

- **Button primary:** `--color-primary` background, `--color-primary-text`, height 44px, padding `0 --space-4`. Disabled: 50% opacity, `cursor: not-allowed`. Loading: label replaced by "Signing in..." style progress text, button disabled.
- **Text input:** height 44px, 1px `--color-border`, focus ring 2px `--color-primary` with 2px offset. Error state: border `--color-danger` plus message text below, linked with `aria-describedby`.
- **Error banner:** `--color-danger-bg` background, `--color-danger` text, leading text label "Error:" (not color alone), `role="alert"`.
- **Role badge:** pill, `--color-surface` background, 1px `--color-primary` border, `--color-primary` text, 14px weight 600, text is the role display name.
- **Focus:** every interactive element shows the 2px primary ring on keyboard focus. Never remove the outline without replacing it.

## Test ids

Every interactive element has `data-testid` (see `.claude/rules/testing_standards.md`). Pattern: `<screen>-<element>`, e.g. `login-email`, `login-submit`.
