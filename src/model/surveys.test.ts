// The topic surveys (PRD §22–§23, §60) and their scorer, held to §67: valid, skipped,
// contradictory, empty and incomplete answers; and the offer rule (§20) that never launches.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { INTERACTIVE_MODULES, strategyById } from "@/learn/interactive";
import { SURVEY_INSIGHTS, surveyText, TOPIC_SURVEYS, topicSurvey } from "@/learn/surveys";
import { deriveNeeds } from "./needs";
import { offerSurvey } from "./offer";
import { availableSurveys, contradictionsIn, insightFor, scoreSurvey, surveyResults } from "./surveys";
import { DOMAIN_LABELS, type Subdomain } from "./layers";
import { completeSurvey, emptyModel, readModel, recordResonance, recordSurveyAnswer, saveOnboarding, type ModelRecord } from "./store";

function fakeStorage() {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
}

const work = topicSurvey("work-study")!;

describe("the five topic surveys", () => {
  it("are the PRD's five, eight to twelve questions each, one scale question each, every string passing the patient rules", () => {
    expect(TOPIC_SURVEYS.map((s) => s.id).sort()).toEqual(["daily-organisation", "emotional-wellbeing", "relationships", "sleep", "work-study"]);
    for (const s of eachOf(TOPIC_SURVEYS, "the topic surveys")) {
      expect(s.questions.length).toBeGreaterThanOrEqual(8);
      expect(s.questions.length).toBeLessThanOrEqual(12);
      expect(s.questions.filter((q) => q.kind === "scale").length).toBe(1);
      expect(new Set(s.questions.map((q) => q.id)).size).toBe(s.questions.length);
      for (const q of s.questions) if (q.kind === "single") expect(new Set(q.options!.map((o) => o.id)).size).toBe(q.options!.length);
      for (const text of surveyText(s)) expect(lintLandingCopy(text), `${s.id}: ${text}`).toEqual([]);
      expect(strategyById(s.tryNext), `${s.id} tryNext`).toBeTruthy();
      expect(INTERACTIVE_MODULES.some((m) => m.id === s.exploreNext), `${s.id} exploreNext`).toBe(true);
    }
  });
});

describe("scoring", () => {
  it("valid answers produce the §23 shape: friction, amplifier, contributor, strength, cost, next steps", () => {
    const r = scoreSurvey(work, {
      initiation: "very", ambiguity: "ambiguity-yes", urgency: "urgency-yes", interruption: "fine", environment: "quiet",
      structure: "little", accountability: "accountability-no", compensation: "often", perfectionism: "yes", consequence: 8, strength: "concrete",
    });
    expect(r.complete).toBe(true);
    expect(r.answered).toBe(11);
    expect(r.friction?.subdomain).toBe("activation");
    expect(r.friction?.label).toMatch(/Starting/);
    expect(r.amplifier?.layer).toBe("environment");
    expect(r.contributors.map((c) => c.note)).toContain("Perfectionistic starting threshold");
    expect(r.strengths).toContain("Sustained engagement once the problem becomes concrete");
    expect(r.cost).toBe(8);
    expect(r.contradictions).toEqual([]);
    expect(r.tryNext).toBe("first-physical-action");
    expect(r.exploreNext).toBe("deadlines");
  });

  it("skipped answers are absent, not wrong; an empty survey scores nothing and is incomplete", () => {
    const some = scoreSurvey(work, { initiation: "very", consequence: 6 });
    expect(some.answered).toBe(2);
    expect(some.complete).toBe(false);
    expect(some.friction?.subdomain).toBe("activation");
    const empty = scoreSurvey(work, {});
    expect(empty.answered).toBe(0);
    expect(empty.complete).toBe(false);
    expect(empty.friction).toBeNull();
    expect(empty.frictions).toEqual([]);
    expect(empty.cost).toBeNull();
  });

  it("an incomplete survey with only a cost names the scale's subject as the friction", () => {
    const r = scoreSurvey(work, { consequence: 7 });
    expect(r.friction?.subdomain).toBe("activation");
    expect(r.complete).toBe(false);
  });

  it("contradictory answers are named and left out, never averaged", () => {
    const sleep = topicSurvey("sleep")!;
    const r = scoreSurvey(sleep, { wake: "wake-no", late: "after-1" });
    expect(r.contradictions).toEqual([]);
    // Two answers about the same claim, opposite ways: the emotional survey's pause question is single, so build one from work's accountability + a stub.
    const contradictory = scoreSurvey(work, { accountability: "accountability-yes", structure: "lots" });
    expect(contradictory.contradictions).toEqual([]);
    const rel = topicSurvey("relationships")!;
    const clash = contradictionsIn(rel, { repair: "repair", named: "named-no" });
    expect(clash).toEqual([]);
    // A genuine clash: the same key claimed both ways needs two questions carrying it; the scorer drops both.
    const fake = { ...work, questions: [
      { id: "a", prompt: "A?", kind: "single" as const, options: [{ id: "a1", label: "yes", claims: { "deadlines-help": true }, signals: [{ subdomain: "time" as const, weight: 3 }] }] },
      { id: "b", prompt: "B?", kind: "single" as const, options: [{ id: "b1", label: "no", claims: { "deadlines-help": false }, signals: [{ subdomain: "time" as const, weight: 3 }] }] },
      { id: "c", prompt: "C?", kind: "single" as const, options: [{ id: "c1", label: "start", signals: [{ subdomain: "activation" as const, weight: 1 }] }] },
    ] };
    const out = scoreSurvey(fake, { a: "a1", b: "b1", c: "c1" });
    expect(out.contradictions).toEqual(["deadlines-help"]);
    expect(out.friction?.subdomain).toBe("activation");
    expect(out.frictions.find((f) => f.subdomain === "time")).toBeUndefined();
  });

  it("ignores values that are not options or numbers", () => {
    const r = scoreSurvey(work, { initiation: "nope", consequence: "eight" as unknown as number, ambiguity: 3 as unknown as string });
    expect(r.answered).toBe(0);
    expect(r.cost).toBeNull();
  });
});

