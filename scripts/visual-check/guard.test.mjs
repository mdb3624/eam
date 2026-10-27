// Chore: visual evidence gate (PreToolUse hook decision logic).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decide } from "./guard.mjs";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "eam-guard-"));
  mkdirSync(join(root, "docs/project/stories"), { recursive: true });
  writeFileSync(join(root, "docs/project/stories/US-001-login.md"), "**Scope:** FULL_STACK\n**Status:** IN_DEVELOPMENT\n");
  writeFileSync(join(root, "docs/project/gate_log.csv"), "timestamp,story,gate,actor,verdict,reason_code,detail,outcome\n");
  return root;
}
const edit = (root, newString, file = "docs/project/stories/US-001-login.md") => ({
  tool_name: "Edit",
  tool_input: { file_path: join(root, file), old_string: "x", new_string: newString },
});

test("blocks moving a UI story to CODE_REVIEW without evidence and logs the block once", () => {
  const root = repo();
  const out = decide({ input: edit(root, "**Status:** CODE_REVIEW"), root, mode: "block", sourceChangedAt: null });
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /US-001/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /capture\.mjs/);
  decide({ input: edit(root, "**Status:** CODE_REVIEW"), root, mode: "block", sourceChangedAt: null });
  const log = readFileSync(join(root, "docs/project/gate_log.csv"), "utf8");
  assert.equal(log.split("\n").filter((l) => l.includes(",VISUAL,hook,BLOCK,EVIDENCE_MISSING")).length, 1);
});

test("warn mode allows the edit but says why", () => {
  const root = repo();
  const out = decide({ input: edit(root, "**Status:** DONE"), root, mode: "warn", sourceChangedAt: null });
  assert.equal(out.hookSpecificOutput.permissionDecision, undefined);
  assert.match(out.hookSpecificOutput.additionalContext, /visual evidence/i);
});

test("off mode and unrelated edits pass through", () => {
  const root = repo();
  assert.deepEqual(decide({ input: edit(root, "**Status:** DONE"), root, mode: "off", sourceChangedAt: null }), {});
  assert.deepEqual(decide({ input: edit(root, "const a = 1", "frontend/src/App.tsx"), root, mode: "block", sourceChangedAt: null }), {});
  assert.deepEqual(decide({ input: edit(root, "**Status:** IN_DEVELOPMENT"), root, mode: "block", sourceChangedAt: null }), {});
});

test("a Write of the whole Story_Map row is also gated", () => {
  const root = repo();
  const out = decide({
    input: {
      tool_name: "Write",
      tool_input: {
        file_path: join(root, "docs/project/Story_Map.md"),
        content: "| US-001 | Login | EPIC-01 | All | FULL_STACK | CODE_REVIEW |\n",
      },
    },
    root,
    mode: "block",
    sourceChangedAt: null,
  });
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
});

test("MultiEdit edits are inspected too", () => {
  const root = repo();
  const out = decide({
    input: {
      tool_name: "MultiEdit",
      tool_input: {
        file_path: join(root, "docs/project/stories/US-001-login.md"),
        edits: [{ old_string: "a", new_string: "**Status:** CODE_REVIEW" }],
      },
    },
    root,
    mode: "block",
    sourceChangedAt: null,
  });
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
});
