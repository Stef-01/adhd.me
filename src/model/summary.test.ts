// The GP summary, held to the rule it exists under: this app writes no clinical prose.
//
// The load-bearing test is "every line is a heading, a row the record already held, or the
// person's own words". That is `src/referrals/document.ts`'s gate made machine-checkable, and it
// is what stops a well-meaning later edit from adding a sentence about somebody's mind.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { profession } from "@/support/professions";
import { AREA_LABELS, areaOf } from "./matrix";
import { deriveNeeds } from "./needs";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  SECTION_HEADINGS,
  SECTION_ORDER,
  adjustmentsFor,
  axisLines,
  gpSummary,
  sectionRows,
  sectionsIn,
  summaryText,
  type SectionKey,
} from "./summary";
import { emptyManual, emptyMedicationNote, MODEL_VERSION, type ModelRecord } from "./store";
import { ASPECT_LABELS } from "./matrix";
import { emptyCarePlan, teamFor, type CarePlan } from "./care-plan";

function record(over: Partial<ModelRecord> = {}): ModelRecord {
  return {
    v: MODEL_VERSION,
    onboarding: null,
    resonance: {},
    answers: {},
    insights: {},
    experiments: [],
    reflections: [],
    relates: {},
    interpretations: [],
    safety: [],
    completed: [],
    survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null },
    surveys: {},
    manual: emptyManual(),
    medication: emptyMedicationNote(),
    checkpoints: [],
    carePlan: emptyCarePlan(),
    ...over,
  };
}

const MY_WORDS = "Give me one clear first step and I will run with it.";
const MY_MED_WORDS = "It makes the first hour easier. It does nothing for the evenings.";

const LIVED = record({
  onboarding: {
    improveFirst: "start-earlier",
    impact: 8,
    lookingFor: "professional",
    affects: "work",
    medication: "yes",
    easier: ["urgent", "alongside"],
    completedAt: "2026-09-01T00:00:00.000Z",
  },
  resonance: {
    starting: { frequency: "often", cost: 8, priority: "yes", at: "2026-09-01T00:00:00.000Z" },
    ambiguity: { frequency: "often", cost: 8, priority: "yes", at: "2026-09-02T00:00:00.000Z" },
    "not-listening": { frequency: "sometimes", cost: 6, priority: "maybe", at: "2026-09-03T00:00:00.000Z" },
  },
  answers: {
    "starting.hardest-to-start": ["vague"],
    "starting.what-helps-start": ["person"],
    "ambiguity.source": ["manager"],
  },
  experiments: [
    { strategyId: "first-physical-action", moduleId: "starting", acceptedAt: "2026-09-01T00:00:00Z", outcome: "a-lot", outcomeAt: "2026-09-02T00:00:00Z" },
    { strategyId: "define-done", moduleId: "ambiguity", acceptedAt: "2026-09-04T00:00:00Z", outcome: "a-little", outcomeAt: "2026-09-06T00:00:00Z" },
    { strategyId: "body-double", moduleId: "starting", acceptedAt: "2026-09-07T00:00:00Z" },
  ],
  completed: ["starting", "ambiguity"],
  manual: { helps: MY_WORDS, harder: "", "work-with-me": "", updatedAt: "2026-09-05T00:00:00.000Z" },
  medication: { changes: MY_MED_WORDS, untouched: "", unwanted: "", updatedAt: "2026-09-05T00:00:00.000Z" },
});

/**
 * Everything the record itself can legitimately put on a line: the labels, notes, titles and names
 * it already holds, plus whatever the person typed. A line outside this set is authored prose.
 */
