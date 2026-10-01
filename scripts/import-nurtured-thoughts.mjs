// Imports Nurtured Thoughts Psychology's sixteen clinicians (2026-10-01) into src/demo/roster-network.ts.
// Two sources, two layers:
//   the visible layer from revamped-adhd.me's scripts/build-profiles.py (the founder's edited cards:
//   short line, signals, summary, About, experience, fees, portraits);
//   the backend layer from each practitioner's own page, every section verbatim (profileDetail).
// Care areas and manner are what the interview reader (src/onboarding/transcript.ts) hears in their
// own words, each with the sentence behind it. Heard in their headline, signals or own "areas of
// interest" list: a care area; heard only deeper in the page: sometimes.
//   node scripts/import-nurtured-thoughts.mjs <nt-build.json> <nt-practitioners.json> <revamped repo>
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createVitest } from "vitest/node";

const [buildPath, scrapePath, revamped] = process.argv.slice(2);
const build = JSON.parse(readFileSync(buildPath, "utf8"));
const scrape = JSON.parse(readFileSync(scrapePath, "utf8"));
const v = await createVitest("test", { watch: false });
const { readTranscript } = await v.import(new URL("../src/onboarding/transcript.ts", import.meta.url).pathname);
const { readRequest } = await v.import(new URL("../src/lib/matching/llm-read.ts", import.meta.url).pathname);
for (const line of readFileSync(".env.local", "utf8").split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ""); }

const BOOK = "https://www.nurturedthoughtspsychology.com.au/contact";
const PROFESSION = { psychiatrist: "psychiatrist", psychologist: "psychologist", gp: null };
const norm = (t) => t.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
const surname = (name) => name.replace(/^Dr\s+/, "").split(/\s+/).at(-1).toLowerCase();

/** A page's sections, held to the shape the type takes: a heading to its paragraphs, a question to its answer. */
function flatten(sections) {
  const out = {};
  for (const [heading, value] of Object.entries(sections ?? {})) {
    const title = heading.replace(/\s+/g, " ").trim();
    if (value == null) continue;
    if (Array.isArray(value)) {
      const lines = value.flatMap((part) => (typeof part === "string" ? [part] : [part.list_heading, ...part.items.map((item) => `• ${item}`)])).filter(Boolean);
      if (lines.length) out[title] = lines;
    } else if (typeof value === "object") {
      for (const [question, answer] of Object.entries(value)) if (answer) out[`${title}: ${question}`] = String(answer);
    } else if (String(value).trim()) out[title] = String(value);
  }
  return out;
}

/**
 * The review (2026-10-01): a proposal is a proposal until a person has read its sentence. Removed where
 * the sentence does not say it; lowered where it says it only in passing.
 */
const REVIEWED = {
  "jae-cho": { remove: ["shared-care"], sometimes: ["adhd-assessment"] }, // a general bio sentence; "ADHD" alone in a list
  "rajitha-de-silva": { remove: ["shared-care"] }, // a general bio sentence
  "kay-walls": { remove: ["shared-care", "executive-function"] }, // no shared prescribing said; "Focused Psychological Strategies" is training
  "natalie-cook": { remove: ["shared-care", "complex-mental-health"] }, // "tailoring treatment"; "complex adult ADHD" is not bipolar or psychosis
  "heather-mcauliffe": { remove: ["shared-care"] }, // "Collaborative care"
  "richard-hostiadi": { sometimes: ["movement-exercise"], add: { titration: "Adult ADHD assessments and ongoing management" } }, // "Lifestyle medicine"; ongoing ADHD management by a GP is dose review
  "shwetha-murthy": { add: { titration: "This breadth of experience underpins her careful, whole‑person approach to ADHD assessment and ongoing management." } },
};

