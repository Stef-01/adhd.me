// The map's reading, held to the two things it must never get wrong: reach is what somebody has
// BUILT (so outward means ease, not severity), and no word on it reads like a diagnosis.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { SUBDOMAINS, type Subdomain } from "./layers";
import {
  AREAS,
  ASPECTS,
  ASPECT_LABELS,
  ASPECT_MEANINGS,
  ASPECT_OF,
  STATUS_LABEL,
  aspectView,
  areaOf,
  axes,
  currentFocus,
  diff,
  leadAxis,
  matrix,
  modulesOnAspect,
  movedAxes,
  standsOut,
  statusFor,
  type Aspect,
  type CellStatus,
} from "./matrix";
import { deriveNeeds, type Need } from "./needs";
import { emptyManual, emptyMedicationNote, MODEL_VERSION, type ModelRecord } from "./store";
import { emptyCarePlan } from "./care-plan";
import { RUNG_REACH } from "@/wellness/map";
import { lintLandingCopy } from "@/compliance/landing";
import { topicSurvey } from "@/learn/surveys";

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

/** Somebody three weeks in: starting hurts, a strategy worked, a sleep run is finished. */
const LIVED = record({
  onboarding: {
    improveFirst: "start-earlier",
    impact: 8,
    lookingFor: "professional",
    affects: "work",
    easier: ["urgent", "alongside"],
    completedAt: "2026-09-01T00:00:00.000Z",
  },
  resonance: {
    starting: { frequency: "often", cost: 8, priority: "yes", at: "2026-09-01T00:00:00.000Z" },
    ambiguity: { frequency: "often", cost: 7, priority: "yes", at: "2026-09-02T00:00:00.000Z" },
  },
  answers: { "starting.hardest-to-start": ["vague"], "starting.what-helps-start": ["person"] },
  experiments: [
    { strategyId: "first-physical-action", moduleId: "starting", acceptedAt: "2026-09-01T00:00:00Z", outcome: "a-lot", outcomeAt: "2026-09-02T00:00:00Z" },
  ],
  completed: ["starting", "sleep"],
});

/** A need built by hand, so a status rule can be exercised without staging a whole record. */
function need(over: Partial<Need> = {}): Need {
  return {
    id: "activation",
    domain: "work-study",
    subdomain: "activation",
    label: "Starting work",
    signalStrength: 1,
    functionalCost: 5,
    userPriority: "yes",
    confidence: "high",
    contributors: [],
    strengths: [],
    context: [],
    strategies: [],
    sources: ["starting"],
    persistence: 1,
    ...over,
  };
}

describe("the six axes", () => {
  it("are the six the founder drew, and every one carries a label and a meaning", () => {
    expect(ASPECTS).toEqual(["starting", "focus", "organisation", "emotional-regulation", "relationships", "sleep-energy"]);
    for (const aspect of eachOf(ASPECTS, "the axes")) {
      expect(ASPECT_LABELS[aspect], aspect).toBeTruthy();
      expect(ASPECT_MEANINGS[aspect], aspect).toMatch(/\.$/);
      expect(lintLandingCopy(`${ASPECT_LABELS[aspect]}. ${ASPECT_MEANINGS[aspect]}`), aspect).toEqual([]);
    }
  });

  it("cover every subdomain exactly once, so nothing on the eco-bio-psychosocial map falls off", () => {
    const covered = new Set<Subdomain>();
    for (const entry of eachOf(SUBDOMAINS, "the subdomains")) {
      const aspect = ASPECT_OF[entry.id];
      expect(ASPECTS, `${entry.id} maps to an axis that exists`).toContain(aspect);
      covered.add(entry.id);
    }
    expect(covered.size).toBe(SUBDOMAINS.length);
    expect(Object.keys(ASPECT_OF).length).toBe(SUBDOMAINS.length);
  });

  it("can every one of them actually move? each is taught by at least one module", () => {
    // The test that caught two dead axes on the wellness map. An axis nothing teaches is a flat
    // edge somebody reads as a verdict, so if one appears here it has to be recorded, not found.
    const dead = ASPECTS.filter((a) => modulesOnAspect(a).length === 0);
    expect(dead, "an axis no module teaches cannot be explored").toEqual([]);
  });
});

