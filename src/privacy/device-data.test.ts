import { describe, expect, it } from "vitest";
import {
  acceptExperiment,
  completeOnboarding,
  confirmInterpretation,
  readModel,
  updateModel,
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
import { PLAYED_KEY, markPlayed, readPlayed } from "@/learn/played";
import { MODULES } from "@/learn/scenes";
import { SNAPSHOT_ASPECTS, type MapSnapshot } from "@/model/snapshot-shape";
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

/** A snapshot of the map with one axis moved, as the hub would store it. */
function snapshot(on: string, starting: [MapSnapshot["statuses"]["starting"], MapSnapshot["rungs"]["starting"]]): MapSnapshot {
  const statuses = Object.fromEntries(SNAPSHOT_ASPECTS.map((a) => [a, a === "starting" ? starting[0] : "unexplored"])) as MapSnapshot["statuses"];
  const rungs = Object.fromEntries(SNAPSHOT_ASPECTS.map((a) => [a, a === "starting" ? starting[1] : "unmapped"])) as MapSnapshot["rungs"];
  return { on, statuses, rungs };
}
const SNAPSHOTS = [snapshot("2026-06-10", ["still-learning", "named"]), snapshot("2026-08-20", ["needs-support", "explored"])];
const PLAYED = { v: 1, at: { maya: "2026-09-01" } };

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
  updateModel(s, (r) => ({ ...r, snapshots: [...SNAPSHOTS] }));
  markPlayed(s, "maya", "2026-09-01");
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
    expect(copyFileName(new Date(2026, 8, 26, 10, 0))).toBe("adhdme-backup-2026-09-26.json");
  });

  it("carries the whole record out and back, so a new browser shows the same map", () => {
    const from = lived();
    const made = makeCopy(from);
    expect(made.model.snapshots, "the map then and now is in the file").toEqual(SNAPSHOTS);
    expect(made.played, "the played ticks are in the file").toEqual(PLAYED);
    const text = JSON.stringify(made);
    const copy = parseCopy(text);
    expect(copy, "a copy this app wrote is accepted").not.toBeNull();
    expect(copy!.model.snapshots).toEqual(SNAPSHOTS);
    expect(copy!.played).toEqual(PLAYED);

    const to = store({ "adhdme.sound": "off", [MODEL_KEY]: "{}", [PLAYED_KEY]: JSON.stringify({ v: 1, at: { leo: "2026-01-01" } }) });
    restoreCopy(to, null, copy!);
    expect(readModel(to)).toEqual(readModel(from));
    expect(readModel(to).snapshots, "day one and the month survive").toEqual(SNAPSHOTS);
    expect(readProfile(to)).toEqual(readProfile(from));
    expect(readProgress(to)).toEqual(readProgress(from));
    expect(readPlayed(to), "the copy's ticks, and nothing from before").toEqual(PLAYED);
    expect(to.getItem("adhdme.sound"), "a preference is not an answer").toBe("off");
  });

  it("one delete takes the snapshots and the played ticks with the rest", () => {
    const s = lived();
    expect(readModel(s).snapshots).toEqual(SNAPSHOTS);
    expect(readPlayed(s)).toEqual(PLAYED);
    deleteDeviceData([s]);
    expect(s.getItem(MODEL_KEY)).toBeNull();
    expect(s.getItem(PLAYED_KEY)).toBeNull();
    expect(hasDeviceData([s])).toBe(false);
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
      ["a snapshot with a word the map does not use", JSON.stringify({ ...good, model: { ...good.model, snapshots: [SNAPSHOTS[0], { ...SNAPSHOTS[1], statuses: { ...SNAPSHOTS[1]!.statuses, focus: "great" } }] } })],
      ["a snapshot whose day is not a day", JSON.stringify({ ...good, model: { ...good.model, snapshots: [{ ...SNAPSHOTS[0], on: "yesterday" }] } })],
      ["a played tick for a game that does not exist", JSON.stringify({ ...good, played: { v: 1, at: { maya: "2026-09-01", nobody: "2026-09-01" } } })],
      ["a played tick whose day is not a day", JSON.stringify({ ...good, played: { v: 1, at: { maya: "yesterday" } } })],
      ["another app's file", JSON.stringify({ name: "notes", items: [] })],
    ];
    for (const [why, text] of bad) expect(parseCopy(text), why).toBeNull();
  });
});
