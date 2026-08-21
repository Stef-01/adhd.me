// W231 verify gate: "the coupling exists as a declared, disabled control; enabling it is a practice
// decision recorded with a reason, and the disabled state is pinned by its own test."
//
// Three things need proving and each fails differently. The shipped state is a VALUE, pinned.
// "Cannot be switched on by accident" is a TYPE property — there must be no boolean route in.
// And "does not reach the rail" is a property of the TREE, not of this module: a module that
// promises not to touch the invitation pool while `pool.ts` imports it has promised nothing.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { AUTOMATED_DECISIONS } from "@/privacy/automated-decisions";
import { occurrencesFrom, sessionKeysFrom } from "./model";
import { forecastFill } from "./forecast";
import {
  COUPLING_OFF_COPY,
  type CouplingRefusal,
  COUPLING_REJECTION_COPY,
  SHIPPED_COUPLING,
  couplingState,
  extraInvitations,
  invitationsToCover,
  type CouplingDecision,
} from "./coupling";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const AS_OF = isoDaysFrom(sim.config.todayIso, 6 * 7 + 1);
const PERIOD = { fromIso: sim.config.todayIso, toIso: AS_OF };
const occurrences = occurrencesFrom(sim.appointments, AS_OF);

const GOOD: CouplingDecision = {
  decidedBy: "Practice manager",
  decidedOnIso: "2026-08-21",
  reason:
    "We have two clinicians with spare Thursday capacity and a waiting list, and we have agreed to try filling it for one quarter.",
};

describe("W231 the coupling ships off, and off is pinned", () => {
  it("is disabled in the shipped state, with the reason in the value", () => {
    expect(SHIPPED_COUPLING.enabled).toBe(false);
    expect(SHIPPED_COUPLING.enabled === false && SHIPPED_COUPLING.why).toBe(COUPLING_OFF_COPY);
  });

  it("does nothing over an entire simulated practice while it is off", () => {
    // Pinned over real data rather than one call: every session, every forecast, no extras. If the
    // coupling ever became live-by-default this fails on seventy inputs at once.
    const keys = sessionKeysFrom(occurrences);
    expect(keys).toHaveLength(70);
    let asked = 0;
    for (const key of keys) {
      const forecast = forecastFill(occurrences, key, 6, PERIOD);
      if (!forecast.forecast) continue;
      asked += 1;
      expect(extraInvitations(SHIPPED_COUPLING, forecast.range, 6)).toBeNull();
    }
    expect(asked, "no forecast was produced, so the sweep is vacuous").toBe(70);
  });

  it("would do something if it were on, so 'nothing happens' is a fact about the switch", () => {
    // The other direction, and the one that stops the test above being trivially true: with a
    // recorded decision the same inputs produce numbers.
    const enabled = couplingState(GOOD);
    expect(enabled.enabled).toBe(true);
    if (!enabled.enabled) return;
    const produced = sessionKeysFrom(occurrences)
      .map((key) => forecastFill(occurrences, key, 6, PERIOD))
      .filter((f) => f.forecast)
      .map((f) => (f.forecast ? extraInvitations(enabled, f.range, 6) : null))
      .filter((n) => n !== null);
    expect(produced.length).toBeGreaterThan(10);
  });
});

