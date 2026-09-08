// The personal model, held to the PRD's own tests (§67, §72, §73) — every boundary, every safety
// variant, and two synthetic people who must get meaningfully different experiences.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { checkSafety, SAFETY_RULES } from "./safety";
import { ENOUGH_FOR_NOW, mayAskOptional, MAX_CONSECUTIVE_QUESTIONS, surveyFatigue } from "./fatigue";
import { EVENTS, safeProps, track } from "./events";
import { improveOptions, improveOption, QUESTIONS } from "./onboarding";
import { acceptExperiment, acknowledgeSafety, activeSafety, clearModel, completeOnboarding, emptyModel, MODEL_KEY, pendingExperiment, readModel, recordAnswer, recordInsight, recordOutcome, recordReflection, recordResonance, saveOnboarding, writeModel, type ModelRecord } from "./store";
import { deriveNeeds, priorityScore } from "./needs";
import { escalationEligible, professionsFor, recommend, summarise } from "./recommend";
import { LAYERS, SUBDOMAINS, subdomainsOf } from "./layers";

function fakeStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe("the layers", () => {
  it("every layer has at least four subdomains and every subdomain has a meaning a person can read", () => {
    for (const layer of eachOf(LAYERS, "the layers")) expect(subdomainsOf(layer).length).toBeGreaterThanOrEqual(4);
    for (const s of eachOf(SUBDOMAINS, "the subdomains")) {
      expect(s.meaning.split(" ").length).toBeGreaterThan(6);
      expect(lintLandingCopy(`${s.label}. ${s.meaning}`), s.id).toEqual([]);
    }
  });
});

describe("onboarding", () => {
  it("asks ten questions, one screen each, and the copy passes the patient rules", () => {
    expect(QUESTIONS.length).toBe(10);
    for (const q of eachOf(QUESTIONS, "the onboarding")) {
      expect(lintLandingCopy(`${q.prompt} ${q.note ?? ""} ${(q.options ?? []).map((o) => o.label).join(". ")}`), q.key).toEqual([]);
    }
  });

  it("generates Q7 from Q2–Q5 and never offers nothing", () => {
    expect(improveOptions({}).length).toBeGreaterThan(0);
    const starting = improveOptions({ hardest: ["starting"], familiar: "cannot-start" });
    expect(starting.map((o) => o.id)).toContain("start-earlier");
    expect(starting.map((o) => o.id)).toContain("understand-procrastination");
    const partner = improveOptions({ hardest: ["relationships", "sleep"] });
    expect(partner.map((o) => o.id)).toEqual(expect.arrayContaining(["communicate-partner", "better-sleep"]));
    expect(improveOptions({ hardest: ["starting", "finishing", "work", "study", "relationships"] }).length).toBeLessThanOrEqual(5);
    expect(improveOption("start-earlier")?.subdomain).toBe("activation");
    expect(improveOption("nope")).toBeNull();
  });
});

describe("the record", () => {
  it("reads empty when nothing is held, when the storage throws, and when the shape is another version", () => {
    expect(readModel(fakeStorage())).toEqual(emptyModel());
    expect(readModel({ getItem: () => { throw new Error("denied"); } })).toEqual(emptyModel());
    expect(readModel(fakeStorage({ [MODEL_KEY]: JSON.stringify({ v: 99 }) }))).toEqual(emptyModel());
    expect(readModel(fakeStorage({ [MODEL_KEY]: "not json" }))).toEqual(emptyModel());
  });

  it("round-trips every write and never holds a verdict the person did not give", () => {
    const s = fakeStorage();
    saveOnboarding(s, { stage: "think-so", hardest: ["starting"] });
    saveOnboarding(s, { impact: 8, improveFirst: "start-earlier" });
    completeOnboarding(s);
    recordResonance(s, "starting", { frequency: "often", cost: 8, priority: "yes" });
    recordAnswer(s, "starting", "hardest-to-start", ["vague", "big"]);
    recordInsight(s, "starting-threshold", "no");
    acceptExperiment(s, "starting", "first-physical-action");
    acceptExperiment(s, "starting", "first-physical-action");
    const r = readModel(s);
    expect(r.onboarding?.completedAt).toBeTruthy();
    expect(r.onboarding?.hardest).toEqual(["starting"]);
    expect(r.resonance.starting?.cost).toBe(8);
    expect(r.answers["starting.hardest-to-start"]).toEqual(["vague", "big"]);
    expect(r.insights["starting-threshold"]).toBe("no");
    expect(r.experiments.length).toBe(1);
    expect(pendingExperiment(r)?.strategyId).toBe("first-physical-action");
    recordOutcome(s, "first-physical-action", "a-lot");
    expect(pendingExperiment(readModel(s))).toBeNull();
    clearModel(s);
    expect(readModel(s)).toEqual(emptyModel());
  });

  it("a rejected insight is kept as a rejection, not as a confirmation", () => {
    const s = fakeStorage();
    recordInsight(s, "x", "no");
    expect(readModel(s).insights.x).toBe("no");
    expect(Object.values(readModel(s).insights)).not.toContain("yes");
  });

  it("a reflection stays on the device and reaches no event", () => {
    const s = fakeStorage();
    const { safety } = recordReflection(s, "starting", "I keep putting off reports because I do not know how good they are meant to be.");
    expect(safety).toBeNull();
    expect(readModel(s).reflections[0]?.text).toContain("reports");
    expect(safeProps({ text: "I keep putting off reports" })).toBe(false);
    expect(track("MODULE_COMPLETED", { module: "starting", step: 9 })).toBe(true);
    expect(track("MODULE_COMPLETED", { reflection: "I keep putting off reports" })).toBe(false);
    expect(EVENTS).toContain("SAFETY_TRIGGERED");
  });
});

