// U14 (R0): `pnpm census` — the size census printed, and the verdict the test would give.
//
// W53's shape: every decision lives in `src/quality/size-census.ts` (unit-tested); this file only
// measures the tree, prints the table (plan · floor · now · verdict) and sets the exit code. The
// gate itself is `size-census.test.ts` under `pnpm test`, so `pnpm verify` runs it without this
// script; this is the table for a person, and the entries to append when a floor can come down.

import { bankable, floors, PLAN_FIGURES, RATCHET, registerFindings, sizeCensusVerdicts } from "../src/quality/size-census.ts";
import { measureTree } from "../src/quality/size-census-read.ts";

const measured = measureTree();
const floor = floors();
const verdicts = sizeCensusVerdicts(measured);
const findings = registerFindings();
const today = new Date().toISOString().slice(0, 10);
const gains = bankable(measured, RATCHET, today);

const rows = Object.entries(measured).map(([measure, now]) => {
  const verdict = verdicts.find((v) => v.measure === measure);
  const state = verdict ? verdict.kind : now < (floor[measure] ?? Infinity) ? "under (bank it)" : "at floor";
  return [measure, PLAN_FIGURES[measure]?.toString() ?? "—", floor[measure]?.toString() ?? "—", now.toString(), state];
});
const widths = [0, 1, 2, 3, 4].map((i) => Math.max(...rows.map((r) => r[i]!.length), ["measure", "plan", "floor", "now", "verdict"][i]!.length));
const line = (cells: string[]): string => cells.map((c, i) => (i === 0 || i === 4 ? c.padEnd(widths[i]!) : c.padStart(widths[i]!))).join("  ");
console.log(line(["measure", "plan", "floor", "now", "verdict"]));
console.log(line(widths.map((w) => "-".repeat(w))));
for (const row of rows) console.log(line(row));
for (const v of verdicts.filter((x) => x.kind === "vanished-measure")) console.log(line([v.measure, "—", String(v.floor), "—", v.kind]));

if (gains.length > 0) {
  console.log("\nGains to bank — append to RATCHET in src/quality/size-census.ts:");
  for (const g of gains) console.log(`  { measure: "${g.measure}", value: ${g.value}, on: "${g.on}" },`);
}
for (const f of findings) console.log(`register: ${f.kind} — ${f.measure}: ${f.detail}`);

const failing = verdicts.length + findings.length;
console.log(`\nsize census: ${failing === 0 ? "PASS" : "FAIL"} — ${Object.keys(measured).length} measures, ${verdicts.length} verdicts, ${findings.length} register findings, ${gains.length} bankable`);
process.exit(failing === 0 ? 0 : 1);
