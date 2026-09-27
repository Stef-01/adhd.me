// The care plan, held to its own refusals (docs/adhd-life/CARE-PLAN-PRD.md §2, §10).
//
// The structural test at the bottom is the load-bearing one. `src/directory/fees.ts` refuses
// `rebateCents` because "a rebate is a fact about the patient's Medicare entitlement rather than
// about the practice" — and this module is made of facts about the patient's entitlement, so the
// temptation to subtract arrives here with a reason. It is asserted over KEYS AND EXPORTS rather
// than over prose, which is fees.ts's own method note: a scan whose subject matter is the thing it
// bans will match the sentence doing the banning.

import { describe, expect, it } from "vitest";
import {
  CLAIMABLE,
  claimable,
  done,
  emptyCarePlan,
  GOALS_MAX,
  hasPlan,
  lapses,
  PLAN_MAX,
  remaining,
  sanitisePlan,
  spent,
  STEPS,
  suggestFor,
  teamFor,
  TEAM_MAX,
  type CarePlan,
} from "./care-plan";
import * as carePlan from "./care-plan";
import { PROFESSIONS } from "@/support/professions";
import { emptyModel, MODEL_KEY, saveCarePlan, savePlanDetails, clearCarePlan, readModel, saveOnboarding, recordResonance, type ModelRecord } from "./store";
import { deriveNeeds } from "./needs";

const THIS_YEAR = 2026;
const TODAY = new Date(`${THIS_YEAR}-09-20T00:00:00Z`);

function plan(over: Partial<CarePlan> = {}): CarePlan {
  return { ...emptyCarePlan(), allows: 5, used: 2, year: THIS_YEAR, confirmedOn: `${THIS_YEAR}-09-01T00:00:00Z`, ...over };
}

/** A record with enough in it to produce needs, so the suggestion tests are not vacuous. */
function livedRecord(): ModelRecord {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  saveOnboarding(storage, { improveFirst: "start-earlier", impact: 8 });
  recordResonance(storage, "starting", { frequency: "often", cost: 8, priority: "yes" });
  recordResonance(storage, "working-memory", { frequency: "often", cost: 7, priority: "yes" });
  recordResonance(storage, "sleep", { frequency: "often", cost: 7, priority: "yes" });
  recordResonance(storage, "eating", { frequency: "often", cost: 6, priority: "yes" });
  recordResonance(storage, "exercise", { frequency: "often", cost: 6, priority: "yes" });
  return readModel(storage);
}

describe("what a plan allows", () => {
  it("an empty record has no plan, and no plan has nothing left", () => {
    const empty = emptyCarePlan();
    expect(hasPlan(empty)).toBe(false);
    expect(remaining(empty, TODAY)).toBe(0);
    expect(spent(empty, TODAY)).toEqual([]);
  });

  it("counts what is left, and draws one dot per service", () => {
    expect(remaining(plan(), TODAY)).toBe(3);
    expect(spent(plan(), TODAY)).toEqual([true, true, false, false, false]);
  });

  it("floors at zero when somebody has used more than the plan allows", () => {
    // Reachable by hand: a person correcting `used` before `allows`. A negative number on a screen
    // is worse than the honest reading, which is that there is nothing left.
    expect(remaining(plan({ allows: 3, used: 5 }), TODAY)).toBe(0);
    expect(spent(plan({ allows: 3, used: 5 }), TODAY)).toEqual([true, true, true]);
  });

  it("reads a plan from an earlier year as a fresh allowance, without editing the record", () => {
    const lastYear = plan({ year: THIS_YEAR - 1, used: 5 });
    expect(remaining(lastYear, TODAY)).toBe(5);
    // And the record is untouched: `used` still says what the person told us last year.
    expect(lastYear.used).toBe(5);
  });

  it("says which year the allowance runs to, once, as a fact", () => {
    expect(lapses(plan(), TODAY)).toBe(THIS_YEAR + 1);
  });

  it("never draws more dots than a plan can hold", () => {
    expect(spent(plan({ allows: 500, used: 0 }), TODAY)).toHaveLength(PLAN_MAX);
  });
});

describe("which kinds a plan can pay for", () => {
  it("names four of the eleven professions, and every one is a real profession", () => {
    expect(CLAIMABLE).toHaveLength(4);
    for (const kind of CLAIMABLE) expect(PROFESSIONS).toContain(kind);
  });

  it("does not cover the kinds a plan cannot: a coach, a GP, a psychiatrist", () => {
    // The coach is the one that matters. MAP-CONNECTIONS measured it as the map's answer for 13 of
    // the 17 subdomains no real provider can serve, and it is not a Medicare provider at all.
    expect(claimable("adhd-coach")).toBe(false);
    expect(claimable("gp")).toBe(false);
    expect(claimable("psychiatrist")).toBe(false);
    expect(claimable("psychologist")).toBe(true);
  });
});

