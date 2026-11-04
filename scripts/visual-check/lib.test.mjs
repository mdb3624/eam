// Chore: visual evidence gate. Lessons from US-001: UI work was called complete on an
// accessibility-tree check alone; real screenshots then showed overlapping text and a clipped
// mobile form, and an all-login-page screenshot set came from a mis-pointed dev proxy.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseScope,
  isUiScope,
  levelForStatus,
  parseGateLog,
  detectGatedTransitions,
  evaluateEvidence,
  coverageProblems,
} from "./lib.mjs";

const SHA = "a".repeat(64);
const shot = (over = {}) => ({
  name: "login-desktop-dark",
  file: "login-desktop-dark.png",
  sha256: SHA,
  bytes: 50000,
  width: 1280,
  height: 800,
  theme: "dark",
  overflowPx: 0,
  expectTextFound: true,
  ...over,
});
const goodShots = () => [
  shot(),
  shot({ name: "login-mobile-dark", file: "login-mobile-dark.png", width: 390 }),
  shot({ name: "login-desktop-light", file: "login-desktop-light.png", theme: "light" }),
  shot({ name: "login-mobile-light", file: "login-mobile-light.png", width: 390, theme: "light" }),
];
const reportOf = (shots = goodShots(), generatedAt = "2026-10-20T12:00:00Z") => ({
  story: "US-001",
  generatedAt,
  shots,
});
const base = (over = {}) => ({
  story: "US-001",
  report: reportOf(),
  hashesOnDisk: Object.fromEntries(goodShots().map((s) => [s.file, SHA])),
  requirements: { desktopMinWidth: 1024, mobileMaxWidth: 480, themes: ["dark", "light"] },
  sourceChangedAt: "2026-10-20T11:00:00Z",
  gateRows: [],
  level: 1,
  ...over,
});

test("parseScope reads the Scope line from a story doc", () => {
  assert.equal(parseScope("# US-1\n**Scope:** FULL_STACK\n"), "FULL_STACK");
  assert.equal(parseScope("**Scope:** UI_ONLY"), "UI_ONLY");
  assert.equal(parseScope("no scope here"), null);
});

test("only UI-bearing scopes need visual evidence", () => {
  assert.equal(isUiScope("FULL_STACK"), true);
  assert.equal(isUiScope("UI_ONLY"), true);
  assert.equal(isUiScope("BACKEND_ONLY"), false);
  assert.equal(isUiScope(null), false);
});

test("levelForStatus: CODE_REVIEW needs evidence, later statuses also need REVIEWER VISUAL PASS", () => {
  assert.equal(levelForStatus("DRAFT"), 0);
  assert.equal(levelForStatus("IN_DEVELOPMENT"), 0);
  assert.equal(levelForStatus("CODE_REVIEW"), 1);
  assert.equal(levelForStatus("REVIEW_PASSED"), 2);
  assert.equal(levelForStatus("LIBRARIAN_VERIFICATION"), 2);
  assert.equal(levelForStatus("DONE"), 2);
});