describe("surveys in the record and the model", () => {
  it("round-trips answers, dates completion as the long survey, and a completed survey becomes a need", () => {
    const s = fakeStorage();
    recordSurveyAnswer(s, "work-study", "initiation", "very");
    recordSurveyAnswer(s, "work-study", "urgency", "urgency-yes");
    recordSurveyAnswer(s, "work-study", "consequence", 8);
    let r = readModel(s);
    expect(r.surveys["work-study"]?.answers.consequence).toBe(8);
    expect(r.surveys["work-study"]?.completedAt).toBeUndefined();
    expect(deriveNeeds(r)).toEqual([]);
    completeSurvey(s, "work-study");
    r = readModel(s);
    expect(r.survey.lastLongAt).toBeTruthy();
    const need = deriveNeeds(r)[0];
    expect(need?.subdomain).toBe("activation");
    expect(need?.functionalCost).toBe(8);
    expect(need?.sources).toContain("survey:work-study");
    expect(need?.contributors.map((c) => c.note)).toContain("Waiting for urgency");
    // A completed survey with contributors is one source plus answers — high, like a module with its personalisation answered.
    expect(need?.confidence).toBe("high");
    recordResonance(s, "starting", { frequency: "often", cost: 8, priority: "yes" });
    expect(deriveNeeds(readModel(s))[0]?.persistence).toBe(2);
    expect(surveyResults(readModel(s)).length).toBe(1);
  });

  it("an older record without the surveys field reads as none", () => {
    const s = fakeStorage();
    const legacy = { ...emptyModel() } as Partial<ModelRecord>;
    delete legacy.surveys;
    s.setItem("adhdme.model.v1", JSON.stringify(legacy));
    expect(readModel(s).surveys).toEqual({});
  });
});

