// Chore: PR-time endpoint capability-overlap report (CODER.md Service Reuse Check step 5).
//
// For every endpoint added in the diff, reports (a) the same resource under a different
// controller and (b) story-map / story-doc lines that mention the same capability.
// Exit 1 only with --strict and only for (a); (b) is informational, since the owning
// story always matches. Run: node check-endpoint-overlap.mjs [--base origin/main] [--strict]
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAPPING = /@(Get|Post|Put|Patch|Delete)Mapping(?:\(\s*(?:(?:value|path)\s*=\s*)?"([^"]*)")?/g;
const CLASS_PREFIX = /@RequestMapping\(\s*(?:(?:value|path)\s*=\s*)?"([^"]*)"/;
const CONTROLLER_GLOB = "backend/src/main/java/**/*Controller*.java";

const joinPath = (...parts) =>
  "/" + parts.join("/").split("/").filter(Boolean).join("/");

const lineOf = (source, index) => source.slice(0, index).split("\n").length;

export function parseMappings(source) {
  const classAt = source.search(/\bclass\s+\w+/);
  const header = classAt === -1 ? "" : source.slice(0, classAt);
  const prefix = CLASS_PREFIX.exec(header)?.[1] ?? "";
  const found = [];
  for (const m of source.matchAll(MAPPING)) {
    if (classAt !== -1 && m.index < classAt) continue;
    found.push({
      verb: m[1].toUpperCase(),
      path: joinPath(prefix, m[2] ?? ""),
      line: lineOf(source, m.index),
    });
  }
  return found;
}

export function resourceKey(path) {
  const skip = (s) => s === "api" || /^v\d+$/.test(s) || s.startsWith("{");
  return path.split("/").filter(Boolean).find((s) => !skip(s)) ?? null;
}

export function addedLinesByFile(diff) {
  const byFile = new Map();
  let current = null;
  for (const row of diff.split("\n")) {
    const file = /^\+\+\+ b\/(.+)$/.exec(row);
    if (file) {
      current = file[1];
      byFile.set(current, new Set());
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(row);
    if (hunk && current) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let i = 0; i < count; i++) byFile.get(current).add(start + i);
    }
  }
  return byFile;
}

const variants = (key) => {
  const spaced = key.replace(/-/g, " ");
  return [...new Set([key, spaced, spaced.replace(/s$/, "")])];
};

export function storyIds(docHits) {
  const ids = new Set();
  for (const h of docHits) {
    const id = /US-\d+/.exec(h.line)?.[0] ?? /US-\d+/.exec(h.file)?.[0];
    if (id) ids.add(id);
  }
  return [...ids];
}

export function findOverlaps({ newEndpoints, otherControllers, docs }) {
  return newEndpoints.map((endpoint) => {
    const key = resourceKey(endpoint.path);
    const needles = key ? variants(key.toLowerCase()) : [];
    const controllerHits = [];
    const docHits = [];
    if (key) {
      for (const c of otherControllers) {
        if (c.file === endpoint.file) continue;
        for (const m of c.mappings) {
          if (resourceKey(m.path) === key) controllerHits.push({ file: c.file, ...m });
        }
      }
      for (const d of docs) {
        for (const line of d.text.split("\n")) {
          const lower = line.toLowerCase();
          if (needles.some((n) => lower.includes(n))) {
            docHits.push({ file: d.file, line: line.trim().slice(0, 160) });
          }
        }
      }
    }
    return { endpoint, key, controllerHits, docHits };
  });
}

const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

function readDocs(root) {
  const files = ["docs/project/Story_Map.md"];
  const storyDir = join(root, "docs/project/stories");
  if (existsSync(storyDir)) {
    for (const f of readdirSync(storyDir)) if (f.endsWith(".md")) files.push(`docs/project/stories/${f}`);
  }
  return files
    .filter((f) => existsSync(join(root, f)))
    .map((f) => ({ file: f, text: readFileSync(join(root, f), "utf8") }));
}

function render(results) {
  const out = ["## Endpoint capability overlap", ""];
  if (results.length === 0) return [...out, "No new endpoints in this diff."].join("\n");
  for (const r of results) {
    const e = r.endpoint;
    out.push(`### ${e.verb} ${e.path}  (${e.file}:${e.line})`);
    if (r.controllerHits.length === 0) out.push("- Same resource in another controller: none");
    for (const h of r.controllerHits) {
      out.push(`- OVERLAP: ${h.verb} ${h.path} in ${h.file}:${h.line}`);
    }
    const ids = storyIds(r.docHits);
    if (ids.length > 0) out.push(`- Stories mentioning "${r.key}": ${ids.join(", ")}`);
    out.push("");
  }
  out.push("REVIEWER: confirm each flagged capability was checked per CODER.md step 5, or a CHG-### was filed.");
  return out.join("\n");
}

function main(argv) {
  const baseArg = argv.indexOf("--base");
  const base = baseArg === -1 ? "origin/main" : argv[baseArg + 1];
  const strict = argv.includes("--strict");
  const root = resolve(git(process.cwd(), "rev-parse", "--show-toplevel").trim());

  const diff = git(root, "diff", "-U0", `${base}...HEAD`, "--", CONTROLLER_GLOB);
  const added = addedLinesByFile(diff);

  const newEndpoints = [];
  for (const [file, lines] of added) {
    const source = readFileSync(join(root, file), "utf8");
    for (const m of parseMappings(source)) {
      if (lines.has(m.line)) newEndpoints.push({ file, ...m });
    }
  }

  const otherControllers = git(root, "ls-files", CONTROLLER_GLOB)
    .split("\n")
    .filter(Boolean)
    .map((file) => ({ file, mappings: parseMappings(readFileSync(join(root, file), "utf8")) }));

  const results = findOverlaps({ newEndpoints, otherControllers, docs: readDocs(root) });
  const report = render(results);
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");

  const overlapped = results.some((r) => r.controllerHits.length > 0);
  if (strict && overlapped) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