describe("W231 it cannot be switched on by accident", () => {
  it("has no boolean route in", () => {
    // @ts-expect-error — a boolean is a setting somebody flips; this takes a decision or nothing.
    void couplingState(true);
    // @ts-expect-error — and there is no options bag with an `enabled` in it either.
    void couplingState(null, { enabled: true });
  });

  it("refuses a decision with no reason, a thin reason, or an unreadable date — each with why", () => {
    const cases: Array<[string, CouplingDecision | null, CouplingRefusal]> = [
      ["nothing recorded", null, "no_decision"],
      ["thin reason", { ...GOOD, reason: "agreed" }, "reason_too_thin"],
      ["no decider", { ...GOOD, decidedBy: "  " }, "reason_too_thin"],
      ["unreadable date", { ...GOOD, decidedOnIso: "August" }, "date_unreadable"],
    ];
    for (const [label, decision, expected] of cases) {
      const state = couplingState(decision);
      expect(state.enabled, label).toBe(false);
      expect("refused" in state && state.refused, label).toBe(expected);
      expect("why" in state && state.why, label).toBe(COUPLING_REJECTION_COPY[expected]);
    }
    // Every declared rejection is reachable, and every reachable one is declared.
    const produced = new Set(
      cases.map(([, decision]) => {
        const state = couplingState(decision);
        return "refused" in state ? state.refused : "";
      }),
    );
    expect([...produced].sort()).toEqual(Object.keys(COUPLING_REJECTION_COPY).sort());
  });

  it("distinguishes a refusal from the shipped off state", () => {
    // Both are `enabled: false`. A refusal that looked identical to "off" would send somebody
    // hunting for a bug in a switch that was working.
    const refused = couplingState(null);
    expect("refused" in refused).toBe(true);
    expect("refused" in SHIPPED_COUPLING).toBe(false);
  });
});

describe("W231 it does not reach the rail, and that is checked on the tree", () => {
  it("is imported by nothing outside the capacity lane", () => {
    // The property that matters. A module promising not to touch the invitation pool while
    // `pool.ts` imports it has promised nothing — so this walks the tree instead of trusting the
    // module note, and names the engine explicitly because that is where it would land.
    const roots = ["src", "app"];
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        // Inside the lane is fine and expected — W226's sentence register imports it to enumerate
        // its copy. "Outside" means outside `src/capacity/`, and saying so precisely is the
        // difference between a check that passes for the right reason and one that fails for the
        // wrong one: the first run flagged this file's own neighbours.
        else if (/\.tsx?$/.test(entry) && !full.includes(`${path.sep}src${path.sep}capacity${path.sep}`)) {
          const code = readFileSync(full, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
          if (/from "[^"]*capacity\/coupling"|from "\.\/coupling"/.test(code)) importers.push(full);
        }
      }
    };
    for (const root of roots) walk(path.join(process.cwd(), root));
    expect(importers, "something outside this lane imports the coupling").toEqual([]);

    // And the engine specifically, stated rather than left implied by the sweep above.
    const engine = readFileSync(path.join(process.cwd(), "src/engine/pool.ts"), "utf8");
    expect(engine).not.toMatch(/coupling|invitationsToCover|extraInvitations/);
  });

  it("sizes from the LOW end of the range, because over-contacting is the error that reaches people", () => {
    // 6 slots, a range of 4 to 6: the shortfall from the low end is 2, from the high end 0.
    // Sizing from the high end assumes the good week and contacts nobody on the bad one; sizing
    // from the low end is the conservative direction for the practice and the aggressive one for
    // the patient, which is why the arithmetic is written down and reviewable while it is off.
    expect(invitationsToCover({ low: 4, high: 6 }, 6)).toBe(2);
    expect(invitationsToCover({ low: 6, high: 6 }, 6)).toBeNull();
    // Null rather than 0: "no shortfall" must not read as "send none of the invitations you were
    // going to send", which is the same distinction W179 draws everywhere else in this tree.
    expect(invitationsToCover({ low: 8, high: 8 }, 6)).toBeNull();
    for (const slots of [0, -2, 1.5]) expect(invitationsToCover({ low: 0, high: 6 }, slots)).toBeNull();
  });
});

describe("W231 the register says what this is and when that changes", () => {
  it("is recorded as built and not in use, with the trigger named", () => {
    const entry = AUTOMATED_DECISIONS.find((d) => d.id === "invitation-volume-coupling");
    expect(entry, "the coupling is not in the ADM register").toBeDefined();
    expect(entry!.status).toBe("built_not_in_use");
    expect(entry!.decidedBy).toContain("src/capacity/coupling.ts");
    expect(entry!.what).toMatch(/switched off/i);
    // W145: the condition under which this classification stops being right, written where a
    // reader of the register meets it.
    expect(entry!.what).toMatch(/MATCH-1|ordering/);
  });

  it("passes the advice linter on everything it says", () => {
    for (const text of [COUPLING_OFF_COPY, ...Object.values(COUPLING_REJECTION_COPY)]) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