test("parseGateLog reads rows and tolerates quoted commas", () => {
  const rows = parseGateLog(
    'timestamp,story,gate,actor,verdict,reason_code,detail,outcome\n' +
      '2026-10-20T13:00:00Z,US-001,VISUAL,REVIEWER,PASS,,"viewed 8 shots, no defects",pending\n',
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(
    { story: rows[0].story, gate: rows[0].gate, actor: rows[0].actor, verdict: rows[0].verdict },
    { story: "US-001", gate: "VISUAL", actor: "REVIEWER", verdict: "PASS" },
  );
  assert.equal(rows[0].detail, "viewed 8 shots, no defects");
});

test("complete evidence passes at level 1", () => {
  assert.deepEqual(evaluateEvidence(base()).problems, []);
});

test("missing report fails with a fix hint", () => {
  const { problems } = evaluateEvidence(base({ report: null }));
  assert.match(problems[0], /No visual-report\.json/);
  assert.match(problems[0], /capture\.mjs/);
});

test("a screenshot file missing on disk or with a different hash is rejected", () => {
  const missing = evaluateEvidence(base({ hashesOnDisk: {} }));
  assert.ok(missing.problems.some((p) => /missing on disk/.test(p)));
  const tampered = evaluateEvidence(
    base({ hashesOnDisk: { ...base().hashesOnDisk, "login-desktop-dark.png": "b".repeat(64) } }),
  );
  assert.ok(tampered.problems.some((p) => /hash mismatch/.test(p)));
});

test("horizontal overflow is a defect", () => {
  const shots = goodShots();
  shots[1] = shot({ name: "login-mobile-dark", file: "login-mobile-dark.png", width: 390, overflowPx: 24 });
  const { problems } = evaluateEvidence(base({ report: reportOf(shots) }));
  assert.ok(problems.some((p) => /overflow/.test(p) && /login-mobile-dark/.test(p)));
});

test("a shot that did not show its expected text (wrong page, failed login, bad proxy) is rejected", () => {
  const shots = goodShots();
  shots[0] = shot({ expectTextFound: false });
  const { problems } = evaluateEvidence(base({ report: reportOf(shots) }));
  assert.ok(problems.some((p) => /expected text/.test(p)));
});

test("a blank or tiny image is rejected", () => {
  const shots = goodShots();
  shots[0] = shot({ bytes: 300 });
  const { problems } = evaluateEvidence(base({ report: reportOf(shots) }));
  assert.ok(problems.some((p) => /too small/.test(p)));
});

test("requires both a desktop and a phone width", () => {
  const onlyDesktop = goodShots().filter((s) => s.width >= 1024);
  const { problems } = evaluateEvidence(base({ report: reportOf(onlyDesktop) }));
  assert.ok(problems.some((p) => /phone/.test(p)));
});

test("requires every theme", () => {
  const onlyDark = goodShots().filter((s) => s.theme === "dark");
  const { problems } = evaluateEvidence(base({ report: reportOf(onlyDark) }));
  assert.ok(problems.some((p) => /light/.test(p) && /theme/.test(p)));
});

test("evidence older than the latest frontend change is stale", () => {
  const { problems } = evaluateEvidence(base({ sourceChangedAt: "2026-10-20T12:30:00Z" }));
  assert.ok(problems.some((p) => /stale/i.test(p)));
});

test("level 2 requires a REVIEWER VISUAL PASS row newer than the evidence", () => {
  const none = evaluateEvidence(base({ level: 2 }));
  assert.ok(none.problems.some((p) => /REVIEWER/.test(p)));

  const coder = evaluateEvidence(
    base({
      level: 2,
      gateRows: [{ timestamp: "2026-10-20T13:00:00Z", story: "US-001", gate: "VISUAL", actor: "CODER", verdict: "PASS" }],
    }),
  );
  assert.ok(coder.problems.some((p) => /REVIEWER/.test(p)), "coder cannot sign off their own evidence");

  const old = evaluateEvidence(
    base({
      level: 2,
      gateRows: [{ timestamp: "2026-10-20T11:30:00Z", story: "US-001", gate: "VISUAL", actor: "REVIEWER", verdict: "PASS" }],
    }),
  );
  assert.ok(old.problems.some((p) => /older than the evidence/.test(p)));

  const ok = evaluateEvidence(
    base({
      level: 2,
      gateRows: [{ timestamp: "2026-10-20T13:00:00Z", story: "US-001", gate: "VISUAL", actor: "REVIEWER", verdict: "PASS" }],
    }),
  );
  assert.deepEqual(ok.problems, []);

  const kickback = evaluateEvidence(
    base({
      level: 2,
      gateRows: [{ timestamp: "2026-10-20T13:00:00Z", story: "US-001", gate: "VISUAL", actor: "REVIEWER", verdict: "KICK_BACK" }],
    }),
  );
  assert.ok(kickback.problems.some((p) => /REVIEWER/.test(p)));
});

test("detectGatedTransitions finds a status flip in a story doc edit", () => {
  const found = detectGatedTransitions({
    relPath: "docs/project/stories/US-001-user-login-rbac.md",
    text: "**Status:** CODE_REVIEW (implementation complete)",
    existingDoc: "**Scope:** FULL_STACK\n**Status:** IN_DEVELOPMENT",
  });
  assert.deepEqual(found, [{ story: "US-001", status: "CODE_REVIEW", scope: "FULL_STACK" }]);
});

test("detectGatedTransitions ignores non-gated statuses and backend-only stories", () => {
  assert.deepEqual(
    detectGatedTransitions({
      relPath: "docs/project/stories/US-001-x.md",
      text: "**Status:** IN_DEVELOPMENT",
      existingDoc: "**Scope:** FULL_STACK",
    }),
    [],
  );
  assert.deepEqual(
    detectGatedTransitions({
      relPath: "docs/project/stories/US-005-x.md",
      text: "**Status:** DONE",
      existingDoc: "**Scope:** BACKEND_ONLY",
    }),
    [],
  );
});

test("detectGatedTransitions reads scope from the new text when a whole doc is written", () => {
  const found = detectGatedTransitions({
    relPath: "docs/project/stories/US-009-alarm.md",
    text: "**Scope:** UI_ONLY\n**Status:** DONE\n",
    existingDoc: null,
  });
  assert.deepEqual(found, [{ story: "US-009", status: "DONE", scope: "UI_ONLY" }]);
});

test("detectGatedTransitions finds Story_Map row edits", () => {
  const text =
    "| US-001 | Login | EPIC-01 | All | FULL_STACK | CODE_REVIEW |\n" +
    "| US-002 | Asset | EPIC-01 | Maria | FULL_STACK | READY_FOR_DESIGN |\n" +
    "| US-005 | Normalize | EPIC-02 | Maria | BACKEND_ONLY | DONE |\n";
  const found = detectGatedTransitions({ relPath: "docs/project/Story_Map.md", text, existingDoc: null });
  assert.deepEqual(found, [{ story: "US-001", status: "CODE_REVIEW", scope: "FULL_STACK" }]);
});

test("detectGatedTransitions ignores unrelated files", () => {
  assert.deepEqual(
    detectGatedTransitions({ relPath: "frontend/src/App.tsx", text: "**Status:** DONE", existingDoc: null }),
    [],
  );
});

// INF-002: HFD's visual-checks.json must cover every AC and every ARCHITECT frontend state.
const STORY_WITH_STATES = [
  "## Acceptance Criteria (Gherkin)",
  "```gherkin",
  "Scenario: One",
  "Scenario: Two",
  "```",
  "## Architect Design",
  "- state:no-match",
  "- state:session-expired",
  "## Files in Scope",
  "state:not-a-state-after-design-section",
].join("\n");

test("coverageProblems names every AC and architect state no shot covers", () => {
  const config = { shots: [{ name: "a", covers: ["AC1", "state:no-match"] }] };
  const problems = coverageProblems({ storyText: STORY_WITH_STATES, config });
  assert.deepEqual(problems.map((p) => /covers (\S+?)\./.exec(p)[1]), ["AC2", "state:session-expired"]);
});

test("coverageProblems passes when every AC and state is covered", () => {
  const config = {
    shots: [
      { name: "a", covers: ["AC1", "AC2"] },
      { name: "b", covers: ["state:no-match", "state:session-expired"] },
    ],
  };
  assert.deepEqual(coverageProblems({ storyText: STORY_WITH_STATES, config }), []);
});

test("coverageProblems is not enforced for a legacy story with no states and no covers", () => {
  const legacy = "## Acceptance Criteria (Gherkin)\n```gherkin\nScenario: One\n```\n## Architect Design\nno states here\n";
  assert.deepEqual(coverageProblems({ storyText: legacy, config: { shots: [{ name: "a" }] } }), []);
});

test("coverageProblems enforces once any shot declares covers, even with no state tokens", () => {
  const legacy = "```gherkin\nScenario: One\nScenario: Two\n```\n";
  const problems = coverageProblems({ storyText: legacy, config: { shots: [{ name: "a", covers: ["AC1"] }] } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /AC2/);
});

test("coverageProblems with no visual-checks.json fails when states exist", () => {
  const problems = coverageProblems({ storyText: STORY_WITH_STATES, config: null });
  assert.equal(problems.length, 4);
});

// INF-002 REVIEWER findings: strict, loud edge cases.
test("coverageProblems reads state names with underscores and capitals in full", () => {
  const story = "```gherkin\nScenario: One\n```\n## Architect Design\n- state:session_expired\n- state:Empty\n## Files in Scope\n";
  const problems = coverageProblems({ storyText: story, config: { shots: [{ name: "a", covers: ["AC1"] }] } });
  assert.deepEqual(problems.map((p) => /covers (\S+?)\.\s/.exec(p)[1]), ["state:session_expired", "state:Empty"]);
});

test("coverageProblems reads a ### Architect Design heading", () => {
  const story = "```gherkin\nScenario: One\n```\n### Architect Design\n- state:no-match\n## Files in Scope\n";
  const problems = coverageProblems({ storyText: story, config: { shots: [{ name: "a", covers: ["AC1"] }] } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /state:no-match/);
});

test("coverageProblems counts ACs only inside the Acceptance Criteria section", () => {
  const story = [
    "## Acceptance Criteria (Gherkin)",
    "```gherkin",
    "Scenario: One",
    "```",
    "## Coder Evidence",
    "Scenario: a note, not an AC",
    "## Architect Design",
    "- state:x",
  ].join("\n");
  const problems = coverageProblems({ storyText: story, config: { shots: [{ name: "a", covers: ["AC1", "state:x"] }] } });
  assert.deepEqual(problems, []);
});

// INF-004: a ## Architect Design holds ### subsections (Schema, API, Frontend); states under them count.
test("coverageProblems reads states under ### subsections of ## Architect Design", () => {
  const story = [
    "## Acceptance Criteria (Gherkin)",
    "```gherkin",
    "Scenario: One",
    "```",
    "## Architect Design (ARCHITECT, 2026-11-03)",
    "### Schema",
    "text",
    "### Frontend",
    "- state:search-idle",
    "- state:session-expired",
    "### Config wiring",
    "- state:in-later-subsection",
    "## Files in Scope",
    "state:after-design",
  ].join("\n");
  const problems = coverageProblems({ storyText: story, config: { shots: [{ name: "a", covers: ["AC1", "state:search-idle"] }] } });
  assert.deepEqual(problems.map((p) => /covers (\S+?)\.\s/.exec(p)[1]), ["state:session-expired", "state:in-later-subsection"]);
});

// INF-004 REVIEWER round 1: headings inside fenced blocks are not headings; heading match is exact.
test("coverageProblems ignores a '# comment' line inside a fenced block", () => {
  const story = "## Acceptance Criteria\n```gherkin\nScenario: One\n# a comment\nScenario: Two\n```\n## Architect Design\n```gherkin\n# note\n```\n- state:x\n";
  const problems = coverageProblems({ storyText: story, config: { shots: [{ name: "a", covers: ["AC1"] }] } });
  assert.deepEqual(problems.map((p) => /covers (\S+?)\.\s/.exec(p)[1]), ["AC2", "state:x"]);
});

test("coverageProblems ignores a '## heading' line inside a fenced block", () => {
  const story = "## Acceptance Criteria\n```gherkin\nScenario: One\n## fake\nScenario: Two\n```\n## Architect Design\n```\n## fake\n```\n- state:x\n";
  const problems = coverageProblems({ storyText: story, config: { shots: [{ name: "a", covers: ["AC1"] }] } });
  assert.deepEqual(problems.map((p) => /covers (\S+?)\.\s/.exec(p)[1]), ["AC2", "state:x"]);
});

test("coverageProblems matches the heading exactly, not by prefix", () => {
  const story = "## Acceptance Criteria\n```gherkin\nScenario: One\n```\n## Architect Designs\n- state:y\n## Architect Design (ARCHITECT, 2026-11-03)\n- state:x\n## Files in Scope\n";
  const problems = coverageProblems({ storyText: story, config: { shots: [{ name: "a", covers: ["AC1"] }] } });
  assert.deepEqual(problems.map((p) => /covers (\S+?)\.\s/.exec(p)[1]), ["state:x"]);
});

test("coverageProblems fails loudly when covers are declared but the story text is empty", () => {
  const problems = coverageProblems({ storyText: "", config: { shots: [{ name: "a", covers: ["AC1"] }] } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /story document/);
});
