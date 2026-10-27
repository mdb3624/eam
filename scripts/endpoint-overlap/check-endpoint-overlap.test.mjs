// Chore: PR-time endpoint capability-overlap report (CODER.md Service Reuse Check step 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseMappings,
  resourceKey,
  addedLinesByFile,
  findOverlaps,
  storyIds,
} from "./check-endpoint-overlap.mjs";

const controller = `package com.eam.workorder;

@RestController
@RequestMapping("/api/v1/work-orders")
public class WorkOrderController {

    @GetMapping
    public List<WorkOrder> list() { return null; }

    @PostMapping("/{id}/close")
    public void close() {}

    @DeleteMapping(path = "/{id}")
    public void remove() {}
}
`;

test("parseMappings joins the class prefix with each method path", () => {
  const found = parseMappings(controller);
  assert.deepEqual(
    found.map((m) => `${m.verb} ${m.path}`),
    [
      "GET /api/v1/work-orders",
      "POST /api/v1/work-orders/{id}/close",
      "DELETE /api/v1/work-orders/{id}",
    ],
  );
});

test("parseMappings reports the 1-based line of each mapping annotation", () => {
  const found = parseMappings(controller);
  assert.deepEqual(found.map((m) => m.line), [7, 10, 13]);
});

test("parseMappings handles a controller with no class-level prefix", () => {
  const found = parseMappings(`class A {\n  @GetMapping("/ping")\n  void p() {}\n}`);
  assert.deepEqual(found.map((m) => `${m.verb} ${m.path}`), ["GET /ping"]);
});

test("resourceKey skips api, version and path-variable segments", () => {
  assert.equal(resourceKey("/api/v1/work-orders/{id}/close"), "work-orders");
  assert.equal(resourceKey("/api/v2/alarms"), "alarms");
  assert.equal(resourceKey("/{id}"), null);
});

test("addedLinesByFile extracts added line numbers from a -U0 diff", () => {
  const diff = [
    "diff --git a/backend/A.java b/backend/A.java",
    "--- a/backend/A.java",
    "+++ b/backend/A.java",
    "@@ -3,0 +4,2 @@ foo",
    "+x",
    "+y",
    "@@ -10 +13 @@ bar",
    "+z",
    "diff --git a/backend/B.java b/backend/B.java",
    "--- /dev/null",
    "+++ b/backend/B.java",
    "@@ -0,0 +1,3 @@",
    "+a",
  ].join("\n");
  const map = addedLinesByFile(diff);
  assert.deepEqual([...map.get("backend/A.java")], [4, 5, 13]);
  assert.deepEqual([...map.get("backend/B.java")], [1, 2, 3]);
});

test("findOverlaps flags the same resource under a different controller", () => {
  const result = findOverlaps({
    newEndpoints: [
      { file: "a/NewController.java", verb: "GET", path: "/api/v2/work-orders", line: 9 },
    ],
    otherControllers: [
      {
        file: "a/WorkOrderController.java",
        mappings: [{ verb: "GET", path: "/api/v1/work-orders", line: 8 }],
      },
    ],
    docs: [
      { file: "Story_Map.md", text: "| US-013 | Create work order from incident |\n| US-099 | Billing |" },
    ],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].controllerHits.length, 1);
  assert.equal(result[0].controllerHits[0].file, "a/WorkOrderController.java");
  assert.equal(result[0].docHits.length, 1);
  assert.match(result[0].docHits[0].line, /US-013/);
});

test("findOverlaps ignores mappings in the controller that owns the new endpoint", () => {
  const result = findOverlaps({
    newEndpoints: [{ file: "a/C.java", verb: "POST", path: "/api/v1/alarms/{id}/ack", line: 5 }],
    otherControllers: [
      { file: "a/C.java", mappings: [{ verb: "GET", path: "/api/v1/alarms", line: 3 }] },
    ],
    docs: [],
  });
  assert.equal(result[0].controllerHits.length, 0);
});

test("storyIds collapses doc hits to unique story ids, in first-seen order", () => {
  const ids = storyIds([
    { file: "Story_Map.md", line: "| US-013 | Create work order |" },
    { file: "docs/project/stories/US-013-create-work-order.md", line: "Work order created" },
    { file: "Story_Map.md", line: "| US-020 | Close work order |" },
    { file: "notes.md", line: "no id here" },
  ]);
  assert.deepEqual(ids, ["US-013", "US-020"]);
});
