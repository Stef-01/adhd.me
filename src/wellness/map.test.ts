// The map: every rung is an act, every dimension can actually be reached, and nothing scores anybody.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { PROFESSIONS } from "@/support/professions";
import { emptyModel, type ModelRecord } from "@/model/store";
import { emptyProfile } from "@/lives/profile";
import { NWIA_DIMENSIONS } from "./nwia";
import { NOT_TAUGHT, RUNGS, RUNG_BECAUSE, RUNG_LABEL, RUNG_REACH, dimensionsOf, kindsOn, modulesOn, personalMap, strongest } from "./map";

const record = (over: Partial<ModelRecord> = {}): ModelRecord => ({ ...emptyModel(), ...over });
const point = (r: ModelRecord, d: string) => personalMap(r, null).find((p) => p.dimension === d)!;

describe("the ladder", () => {
  it("is five rungs of words, never a number", () => {
    expect(RUNGS.length).toBe(5);
    for (const rung of eachOf(RUNGS, "the rungs")) {
      expect(RUNG_LABEL[rung], rung).toBeTruthy();
      // One word each, because nine of them share a screen with a sixty-word ceiling.
      expect(RUNG_LABEL[rung].split(/\s+/).length, rung).toBe(1);
      expect(RUNG_LABEL[rung], rung).not.toMatch(/\d/);
      expect(RUNG_BECAUSE[rung], rung).not.toMatch(/\d/);
    }
  });

  it("climbs: a higher rung always reaches further", () => {
    const reaches = RUNGS.map((r) => RUNG_REACH[r]);
    for (let i = 1; i < reaches.length; i++) expect(reaches[i]!, RUNGS[i]).toBeGreaterThan(reaches[i - 1]!);
    expect(RUNG_REACH.working).toBe(1);
    // Nothing sits on the origin: an untouched dimension is still a point on the shape, or the
    // polygon collapses into a spike and reads as a verdict about the person rather than a map.
    expect(RUNG_REACH.unmapped).toBeGreaterThan(0);
  });

  it("says what put a dimension on its rung as an act, and passes the patient copy rules", () => {
    for (const rung of eachOf(RUNGS, "the rungs")) {
      expect(lintLandingCopy(`${RUNG_LABEL[rung]}. ${RUNG_BECAUSE[rung]}`), rung).toEqual([]);
    }
  });
});

describe("the dimensions", () => {
  it("every dimension a module teaches can be explored, and the two that cannot are declared", () => {
    for (const d of eachOf(NWIA_DIMENSIONS, "the wellness dimensions")) {
      if (d in NOT_TAUGHT) continue;
      expect(modulesOn(d).length, `${d} has no module and is not in NOT_TAUGHT`).toBeGreaterThan(0);
    }
  });

  it("keeps NOT_TAUGHT honest in the other direction: a dimension listed there really has nothing", () => {
    // Without this the register rots the useful way round — a run gets written about family, the
    // Cultural axis starts moving, and the note saying it cannot stays on the page.
    for (const [d, why] of Object.entries(NOT_TAUGHT)) {
      expect(modulesOn(d as (typeof NWIA_DIMENSIONS)[number]).length, `${d} has modules now: delete its NOT_TAUGHT entry`).toBe(0);
      expect(why.length, d).toBeGreaterThan(30);
    }
  });

  it("opens a dimension on the kinds of care its own modules name, and narrows to all of them", () => {
    // The SET is the holistic answer for this part of a life; the finder's band chooses inside it.
    expect(kindsOn("physical")).toContain("sleep-clinician");
    expect(kindsOn("physical")).not.toContain("university-support");
    expect(kindsOn("social")).toContain("relationship-counsellor");
    expect(kindsOn("environment").length, "environment is a real narrowing, not the whole roster").toBeLessThan(5);
    expect(new Set(kindsOn("emotional")).size, "no kind listed twice").toBe(kindsOn("emotional").length);
  });

  it("points only at kinds of care the roster's own vocabulary holds", () => {
    for (const p of eachOf(personalMap(null, null), "the map points")) {
      for (const kind of p.kinds) expect(PROFESSIONS, `${p.dimension} → ${kind}`).toContain(kind);
    }
  });
});

