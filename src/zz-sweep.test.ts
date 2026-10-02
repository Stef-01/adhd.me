import { test } from "vitest";
import { clinicians, rankCliniciansNear, noneLocal, LOCAL_KM } from "@/demo/clinicians";
import { emptyFilters } from "@/finder/filters";
import { searchRoster } from "@/finder/pipeline";
import { placeIn, resolvePlace } from "@/geo/suburbs";
import { professionsMentioned, PROFESSION_ENTRIES } from "@/support/professions";
test("sweep", () => {
  const bad: string[] = [];
  const places = ["Brisbane", "Sydney", "Gold Coast", "Hornsby", "Parramatta", "Southport", "Fortitude Valley", "Penrith", "Benowa", "Graceville"];
  const asks = ["", " for an adult ADHD assessment", " who takes new patients", " for my 9 year old son", " for anxiety", " bulk billed", " by telehealth", " in person"];
  for (const p of places) for (const e of PROFESSION_ENTRIES) for (const a of asks) {
    const q = `A ${e.cues[0]} in ${p}${a}`;
    const o = resolvePlace(p);
    if (!o) { bad.push(`no place ${p}`); continue; }
    if (placeIn(q) !== p) bad.push(`placeIn ${q} -> ${placeIn(q)}`);
    const named = professionsMentioned(q);
    if (!named.includes(e.id)) bad.push(`kind ${q} -> ${named}`);
    const list = rankCliniciansNear(q, o, searchRoster(clinicians, emptyFilters(), q, o));
    if (list.some((c) => !named.includes(((c.profession ?? "gp") as string) as never))) bad.push(`other kind in ${q}: ${list.filter((c)=>!named.includes((c.profession??"gp") as never)).map(c=>c.id).slice(0,3)}`);
    const km = (c: typeof list[number]) => { const r = resolvePlace(c.suburb); return r ? Math.hypot((r.lat - o.lat) * 111, (r.lon - o.lon) * 95) : 9999; };
    const firstLocal = list.findIndex((c) => km(c) <= LOCAL_KM);
    if (firstLocal > 0 && !/in person/.test(q)) bad.push(`local at ${firstLocal} in ${q}: top ${list[0]!.id} ${list[0]!.suburb}`);
  }
  for (const typo of ["councellor", "counseller", "psychiatrists", "psychologist's", "physio's", "occupational therapists", "a OT", "dietitians", "GP's", "Doctors", "a psych", "psycologist"]) console.log("KIND", typo, professionsMentioned(`a ${typo} near me`));
  for (const s of ["a gp in brisbane cbd", "gp brisbane", "brisbane gp", "near the gold coast", "on the Gold Coast", "in Sydney's north", "in Bris.", "sydney cbd", "in syd", "around bne", "in qld"]) console.log("PLACE", s, "->", placeIn(s));
  console.log("BAD", bad.length, JSON.stringify([...new Set(bad)].slice(0, 40), null, 1));
});
test("bare", () => {
  for (const s of ["gp brisbane", "brisbane gp", "on the Gold Coast", "in Sydney's north", "sydney cbd", "my son Logan has ADHD", "my daughter Sydney is 9", "I don't live in Brisbane anymore", "not in brisbane, in Ipswich", "a GP, Parramatta area", "Melbourne based psychologist", "help for my son, we live in Logan", "Liverpool supporter needing a GP in Hornsby"]) console.log("BARE", s, "->", placeIn(s));
});
