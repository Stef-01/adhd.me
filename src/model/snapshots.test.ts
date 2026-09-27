import { afterEach, describe, expect, it } from "vitest";
import { RUNGS } from "@/wellness/map";
import { ASPECTS, ASPECT_LABELS, STATUS_LABEL } from "./matrix";
import { SNAPSHOT_ASPECTS, SNAPSHOT_CAP, SNAPSHOT_RUNGS, SNAPSHOT_STATUSES, isSnapshot, type MapSnapshot } from "./snapshot-shape";
import { compareFor, compareSentence, migratedDayOne, monthName, nextSnapshots, pointsOf, snapshotOf } from "./snapshots";
import { emptyModel, readModel, writeModel, type ModelRecord } from "./store";

function snap(on: string, over: Partial<Record<(typeof ASPECTS)[number], [MapSnapshot["statuses"]["starting"], MapSnapshot["rungs"]["starting"]]>> = {}): MapSnapshot {
  const statuses = Object.fromEntries(ASPECTS.map((a) => [a, over[a]?.[0] ?? "unexplored"])) as MapSnapshot["statuses"];
  const rungs = Object.fromEntries(ASPECTS.map((a) => [a, over[a]?.[1] ?? "unmapped"])) as MapSnapshot["rungs"];
  return { on, statuses, rungs };
}

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

const tz = process.env.TZ;
afterEach(() => {
  // Assigning undefined would store the string "undefined", which is not an unset zone.
  if (tz === undefined) delete process.env.TZ;
  else process.env.TZ = tz;
});

describe("the stored shape", () => {
  it("names the same axes, words and rungs the map does", () => {
    expect([...SNAPSHOT_ASPECTS]).toEqual([...ASPECTS]);
    expect([...SNAPSHOT_STATUSES].sort()).toEqual(Object.keys(STATUS_LABEL).sort());
    expect([...SNAPSHOT_RUNGS]).toEqual([...RUNGS]);
  });

  it("survives the store, and a malformed one is dropped rather than half-read", () => {
    const s = memory();
    const good = snap("2026-08-20", { starting: ["needs-support", "explored"] });
    writeModel(s, { ...emptyModel(), snapshots: [good, { on: "yesterday" } as unknown as MapSnapshot] });
    expect(readModel(s).snapshots).toEqual([good]);
    expect(isSnapshot({ ...good, statuses: { ...good.statuses, focus: "great" } })).toBe(false);
  });
});

describe("nextSnapshots", () => {
  const a = snap("2026-08-01", { starting: ["still-learning", "named"] });
  const b = snap("2026-09-01", { starting: ["needs-support", "explored"] });
  const c = snap("2026-09-01", { starting: ["mostly-supported", "working"] });

  it("the first is day one", () => {
    expect(nextSnapshots([], a)).toEqual([a]);
  });

  it("an unchanged map writes nothing, so the hub cannot loop", () => {
    const prev = [a, b];
    expect(nextSnapshots(prev, { ...b, on: "2026-09-02" })).toBe(prev);
  });

  it("a second change on the same day replaces that day's snapshot", () => {
    expect(nextSnapshots([a, b], c)).toEqual([a, c]);
  });

  it("day one is never replaced, even by a change later that day", () => {
    const later = { ...c, on: a.on };
    expect(nextSnapshots([a], later)).toEqual([a, later]);
  });

  it("keeps day one when the list is full, and drops the oldest after it", () => {
    let list: readonly MapSnapshot[] = [a];
    for (let i = 0; i < SNAPSHOT_CAP + 4; i++) {
      list = nextSnapshots(list, snap(`2026-10-${String((i % 28) + 1).padStart(2, "0")}`, { focus: [i % 2 ? "working-well" : "needs-support", i % 2 ? "kept" : "named"] }));
    }
    expect(list).toHaveLength(SNAPSHOT_CAP);
    expect(list[0]).toBe(a);
  });

  it("dates a snapshot by the person's own day, not UTC", () => {
    process.env.TZ = "Australia/Sydney";
    const record: ModelRecord = { ...emptyModel(), onboarding: { completedAt: "2026-09-26T22:00:00.000Z", impact: 6 } };
    expect(migratedDayOne(record)?.on).toBe("2026-09-27");
  });
});

describe("migration", () => {
  it("a record from before snapshots gets day one from its first answers, marked approximate", () => {
    const record: ModelRecord = {
      ...emptyModel(),
      onboarding: { improveFirst: "start-earlier", impact: 8, completedAt: "2026-08-01T00:00:00.000Z" },
      resonance: { starting: { frequency: "often", cost: 8, priority: "yes", at: "2026-08-02T00:00:00.000Z" } },
      completed: ["starting"],
    };
    const dayOne = migratedDayOne(record)!;
    expect(dayOne.approx).toBe(true);
    // Only the first answers: the finished run later on is not part of day one.
    expect(dayOne).toEqual({ ...snapshotOf({ ...emptyModel(), onboarding: record.onboarding, resonance: record.resonance }, dayOne.on), approx: true });
    expect(migratedDayOne(emptyModel())).toBeNull();
  });
});