describe("safety (§72)", () => {
  const variants: Array<[string, string]> = [
    ["I don't want to be here anymore", "self-harm"],
    ["Honestly there is no point going on", "hopelessness"],
    ["I keep hearing voices telling me to stop", "psychosis"],
    ["I haven't slept in days and my thoughts are racing", "mania"],
    ["I have stopped eating so I can concentrate", "eating"],
    ["I can't stop drinking after work", "substance"],
    ["He hits me when I forget things", "violence"],
    ["Since the new dose I get chest pain and my heart is racing", "cardiac"],
    ["I am going to hurt someone if this keeps up", "danger"],
  ];
  it("every rule has an explicit test, and every variant reaches its rule", () => {
    expect(new Set(variants.map((v) => v[1])).size).toBe(SAFETY_RULES.length);
    for (const [text, id] of variants) expect(checkSafety(text)?.id, text).toBe(id);
  });

  it("ordinary reflections do not trigger", () => {
    for (const text of ["I put off the report because the brief was vague", "Body doubling helped a lot", "My partner carries the calendar", ""]) {
      expect(checkSafety(text), text).toBeNull();
    }
  });

  it("a triggered reflection suppresses ordinary recommendations, and nothing about it claims a diagnosis", () => {
    const s = fakeStorage();
    saveOnboarding(s, { improveFirst: "start-earlier", impact: 6 });
    const { safety } = recordReflection(s, "starting", "I don't want to be here anymore");
    expect(safety).toBe("self-harm");
    const r = readModel(s);
    expect(activeSafety(r)?.ruleId).toBe("self-harm");
    const rec = recommend(r);
    expect(rec.action).toBe("URGENT_ESCALATION");
    expect(rec.explain.ruleTriggered).toBe("safety.active");
    for (const rule of eachOf(SAFETY_RULES, "the safety rules")) {
      expect(rule.suppressStandardRecommendations).toBe(true);
      expect(rule.message).not.toMatch(/\byou (have|are suffering from)\b/i);
      expect(rule.recommendedAction).toMatch(/000|13 11 14|1300|1800/);
    }
    acknowledgeSafety(s);
    expect(activeSafety(readModel(s))).toBeNull();
    expect(recommend(readModel(s)).action).not.toBe("URGENT_ESCALATION");
  });
});

describe("survey fatigue (§21)", () => {
  it("rises with questions answered today and abandons this week, and withholds optional questions when high", () => {
    const base = emptyModel();
    expect(surveyFatigue(base).score).toBe(0);
    const day = new Date().toISOString().slice(0, 10);
    const busy: ModelRecord = { ...base, survey: { day, answeredToday: 14, abandons: [`${day}:work`], lastLongAt: null } };
    expect(surveyFatigue(busy).high).toBe(true);
    expect(mayAskOptional(busy, 0)).toBe(false);
    expect(mayAskOptional(base, MAX_CONSECUTIVE_QUESTIONS)).toBe(false);
    expect(mayAskOptional(base, 3)).toBe(true);
    expect(lintLandingCopy(ENOUGH_FOR_NOW)).toEqual([]);
  });
});

function profile(patch: (s: ReturnType<typeof fakeStorage>) => void): ModelRecord {
  const s = fakeStorage();
  patch(s);
  return readModel(s);
}

