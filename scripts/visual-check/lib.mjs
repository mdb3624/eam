// Visual evidence gate: pure logic. See docs/standards/Definition_of_Done.md (Visual Evidence Gate).
//
// Why this exists: US-001 was moved to CODE_REVIEW on an accessibility-tree check alone. Real
// screenshots then showed overlapping text and a clipped phone layout, and a first set of
// "logged in" screenshots were all the login page because the dev proxy pointed at the wrong
// backend. This gate makes "looked at real, correct, fresh screenshots" a precondition for the
// status change, not a habit.

export const UI_SCOPES = new Set(["FULL_STACK", "UI_ONLY"]);

/** 0 = no evidence needed, 1 = capture evidence, 2 = capture evidence plus REVIEWER VISUAL PASS. */
const STATUS_LEVEL = {
  CODE_REVIEW: 1,
  REVIEW_PASSED: 2,
  LIBRARIAN_VERIFICATION: 2,
  DONE: 2,
};

export const MIN_SCREENSHOT_BYTES = 2000;

export const parseScope = (markdown) =>
  /^\*\*Scope:\*\*\s*([A-Z_]+)/m.exec(markdown ?? "")?.[1] ?? null;

export const isUiScope = (scope) => UI_SCOPES.has(scope);

export const levelForStatus = (status) => STATUS_LEVEL[status] ?? 0;

/** Minimal CSV reader for gate_log.csv: handles double-quoted fields containing commas. */
export function parseGateLog(csv) {
  const rows = [];
  const lines = (csv ?? "").split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines.shift() ?? "");
  for (const line of lines) {
    const cells = splitCsv(line);
    rows.push(Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));
  }
  return rows;
}

function splitCsv(line) {
  const cells = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

const STORY_DOC = /^docs\/project\/stories\/(US-\d+)[^/]*\.md$/;
const STORY_MAP = "docs/project/Story_Map.md";
const MAP_ROW = /^\|\s*(US-\d+)\s*\|.*\|\s*([A-Z_]+)\s*\|\s*([A-Z_]+)\s*\|\s*$/;

/**
 * Finds status changes (in text about to be written) that move a UI-bearing story into a gated
 * status. relPath is repo-relative with forward slashes; existingDoc is the current file content
 * (used to read Scope when the new text is only a fragment).
 */
export function detectGatedTransitions({ relPath, text, existingDoc }) {
  const found = [];
  const doc = STORY_DOC.exec(relPath);
  if (doc) {
    const status = /^\*\*Status:\*\*\s*([A-Z_]+)/m.exec(text)?.[1];
    const scope = parseScope(text) ?? parseScope(existingDoc);
    if (status && levelForStatus(status) > 0 && isUiScope(scope)) {
      found.push({ story: doc[1], status, scope });
    }
  } else if (relPath === STORY_MAP) {
    for (const line of text.split(/\r?\n/)) {
      const m = MAP_ROW.exec(line);
      if (m && levelForStatus(m[3]) > 0 && isUiScope(m[2])) {
        found.push({ story: m[1], status: m[3], scope: m[2] });
      }
    }
  }
  return found;
}

const ts = (iso) => Date.parse(iso);

/**
 * Pure evaluation of a story's visual evidence. Returns { problems: string[] }; empty = pass.
 *  report            parsed visual-report.json (or null)
 *  hashesOnDisk      { fileName: sha256 } for PNGs actually present in the evidence folder
 *  requirements      { desktopMinWidth, mobileMaxWidth, themes[] }
 *  sourceChangedAt   ISO time of the latest change under the frontend source
 *  gateRows          parsed gate_log rows
 *  level             1 or 2 (see levelForStatus)
 */
export function evaluateEvidence({ story, report, hashesOnDisk, requirements, sourceChangedAt, gateRows, level }) {
  const problems = [];
  if (!report) {
    problems.push(
      `No visual-report.json for ${story}. Capture real screenshots first: ` +
        `node scripts/visual-check/capture.mjs --story ${story} --base <frontend url> --token <name>=<jwt>`,
    );
    return { problems };
  }
  const shots = report.shots ?? [];
  if (shots.length === 0) {
    problems.push(`visual-report.json for ${story} contains no screenshots.`);
    return { problems };
  }

  for (const s of shots) {
    if (!(s.file in hashesOnDisk)) {
      problems.push(`Screenshot ${s.file} (${s.name}) is missing on disk.`);
    } else if (hashesOnDisk[s.file] !== s.sha256) {
      problems.push(`Screenshot ${s.file} (${s.name}) hash mismatch: the image changed after capture. Re-run capture.`);
    }
    if (s.bytes < MIN_SCREENSHOT_BYTES) {
      problems.push(`Screenshot ${s.name} is too small (${s.bytes} bytes); it is likely blank.`);
    }
    if (s.overflowPx !== 0) {
      problems.push(`Screenshot ${s.name}: horizontal overflow of ${s.overflowPx}px at width ${s.width}. Fix the layout.`);
    }
    if (!s.expectTextFound) {
      problems.push(
        `Screenshot ${s.name}: expected text not found on the page. The shot shows the wrong screen ` +
          `(failed login, wrong role, or the dev proxy points at the wrong backend).`,
      );
    }
  }

  const { desktopMinWidth, mobileMaxWidth, themes } = requirements;
  if (!shots.some((s) => s.width >= desktopMinWidth)) {
    problems.push(`No desktop screenshot (width >= ${desktopMinWidth}).`);
  }
  if (!shots.some((s) => s.width <= mobileMaxWidth)) {
    problems.push(`No phone screenshot (width <= ${mobileMaxWidth}).`);
  }
  for (const theme of themes) {
    if (!shots.some((s) => s.theme === theme)) {
      problems.push(`No screenshot in the ${theme} theme.`);
    }
  }

  if (sourceChangedAt && ts(sourceChangedAt) > ts(report.generatedAt)) {
    problems.push(
      `Evidence is stale: frontend source changed at ${sourceChangedAt}, after capture at ${report.generatedAt}. Re-run capture.`,
    );
  }

  if (level >= 2) {
    const passes = (gateRows ?? []).filter(
      (r) => r.story === story && r.gate === "VISUAL" && r.actor === "REVIEWER" && r.verdict === "PASS",
    );
    if (passes.length === 0) {
      problems.push(
        `No REVIEWER VISUAL PASS row for ${story} in gate_log.csv. REVIEWER must open every screenshot, then log the verdict.`,
      );
    } else if (!passes.some((r) => ts(r.timestamp) >= ts(report.generatedAt))) {
      problems.push(`The REVIEWER VISUAL PASS for ${story} is older than the evidence; re-review the new screenshots.`);
    }
  }
  return { problems };
}