function permittedRows(rec: ModelRecord): Set<string> {
  const ok = new Set<string>();
  for (const need of deriveNeeds(rec)) {
    ok.add(need.label);
    ok.add(`${need.label} (${AREA_LABELS[areaOf(need, rec)]})`);
    ok.add(`${AREA_LABELS[areaOf(need, rec)]}: ${need.label}`);
    ok.add(`${AREA_LABELS[areaOf(need, rec)]}: ${need.label} (not a priority)`);
    for (const c of need.contributors) ok.add(c.note);
    for (const c of need.context) ok.add(c);
    for (const s of need.strengths) ok.add(s);
    for (const s of need.strategies) {
      for (const suffix of ["helped a lot", "helped a little", "did not help", "not tried yet", "still testing"]) {
        ok.add(`${s.title} — ${suffix}`);
      }
      ok.add(s.title);
    }
  }
  for (const line of [rec.manual.helps, rec.manual.harder, rec.manual["work-with-me"], rec.medication.changes, rec.medication.untouched, rec.medication.unwanted, rec.carePlan.goalNote, rec.carePlan.providerNote]) {
    for (const part of line.split("\n")) if (part.trim()) ok.add(part.trim());
  }
  // The plan's rows: the person's own numbers and answers, in labels the app already shows them.
  const plan = rec.carePlan;
  ok.add(`Plan allows: ${plan.allows}`);
  ok.add(`Used so far: ${plan.used}`);
  ok.add(`Six months or more: ${plan.sixMonths ? "yes" : "not yet"}`);
  if (plan.goals) ok.add(`Goals: ${plan.goals.map((a) => ASPECT_LABELS[a]).join(", ")}`);
  if (plan.providers) ok.add(`Current providers: ${plan.providers.length ? plan.providers.map((k) => profession(k).label).join(", ") : "none"}`);
  const proposal = teamFor(rec).filter((r) => r.covered);
  const named = (kinds: readonly string[]) =>
    kinds.map((k) => { const why = proposal.find((r) => r.kind === k)?.because; return why ? `${profession(k as never).label} (${why})` : profession(k as never).label; }).join(", ");
  ok.add(`Proposed team: ${named(proposal.map((r) => r.kind))}`);
  if (plan.team) ok.add(`Preferred team: ${named(plan.team)}`);
  return ok;
}

describe("the rule: no clinical text this app authored", () => {
  it("every line of the document is a heading, a row from the record, or the person's own words", () => {
    const headings = new Set<string>(Object.values(SECTION_HEADINGS));
    for (const audience of eachOf(AUDIENCES, "the audiences")) {
      const summary = gpSummary(LIVED, audience);
      const text = summaryText(summary);
      expect(text, audience).not.toBe("");
      const allowed = permittedRows(LIVED);
      // The heading of a profession is the app's own word for a kind of care, which it already
      // showed this person on their own screen. Allow exactly those labels and nothing else.
      for (const p of summary.supports) allowed.add(profession(p).label);
      for (const line of eachOf(text.split("\n").filter((l) => l.trim()), `the lines of the ${audience} summary`)) {
        const ok = headings.has(line) || allowed.has(line);
        expect(ok, `"${line}" is not a heading, a record row, or the person's own words`).toBe(true);
      }
    }
  });

  it("holds a prepared care plan to the same rule: numbers, answers and labels, never a request", () => {
    const prepared: CarePlan = {
      allows: 5, used: 2, year: 2026, confirmedOn: "2026-09-05T00:00:00Z",
      sixMonths: true, goals: ["starting", "sleep-energy"], goalNote: "Get out the door on time.",
      providers: ["psychologist"], providerNote: "Dr Lee, fortnightly.", team: ["psychologist", "occupational-therapist"],
    };
    const rec = record({ ...LIVED, carePlan: prepared });
    const summary = gpSummary(rec, "gp");
    const rows = sectionRows(summary, "carePlan");
    expect(rows).toEqual([
      "Plan allows: 5",
      "Used so far: 2",
      "Six months or more: yes",
      "Goals: Starting, Sleep & energy",
      "Get out the door on time.",
      "Current providers: Psychologist",
      "Dr Lee, fortnightly.",
      expect.stringMatching(/^Preferred team: Psychologist/),
    ]);
    const allowed = permittedRows(rec);
    for (const line of rows) expect(allowed.has(line), `"${line}" is not a record row or the person's own words`).toBe(true);
    // The team a GP reads holds only kinds a plan can pay for, and never a GP.
    expect(rows.join("\n")).not.toMatch(/coach|\bGP\b/);
  });

  it("says nothing about a plan nobody has started, and proposes from the map once the numbers exist", () => {
    expect(sectionRows(gpSummary(LIVED, "gp"), "carePlan")).toEqual([]);
    const numbers = record({ ...LIVED, carePlan: { ...emptyCarePlan(), allows: 5, used: 2, year: 2026, confirmedOn: "2026-09-05T00:00:00Z" } });
    const rows = sectionRows(gpSummary(numbers, "gp"), "carePlan");
    expect(rows.slice(0, 2)).toEqual(["Plan allows: 5", "Used so far: 2"]);
    expect(rows.some((r) => r.startsWith("Proposed team: "))).toBe(true);
    expect(rows.join("\n")).not.toMatch(/Six months|Goals:|Current providers/);
  });

  it("holds the person's own words byte for byte, never rewritten", () => {
    const text = summaryText(gpSummary(LIVED, "gp"));
    expect(text).toContain(MY_WORDS);
    expect(text).toContain(MY_MED_WORDS);
  });

  it("has no sentence template anywhere in its output for an empty record", () => {
    const empty = gpSummary(record(), "gp");
    expect(summaryText(empty)).toBe("");
    expect(sectionsIn(empty)).toEqual([]);
  });
});