describe("personalMap", () => {
  it("starts unmapped, all nine, with nothing claimed about anybody", () => {
    const points = personalMap(null, null);
    expect(points.length).toBe(NWIA_DIMENSIONS.length);
    for (const p of eachOf(points, "the map points")) {
      expect(p.rung, p.dimension).toBe("unmapped");
      expect(p.strength, p.dimension).toBeNull();
    }
  });

  it("names a dimension from a goal set at the door, which is all spiritual has", () => {
    const r = record({ onboarding: { improveFirst: "start-earlier" } as ModelRecord["onboarding"] });
    expect(point(r, "spiritual").rung).toBe("named");
  });

  it("climbs as the person acts: named, explored, kept, working", () => {
    const m = modulesOn("emotional")[0]!;
    const started = record({ resonance: { [m.id]: { frequency: "often", cost: 7, priority: "yes", at: "2026-01-01T00:00:00Z" } } as ModelRecord["resonance"] });
    expect(point(started, "emotional").rung).toBe("named");

    const finished = record({ ...started, completed: [m.id] });
    expect(point(finished, "emotional").rung).toBe("explored");

    const carrying = record({ ...finished, experiments: [{ strategyId: "s", moduleId: m.id, acceptedAt: "2026-01-02T00:00:00Z" }] });
    expect(point(carrying, "emotional").rung).toBe("kept");

    const working = record({ ...carrying, experiments: [{ strategyId: "s", moduleId: m.id, acceptedAt: "2026-01-02T00:00:00Z", outcome: "a-lot", outcomeAt: "2026-01-09T00:00:00Z" }] });
    expect(point(working, "emotional").rung).toBe("working");
  });

  it("claims a strength only once something here has been finished — the module says it, not the app", () => {
    const m = modulesOn("emotional")[0]!;
    expect(point(record({ resonance: { [m.id]: { frequency: "often", cost: 7, priority: "yes", at: "x" } } as ModelRecord["resonance"] }), "emotional").strength).toBeNull();
    expect(point(record({ completed: [m.id] }), "emotional").strength).toBeTruthy();
  });

  it("counts a strategy that did not work as carried, not as working", () => {
    const m = modulesOn("emotional")[0]!;
    const r = record({ experiments: [{ strategyId: "s", moduleId: m.id, acceptedAt: "x", outcome: "no" }] });
    expect(point(r, "emotional").rung).toBe("kept");
  });

  it("reads a finished module out of the learning profile too, not only the personal record", () => {
    const m = modulesOn("physical")[0]!;
    const p = { ...emptyProfile(), completedModuleIds: [m.id] };
    expect(personalMap(null, p).find((x) => x.dimension === "physical")!.rung).toBe("explored");
  });

  it("does not fall over on a record whose fields are missing", () => {
    expect(() => personalMap({} as ModelRecord, {} as never)).not.toThrow();
  });
});

describe("dimensionsOf", () => {
  it("names the axes a run moves, so the run's last card can say where it moved them", () => {
    // The sleep run is about the body; the money run is about the part of a life a bill lands in.
    expect(dimensionsOf("sleep")).toContain("physical");
    expect(dimensionsOf("sleep")).not.toContain("social");
    expect(dimensionsOf("money")).toContain("finances");
    expect(dimensionsOf("conflict")).toContain("social");
  });

  it("agrees with the map: a run only ever moves an axis it is listed under", () => {
    // Two readings of the same table drifting apart is the failure this file exists to prevent.
    for (const d of eachOf(NWIA_DIMENSIONS, "the wellness dimensions")) {
      for (const m of modulesOn(d)) expect(dimensionsOf(m.id), `${m.id} on ${d}`).toContain(d);
    }
  });

  it("says nothing about a module id it has never heard of", () => {
    expect(dimensionsOf("not-a-module")).toEqual([]);
  });
});

describe("strongest", () => {
  it("opens the map on the dimension furthest out, so the first thing shown is what you built", () => {
    const m = modulesOn("physical")[0]!;
    const r = record({ experiments: [{ strategyId: "s", moduleId: m.id, acceptedAt: "x", outcome: "a-lot" }] });
    expect(strongest(personalMap(r, null)).dimension).toBe("physical");
  });

  it("still returns a point when nothing has happened at all", () => {
    expect(strongest(personalMap(null, null)).rung).toBe("unmapped");
  });
});
