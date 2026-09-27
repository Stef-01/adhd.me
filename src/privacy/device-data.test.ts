import { describe, expect, it } from "vitest";
import {
  acceptExperiment,
  completeOnboarding,
  confirmInterpretation,
  readModel,
  recordCheckpoint,
  recordInsight,
  recordOutcome,
  recordReflection,
  recordRelate,
  recordResonance,
  saveCarePlan,
  saveManual,
  saveMedicationNote,
  saveOnboarding,
  MODEL_KEY,
} from "@/model/store";
import { readProfile, recordResonance as recordSignal, selectGoals, PROFILE_KEY } from "@/lives/profile";
import { markDone, readProgress, PROGRESS_KEY } from "@/learn/progress";
import { MODULES } from "@/learn/scenes";
import { KEPT_PREFERENCES, copyFileName, deleteDeviceData, hasDeviceData, isAnswerKey, makeCopy, parseCopy, restoreCopy } from "./device-data";

/** A Storage with the parts the browser's has, so deletion can walk its keys. */
function store(seed: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(seed));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    keys: () => [...m.keys()].sort(),
  };
}

const ANSWERS_LOCAL = [MODEL_KEY, PROFILE_KEY, PROGRESS_KEY, "adhdme.learn.cursor.v1", "adhdme.learn.pane.v1", "adhdme.played.v1", "adhdme.filters.v3", "adhdme.filters.v2"];
const ANSWERS_SESSION = ["adhdme.finder.v4", "adhdme.match.v1", "adhdme.match.view.v1"];
const KEPT = [...KEPT_PREFERENCES, "adhdme.play.tutored", "adhdme.play.labels", "adhdme-privacy-ack", "adhdme-consent"];

/** Somebody a few weeks in, touching every part of the record a copy has to carry. */
function lived() {
  const s = store();
  saveOnboarding(s, { stage: "think-so", hardest: ["starting", "organisation"], impact: 7, easier: ["urgent"], improveFirst: "start-earlier", lookingFor: "try" });
  completeOnboarding(s);
  recordResonance(s, "starting", { frequency: "often", cost: 8, priority: "yes" });
  recordRelate(s, "starting", "r1", 6);
  recordInsight(s, "starting.vague", "yes");
  acceptExperiment(s, "starting", "first-physical-action");
  recordOutcome(s, "first-physical-action", "a-lot");
  recordReflection(s, "starting", "The brief was vague");
  confirmInterpretation(s, "starting", { subdomain: "structure", layer: "environment", note: "An unclear brief" });
  saveCarePlan(s, 5, 2);
  saveManual(s, "helps", "A person beside me");
  saveMedicationNote(s, "changes", "Mornings are easier");
  recordCheckpoint(s, 6, "still-looking");
  selectGoals(s, ["task_initiation", "sleep"]);
  recordSignal(s, { sourceType: "character", sourceId: "nina", response: "this_is_me" });
  markDone(s, MODULES[0]!.id);
  return s;
}

describe("one delete", () => {
  it("counts every answer store as an answer and every preference as a preference", () => {
    for (const key of [...ANSWERS_LOCAL, ...ANSWERS_SESSION]) expect(isAnswerKey(key), key).toBe(true);
    for (const key of KEPT) expect(isAnswerKey(key), key).toBe(false);
  });

  it("removes every answer from both stores and keeps the preferences and the consent choice", () => {
    const local = store(Object.fromEntries([...ANSWERS_LOCAL, ...KEPT].map((k) => [k, "1"])));
    const session = store(Object.fromEntries(ANSWERS_SESSION.map((k) => [k, "1"])));
    deleteDeviceData([local, session]);
    expect(local.keys()).toEqual([...KEPT].sort());
    expect(session.keys()).toEqual([]);
  });

  it("shows when only Lives holds something, and not when only preferences do", () => {
    expect(hasDeviceData([store({ [PROFILE_KEY]: "{}" })])).toBe(true);
    expect(hasDeviceData([store(), store({ "adhdme.match.v1": "p1" })])).toBe(true);
    expect(hasDeviceData([store(Object.fromEntries(KEPT.map((k) => [k, "1"])))])).toBe(false);
  });
});

describe("a copy", () => {
  it("is named by the day it was saved", () => {
    expect(copyFileName(new Date("2026-09-26T10:00:00Z"))).toBe("adhdme-backup-2026-09-26.json");
  });

  it("carries the whole record out and back, so a new browser shows the same map", () => {
    const from = lived();
    const text = JSON.stringify(makeCopy(from));
    const copy = parseCopy(text);
    expect(copy, "a copy this app wrote is accepted").not.toBeNull();

    const to = store({ "adhdme.sound": "off", [MODEL_KEY]: "{}" });
    restoreCopy(to, null, copy!);
    expect(readModel(to)).toEqual(readModel(from));
    expect(readProfile(to)).toEqual(readProfile(from));
    expect(readProgress(to)).toEqual(readProgress(from));
    expect(to.getItem("adhdme.sound"), "a preference is not an answer").toBe("off");
  });

  it("an empty browser saves a copy that restores to an empty browser", () => {
    const copy = parseCopy(JSON.stringify(makeCopy(store())));
    expect(copy).not.toBeNull();
    const to = lived();
    restoreCopy(to, null, copy!);
    expect(hasDeviceData([to])).toBe(false);
  });

  it("refuses anything that is not exactly what this app writes", () => {
    const good = makeCopy(lived());
    const bad: Array<[string, string]> = [
      ["not JSON", "{"],
      ["another schema", JSON.stringify({ ...good, schema: 2 })],
      ["no model", JSON.stringify({ ...good, model: undefined })],
      ["a cost of 11", JSON.stringify({ ...good, model: { ...good.model, resonance: { starting: { cost: 11, at: "2026-09-01T00:00:00Z" } } } })],
      ["a list where one belongs", JSON.stringify({ ...good, model: { ...good.model, completed: "starting" } })],
      ["a safety rule that does not exist", JSON.stringify({ ...good, model: { ...good.model, safety: [{ ruleId: "made-up", at: "2026-09-01T00:00:00Z" }] } })],
      ["a goal that does not exist", JSON.stringify({ ...good, lives: { ...good.lives, selectedGoals: ["flying"] } })],
      ["an onboarding answer out of its options", JSON.stringify({ ...good, model: { ...good.model, onboarding: { ...good.model.onboarding, stage: "sure" } } })],
      ["a date that is not a date", JSON.stringify({ ...good, savedOn: "yesterday" })],
      ["another app's file", JSON.stringify({ name: "notes", items: [] })],
    ];
    for (const [why, text] of bad) expect(parseCopy(text), why).toBeNull();
  });
});