describe("the words", () => {
  it("are five, and none of them reads like a diagnosis", () => {
    const words = ASPECTS.map(() => null); // keep eachOf honest about the real list below
    expect(words).toHaveLength(6);
    const labels = Object.entries(STATUS_LABEL).filter(([id]) => id !== "unexplored");
    expect(labels).toHaveLength(5);
    for (const [id, label] of eachOf(labels, "the status words")) {
      expect(label, id).not.toMatch(/deficit|impair|disorder|abnormal|severe|risk|symptom/i);
      expect(lintLandingCopy(label), id).toEqual([]);
    }
  });

  it("say nothing at all where nothing has been asked", () => {
    expect(STATUS_LABEL.unexplored).toBe("");
  });

  it("a strong pattern that costs nothing is working well, not a problem to solve", () => {
    // The hyperfocus case from the brief: happens constantly, does not hurt, wants no change.
    expect(statusFor([need({ userPriority: "no", functionalCost: 8 })], false)).toBe("working-well");
    expect(statusFor([need({ functionalCost: 2 })], false)).toBe("working-well");
  });

  it("worked at and still costly is needs-support, and outranks having something that helps", () => {
    const worked = need({
      functionalCost: 9,
      userPriority: "yes",
      strategies: [{ strategyId: "s", title: "A strategy", outcome: "a-lot" }],
    });
    expect(statusFor([worked], false)).toBe("needs-support");
  });

  it("something here that works, at a bearable cost, is mostly supported", () => {
    const handled = need({
      functionalCost: 6,
      userPriority: "maybe",
      strategies: [{ strategyId: "s", title: "A strategy", outcome: "a-lot" }],
    });
    expect(statusFor([handled], false)).toBe("mostly-supported");
  });

  it("one source is still learning, and a contributor alone is too", () => {
    expect(statusFor([need({ confidence: "low", functionalCost: 9 })], false)).toBe("still-learning");
    expect(statusFor([], true)).toBe("still-learning");
    expect(statusFor([], false)).toBe("unexplored");
  });

  it("everything else is worth improving", () => {
    expect(statusFor([need({ functionalCost: 6, userPriority: "maybe" })], false)).toBe("worth-improving");
  });
});

describe("reach", () => {
  it("is the ladder the wellness map already proved, not a second reading of it", () => {
    // Two readings of one table drifting apart is the failure src/wellness/map.ts exists to stop.
    for (const point of eachOf(axes(LIVED), "the axes of a lived-in map")) {
      expect(RUNG_REACH[point.rung], point.aspect).toBe(point.reach);
    }
  });

  it("climbs because the person did something, and says so as an act", () => {
    const empty = axes(record());
    expect(empty.every((a) => a.reach === RUNG_REACH.unmapped)).toBe(true);
    expect(empty.every((a) => a.stillLearning)).toBe(true);

    const lived = axes(LIVED);
    const starting = lived.find((a) => a.aspect === "starting")!;
    // A strategy on a starting run that worked is the top rung.
    expect(starting.rung).toBe("working");
    expect(starting.reach).toBe(1);
    expect(starting.stillLearning).toBe(false);
  });

  it("is not severity: a high cost on its own does not move the shape outward", () => {
    const costlyOnly = record({
      onboarding: { improveFirst: "start-earlier", impact: 10, completedAt: "2026-09-01T00:00:00.000Z" },
    });
    const point = axes(costlyOnly).find((a) => a.aspect === "starting")!;
    // Named, because they said it. Not explored, kept or working — they have not built anything.
    expect(point.rung).toBe("named");
    expect(point.reach).toBeLessThan(RUNG_REACH.explored);
  });

  it("always returns six points in order, with or without a record", () => {
    expect(axes(null).map((a) => a.aspect)).toEqual([...ASPECTS]);
    expect(axes(LIVED).map((a) => a.aspect)).toEqual([...ASPECTS]);
  });
});

describe("the matrix", () => {
  it("is thirty cells, always, in a stable order", () => {
    const cells = matrix(LIVED);
    expect(cells).toHaveLength(AREAS.length * ASPECTS.length);
    expect(cells).toHaveLength(30);
    expect(cells[0]!.area).toBe(AREAS[0]);
    expect(cells[0]!.aspect).toBe(ASPECTS[0]);
    for (const cell of eachOf(cells, "the cells")) {
      expect(ASPECTS).toContain(cell.aspect);
      expect(AREAS).toContain(cell.area);
      if (cell.status === "unexplored") expect(cell.because).toBe("");
      else expect(cell.because, `${cell.area}:${cell.aspect}`).not.toBe("");
    }
  });

  it("starts empty, and an empty map says nothing about anybody", () => {
    const cells = matrix(record());
    expect(cells.every((c) => c.status === "unexplored")).toBe(true);
    expect(cells.every((c) => c.because === "")).toBe(true);
    expect(standsOut(record())).toBeNull();
  });

  it("puts an understand-module need in the area the person named at the door", () => {
    const atHome = record({ onboarding: { affects: "home", completedAt: "2026-09-01T00:00:00.000Z" } });
    const understandNeed = need({ domain: "understand" });
    expect(areaOf(understandNeed, atHome)).toBe("daily-life");
    expect(areaOf(understandNeed, record())).toBe("work-study");
    expect(areaOf(need({ domain: "relationships" }), atHome)).toBe("relationships");
  });
});