describe("the sections", () => {
  it("appear in document order and every one that appears has content", () => {
    const summary = gpSummary(LIVED, "gp");
    const keys = sectionsIn(summary);
    expect(keys.length).toBeGreaterThan(3);
    expect(keys).toEqual(SECTION_ORDER.filter((k) => keys.includes(k)));
    for (const key of eachOf(keys, "the sections")) {
      expect(sectionRows(summary, key).length, key).toBeGreaterThan(0);
      expect(SECTION_HEADINGS[key], key).toBeTruthy();
    }
  });

  it("a removed section leaves the document entirely", () => {
    const summary = gpSummary(LIVED, "gp");
    const removed = new Set<SectionKey>(["tried"]);
    const before = summaryText(summary);
    const after = summaryText(summary, removed);
    expect(before).toContain(SECTION_HEADINGS.tried);
    expect(after).not.toContain(SECTION_HEADINGS.tried);
    for (const row of sectionRows(summary, "tried")) expect(after).not.toContain(row);
  });

  it("every heading passes the copy lint", () => {
    for (const [key, heading] of eachOf(Object.entries(SECTION_HEADINGS), "the headings")) {
      expect(lintLandingCopy(heading), key).toEqual([]);
    }
    for (const [key, label] of eachOf(Object.entries(AUDIENCE_LABELS), "the audience labels")) {
      expect(lintLandingCopy(label), key).toEqual([]);
    }
  });
});

describe("audience", () => {
  it("changes the order, never the facts", () => {
    const gp = gpSummary(LIVED, "gp");
    const psych = gpSummary(LIVED, "psychologist");
    const factsOf = (s: ReturnType<typeof gpSummary>) => [...s.highestImpact].sort().join("|");
    expect(factsOf(psych)).toBe(factsOf(gp));
  });

  it("leaves medication out of a summary for work or university", () => {
    expect(summaryText(gpSummary(LIVED, "work"))).not.toContain(MY_MED_WORDS);
    expect(summaryText(gpSummary(LIVED, "gp"))).toContain(MY_MED_WORDS);
  });

  it("never lists a matched provider, because that section is opt-in and nothing opted in", () => {
    for (const audience of eachOf(AUDIENCES, "the audiences")) {
      const s = gpSummary(LIVED, audience);
      expect(Object.keys(s)).not.toContain("matched");
    }
  });
});

describe("supports", () => {
  it("are named only when the escalation gate already opened", () => {
    // Nothing tried, low cost: no kind of care is suggested at all.
    const quiet = record({
      onboarding: { improveFirst: "start-earlier", impact: 2, completedAt: "2026-09-01T00:00:00.000Z" },
    });
    expect(gpSummary(quiet, "gp").supports).toEqual([]);
    expect(gpSummary(LIVED, "gp").supports.length).toBeGreaterThan(0);
  });
});

describe("the extras the document can carry", () => {
  it("the map reading is one line per touched axis, in words", () => {
    const lines = axisLines(LIVED);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of eachOf(lines, "the axis lines")) {
      expect(line).toMatch(/^[^:]+: [A-Z]/);
      expect(line).not.toMatch(/\d/);
    }
  });

  it("adjustments name a real track only when the leading need is one a track covers", () => {
    // Starting is not a thing a university or a workplace puts on paper, so there is no track.
    expect(adjustmentsFor(LIVED)).toBeNull();
    expect(adjustmentsFor(record())).toBeNull();
    const atWork = record({
      onboarding: { improveFirst: "reduce-work-overwhelm", impact: 8, affects: "work", completedAt: "2026-09-01T00:00:00.000Z" },
    });
    const track = adjustmentsFor(atWork);
    expect(track, "a workload-led record reaches the workplace track").not.toBeNull();
    expect(track!.items.length).toBeGreaterThan(0);
  });
});
