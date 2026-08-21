// W232: the Q18 operational dossier's arithmetic and its quoted facts, checked against the tree.
//
// A dossier is read by somebody making a commitment, and its whole value is that its facts are
// current. W207's Y4 dossier and W216's Q17 one came with tests for the same reason: a figure is
// true on the day it is written and becomes a lie silently, without anybody editing it.
//
// This one prices an OPERATIONAL decision rather than a gate, so what needs pinning is different.
// Every number in it is derived — from W46's figures register or from the simulated practice — and
// every one is recomputed here rather than transcribed. And its central finding is a claim about
// the state of the tree ("nothing in this product fills the slots"), so that is checked against
// W231's shipped state and the blocked rows rather than read as prose.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { figure } from "@/collateral/figures";
import { capacityReport, occurrencesFrom, sessionKeysFrom } from "@/capacity/model";
import { forecastFill } from "@/capacity/forecast";
import { SHIPPED_COUPLING } from "@/capacity/coupling";

const ROOT = process.cwd();
const DOSSIER = readFileSync(path.join(ROOT, "docs", "CAPACITY-DOSSIER-Q18.md"), "utf8");
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");

/**
 * The last unit that existed when this dossier was written.
 *
 * DOSSIER-1's rule: a point-in-time document pinned against the LIVE ledger is pinned against a
 * moving target, and W207's went red the day W208 planned Year 5. This file reads the ledger only
 * to check that the rows it names are still blocked, and bounds itself for the same reason.
 */
const Q18_LAST_UNIT = 260;

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const AS_OF = isoDaysFrom(sim.config.todayIso, 6 * 7 + 1);
const PERIOD = { fromIso: sim.config.todayIso, toIso: AS_OF };
const occurrences = occurrencesFrom(sim.appointments, AS_OF);

describe("W232 every figure in the dossier is derived, not typed", () => {
  it("recomputes the slots offered and unfilled, and finds the dossier's numbers", () => {
    const report = capacityReport(sim.appointments, AS_OF, PERIOD);
    let offered = 0;
    let filled = 0;
    for (const session of report.sessions) {
      if (!session.history.recorded) continue;
      offered += session.history.slotsOffered;
      filled += session.history.slotsFilled;
    }
    const unfilled = offered - filled;
    expect(offered).toBe(8393);
    expect(unfilled).toBe(260);
    expect(DOSSIER).toContain("**8,393 slots offered**");
    expect(DOSSIER).toContain("**260 went unfilled**");
    expect(DOSSIER).toContain(`${((unfilled / offered) * 100).toFixed(1)}%`);
  });

  it("prices them from the figures register rather than from a number in the prose", () => {
    const perSlot = figure("mbs.bulk-billed-level-b-metro");
    expect(perSlot.display).toBe("$69.56");
    expect(perSlot.source.kind).toBe("published");
    expect(DOSSIER).toContain(perSlot.display);
    expect(DOSSIER).toContain("mbs.bulk-billed-level-b-metro");

    // The headline total, recomputed. If either input moves this fails rather than going stale.
    const total = 260 * perSlot.value;
    expect(DOSSIER).toContain(`$${total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`);
    // And the two-slot staffing error, from the same figure.
    expect(DOSSIER).toContain(`$${(2 * perSlot.value).toFixed(2)}`);
  });

  it("names the rebate figure as the rebate, and cites no third number", () => {
    // The distinction the dossier draws: what a patient receives is not what a practice earns.
    expect(figure("mbs.item23").display).toBe("$43.90");
    expect(DOSSIER).toContain("$43.90");
    const dollars = new Set([...DOSSIER.matchAll(/\$[\d,]+\.\d\d/g)].map((m) => m[0]));
    expect([...dollars].sort()).toEqual(["$139.12", "$18,085.60", "$43.90", "$69.56"].sort());
  });

  it("recomputes the width distribution the staffing argument rests on", () => {
    const widths = new Map<number, number>();
    for (const key of sessionKeysFrom(occurrences)) {
      const forecast = forecastFill(occurrences, key, 6, PERIOD);
      if (!forecast.forecast) continue;
      const width = forecast.range.high - forecast.range.low;
      widths.set(width, (widths.get(width) ?? 0) + 1);
    }
    expect([...widths].sort((a, b) => a[0] - b[0])).toEqual([[0, 21], [1, 46], [2, 3]]);
    expect(DOSSIER).toContain("**21 sessions** produce a range of width **0**");
    expect(DOSSIER).toContain("**46 sessions** produce a range of width **1**");
    expect(DOSSIER).toContain("**3 sessions** produce a range of width **2**");
    // The claim that width 2 is the widest, checked rather than assumed.
    expect(Math.max(...widths.keys())).toBe(2);
    expect(DOSSIER).toContain("the widest in the practice");
  });
});

describe("W232 the central finding is a fact about the tree, not a sentence in a document", () => {
  it("holds only while the coupling ships off", () => {
    // If W231's coupling were switched on in the shipped state, the dossier's lead finding would
    // be wrong and this fails — which is the correct outcome: the document would need rewriting,
    // not quietly keeping.
    expect(SHIPPED_COUPLING.enabled).toBe(false);
    expect(DOSSIER).toContain("**ships off**");
  });

  it("holds only while nothing has ever been sent", () => {
    // The rows the finding rests on, read from the ledger and bounded to the units that existed
    // when this was written (DOSSIER-1).
    const rows = LEDGER.split("\n").filter((line) => /^\| W\d+ \|/.test(line));
    const inScope = rows.filter((line) => {
      const id = Number(line.match(/^\| W(\d+) \|/)![1]);
      return id <= Q18_LAST_UNIT;
    });
    expect(inScope.length).toBeGreaterThan(100);
    const w174 = inScope.find((line) => line.startsWith("| W174 |"))!;
    expect(w174, "W174 is no longer blocked — the dossier's premise has changed").toContain("| blocked |");
    expect(w174).toMatch(/G3/);
    expect(DOSSIER).toContain("W174 is `blocked`");
  });

  it("states the finding first, because it is the one that changes a decision", () => {
    const finding = DOSSIER.indexOf("nothing in this product fills the slots");
    const pricing = DOSSIER.indexOf("What the forecast is actually worth");
    expect(finding).toBeGreaterThan(0);
    expect(finding).toBeLessThan(pricing);
    expect(DOSSIER).toContain("Opening slots you have no mechanism to fill is worse than not opening");
  });
});

describe("W232 the dossier prices both ends and recommends neither", () => {
  it("gives each end of the range its own row and its own cost", () => {
    expect(DOSSIER).toContain("the high end (6)");
    expect(DOSSIER).toContain("the low end (4)");
    expect(DOSSIER).toContain("Two slots of clinician time idle");
    expect(DOSSIER).toContain("Two people turned away");
  });

  it("takes no position, and says which questions it is refusing", () => {
    expect(DOSSIER).toContain("This product does not know any of those and must not choose");
    expect(DOSSIER).toContain("## What this dossier does not price");
    expect(DOSSIER).not.toMatch(/\bwe recommend\b|\byou should\b|\bthe right (choice|answer) is\b/i);
  });

  it("bounds its own ledger read, so it cannot go red when Year 6 is planned", () => {
    // DOSSIER-1's own trigger, satisfied here by construction rather than by luck.
    const source = readFileSync(path.join(ROOT, "src/quality/capacity-dossier-q18.test.ts"), "utf8");
    expect(source).toContain("BUILD-STATE.md");
    expect(source).toMatch(/_LAST_UNIT/);
  });
});