describe("what the screens read", () => {
  it("the hub's sentence is authored, and only appears once something points somewhere", () => {
    const line = standsOut(LIVED);
    expect(line).toBeTruthy();
    expect(line!).toMatch(/\.$/);
    expect(lintLandingCopy(line!)).toEqual([]);
  });

  it("the focus chips are at most three, one per axis", () => {
    const focus = currentFocus(LIVED);
    expect(focus.length).toBeLessThanOrEqual(3);
    expect(new Set(focus.map((f) => f.aspect)).size).toBe(focus.length);
  });

  it("an axis opens on its five areas, in order, with the axis's own point", () => {
    const view = aspectView(LIVED, "starting");
    expect(view.cells.map((c) => c.area)).toEqual([...AREAS]);
    expect(view.point.aspect).toBe("starting");
    expect(view.top?.subdomain).toBeTruthy();
    if (view.line) expect(lintLandingCopy(view.line)).toEqual([]);
  });

  it("opens on what you have built, not on what you have not", () => {
    const lead = leadAxis(axes(LIVED));
    expect(lead.reach).toBe(Math.max(...axes(LIVED).map((a) => a.reach)));
  });

  it("an empty record still answers every question without throwing", () => {
    const empty = record();
    expect(() => matrix(empty)).not.toThrow();
    expect(aspectView(null, "focus").cells).toEqual([]);
    expect(currentFocus(null)).toEqual([]);
  });
});

describe("what changed", () => {
  it("diff returns exactly the cells whose word moved, and nothing else", () => {
    const before = record();
    const after = LIVED;
    const changed = diff(before, after);
    const beforeCells = new Map(matrix(before).map((c) => [`${c.area}:${c.aspect}`, c.status]));
    expect(changed.length).toBeGreaterThan(0);
    for (const cell of eachOf(changed, "the changed cells")) {
      expect(beforeCells.get(`${cell.area}:${cell.aspect}`)).not.toBe(cell.status);
    }
    const changedKeys = new Set(changed.map((c) => `${c.area}:${c.aspect}`));
    for (const cell of matrix(after)) {
      if (changedKeys.has(`${cell.area}:${cell.aspect}`)) continue;
      expect(beforeCells.get(`${cell.area}:${cell.aspect}`)).toBe(cell.status);
    }
  });

  it("nothing changed is nothing to animate", () => {
    expect(diff(LIVED, LIVED)).toEqual([]);
    expect(movedAxes(LIVED, LIVED)).toEqual([]);
  });

  it("finishing a run moves the axis it was about", () => {
    const after = record({ ...LIVED, completed: [...LIVED.completed, "interruption"] });
    const moved = movedAxes(LIVED, after);
    expect(moved).toContain<Aspect>("focus");
  });
});

describe("the derived needs this is read from", () => {
  it("still carry the four things the direction asked about each one", () => {
    const needs = deriveNeeds(LIVED);
    expect(needs.length).toBeGreaterThan(0);
    for (const n of eachOf(needs, "the needs")) {
      expect(typeof n.signalStrength).toBe("number");
      expect(typeof n.functionalCost).toBe("number");
      expect(["yes", "maybe", "no", "unknown"]).toContain(n.userPriority);
      expect(["low", "medium", "high"]).toContain(n.confidence);
    }
  });

  it("every status a real record can produce is one the labels know", () => {
    const seen = new Set<CellStatus>(matrix(LIVED).map((c) => c.status));
    for (const status of seen) expect(STATUS_LABEL[status]).toBeDefined();
    expect(seen.size).toBeGreaterThan(1);
  });
});

/** Every question of the work survey answered with its first option, the way a person would. */
function workAnswers(): Record<string, string | number> {
  const survey = topicSurvey("work-study")!;
  const out: Record<string, string | number> = {};
  for (const q of survey.questions) {
    if (q.kind === "scale") out[q.id] = 9;
    else if (q.options?.[0]) out[q.id] = q.options[0].id;
  }
  return out;
}

describe("the map getting clearer", () => {
  it("counts a sharpened word, not only a longer spike", () => {
    // Somebody who has only been through the door answers the work survey. They have built
    // nothing, so the reach barely moves — but the app is surer and the axis is called something
    // different. That is the reward they answered ten questions for, and counting reach alone
    // would have made it silent.
    const before = record({
      onboarding: { improveFirst: "start-earlier", impact: 8, completedAt: "2026-09-01T00:00:00.000Z" },
    });
    const after = record({
      ...before,
      surveys: {
        "work-study": {
          answers: workAnswers(),
          at: "2026-09-08T00:00:00.000Z",
          completedAt: "2026-09-08T00:00:00.000Z",
        },
      },
    });
    const reachOnly = axes(before).every((a) => axes(after).find((b) => b.aspect === a.aspect)!.reach === a.reach);
    const moved = movedAxes(before, after);
    expect(moved.length, "a survey that changes nothing at all would be a broken survey").toBeGreaterThan(0);
    // Whether or not reach moved, the word did — and that is what the screen announces.
    if (reachOnly) {
      const wordChanged = matrix(after).some((cell) => {
        const was = matrix(before).find((c) => c.area === cell.area && c.aspect === cell.aspect)!;
        return was.status !== cell.status;
      });
      expect(wordChanged).toBe(true);
    }
  });
});
