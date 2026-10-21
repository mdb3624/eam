#!/bin/bash
# PreToolUse guard on Edit|Write|MultiEdit: a UI-bearing story (Scope FULL_STACK or UI_ONLY) cannot
# be moved to CODE_REVIEW or later without valid visual evidence.
# Logic lives in scripts/visual-check/guard.mjs (unit-tested). Mode: EAM_VISUAL_GATE=block|warn|off
# (default block). Bash edits bypass this hook; CI runs check-visual-evidence.mjs --all as the backstop.
root=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$root" ] || ! command -v node >/dev/null 2>&1 && { echo '{}'; exit 0; }
[ -f "$root/scripts/visual-check/guard.mjs" ] || { echo '{}'; exit 0; }
exec node "$root/scripts/visual-check/guard.mjs"
