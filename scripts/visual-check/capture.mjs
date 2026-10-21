// Visual evidence gate: capture real screenshots of a story's UI with Playwright and write
// visual-report.json.
//
//   node scripts/visual-check/capture.mjs --story US-001 --base http://localhost:5273 \
//        --token dispatcher=<jwt> --token norole=<jwt>
//
// Reads docs/design/<story>/visual-checks.json (authored by HFD). Playwright is a devDependency of
// frontend/ and also installed globally (npm install -g playwright). It drives an installed Edge or Chrome (no browser download); if
// neither exists, run `npx playwright install chromium` in frontend/ and set EAM_BROWSER_CHANNEL=chromium.
// Screenshots land on the host so they can be opened and looked at.
//
// Each shot asserts: no horizontal overflow, and its expectText is on the page. The second one
// catches the failure that bit US-001: "logged in" shots that were really the login page because
// the dev proxy pointed at the wrong backend.
//
// A shot may carry "steps" to reach interactive states (error banners etc.):
//   { "fill": "<data-testid>", "value": "text" }  |  { "click": "<data-testid>" }  |  { "press": "Enter" }
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
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

// Resolve Playwright from the project first, then from the global npm install, so the capture
// works in any checkout on this machine (npm install -g playwright).
let chromium;
const resolvers = [
  () => createRequire(join(root, "frontend", "package.json"))("playwright"),
  () => createRequire(join(execSync("npm root -g", { encoding: "utf8" }).trim(), "x.js"))("playwright"),
];
for (const resolveIt of resolvers) {
  try {
    ({ chromium } = resolveIt());
    break;
  } catch {
    // try the next location
  }
}
if (!chromium) {
  console.error("Playwright is not installed. Run: npm install -g playwright   (or: cd frontend && npm install)");
  process.exit(2);
}

async function launch() {
  const channels = process.env.EAM_BROWSER_CHANNEL ? [process.env.EAM_BROWSER_CHANNEL] : ["msedge", "chrome", "chromium"];
  const errors = [];
  for (const channel of channels) {
    try {
      return await chromium.launch(channel === "chromium" ? {} : { channel });
    } catch (e) {
      errors.push(`${channel}: ${String(e.message).split("\n")[0]}`);
    }
  }
  console.error(`Could not launch a browser.\n  ${errors.join("\n  ")}\nInstall one: cd frontend && npx playwright install chromium (then EAM_BROWSER_CHANNEL=chromium).`);
  process.exit(2);
}

// Start from a clean evidence folder so a stale file from an earlier or interrupted run can never
// be mixed into this report.
const outDir = join(root, "docs/project/evidence", story);
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) {
  if (f.endsWith(".png") || f === "visual-report.json") rmSync(join(outDir, f));
}

const origin = new URL(base).origin;
const tokenStore = config.tokenStorage ?? "sessionStorage";
const browser = await launch();
const report = { story, generatedAt: null, base, browser: `${browser.browserType().name()} ${browser.version()}`, tool: "playwright", shots: [] };
let failed = false;

for (const shot of config.shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    isMobile: shot.width < 600,
    hasTouch: shot.width < 600,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));

  // Seed theme and session before any app script runs.
  if (shot.theme && config.themeStorageKey) {
    await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [config.themeStorageKey, shot.theme]);
  }
  if (shot.token) {
    if (!tokens[shot.token]) {
      console.error(`Shot ${shot.name} needs --token ${shot.token}=<jwt>`);
      failed = true;
      await context.close();
      continue;
    }
    await context.addInitScript(
      ([store, k, v]) => window[store].setItem(k, v),
      [tokenStore, config.tokenStorageKey, tokens[shot.token]],
    );
  }

  await page.goto(origin + shot.path, { waitUntil: "load" });
  for (const step of shot.steps ?? []) {
    if (step.fill !== undefined) await page.getByTestId(step.fill).fill(step.value ?? "");
    else if (step.click !== undefined) await page.getByTestId(step.click).click();
    else if (step.press !== undefined) await page.keyboard.press(step.press);
  }

  let found = true;
  try {
    await page.waitForFunction((text) => document.body && document.body.innerText.includes(text), shot.expectText, { timeout: 8000 });
  } catch {
    found = false;
  }
  await page.waitForTimeout(300);
  const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const file = `${shot.name}.png`;
  const png = await page.screenshot({ path: join(outDir, file), fullPage: false });
  await context.close();

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
    expectTextFound: found,
    overflowPx,
  };
  if (problems.length) entry.pageErrors = problems;
  report.shots.push(entry);
  const ok = found && overflowPx === 0 && problems.length === 0;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${shot.name} (${shot.width}px ${shot.theme ?? ""}) overflow=${overflowPx} text=${found ? "found" : "NOT FOUND"}${problems.length ? ` ${problems[0]}` : ""}`);
}

await browser.close();
report.generatedAt = new Date().toISOString().replace(/\.\d+Z$/, "Z");
writeFileSync(join(outDir, "visual-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`\nWrote ${report.shots.length} screenshots and visual-report.json to ${outDir}`);
console.log("Next: OPEN EVERY PNG and look at it (layout, overlap, clipping, contrast). A passing report is not a review.");
process.exit(failed ? 1 : 0);