describe("who to spend it on", () => {
  const record = livedRecord();

  it("has more needs than services, so the cap below is actually exercised", () => {
    expect(deriveNeeds(record).length).toBeGreaterThan(2);
  });

  it("suggests nothing when there is nothing left to spend", () => {
    expect(suggestFor(record, plan({ allows: 2, used: 2 }), TODAY)).toEqual([]);
    expect(suggestFor(record, emptyCarePlan(), TODAY)).toEqual([]);
  });

  it("never suggests spending more services than remain", () => {
    for (const left of [1, 2, 3]) {
      const covered = suggestFor(record, plan({ allows: left, used: 0 }), TODAY).filter((s) => s.covered);
      expect(covered.length).toBeLessThanOrEqual(left);
    }
  });

  it("suggests each kind once, and names the axis it came from", () => {
    const out = suggestFor(record, plan({ allows: 5, used: 0 }), TODAY);
    expect(out.length).toBeGreaterThan(0);
    expect(new Set(out.map((s) => s.kind)).size).toBe(out.length);
    for (const s of out) {
      expect(PROFESSIONS).toContain(s.kind);
      // The axis, not the need's sentence: one or two words, and no full stop.
      expect(s.because).not.toMatch(/\.$/);
      expect(s.because.split(" ").length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps at most one kind a plan cannot pay for, marked, rather than dropping it", () => {
    const out = suggestFor(record, plan({ allows: 5, used: 0 }), TODAY);
    expect(out.filter((s) => !s.covered).length).toBeLessThanOrEqual(1);
    for (const s of out) expect(s.covered).toBe(claimable(s.kind));
  });

  it("never suggests a GP, because a GP writes the plan", () => {
    // `professionsFor` falls back to ["gp"] whenever no module targets a need, so this is the one
    // kind that arrives without anybody choosing it — and "see a GP" on a care-plan screen is
    // circular. Skipped, not marked: it was never on offer to be denied.
    for (const left of [1, 3, 5]) {
      const out = suggestFor(record, plan({ allows: left, used: 0 }), TODAY);
      expect(out.map((s) => s.kind)).not.toContain("gp");
    }
  });

  it("is deterministic: the same record and plan give the same list", () => {
    const a = suggestFor(record, plan(), TODAY);
    const b = suggestFor(record, plan(), TODAY);
    expect(a).toEqual(b);
  });
});

describe("the plan on the record", () => {
  function storage() {
    const store = new Map<string, string>();
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  }

  it("starts empty on a new record", () => {
    expect(hasPlan(emptyModel().carePlan)).toBe(false);
  });

  it("saves the person's own numbers and reads them back", () => {
    const s = storage();
    const saved = saveCarePlan(s, 5, 2, THIS_YEAR);
    expect(saved.carePlan.allows).toBe(5);
    expect(saved.carePlan.used).toBe(2);
    expect(hasPlan(saved.carePlan)).toBe(true);
    expect(readModel(s).carePlan.allows).toBe(5);
  });

  it("clamps what a person can type, at both ends", () => {
    const s = storage();
    expect(saveCarePlan(s, -4, -1, THIS_YEAR).carePlan).toMatchObject({ allows: 0, used: 0 });
    expect(saveCarePlan(s, 9999, 9999, THIS_YEAR).carePlan).toMatchObject({ allows: PLAN_MAX, used: PLAN_MAX });
  });

  it("forgets it when asked", () => {
    const s = storage();
    saveCarePlan(s, 5, 2, THIS_YEAR);
    expect(hasPlan(clearCarePlan(s).carePlan)).toBe(false);
  });

  it("reads a record written before the plan existed as having no plan", () => {
    const s = storage();
    const before = { ...emptyModel() } as Record<string, unknown>;
    delete before.carePlan;
    s.setItem(MODEL_KEY, JSON.stringify(before));
    expect(hasPlan(readModel(s).carePlan)).toBe(false);
  });
});

describe("the helper: five things, each answered or not", () => {
  it("starts with nothing answered, and a written plan answers only the numbers", () => {
    for (const step of STEPS) expect(done(emptyCarePlan(), step), step).toBe(false);
    const numbers = plan();
    expect(STEPS.filter((step) => done(numbers, step))).toEqual(["services"]);
  });

  it("counts a not-yet, a nobody and an empty team as answers, because they are", () => {
    expect(done(plan({ sixMonths: false }), "duration")).toBe(true);
    expect(done(plan({ goals: [] }), "goals")).toBe(true);
    expect(done(plan({ providers: [] }), "providers")).toBe(true);
    expect(done(plan({ team: [] }), "team")).toBe(true);
  });

  it("asks the four before the visit first, and the numbers only a written plan can give last", () => {
    expect(STEPS[STEPS.length - 1]).toBe("services");
  });

  it("reads an old record as not asked yet rather than as answered nothing", () => {
    const old = sanitisePlan({ allows: 5, used: 2, year: THIS_YEAR, confirmedOn: "2026-09-01T00:00:00Z" });
    expect(old).toMatchObject({ allows: 5, used: 2, sixMonths: null, goals: null, providers: null, team: null, goalNote: "", providerNote: "" });
    expect(sanitisePlan(null)).toEqual(emptyCarePlan());
    expect(sanitisePlan("plan")).toEqual(emptyCarePlan());
    expect(sanitisePlan([])).toEqual(emptyCarePlan());
  });

  it("holds each answer to its own shape: known kinds, known axes, at most three goals, no duplicates", () => {
    const messy = sanitisePlan({
      sixMonths: "yes",
      goals: ["starting", "starting", "money", "focus", "sleep-energy", "organisation"],
      goalNote: 42,
      providers: ["psychologist", "wizard", "psychologist"],
      team: ["psychologist", "adhd-coach", "gp", "dietitian"],
    });
    expect(messy.sixMonths).toBeNull();
    expect(messy.goals).toEqual(["starting", "focus", "sleep-energy"]);
    expect(messy.goals!.length).toBe(GOALS_MAX);
    expect(messy.goalNote).toBe("");
    expect(messy.providers).toEqual(["psychologist"]);
    // A plan can never pay for a coach and a GP writes it, so neither can be on the team it reads.
    expect(messy.team).toEqual(["psychologist", "dietitian"]);
  });

  it("keeps the person's own words byte for byte", () => {
    const words = "  Get out the door on time.  ";
    expect(sanitisePlan({ goalNote: words }).goalNote).toBe(words);
  });
});

describe("the map's proposal for a plan that may not exist yet", () => {
  it("proposes from the map alone, never a GP, at most four covered and one uncovered", () => {
    const rows = teamFor(livedRecord());
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((r) => r.kind)).not.toContain("gp");
    expect(rows.filter((r) => r.covered).length).toBeLessThanOrEqual(TEAM_MAX);
    expect(rows.filter((r) => !r.covered).length).toBeLessThanOrEqual(1);
    for (const r of rows) expect(r.covered).toBe(claimable(r.kind));
  });

  it("is what a plan spends, so the two agree wherever both exist", () => {
    const rec = livedRecord();
    expect(suggestFor(rec, plan({ allows: 5, used: 0 }), TODAY)).toEqual(teamFor(rec, 5));
    expect(teamFor(rec, 1).filter((r) => r.covered)).toHaveLength(1);
    expect(teamFor(rec, 0)).toEqual([]);
  });

  it("proposes nothing for a map with nothing on it", () => {
    expect(teamFor(emptyModel())).toEqual([]);
  });
});

describe("the helper on the record", () => {
  function storage() {
    const store = new Map<string, string>();
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  }

  it("keeps each answer, and the numbers do not overwrite the answers or the answers the numbers", () => {
    const s = storage();
    savePlanDetails(s, { sixMonths: true, goals: ["starting"], goalNote: "Mornings." });
    saveCarePlan(s, 5, 2, THIS_YEAR);
    savePlanDetails(s, { providers: [], team: ["psychologist"] });
    const read = readModel(s).carePlan;
    expect(read).toMatchObject({ allows: 5, used: 2, sixMonths: true, goals: ["starting"], goalNote: "Mornings.", providers: [], team: ["psychologist"] });
    expect(STEPS.every((step) => done(read, step))).toBe(true);
  });

  it("forgets the answers with the plan", () => {
    const s = storage();
    savePlanDetails(s, { sixMonths: true, goals: ["starting"] });
    expect(clearCarePlan(s).carePlan).toEqual(emptyCarePlan());
  });
});

describe("no money, structurally", () => {
  // fees.ts refuses `outOfPocketCents` and `rebateCents`, and its stated reason for the second is
  // that an entitlement fact "invites the subtraction the field above refuses". This module is an
  // entitlement fact, so the absence is asserted rather than intended.
  const MONEY = /cent|dollar|price|fee|rebate|gap|saving|cost|worth|\$/i;

  it("has no field on the record that could hold an amount", () => {
    const keys = Object.keys(emptyCarePlan());
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((k) => MONEY.test(k))).toEqual([]);
  });

  it("exports nothing whose name promises an amount", () => {
    const names = Object.keys(carePlan);
    expect(names.length).toBeGreaterThan(5);
    expect(names.filter((n) => MONEY.test(n))).toEqual([]);
  });

  it("returns no number from a suggestion except the count of them", () => {
    const out = suggestFor(livedRecord(), plan({ allows: 5, used: 0 }), TODAY);
    for (const s of out) {
      expect(Object.keys(s).filter((k) => MONEY.test(k))).toEqual([]);
      for (const value of Object.values(s)) expect(typeof value).not.toBe("number");
    }
  });
});