const entries = [];
const report = [];
for (const card of build) {
  const page = scrape.practitioners.find((p) => surname(p.name).startsWith(surname(card.name).slice(0, 5)) || norm(p.name).includes(surname(card.name)));
  if (!page) throw new Error(`no page for ${card.name}`);
  const sections = flatten(page.sections);
  const pageLines = Object.values(sections).flat();
  const interests = page.areas_of_interest ?? [];
  const headline = [card.description, ...card.chips, ...interests];
  const turns = [...headline, ...card.about, ...card.experience, ...pageLines].map((text) => ({ speaker: "clinician", text }));
  const heard = readTranscript(turns).proposed;
  const care = new Map();
  const manner = new Map();
  for (const facet of heard) {
    const main = headline.some((line) => norm(line).includes(norm(facet.quote)) || norm(facet.quote).includes(norm(line)));
    if (facet.kind === "care") {
      const held = care.get(facet.area);
      if (!held || (main && !held.main)) care.set(facet.area, { main, quote: facet.quote });
    } else if (!manner.has(facet.trait)) manner.set(facet.trait, facet.quote);
  }
  // Ages as the page or the card states them: a clinician who sees children or teenagers declares it, with the sentence.
  const ages = card.ages ?? [];
  if ((ages.includes("children") || ages.includes("teens")) && !care.has("child-adolescent-adhd")) {
    const quote = page.ages ?? pageLines.find((line) => /\b(child|children|teen|adolescen|young people|age 5|15\+|13\+)/i.test(line)) ?? null;
    if (quote) care.set("child-adolescent-adhd", { main: false, quote });
  }
  // The interview reader's lexicon predates women's health, perinatal and the life domains, so the model
  // reader (grounded: every tag quotes their words) reads their explicit focus lists too: the card's
  // signals and the page's own "areas of interest", never a descriptive sentence (on Dr Natalie Cook's
  // "tailoring treatment to… their work, sleep, family" it read three areas she does not offer).
  const focusLines = [...card.chips, ...interests];
  if (focusLines.length) {
    const read = await readRequest(`Help with: ${focusLines.join(". ")}`);
    for (const need of read.needs) {
      const area = need.facet.kind === "care" ? need.facet.area : null;
      if (area && !care.get(area)?.main && focusLines.some((line) => norm(line).includes(norm(need.matched)) || norm(need.matched).includes(norm(line)))) care.set(area, { main: true, quote: need.matched });
    }
  }
  // A page that states its focus in a sentence rather than a list ("I work with clients of all ages,
  // supporting them through … pregnancy and motherhood … sleep difficulties, disordered eating"): the
  // same grounded read over those sentences, at the sometimes grade.
  const STATES_FOCUS = /\b(i work with|work with (clients|people|adults|children|families)|supporting (them|people|clients|adults)|particular interest|areas? of interest|special interest)\b/i;
  const focusSentences = pageLines.flatMap((line) => line.split(/(?<=[.!?])\s+/)).filter((sentence) => STATES_FOCUS.test(sentence));
  if (focusSentences.length) {
    const read = await readRequest(`Help with: ${focusSentences.join(" ")}`);
    for (const need of read.needs) {
      const area = need.facet.kind === "care" ? need.facet.area : null;
      if (area && !care.has(area) && focusSentences.some((sentence) => norm(sentence).includes(norm(need.matched)))) care.set(area, { main: false, quote: need.matched });
    }
  }
  // A clinician whose ages begin at adolescence ("adolescents and adults", "13+") carries the child tag
  // at the sometimes grade, so a nine-year-old's search lists those who see children first.
  if (care.has("child-adolescent-adhd") && !ages.includes("children")) care.get("child-adolescent-adhd").main = false;
  for (const [area, quote] of Object.entries(REVIEWED[card.id]?.add ?? {})) if (!care.has(area)) care.set(area, { main: false, quote });
  for (const area of REVIEWED[card.id]?.remove ?? []) care.delete(area);
  for (const area of REVIEWED[card.id]?.sometimes ?? []) if (care.has(area)) care.get(area).main = false;
  const careAreas = [...care].filter(([, c]) => c.main).map(([area]) => area);
  const sometimes = [...care].filter(([, c]) => !c.main).map(([area]) => area);
  const evidence = Object.fromEntries([...care].map(([area, c]) => [area, c.quote.slice(0, 200)]));
  const profession = card.category === "allied" ? "social-worker" : PROFESSION[card.category];
  const gender = card.pronouns === "she/her" ? "woman" : card.pronouns === "he/him" ? "man" : null;
  const billing = card.details.find(([k]) => k === "Billing")?.[1];
  const appointments = card.details.find(([k]) => k === "Appointments")?.[1];
  const reach = card.details.find(([k]) => k === "Reach")?.[1] ?? "Clinic appointments in Graceville, Brisbane, and telehealth";
  const summary = card.about[0];
  const image = `/clinicians/${card.id}.jpg`;
  const portrait = `${revamped}/assets/clinicians/${card.id}.jpg`;
  if (existsSync(portrait)) copyFileSync(portrait, `public${image}`);
  else report.push(`no portrait for ${card.id}`);
  const entry = {
    id: card.id,
    name: card.name,
    shortName: card.short,
    ...(profession ? { profession } : {}),
    ...(gender ? { gender, pronouns: card.pronouns } : {}),
    title: [page.role ?? card.role, page.qualifications].filter(Boolean).join(", "),
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach,
    image,
    acceptingNewPatients: true,
    focus: card.description,
    matchLine: card.description,
    fitSignals: card.chips,
    practicalSignals: [billing, card.telehealth ? "Telehealth" : null].filter(Boolean),
    summary,
    about: card.about.join(" "),
    experience: card.experience,
    languages: ["English", ...(card.languages ?? [])],
    careAreas,
    careAreasSometimes: sometimes,
    careEvidence: evidence,
    manner: [...manner.keys()].slice(0, 3),
    wheelchairAccessible: false,
    appointmentLength: appointments ?? "Times set with the practice",
    telehealthFirstAppointment: Boolean(card.telehealth),
    booking: { via: "practice", url: BOOK, note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form." },
    profileDetail: { sourceUrl: page.page_url, readOn: "2026-10-01", sections },
    realPerson: true,
  };
  entries.push(entry);
  report.push(`${card.id.padEnd(18)} ${String(profession ?? "gp").padEnd(14)} care [${careAreas.join(", ")}] sometimes [${sometimes.join(", ")}] manner [${entry.manner.join(", ")}] sections ${Object.keys(sections).length}`);
}

const ts = entries.map((e) => `  ${JSON.stringify(e, null, 2).replace(/\n/g, "\n  ").replace(/"([a-zA-Z]+)":/g, "$1:")},`).join("\n");
const path = "src/demo/roster-network.ts";
const source = readFileSync(path, "utf8");
const marker = "// Nurtured Thoughts Psychology (2026-10-01)";
if (source.includes(marker)) throw new Error("already imported");
const at = source.lastIndexOf("\n];");
writeFileSync(path, `${source.slice(0, at)}\n  ${marker}: sixteen clinicians, from revamped-adhd.me's cards (the visible layer) and their own pages\n  // (profileDetail, the backend layer), by scripts/import-nurtured-thoughts.mjs.\n${ts}${source.slice(at)}`);
console.log(report.join("\n"));
await v.close();