describe("needs and recommendations (§67)", () => {
  it("with no signals recommends the first module", () => {
    const rec = recommend(emptyModel());
    expect(rec.action).toBe("LEARN");
    expect(rec.moduleId).toBe("context");
    expect(rec.why.length).toBeGreaterThan(20);
  });

  it("onboarding alone gives a low-confidence need and a learn action about it", () => {
    const r = profile((s) => { saveOnboarding(s, { hardest: ["starting"], familiar: "cannot-start", impact: 7, improveFirst: "start-earlier", easier: ["urgent", "alongside"] }); completeOnboarding(s); });
    const [need] = deriveNeeds(r);
    expect(need?.subdomain).toBe("activation");
    expect(need?.confidence).toBe("low");
    expect(need?.contributors.map((c) => c.layer)).toEqual(expect.arrayContaining(["environment", "people"]));
    const rec = recommend(r);
    expect(rec.action).toBe("LEARN");
    expect(rec.moduleId).toBe("starting");
  });

  it("confidence rises as signals accumulate", () => {
    const low = profile((s) => saveOnboarding(s, { improveFirst: "start-earlier", impact: 5 }));
    const medium = profile((s) => { saveOnboarding(s, { improveFirst: "start-earlier", impact: 5 }); recordResonance(s, "starting", { frequency: "often", cost: 6, priority: "yes" }); });
    const high = profile((s) => { saveOnboarding(s, { improveFirst: "start-earlier", impact: 5 }); recordResonance(s, "starting", { frequency: "often", cost: 6, priority: "yes" }); recordAnswer(s, "starting", "hardest-to-start", ["vague"]); });
    expect(deriveNeeds(low)[0]?.confidence).toBe("low");
    expect(deriveNeeds(medium)[0]?.confidence).toBe("medium");
    expect(deriveNeeds(high)[0]?.confidence).toBe("high");
    expect(priorityScore(deriveNeeds(high)[0]!)).toBeGreaterThan(priorityScore(deriveNeeds(low)[0]!));
  });

  it("the escalation boundary: cost 8, priority yes, confidence high, three failed strategies → provider eligible; one short → not", () => {
    const eligible = profile((s) => {
      recordResonance(s, "starting", { frequency: "often", cost: 8, priority: "yes" });
      recordAnswer(s, "starting", "hardest-to-start", ["vague"]);
      recordAnswer(s, "ambiguity", "source", ["manager"]);
      recordResonance(s, "ambiguity", { frequency: "often", cost: 8, priority: "yes" });
      for (const id of ["first-physical-action", "body-double", "define-done"]) { acceptExperiment(s, "starting", id); recordOutcome(s, id, "no"); }
    });
    const need = deriveNeeds(eligible)[0]!;
    expect(need.subdomain).toBe("activation");
    expect(escalationEligible(need, eligible)).toBe(true);
    const rec = recommend(eligible);
    expect(rec.action).toBe("EXPLORE_PROVIDER");
    expect(rec.professions?.[0]).toBe("occupational-therapist");
    expect(rec.explain.ruleTriggered).toBe("escalation.eligible");
    expect(rec.explain.inputsUsed.join(" ")).toContain("cost:8");
    expect(lintLandingCopy(`${rec.heading} ${rec.body} ${rec.why}`)).toEqual([]);

    const lowCost = profile((s) => {
      recordResonance(s, "starting", { frequency: "often", cost: 6, priority: "yes" });
      recordAnswer(s, "starting", "hardest-to-start", ["vague"]);
      for (const id of ["first-physical-action", "body-double"]) { acceptExperiment(s, "starting", id); recordOutcome(s, id, "no"); }
    });
    expect(escalationEligible(deriveNeeds(lowCost)[0]!, lowCost)).toBe(false);
    const noPriority = profile((s) => {
      recordResonance(s, "starting", { frequency: "often", cost: 9, priority: "maybe" });
      recordAnswer(s, "starting", "hardest-to-start", ["vague"]);
      for (const id of ["first-physical-action", "body-double"]) { acceptExperiment(s, "starting", id); recordOutcome(s, id, "no"); }
    });
    expect(escalationEligible(deriveNeeds(noPriority)[0]!, noPriority)).toBe(false);
    const untried = profile((s) => { recordResonance(s, "starting", { frequency: "often", cost: 9, priority: "yes" }); recordAnswer(s, "starting", "hardest-to-start", ["vague"]); });
    expect(escalationEligible(deriveNeeds(untried)[0]!, untried)).toBe(false);
    expect(recommend(untried).action).not.toBe("EXPLORE_PROVIDER");
  });

  it("an accepted experiment is followed up before anything new, and its outcome changes the next recommendation", () => {
    const s = fakeStorage();
    recordResonance(s, "starting", { frequency: "often", cost: 7, priority: "yes" });
    acceptExperiment(s, "starting", "first-physical-action");
    expect(recommend(readModel(s)).action).toBe("TRY_STRATEGY");
    expect(recommend(readModel(s)).heading).toContain("help");
    recordOutcome(s, "first-physical-action", "a-lot");
    const after = recommend(readModel(s));
    expect(after.explain.ruleTriggered).not.toBe("experiment.pending");
    expect(summarise(readModel(s)).helps).toContain("The first physical action");
  });

  it("a people-layer picture asks to involve a support person; an environment picture asks to change the environment", () => {
    const people = profile((s) => {
      recordResonance(s, "not-listening", { frequency: "often", cost: 7, priority: "yes" });
      recordAnswer(s, "not-listening", "who", ["partner", "family"]);
    });
    expect(recommend(people).action).toBe("INVOLVE_SUPPORT_PERSON");
    const environment = profile((s) => {
      recordResonance(s, "working-memory", { frequency: "often", cost: 7, priority: "yes" });
      recordAnswer(s, "working-memory", "knocks", ["phone"]);
      recordAnswer(s, "working-memory", "capture", "no");
    });
    expect(recommend(environment).action).toBe("CHANGE_ENVIRONMENT");
  });

  it("medication in the picture routes to the existing prescriber, never to advice", () => {
    const r = profile((s) => saveOnboarding(s, { medication: "yes", hardest: ["medication"], improveFirst: "medication-picture", impact: 6 }));
    const rec = recommend(r);
    expect(rec.action).toBe("DISCUSS_WITH_EXISTING_CLINICIAN");
    expect(lintLandingCopy(`${rec.heading} ${rec.body} ${rec.why}`)).toEqual([]);
  });
});

