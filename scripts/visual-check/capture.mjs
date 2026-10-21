// Visual evidence gate: capture real screenshots of a story's UI and write visual-report.json.
//
//   node scripts/visual-check/capture.mjs --story US-001 --base http://localhost:5273 \
//        --token dispatcher=<jwt> --token norole=<jwt>
//
// Reads docs/design/<story>/visual-checks.json (authored by HFD), drives a local headless
// Edge/Chrome over the DevTools protocol (no extra dependencies), and writes the PNGs and
// docs/project/evidence/<story>/visual-report.json. Screenshots land on the host so they can be
// opened and looked at; a screenshot tool that saves inside a container is not enough.
//
// Each shot asserts: no horizontal overflow, and its expectText is on the page. The second one
// catches the failure that bit US-001: "logged in" shots that were really the login page because
// the dev proxy pointed at the wrong backend.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const argv = process.argv.slice(2);
const all = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const one = (name) => all(name)[0] ?? null;

const story = one("--story");
const base = one("--base");
if (!story || !base) {
  console.error("usage: capture.mjs --story US-001 --base http://localhost:5273 [--token name=jwt ...]");
  process.exit(2);
}
const tokens = Object.fromEntries(all("--token").map((t) => [t.slice(0, t.indexOf("=")), t.slice(t.indexOf("=") + 1)]));
const configPath = join(root, "docs/design", story, "visual-checks.json");
if (!existsSync(configPath)) {
  console.error(`Missing ${configPath}. HFD must define the screens, widths, themes and expected text for the story.`);
  process.exit(2);
}
const config = JSON.parse(readFileSync(configPath, "utf8"));
const outDir = join(root, "docs/project/evidence", story);
mkdirSync(outDir, { recursive: true });

const browser = [
  process.env.EAM_BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));
if (!browser) {
  console.error("No Edge/Chrome found. Set EAM_BROWSER to a Chromium-based browser executable.");
  process.exit(2);
}

const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "eam-capture-"));
const proc = spawn(browser, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], {
  stdio: "ignore",
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page;
    } catch {
      // browser still starting
    }
    await sleep(250);
  }
  throw new Error("browser did not start");
}

const target = await pageTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d.result ?? d.error);
    pending.delete(d.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolveCall) => {
    const id = ++nextId;
    pending.set(id, resolveCall);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.value;

const origin = new URL(base).origin;
const tokenStore = config.tokenStorage ?? "sessionStorage";
const report = { story, generatedAt: null, base, browser, shots: [] };
let failed = false;

for (const shot of config.shots) {
  await send("Emulation.setDeviceMetricsOverride", { width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: shot.width < 600 });
  await send("Page.navigate", { url: origin + (config.loginPath ?? "/login") });
  await sleep(1200);
  await evaluate("sessionStorage.clear(); localStorage.clear();");
  if (shot.theme && config.themeStorageKey) {
    await evaluate(`localStorage.setItem(${JSON.stringify(config.themeStorageKey)}, ${JSON.stringify(shot.theme)})`);
  }
  if (shot.token) {
    if (!tokens[shot.token]) {
      console.error(`Shot ${shot.name} needs --token ${shot.token}=<jwt>`);
      failed = true;
      continue;
    }
    await evaluate(`${tokenStore}.setItem(${JSON.stringify(config.tokenStorageKey)}, ${JSON.stringify(tokens[shot.token])})`);
  }
  await send("Page.navigate", { url: origin + shot.path });

  let found = false;
  for (let i = 0; i < 32 && !found; i++) {
    await sleep(250);
    found = await evaluate(`document.body && document.body.innerText.includes(${JSON.stringify(shot.expectText)})`);
  }
  await sleep(300);
  const overflowPx = await evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth");
  const png = Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64");
  const file = `${shot.name}.png`;
  writeFileSync(join(outDir, file), png);
  const entry = {
    name: shot.name,
    file,
    sha256: createHash("sha256").update(png).digest("hex"),
    bytes: png.length,
    width: shot.width,
    height: shot.height,
    theme: shot.theme ?? null,
    path: shot.path,
    expectText: shot.expectText,
    expectTextFound: Boolean(found),
    overflowPx,
  };
  report.shots.push(entry);
  const ok = entry.expectTextFound && overflowPx === 0;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${shot.name} (${shot.width}px ${shot.theme ?? ""}) overflow=${overflowPx} text=${entry.expectTextFound ? "found" : "NOT FOUND"}`);
}

report.generatedAt = new Date().toISOString().replace(/\.\d+Z$/, "Z");
writeFileSync(join(outDir, "visual-report.json"), JSON.stringify(report, null, 2) + "\n");
ws.close();
proc.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  // profile dir may still be locked by the exiting browser; it is in the OS temp dir
}
console.log(`\nWrote ${report.shots.length} screenshots and visual-report.json to ${outDir}`);
console.log("Next: OPEN EVERY PNG and look at it (layout, overlap, clipping, contrast). A passing report is not a review.");
process.exit(failed ? 1 : 0);
