// Visual evidence gate: verify a story's screenshots. See docs/standards/Definition_of_Done.md.
//
//   node scripts/visual-check/check-visual-evidence.mjs --story US-001 [--level 1|2]
//   node scripts/visual-check/check-visual-evidence.mjs --all        (CI: every gated UI story in Story_Map)
//
// Exit 1 and print what is wrong when evidence is missing, wrong, stale or unreviewed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateEvidence, isUiScope, levelForStatus, parseGateLog } from "./lib.mjs";

export const DEFAULT_REQUIREMENTS = { desktopMinWidth: 1024, mobileMaxWidth: 480, themes: ["dark", "light"] };

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null);

/** Latest change under frontend/src: last commit time, or a newer uncommitted file mtime. */
export function latestSourceChange(root) {
  let latest = 0;
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", "frontend/src"], { cwd: root, encoding: "utf8" }).trim();
    if (iso) latest = Date.parse(iso);
    const status = execFileSync("git", ["status", "--porcelain", "--", "frontend/src"], { cwd: root, encoding: "utf8" });
    for (const line of status.split("\n").filter(Boolean)) {
      const file = join(root, line.slice(3).trim().replace(/^"|"$/g, ""));
      if (existsSync(file) && statSync(file).isFile()) latest = Math.max(latest, statSync(file).mtimeMs);
    }
  } catch {
    // Not a git checkout: freshness cannot be judged, so do not fail on it.
    return null;
  }
  return latest ? new Date(latest).toISOString() : null;
}

export function checkStory({ root, story, level, sourceChangedAt }) {
  const evidenceDir = join(root, "docs/project/evidence", story);
  const report = readJson(join(evidenceDir, "visual-report.json"));
  const hashesOnDisk = {};
  for (const shot of report?.shots ?? []) {
    const file = join(evidenceDir, shot.file);
    if (existsSync(file)) hashesOnDisk[shot.file] = createHash("sha256").update(readFileSync(file)).digest("hex");
  }
  const config = readJson(join(root, "docs/design", story, "visual-checks.json"));
  const gatePath = join(root, "docs/project/gate_log.csv");
  return evaluateEvidence({
    story,
    report,
    hashesOnDisk,
    requirements: config?.requirements ?? DEFAULT_REQUIREMENTS,
    sourceChangedAt,
    gateRows: existsSync(gatePath) ? parseGateLog(readFileSync(gatePath, "utf8")) : [],
    level,
  });
}

const MAP_ROW = /^\|\s*(US-\d+)\s*\|.*\|\s*([A-Z_]+)\s*\|\s*([A-Z_]+)\s*\|\s*$/;

/** Every UI story in the Story_Map that has reached a gated status, with its problems (if any). */
export function checkAll({ root, sourceChangedAt }) {
  const mapPath = join(root, "docs/project/Story_Map.md");
  if (!existsSync(mapPath)) return [];
  const failures = [];
  for (const line of readFileSync(mapPath, "utf8").split(/\r?\n/)) {
    const m = MAP_ROW.exec(line);
    if (!m || !isUiScope(m[2]) || levelForStatus(m[3]) === 0) continue;
    const { problems } = checkStory({ root, story: m[1], level: levelForStatus(m[3]), sourceChangedAt });
    if (problems.length > 0) failures.push({ story: m[1], status: m[3], problems });
  }
  return failures;
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const sourceChangedAt = latestSourceChange(root);

  if (argv.includes("--all")) {
    const failures = checkAll({ root, sourceChangedAt });
    for (const f of failures) {
      console.error(`${f.story} (${f.status}) is missing visual evidence:`);
      for (const p of f.problems) console.error(`  - ${p}`);
    }
    if (failures.length === 0) console.log("Visual evidence gate: all gated UI stories have valid evidence.");
    process.exit(failures.length === 0 ? 0 : 1);
  }

  const story = arg("--story");
  if (!story) {
    console.error("usage: check-visual-evidence.mjs --story US-001 [--level 1|2] | --all");
    process.exit(2);
  }
  const { problems } = checkStory({ root, story, level: Number(arg("--level") ?? 1), sourceChangedAt });
  for (const p of problems) console.error(`- ${p}`);
  if (problems.length === 0) console.log(`${story}: visual evidence OK.`);
  process.exit(problems.length === 0 ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
