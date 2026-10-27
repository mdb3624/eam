// Chore: visual evidence gate (CLI layer, run against a throwaway repo layout).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkStory, checkAll } from "./check-visual-evidence.mjs";

const png = Buffer.alloc(5000, 7);
const sha = createHash("sha256").update(png).digest("hex");

function repo({ withEvidence = true, status = "CODE_REVIEW", scope = "FULL_STACK", gateRows = "" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "eam-vis-"));
  mkdirSync(join(root, "docs/project/stories"), { recursive: true });
  mkdirSync(join(root, "docs/project/evidence/US-001"), { recursive: true });
  writeFileSync(join(root, "docs/project/stories/US-001-login.md"), `**Scope:** ${scope}\n**Status:** ${status}\n`);
  writeFileSync(
    join(root, "docs/project/Story_Map.md"),
    `| US-001 | Login | EPIC-01 | All | ${scope} | ${status} |\n| US-002 | Asset | EPIC-01 | M | FULL_STACK | READY_FOR_DESIGN |\n`,
  );
  writeFileSync(
    join(root, "docs/project/gate_log.csv"),
    "timestamp,story,gate,actor,verdict,reason_code,detail,outcome\n" + gateRows,
  );
  if (withEvidence) {
    const shots = [
      ["d-dark", 1280, "dark"],
      ["m-dark", 390, "dark"],
      ["d-light", 1280, "light"],
      ["m-light", 390, "light"],
    ].map(([name, width, theme]) => {
      writeFileSync(join(root, `docs/project/evidence/US-001/${name}.png`), png);
      return { name, file: `${name}.png`, sha256: sha, bytes: png.length, width, height: 800, theme, overflowPx: 0, expectTextFound: true };
    });
    writeFileSync(
      join(root, "docs/project/evidence/US-001/visual-report.json"),
      JSON.stringify({ story: "US-001", generatedAt: "2026-10-20T12:00:00Z", shots }),
    );
  }
  return root;
}

test("a UI story with complete evidence passes level 1", () => {
  const root = repo();
  assert.deepEqual(checkStory({ root, story: "US-001", level: 1, sourceChangedAt: "2026-10-20T11:00:00Z" }).problems, []);
});

test("a UI story with no evidence fails", () => {
  const root = repo({ withEvidence: false });
  const { problems } = checkStory({ root, story: "US-001", level: 1, sourceChangedAt: null });
  assert.match(problems[0], /No visual-report\.json/);
});

test("level 2 needs the REVIEWER VISUAL PASS row", () => {
  const root = repo({ status: "DONE" });
  assert.ok(checkStory({ root, story: "US-001", level: 2, sourceChangedAt: null }).problems.some((p) => /REVIEWER/.test(p)));
  const signed = repo({
    status: "DONE",
    gateRows: '2026-10-20T13:00:00Z,US-001,VISUAL,REVIEWER,PASS,,"viewed 4 shots",pending\n',
  });
  assert.deepEqual(checkStory({ root: signed, story: "US-001", level: 2, sourceChangedAt: null }).problems, []);
});

test("checkAll scans the Story_Map and only holds gated UI stories to the gate", () => {
  const failing = repo({ withEvidence: false });
  const result = checkAll({ root: failing, sourceChangedAt: null });
  assert.equal(result.length, 1, "US-002 is READY_FOR_DESIGN so it is not gated");
  assert.equal(result[0].story, "US-001");
  assert.ok(result[0].problems.length > 0);

  assert.deepEqual(checkAll({ root: repo(), sourceChangedAt: null }), []);
  assert.deepEqual(checkAll({ root: repo({ withEvidence: false, scope: "BACKEND_ONLY" }), sourceChangedAt: null }), []);
});

test("custom requirements from the HFD visual-checks.json are honoured", () => {
  const root = repo();
  mkdirSync(join(root, "docs/design/US-001"), { recursive: true });
  writeFileSync(
    join(root, "docs/design/US-001/visual-checks.json"),
    JSON.stringify({ requirements: { desktopMinWidth: 1024, mobileMaxWidth: 480, themes: ["dark", "light", "high-contrast"] }, shots: [] }),
  );
  const { problems } = checkStory({ root, story: "US-001", level: 1, sourceChangedAt: null });
  assert.ok(problems.some((p) => /high-contrast/.test(p)));
});
