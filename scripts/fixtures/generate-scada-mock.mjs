// Generates a deterministic mock SCADA event export (JSON lines) for the EAM pilot integration.
//
//   node scripts/fixtures/generate-scada-mock.mjs [outFile] [count]
//
// Default output: docs/fixtures/scada-pilot/scada-pilot-sample.jsonl (50 events, seed fixed).
// Source tags are deliberately NOT canonical asset codes: US-006 maps them. Canonical codes in
// `expectedAsset` exist only so tests can assert the mapping; a real feed would not carry them.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const outFile = resolve(process.argv[2] ?? join("docs/fixtures/scada-pilot/scada-pilot-sample.jsonl"));
const count = Number(process.argv[3] ?? 50);

function join(p) {
  return resolve(root, p);
}

// mulberry32: small seeded PRNG so the file is reproducible.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261112);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];

// Canonical codes match backend AssetSeed.seedChain (SUB-3 > F-12 > TX-4587) plus a second chain.
const points = [
  { tag: "S3_T4587_TOP_OIL_TEMP", asset: "TX-4587", type: "HIGH_TEMP", unit: "C", base: 95, limit: 105 },
  { tag: "S3_F12_BRK_STATUS", asset: "F-12", type: "BREAKER_TRIP", unit: "state", base: 1, limit: 0 },
  { tag: "S3_RTU_COMM", asset: "SUB-3", type: "COMM_LOSS", unit: "", base: null, limit: null },
  { tag: "S9_T0112_TOP_OIL_TEMP", asset: "TX-0112", type: "HIGH_TEMP", unit: "C", base: 90, limit: 105 },
  { tag: "S9_F07_BRK_STATUS", asset: "F-07", type: "BREAKER_TRIP", unit: "state", base: 1, limit: 0 },
];
const UNMAPPED = { tag: "S77_X001_UNKNOWN", asset: null, type: "HIGH_TEMP", unit: "C", base: 90, limit: 105 };

const start = Date.parse("2026-11-12T14:00:00Z");
const events = [];
for (let i = 1; i <= count; i++) {
  const p = i % 17 === 0 ? UNMAPPED : pick(points);
  const ts = new Date(start + i * 25_000 + Math.floor(rand() * 10_000)).toISOString();
  const ev = {
    messageId: `MSG-${String(i).padStart(6, "0")}`,
    ts,
    source: "SCADA-PILOT",
    tag: p.tag,
    event: p.type,
    severity: "WARNING",
    quality: "GOOD",
    expectedAsset: p.asset,
  };
  if (p.type === "HIGH_TEMP") {
    const v = Math.round((p.base + rand() * 25) * 10) / 10;
    ev.value = v;
    ev.unit = p.unit;
    ev.severity = v >= p.limit ? "CRITICAL" : v >= p.limit - 5 ? "WARNING" : "INFO";
  } else if (p.type === "BREAKER_TRIP") {
    ev.value = 0;
    ev.unit = p.unit;
    ev.severity = "CRITICAL";
  } else {
    ev.value = null;
    ev.quality = "BAD";
    ev.severity = "MAJOR";
  }
  events.push(ev);
}

// Deliberate edge rows for the ingest, normalize, identity and no-false-normal stories.
events.push({ ...events[2] });                                           // exact duplicate (idempotency)
events.push({ ...events[5], ts: "2026-11-12T13:59:00Z" });                // out-of-order, same messageId reused
events.push({ messageId: "MSG-BAD-0001", ts: "not-a-timestamp", source: "SCADA-PILOT", tag: "S3_T4587_TOP_OIL_TEMP", event: "HIGH_TEMP" }); // malformed
events.push({ messageId: "MSG-BAD-0002", source: "SCADA-PILOT", event: "HIGH_TEMP", severity: "CRITICAL" });                                // missing tag and ts

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
console.log(`wrote ${events.length} events to ${outFile}`);
