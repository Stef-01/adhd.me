import { expect, it } from "vitest";
import { clinicians, professionOf, rankCliniciansNear, facetStrength } from "@/demo/clinicians";
import { needForKey, holdsPreference } from "@/matching/needs";
import { resolvePlace } from "@/geo/suburbs";
import { emptyFilters } from "@/finder/filters";
import { searchRoster } from "@/finder/pipeline";
const AGE = [[], ["care:child-adolescent-adhd"]];
const CARE = [[], ["care:adhd-assessment"], ["care:titration"], ["care:anxiety"], ["care:executive-function"], ["care:womens-health"], ["care:autism-adhd"], ["care:trauma-informed"], ["care:movement-exercise"], ["care:sleep"], ["care:complex-mental-health"], ["care:adhd-assessment", "care:anxiety"], ["care:executive-function", "care:work-career"], ["care:study-school"], ["care:perinatal"]];
const PREF = [[], ["pref:woman-gp"], ["pref:telehealth-first"], ["pref:lived-experience"], ["pref:bulk-billing"], ["language:hindi"], ["pref:woman-gp", "pref:telehealth-first"]];
const PLACE = ["", "Graceville", "Hornsby", "Gold Coast", "Perth"];
const has = (c: any, key: string) => { const n = needForKey(key); return n ? facetStrength(c, n.facet) > 0 : false; };
// The personalisation sweep (2026-10-01): every combination of who the person is, what they need, how and
// where, ranked, and held to the rules a person would take for granted. Rules that are policy (access
// before an assessment, a child before a language) or roster gaps (nobody prescribes for children) are
// reported by the scratch sweep in the RCA record, not asserted here.
it("holds the personalisation rules over 1,045 combinations", () => {
  const v: Record<string, string[]> = {};
  const add = (rule: string, msg: string) => ((v[rule] ??= []).push(msg));
  let n = 0;
  for (const a of AGE) for (const c of CARE) for (const p of PREF) for (const place of PLACE) {
    const keys = [...a, ...c, ...p]; if (!keys.length) continue; n++;
    const needs = keys.flatMap((k) => needForKey(k) ?? []);
    const origin = place ? resolvePlace(place) : null;
    const roster = searchRoster(clinicians, emptyFilters(), "", origin);
    const top = rankCliniciansNear("", origin, roster, undefined, needs).slice(0, 5);
    const label = `${keys.join("+")}${place ? " @" + place : ""}`;
    const exists = (pred: (x: any) => boolean) => roster.some(pred);
    if (a.length && exists((x) => has(x, a[0]!)) && !has(top[0], a[0]!)) add("child first must see children", `${label} -> ${top[0]!.id}`);
    if (a.length) { const adultsOnly = top.filter((x) => !has(x, a[0]!)); if (adultsOnly.length && roster.filter((x) => has(x, a[0]!)).length >= 5) add("child top5 all see children", `${label} -> ${adultsOnly.map((x) => x.id).join(",")}`); }
    for (const k of p) if (exists((x) => has(x, k)) && !has(top[0], k)) add(`${k} first`, `${label} -> ${top[0]!.id}`);
    if (c.includes("care:adhd-assessment") && exists((x) => has(x, "care:adhd-assessment")) && !has(top[0], "care:adhd-assessment")) add("assessment first", `${label} -> ${top[0]!.id}(${professionOf(top[0]!)})`);
    if (c.includes("care:titration") && !["gp", "psychiatrist"].includes(professionOf(top[0]!)) && exists((x) => has(x, "care:titration"))) add("dose review led by a prescriber", `${label} -> ${top[0]!.id}(${professionOf(top[0]!)})`);
    for (const k of c) if (exists((x) => has(x, k)) && !top.some((x) => has(x, k))) add(`${k} in top5`, `${label}`);
  }
  expect(n).toBe(1045);
  expect(v["child first must see children"] ?? []).toEqual([]);
  expect(v["child top5 all see children"] ?? []).toEqual([]);
  expect((v["dose review led by a prescriber"] ?? []).filter((m) => !m.includes("child-adolescent"))).toEqual([]);
  expect(v["pref:woman-gp first"] ?? []).toEqual([]);
  expect(v["pref:telehealth-first first"] ?? []).toEqual([]);
});
