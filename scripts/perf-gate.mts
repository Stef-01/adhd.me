// AR32: `pnpm perf:gate` — the per-route shipped-JS step of the verify gate.
//
// W53's shape exactly: all decision logic lives in src/quality/route-weights.ts, which is
// unit-tested; this file only reads the build output, measures, and sets the exit code. It runs
// AFTER `pnpm build` in the verify chain because the thing it measures IS the build.
//
// With `--pin` (wired as `pnpm generate:route-budgets`) it instead rewrites the generated
// budget block in the register from the same measurement, so the pin and the gate can never
// disagree about what a route weighs — one measurement function, two callers.

import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { budgetFor, ROUTE_BUDGETS, routeWeightVerdicts } from "../src/quality/route-weights.ts";

const REGISTER_PATH = "src/quality/route-weights.ts";
const MANIFEST_PATH = ".next/app-build-manifest.json";

/** Route → shipped-JS KB, from the app build manifest. The one measurement both modes share. */
function measure(): Record<string, number> {
  let manifest: { pages: Record<string, string[]> };
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as typeof manifest;
  } catch {
    console.error(`perf gate: FAIL — cannot read ${MANIFEST_PATH}; run \`pnpm build\` first`);
    process.exit(1);
  }
  const out: Record<string, number> = {};
  for (const [key, files] of Object.entries(manifest.pages)) {
    // Only page entries: layouts are counted through the pages that use them, and `/route`
    // handlers ship no page JS a visitor hydrates.
    if (!key.endsWith("/page")) continue;
    const route = key.slice(0, -"/page".length) || "/";
    let bytes = 0;
    for (const file of new Set(files)) {
      if (!file.endsWith(".js")) continue;
      bytes += statSync(join(".next", file)).size;
    }
    out[route] = Math.ceil(bytes / 1024);
  }
  return out;
}

function pin(measured: Record<string, number>): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const rows = Object.entries(measured)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, kb]) => `  "${route}": ${budgetFor(kb)}, // measured ${kb} KB`)
    .join("\n");
  const block =
    `// BEGIN GENERATED BUDGETS\n` +
    `// Derived ${stamp} from ${MANIFEST_PATH}: ceil(measured KB × HEADROOM) per route.\n` +
    `export const ROUTE_BUDGETS: Readonly<Record<string, number>> = {\n${rows}\n};\n` +
    `// END GENERATED BUDGETS\n`;
  const source = readFileSync(REGISTER_PATH, "utf8");
  const replaced = source.replace(
    /\/\/ BEGIN GENERATED BUDGETS\n[\s\S]*?\/\/ END GENERATED BUDGETS\n/,
    block,
  );
  if (replaced === source && !source.includes(block)) {
    console.error(`perf gate: FAIL — generated markers not found in ${REGISTER_PATH}`);
    process.exit(1);
  }
  writeFileSync(REGISTER_PATH, replaced);
  console.log(`route budgets: ${Object.keys(measured).length} routes pinned into ${REGISTER_PATH}`);
}

const measured = measure();
if (process.argv.includes("--pin")) {
  pin(measured);
} else {
  const findings = routeWeightVerdicts(measured, ROUTE_BUDGETS);
  if (findings.length > 0) {
    console.error(`perf gate: FAIL — ${findings.length} finding(s)`);
    for (const f of findings) console.error(`  ${f.kind} ${f.route}: ${f.detail}`);
    process.exit(1);
  }
  const routes = Object.keys(measured).length;
  const heaviest = Object.entries(measured).sort(([, a], [, b]) => b - a)[0]!;
  console.log(
    `perf gate: PASS (${routes} routes within budget; heaviest ${heaviest[0]} at ${heaviest[1]} KB)`,
  );
}
