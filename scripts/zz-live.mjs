import { readFileSync } from "node:fs";
import { createVitest } from "vitest/node";
for (const line of readFileSync(".env.local", "utf8").split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ""); }
const v = await createVitest("test", { watch: false });
const { readRequest } = await v.import(new URL("./src/lib/matching/llm-read.ts", `file://${process.cwd()}/`).pathname);
const { clinicians, rankCliniciansNear } = await v.import(new URL("./src/demo/clinicians.ts", `file://${process.cwd()}/`).pathname);
const { searchRoster } = await v.import(new URL("./src/finder/pipeline.ts", `file://${process.cwd()}/`).pathname);
const { emptyFilters } = await v.import(new URL("./src/finder/filters.ts", `file://${process.cwd()}/`).pathname);
const { placeIn, resolvePlace } = await v.import(new URL("./src/geo/suburbs.ts", `file://${process.cwd()}/`).pathname);
const qs = JSON.parse(process.argv[2]);
for (const q of qs) {
  const read = await readRequest(q);
  const o = resolvePlace(placeIn(q) || "");
  const top = rankCliniciansNear(q, o, searchRoster(clinicians, emptyFilters(), q, o), undefined, read.needs).slice(0, 3);
  console.log("LIVE", q, "|", read.needs.map((n) => JSON.stringify(n.facet)).join(" "), "|", top.map((c) => `${c.id}:${c.gender}`).join(", "));
}
await v.close();
