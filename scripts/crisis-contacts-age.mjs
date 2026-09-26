// Lists every crisis contact whose last check is older than 90 days. Run monthly by
// .github/workflows/crisis-contacts.yml, which opens an issue when this prints any.
// Usage: node scripts/crisis-contacts-age.mjs

import { appendFileSync } from "node:fs";
import { CRISIS_CONTACTS } from "../src/model/crisis-contacts.ts";

const MAX_DAYS = 90;
const today = Date.now();
const stale = CRISIS_CONTACTS.filter((c) => (today - Date.parse(c.verifiedOn)) / 86_400_000 > MAX_DAYS);

for (const c of stale) console.log(`${c.id}: ${c.service} ${c.said}, last checked ${c.verifiedOn}, source ${c.source}`);
if (stale.length === 0) console.log(`All ${CRISIS_CONTACTS.length} crisis contacts were checked within ${MAX_DAYS} days.`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `stale=${stale.map((c) => c.id).join(",")}\n`);
