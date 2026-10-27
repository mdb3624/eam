#!/bin/bash
# PreToolUse guard on Edit|Write|MultiEdit: flags edits to files that are not in
# the active story's "## Files in Scope" list.
#
# Why: the CODER drifted early on, silently fixing unrelated things while it was
# "in the neighborhood". REVIEWER catches that after the fact. This catches it at
# the moment of the edit, with an exact rule (path match), not a probability.
#
# Modes (env EAM_SCOPE_GUARD):
#   warn  (default) allow the edit, tell the model it is out of scope, log a row
#   block           deny the edit and log a row
#   off             do nothing
#
# Active story: env EAM_ACTIVE_STORY, else the US-/CHG-/INF-/SEC-### in the branch name.
# Story doc:    env EAM_STORY_DOC, else <ID>*.md under docs/business/stories, docs/project/stories
#               or docs/changes (first match; works in FreightClub and EAM layouts).
# No story, no doc, or no filled-in scope list = pass through untouched.
#
# Log: docs/project/gate_log.csv (see docs/standards/Gate_Log.md).

mode="${EAM_SCOPE_GUARD:-warn}"
[ "$mode" = "off" ] && { echo '{}'; exit 0; }

input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && { echo '{}'; exit 0; }

norm() {
  local p="${1//\\//}"
  p=$(echo "$p" | sed -E 's#^/([a-zA-Z])/#\1:/#')
  echo "$p" | sed -E 's#^([A-Za-z]):#\L\1:#'
}

root=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$root" ] && { echo '{}'; exit 0; }
root=$(norm "$root")
rel=$(norm "$file")
rel="${rel#"$root"/}"

story="${EAM_ACTIVE_STORY:-}"
if [ -z "$story" ]; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  story=$(echo "$branch" | grep -oE '(US|CHG|INF|SEC)-[0-9]+' | head -1)
fi
[ -z "$story" ] && { echo '{}'; exit 0; }

doc="${EAM_STORY_DOC:-}"
if [ -z "$doc" ]; then
  for pattern in "$root/docs/business/stories/${story}"*.md "$root/docs/project/stories/${story}"*.md "$root/docs/changes/${story}"*.md; do
    [ -f "$pattern" ] && { doc="$pattern"; break; }
  done
fi
[ -z "$doc" ] || [ ! -f "$doc" ] && { echo '{}'; exit 0; }

# Collect the scope list: "- " lines under "## Files in Scope" until the next "## ".
scope=$(awk '
  /^## Files in Scope/ {on=1; next}
  /^## / {on=0}
  on && /^- / {sub(/^- +/, ""); gsub(/`/, ""); print}
' "$doc" | grep -v '\[' | sed -E 's/[[:space:]]+$//')
[ -z "$scope" ] && { echo '{}'; exit 0; }

# Always-allowed bookkeeping files.
case "$rel" in
  docs/business/stories/${story}*|docs/project/stories/${story}*|docs/changes/${story}*|docs/project/Story_Map.md|docs/project/gate_log.csv|test-results/*)
    echo '{}'; exit 0 ;;
esac

in_scope=0
while IFS= read -r glob; do
  [ -z "$glob" ] && continue
  g="${glob//\*\*/*}"
  case "$rel" in
    $g) in_scope=1; break ;;
  esac
  case "$g" in
    */) case "$rel" in "$g"*) in_scope=1; break ;; esac ;;
  esac
done <<< "$scope"

[ "$in_scope" = "1" ] && { echo '{}'; exit 0; }

# Out of scope: log once per story+path, then warn or block.
log="$root/docs/project/gate_log.csv"
verdict="WARN"; [ "$mode" = "block" ] && verdict="BLOCK"
if [ -f "$log" ] && ! grep -qF ",${story},CODER_SCOPE,hook,${verdict},OUT_OF_SCOPE_EDIT,\"${rel}\"" "$log"; then
  printf '%s,%s,CODER_SCOPE,hook,%s,OUT_OF_SCOPE_EDIT,"%s",pending\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$story" "$verdict" "$rel" >> "$log"
fi

msg="Scope guard: '$rel' is not in ${story}'s Files in Scope. Only edit it if the story needs it, and say why. If it is needed, ask ARCHITECT for a scope amendment; do not fix unrelated things in passing."

if [ "$mode" = "block" ]; then
  jq -n --arg m "$msg" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$m}}'
else
  jq -n --arg m "$msg" '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$m}}'
fi
exit 0