describe("the offer rule (§20 level 4)", () => {
  it("offers nothing with no need, nothing when fatigued, nothing once completed, and never launches", () => {
    expect(offerSurvey(emptyModel())).toBeNull();
    const s = fakeStorage();
    saveOnboarding(s, { improveFirst: "start-earlier", impact: 8 });
    recordResonance(s, "starting", { frequency: "often", cost: 8, priority: "yes" });
    const offered = offerSurvey(readModel(s));
    expect(offered?.survey.id).toBe("work-study");
    expect(offered?.rule).toBe("need.persisted");
    expect(lintLandingCopy(offered!.why)).toEqual([]);
    const day = new Date().toISOString().slice(0, 10);
    const tired: ModelRecord = { ...readModel(s), survey: { day, answeredToday: 20, abandons: [], lastLongAt: null } };
    expect(offerSurvey(tired)).toBeNull();
    completeSurvey(s, "work-study");
    expect(offerSurvey(readModel(s))).toBeNull();
    expect(availableSurveys(readModel(s)).map((x) => x.id)).not.toContain("work-study");
  });

  it("offers when the person asked for professional support, or when the cost is high and confidence low; not on a single low-cost signal", () => {
    const pro = fakeStorage();
    saveOnboarding(pro, { improveFirst: "communicate-partner", impact: 5, lookingFor: "professional" });
    expect(offerSurvey(readModel(pro))?.rule).toBe("wants.professional");
    expect(offerSurvey(readModel(pro))?.survey.id).toBe("relationships");
    const high = fakeStorage();
    saveOnboarding(high, { improveFirst: "better-sleep", impact: 9 });
    expect(offerSurvey(readModel(high))?.rule).toBe("would.sharpen");
    const low = fakeStorage();
    saveOnboarding(low, { improveFirst: "better-sleep", impact: 3 });
    expect(offerSurvey(readModel(low))).toBeNull();
  });
});

describe("the sentence a survey earns", () => {
  it("every friction a survey can point at has an authored sentence, and it passes the copy lint", () => {
    // The sentence is the reward in "give data, receive insight", and it is the most consequential
    // thing the product says to somebody about their own mind. Nothing composes one at runtime, so
    // every friction a real survey can produce has to have one written for it here.
    const reachable = new Set<Subdomain>();
    for (const survey of eachOf(TOPIC_SURVEYS, "the topic surveys")) {
      for (const q of survey.questions) {
        for (const option of q.options ?? []) {
          for (const signal of option.signals ?? []) reachable.add(signal.subdomain);
        }
      }
    }
    expect(reachable.size).toBeGreaterThan(5);
    const missing = [...reachable].filter((s) => !SURVEY_INSIGHTS[s]);
    expect(missing, "a friction with no sentence would leave the result screen silent").toEqual([]);
    for (const subdomain of eachOf([...reachable], "the reachable frictions")) {
      const sentence = SURVEY_INSIGHTS[subdomain]!;
      expect(sentence, subdomain).toMatch(/\.$/);
      expect(lintLandingCopy(sentence), subdomain).toEqual([]);
      expect(sentence, `${subdomain} must not read like a diagnosis`).not.toMatch(/deficit|impair|disorder|symptom/i);
    }
  });

  it("says nothing when nothing stood out", () => {
    const survey = TOPIC_SURVEYS[0]!;
    expect(insightFor(scoreSurvey(survey, {}))).toBeNull();
  });
});

// A survey fills exactly one area of the map, and it must be called what that area is called.
// Three of the five were not: you chose "Daily Organisation", "Sleep" or "Emotional Wellbeing"
// and "Daily Life", "Sleep & Body" or "Mind & Emotions" filled in. The loop the whole tab is
// built on is give data, receive insight (MAP-PRD §9), and it reads as two unrelated things when
// the thing you answered is not the thing that moved. Nothing caught it because both names were
// correct in isolation — only the join was wrong.
describe("every survey is named for the area it fills", () => {
  it("has five surveys over five distinct areas, so this cannot pass vacuously", () => {
    expect(TOPIC_SURVEYS.length).toBe(5);
    expect(new Set(TOPIC_SURVEYS.map((s) => s.domain)).size).toBe(5);
  });

  it("titles each survey with its own area's label", () => {
    const wrong = TOPIC_SURVEYS
      .filter((s) => s.title !== DOMAIN_LABELS[s.domain])
      .map((s) => `${s.id}: titled "${s.title}", fills "${DOMAIN_LABELS[s.domain]}"`);
    expect(wrong, "a survey named differently from the row it fills breaks the loop in §9").toEqual([]);
  });
});
