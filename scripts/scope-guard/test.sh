#!/bin/bash
# Tests for .claude/hooks/story-scope-guard.sh. Run: bash scripts/scope-guard/test.sh
# Builds a throwaway git repo per case so the real gate_log.csv is never touched.
set -u

HOOK="$(cd "$(dirname "$0")/../.." && pwd)/.claude/hooks/story-scope-guard.sh"
fail=0
pass=0

check() { # name, condition result (0 = ok)
  if [ "$2" -eq 0 ]; then pass=$((pass + 1)); echo "ok   $1"; else fail=$((fail + 1)); echo "FAIL $1"; fi
}

# new_repo <branch> <scope-body>  -> echoes repo path
new_repo() {
  local d; d=$(mktemp -d)
  git -C "$d" init -q -b "$1"
  git -C "$d" -c user.email=t@t -c user.name=t commit -q --allow-empty -m init
  mkdir -p "$d/docs/project/stories" "$d/docs/changes"
  printf 'timestamp,story,gate,actor,verdict,reason_code,detail,outcome\n' > "$d/docs/project/gate_log.csv"
  printf '# US-777: Test\n\n## Files in Scope\n%s\n\n## Decision Log\n' "$2" > "$d/docs/project/stories/US-777-test.md"
  echo "$d"
}

# run_hook <repo> <relative file>  -> hook stdout
run_hook() {
  (cd "$1" && jq -n --arg f "$1/$2" '{tool_input:{file_path:$f}}' | bash "$HOOK")
}

flagged() { echo "$1" | grep -q 'Scope guard'; }
logged() { grep -q "CODER_SCOPE,hook,WARN,OUT_OF_SCOPE_EDIT,\"$2\"" "$1/docs/project/gate_log.csv"; }

BARE=$'backend/pom.xml\nbackend/src/main/java/com/eam/auth/**\nfrontend/src/**'
BULLET=$'- backend/pom.xml\n- `backend/src/main/java/com/eam/auth/**`\n- frontend/src/**'

for style in bare bullet; do
  body="$BARE"; [ "$style" = bullet ] && body="$BULLET"
  r=$(new_repo feature/US-777-test "$body")

  out=$(run_hook "$r" backend/src/main/java/com/eam/auth/AuthService.java)
  ! flagged "$out"; check "$style list: in-scope glob edit passes" $?

  out=$(run_hook "$r" backend/pom.xml)
  ! flagged "$out"; check "$style list: in-scope exact path passes" $?

  out=$(run_hook "$r" scripts/other/thing.mjs)
  flagged "$out"; check "$style list: out-of-scope edit is flagged" $?
  logged "$r" scripts/other/thing.mjs; check "$style list: out-of-scope edit is logged to gate_log.csv" $?

  run_hook "$r" scripts/other/thing.mjs >/dev/null
  [ "$(grep -c 'scripts/other/thing.mjs' "$r/docs/project/gate_log.csv")" -eq 1 ]; check "$style list: same path is logged once" $?
  rm -rf "$r"
done

r=$(new_repo feature/US-777-test "$BARE")
out=$(run_hook "$r" docs/project/evidence/US-777/login-desktop-dark.png)
! flagged "$out"; check "story evidence directory is always allowed" $?
out=$(run_hook "$r" docs/project/evidence/US-999/login-desktop-dark.png)
flagged "$out"; check "another story's evidence directory is not allowed" $?
rm -rf "$r"

r=$(new_repo feature/US-777-test $'(to be filled by ARCHITECT)\n[path]')
out=$(run_hook "$r" anything/at/all.txt)
! flagged "$out"; check "placeholder-only scope list passes through" $?
rm -rf "$r"

r=$(new_repo main "$BARE")
out=$(run_hook "$r" scripts/other/thing.mjs)
! flagged "$out"; check "no story in branch name passes through" $?
rm -rf "$r"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
