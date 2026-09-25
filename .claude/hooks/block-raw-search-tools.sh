#!/bin/bash
# PreToolUse guard on Bash: blocks find/cat/head/tail/grep/sed/awk when they are
# the LEADING command of a statement (i.e. reading a file/dir straight into
# context) in favor of Read/Grep/Glob, or a sandboxed-execution tool for
# large/processed output.
#
# NOT blocked: grep/sed/awk/head/tail used to FILTER another command's output
# (e.g. `docker logs my-tester | grep -E "ERROR|BUILD"`) — that pattern is
# still useful for build/log inspection, so only the leading segment of each
# top-level statement (before the first `|`) is checked.

input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

if [ -z "$cmd" ]; then
  echo '{}'
  exit 0
fi

banned="cat find head tail grep sed awk"
blocked_as=""

normalized=$(echo "$cmd" | sed -E 's/(&&|\|\||;)/\n/g')

while IFS= read -r stmt; do
  leading=$(echo "$stmt" | sed -E 's/\|.*//')
  first_word_raw=$(echo "$leading" | awk '{print $1}')
  first_word=$(basename "$first_word_raw" 2>/dev/null)
  [ -z "$first_word" ] && first_word="$first_word_raw"
  for b in $banned; do
    if [ "$first_word" = "$b" ]; then
      blocked_as="$b"
      break 2
    fi
  done
done <<< "$normalized"

if [ -n "$blocked_as" ]; then
  reason="Raw '$blocked_as' reads output straight into context. Use Grep/Glob for search, Read for a file you intend to Edit, or a sandboxed-execution tool for large/processed output instead. (Piping INTO grep/sed/awk/head/tail to filter another command's output, e.g. 'docker logs x | grep ERROR', is still fine and not blocked.)"
  jq -n --arg reason "$reason" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
  exit 0
fi

echo '{}'
