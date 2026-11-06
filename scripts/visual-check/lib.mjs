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
 *  status            the story's Story_Map status. A DONE story's evidence records the UI as shipped, so a
 *                    later frontend change does not make it stale (INF-005). All other checks still apply.
 */
export function evaluateEvidence({ story, report, hashesOnDisk, requirements, sourceChangedAt, gateRows, level, status }) {
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

  if (status !== "DONE" && sourceChangedAt && ts(sourceChangedAt) > ts(report.generatedAt)) {
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

/**
 * INF-002: every AC and every ARCHITECT frontend state (`state:<name>` inside "## Architect Design")
 * must appear in some shot's `covers` in docs/design/<ID>/visual-checks.json. Enforced when the
 * design names a state or any shot declares `covers`; older stories with neither are left alone.
 */
export function coverageProblems({ storyText, config }) {
  const shapeProblems = [];
  if (config != null) {
    if (config.shots !== undefined && !Array.isArray(config.shots)) {
      shapeProblems.push("visual-checks.json: `shots` must be an array.");
    } else {
      (config.shots ?? []).forEach((shot, i) => {
        if (shot === null || typeof shot !== "object" || Array.isArray(shot)) {
          shapeProblems.push(`visual-checks.json: shot #${i + 1} must be an object.`);
        } else if (shot.covers !== undefined && !(Array.isArray(shot.covers) && shot.covers.every((c) => typeof c === "string"))) {
          shapeProblems.push(`visual-checks.json: shot #${i + 1} (${shot.name ?? "unnamed"}): \`covers\` must be an array of strings.`);
        }
      });
    }
  }
  if (shapeProblems.length > 0) return shapeProblems;
  const raw = typeof storyText === "string" ? storyText : "";
  // A section runs to the next heading of the same or a higher level, so `###` subsections belong to it (INF-004).
  // Lines inside code fences are never headings (a Gherkin "# comment" must not end a section). A fence is
  // ``` or ~~~ (up to 3 spaces of indent) and closes only on the same character, at least as long, with
  // nothing after it. The heading text must match exactly, with only an optional "(...)" suffix, so
  // "Architect Designs" is not it. A fence still open at the end is reported, never silently accepted.
  // HTML comments are blanked outside fences only (a "<!--" shown inside a fence is just text), so a
  // commented-out heading or state is never read; a comment still open at the end is reported.
  let fence = null;
  let inComment = false;
  const lines = raw.split(/\r?\n/).map((original) => {
    let line = original;
    if (!fence) {
      let out = "";
      let rest = line;
      for (;;) {
        if (inComment) {
          const end = rest.indexOf("-->");
          if (end === -1) { rest = ""; break; }
          rest = rest.slice(end + 3);
          inComment = false;
        }
        const start = rest.indexOf("<!--");
        if (start === -1) break;
        out += rest.slice(0, start);
        rest = rest.slice(start + 4);
        inComment = true;
      }
      line = out + rest;
    }
    const f = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (f && f[1][0] === fence.char && f[1].length >= fence.len && f[2].trim() === "") fence = null;
      return { line, heading: null };
    }
    if (f && !(f[1][0] === "`" && f[2].includes("`"))) {
      fence = { char: f[1][0], len: f[1].length };
      return { line, heading: null };
    }
    const m = /^(#+)[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    return { line, heading: m ? { level: m[1].length, title: m[2] } : null };
  });
  const unclosedFence = fence !== null;
  const unclosedComment = inComment;
  const text = lines.map((l) => l.line).join("\n");
  // `state:name` (word boundary, dots allowed inside a name) anywhere; `state: name` with a space only
  // as a bullet, so prose like "the session state: unknown" is not a required state.
  const NAME = "[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*";
  const stateTokens = (s) => [
    ...[...s.matchAll(new RegExp("(?<![A-Za-z0-9_])state:(" + NAME + ")", "g"))].map((m) => m[1]),
    ...[...s.matchAll(new RegExp("^[ \\t]*[-*][ \\t]+state:[ \\t]+(" + NAME + ")", "gm"))].map((m) => m[1]),
  ];
  const section = (heading) => {
    const exact = new RegExp("^" + heading + "(?:\\s*\\(.*\\))?\\s*$");
    // Every matching heading counts (an addendum section adds to the first), bodies are joined.
    const bodies = [];
    lines.forEach((l, start) => {
      if (!(l.heading && l.heading.level >= 2 && l.heading.level <= 3 && exact.test(l.heading.title))) return;
      const body = [];
      for (const next of lines.slice(start + 1)) {
        if (next.heading && next.heading.level <= l.heading.level) break;
        body.push(next.line);
      }
      bodies.push(body.join("\n"));
    });
    return bodies.length === 0 ? undefined : bodies.join("\n");
  };
  const designSection = section("Architect Design");
  const design = designSection ?? "";
  const states = [...new Set(stateTokens(design).map((n) => `state:${n}`))];
  const covered = new Set((config?.shots ?? []).flatMap((s) => s.covers ?? []));
  const unreadableDesign = designSection === undefined && stateTokens(text).length > 0;
  if (states.length === 0 && covered.size === 0 && !unreadableDesign) return [];
  if (raw.trim() === "") {
    return ["visual-checks.json declares covers but no story document was found, so what the shots must cover cannot be checked."];
  }
  if (unclosedFence) {
    return ["The story has an unclosed code fence, so its headings cannot be read reliably. Close the fence."];
  }
  if (unclosedComment) {
    return ["The story has an unclosed HTML comment, so everything after it is hidden. Close the comment with -->."];
  }
  if (unreadableDesign) {
    return ["The story names state: tokens but no Architect Design heading (## or ###) could be read, so the required states cannot be checked."];
  }
  const acSection = section("Acceptance Criteria");
  const acText = acSection ?? text;
  const acCount = (acText.match(/^[ \t]*(?:[-*>][ \t]*)*(?:\*\*)?(?:Scenario Outline|Scenario|Example)(?::\*\*|:)/gm) ?? []).length;
  if (acSection !== undefined && acCount === 0) {
    return ["The story has an Acceptance Criteria section but no scenario could be read from it (expected lines like `Scenario: ...`), so the ACs cannot be checked."];
  }
  const required = [...Array.from({ length: acCount }, (_, i) => `AC${i + 1}`), ...states];
  return required
    .filter((id) => !covered.has(id))
    .map((id) => `visual-checks.json: no shot covers ${id}. Add it to a shot's "covers" or capture the missing state.`);
}
