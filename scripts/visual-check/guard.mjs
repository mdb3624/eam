// PreToolUse hook (Edit|Write|MultiEdit): blocks moving a UI-bearing story to CODE_REVIEW or later
// without valid visual evidence. Wired in .claude/settings.json via .claude/hooks/visual-evidence-guard.sh.
//
// Modes (env EAM_VISUAL_GATE): block (default) | warn | off.
// A Bash edit (sed -i) bypasses this hook; CI runs check-visual-evidence.mjs --all to catch that.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkStory, latestSourceChange } from "./check-visual-evidence.mjs";
import { detectGatedTransitions, levelForStatus } from "./lib.mjs";

function newText(toolInput) {
  if (typeof toolInput.content === "string") return toolInput.content;
  if (Array.isArray(toolInput.edits)) return toolInput.edits.map((e) => e.new_string ?? "").join("\n");
  return toolInput.new_string ?? "";
}

export function decide({ input, root, mode, sourceChangedAt }) {
  if (mode === "off") return {};
  const filePath = input?.tool_input?.file_path;
  if (!filePath) return {};
  const relPath = relative(root, resolve(filePath)).split(sep).join("/");
  const existingDoc = existsSync(resolve(filePath)) ? readFileSync(resolve(filePath), "utf8") : null;
  const transitions = detectGatedTransitions({ relPath, text: newText(input.tool_input), existingDoc });

  const messages = [];
  for (const t of transitions) {
    const { problems } = checkStory({ root, story: t.story, level: levelForStatus(t.status), sourceChangedAt });
    if (problems.length === 0) continue;
    messages.push(`${t.story} -> ${t.status} needs visual evidence:\n` + problems.map((p) => `  - ${p}`).join("\n"));
    logBlock(root, t.story, mode === "block" ? "BLOCK" : "WARN", problems[0]);
  }
  if (messages.length === 0) return {};

  const text =
    `Visual evidence gate (a UI story cannot reach CODE_REVIEW or later on an accessibility-tree check or tests alone).\n` +
    messages.join("\n") +
    `\nCapture, then open and look at every screenshot: node scripts/visual-check/capture.mjs --story <ID> --base <url> --token <name>=<jwt>`;
  return mode === "block"
    ? { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: text } }
    : { hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: text } };
}

function logBlock(root, story, verdict, detail) {
  const log = resolve(root, "docs/project/gate_log.csv");
  if (!existsSync(log)) return;
  const marker = `,${story},VISUAL,hook,${verdict},EVIDENCE_MISSING,`;
  if (readFileSync(log, "utf8").includes(marker)) return;
  appendFileSync(
    log,
    `${new Date().toISOString().replace(/\.\d+Z$/, "Z")}${marker}"${detail.replace(/"/g, "'").slice(0, 120)}",pending\n`,
  );
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  let input = {};
  try {
    input = JSON.parse(await readStdin());
  } catch {
    // Unreadable hook input: never block on our own parsing failure.
  }
  const out = decide({
    input,
    root,
    mode: process.env.EAM_VISUAL_GATE ?? "block",
    sourceChangedAt: latestSourceChange(root),
  });
  process.stdout.write(JSON.stringify(out));
}