describe("what the hub compares against", () => {
  const today = new Date(2026, 8, 27);
  const dayOne = snap("2026-06-10", { starting: ["still-learning", "named"] });
  const august = snap("2026-08-20", { starting: ["needs-support", "explored"] });
  const now = snap("2026-09-27", { starting: ["mostly-supported", "working"] });

  it("only day one, when nothing else is four weeks old", () => {
    const c = compareFor([dayOne, { ...august, on: "2026-09-10" }], now, today);
    expect(c.dayOne).toBe(dayOne);
    expect(c.month).toBeNull();
  });

  it("day one and a month, named without a digit", () => {
    const c = compareFor([dayOne, august], now, today);
    expect(c.month?.name).toBe("August");
    expect(c.month?.name).not.toMatch(/\d/);
  });

  it("nothing, when then and now draw the same map", () => {
    const c = compareFor([now], { ...now, on: "2026-09-28" }, today);
    expect(c).toEqual({ dayOne: null, month: null });
  });

  it("names older months so a year is never mistaken for this one", () => {
    expect(monthName("2025-08-20", today)).toBe("August last year");
    expect(monthName("2024-08-20", today)).toBe("Two years ago");
    expect(monthName("2026-08-20", today)).toBe("August");
  });

  it("says last year for any month in last year, even under twelve whole months", () => {
    // Eleven months and a day: this month's own name, a year back.
    expect(monthName("2025-09-28", today)).toBe("September last year");
    expect(monthName("2025-09-27", today)).toBe("September last year");
    // A later month number than today's, eleven months back.
    expect(monthName("2025-10-01", today)).toBe("October last year");
    expect(monthName("2025-12-31", today)).toBe("December last year");
    // The first day of this year is still this year.
    expect(monthName("2026-01-01", today)).toBe("January");
  });

  it("says two years ago from two calendar years back, where last year would name the wrong year", () => {
    // Twenty three whole months, but last September was a year later than this one.
    expect(monthName("2024-09-28", today)).toBe("The September before last");
    expect(monthName("2024-09-27", today)).toBe("Two years ago");
    // Across New Year: last December is last year; the December before it is not.
    const january = new Date(2026, 0, 10);
    expect(monthName("2025-12-15", january)).toBe("December last year");
    expect(monthName("2024-12-20", january)).toBe("The December before last");
    expect(monthName("2025-01-10", january)).toBe("January last year");
  });

  it("says the month before last in the middle of a sentence without a capital", () => {
    const then = snap("2024-09-28", { starting: ["needs-support", "named"] });
    const now = snap("2026-09-27", { starting: ["needs-support", "kept"] });
    expect(compareSentence(then, "The September before last", now, (a) => ASPECT_LABELS[a])).toEqual([
      `${ASPECT_LABELS.starting}: Named in the September before last, Kept now.`,
    ]);
  });

  it("gives the drawing a sentence per axis that moved, in the screen's words", () => {
    const lines = compareSentence(august, "August", now, (a) => ASPECT_LABELS[a]);
    expect(lines).toEqual([`${ASPECT_LABELS.starting}: Needs support and Explored in August, Mostly supported and Working now.`]);
    expect(lines.join(" ")).not.toMatch(/\d/);
  });

  it("names a rung that moved, because the dashed outline is drawn from the rung", () => {
    const named = snap("2026-08-20", { starting: ["needs-support", "named"] });
    const kept = snap("2026-09-27", { starting: ["needs-support", "kept"] });
    const lines = compareSentence(named, "August", kept, (a) => ASPECT_LABELS[a]);
    expect(lines).toEqual([`${ASPECT_LABELS.starting}: Named in August, Kept now.`]);
    expect(lines.join(" ")).not.toMatch(/\d/);
  });

  it("names only the status when only the status moved, and says Unasked once", () => {
    const before = snap("2026-08-20", { starting: ["needs-support", "kept"] });
    const after = snap("2026-09-27", { starting: ["mostly-supported", "kept"], focus: ["still-learning", "named"] });
    expect(compareSentence(before, "Day one", after, (a) => ASPECT_LABELS[a])).toEqual([
      `${ASPECT_LABELS.starting}: Needs support on day one, Mostly supported now.`,
      `${ASPECT_LABELS.focus}: Unasked on day one, Still learning and Named now.`,
    ]);
  });

  it("draws then the way the radar draws now", () => {
    const points = pointsOf(august);
    expect(points.map((p) => p.aspect)).toEqual([...ASPECTS]);
    expect(points.find((p) => p.aspect === "starting")?.status).toBe("needs-support");
  });
});