describe("synthetic profiles (§73)", () => {
  it("Profile A — deadline dependence and ambiguity, sleep fine — gets work before sleep and no sleep referral", () => {
    const a = profile((s) => {
      saveOnboarding(s, { medication: "yes", hardest: ["starting", "work"], familiar: "rely-on-deadlines", impact: 7, improveFirst: "start-earlier", easier: ["urgent"], lookingFor: "try" });
      recordResonance(s, "deadlines", { frequency: "often", cost: 8, priority: "yes" });
      recordResonance(s, "ambiguity", { frequency: "often", cost: 8, priority: "yes" });
      recordResonance(s, "sleep", { frequency: "rarely", cost: 1, priority: "no" });
    });
    const needs = deriveNeeds(a);
    const order = needs.map((n) => n.subdomain);
    expect(order.indexOf("activation")).toBeLessThan(order.indexOf("sleep"));
    expect(order.indexOf("time")).toBeLessThan(order.indexOf("sleep"));
    const rec = recommend(a);
    expect(rec.action).not.toBe("EXPLORE_PROVIDER");
    expect(rec.need?.domain).not.toBe("sleep-body");
    expect(professionsFor(needs[0]!)).not.toContain("exercise-physiologist");
  });

  it("Profile B — relationship conflict primary, low work impairment — relationship modules dominate and no OT-first recommendation", () => {
    const b = profile((s) => {
      saveOnboarding(s, { hardest: ["relationships", "emotions"], familiar: "forget", impact: 8, improveFirst: "communicate-partner", lookingFor: "professional" });
      recordResonance(s, "conflict", { frequency: "often", cost: 9, priority: "yes" });
      recordResonance(s, "forgotten-commitments", { frequency: "often", cost: 8, priority: "yes" });
      recordAnswer(s, "conflict", "after", ["repeat"]);
      recordResonance(s, "ambiguity", { frequency: "rarely", cost: 2, priority: "no" });
    });
    const needs = deriveNeeds(b);
    expect(needs[0]?.domain).toBe("relationships");
    const professions = professionsFor(needs[0]!);
    expect(professions[0]).not.toBe("occupational-therapist");
    expect(professions).toEqual(expect.arrayContaining(["psychologist", "counsellor"]));
    const rec = recommend(b);
    expect(rec.need?.domain).toBe("relationships");
  });

  it("fairness: the same signals recommend the same thing whatever the person's stage or depth", () => {
    const make = (patch: Record<string, unknown>) => profile((s) => {
      saveOnboarding(s, { hardest: ["starting"], impact: 7, improveFirst: "start-earlier", ...patch });
      recordResonance(s, "starting", { frequency: "often", cost: 7, priority: "yes" });
    });
    const base = recommend(make({ stage: "think-so", depth: "short" }), new Date(0));
    for (const patch of [{ stage: "have-assessment" }, { stage: "supporting" }, { depth: "deep" }, { medication: "prefer-not" }]) {
      const other = recommend(make(patch), new Date(0));
      expect(other.action).toBe(base.action);
      expect(other.moduleId).toBe(base.moduleId);
    }
  });
});
