// W225 verify gate: "no patient id can enter the recommendation type; asserted as an absence, not
// a filter."
//
// An absence needs a different kind of test from a behaviour, and this one needs three, because
// the drift it guards against has three doors. A patient could arrive as a PARAMETER (checked on
// every exported signature, not on names — `sizeFor(patient)` passes a name check). It could
// arrive as a FIELD (checked on the serialised value against real synthetic patient ids). Or it
// could arrive through an IMPORT of something that holds patients, which is checked by pinning the
// import list, because that is the door MATCH-1 came through: a reasonable-looking line in a
// module that already had the data to hand.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { NO_HISTORY_COPY, occurrencesFrom, sessionKeysFrom, type SessionOccurrence, type Weekday } from "./model";
import { MIN_SCORED_PREDICTIONS } from "./score";
import * as mod from "./recommendation";
import {
  ALL_SCORE_SCOPES,
  RECOMMENDATION_WITHHELD_COPY,
  sessionRecommendation,
  withheldRecommendationCopy,
} from "./recommendation";

const SOURCE = readFileSync(path.join(process.cwd(), "src/capacity/recommendation.ts"), "utf8");

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const TODAY = sim.config.todayIso;
const AS_OF = isoDaysFrom(TODAY, 6 * 7 + 1);
const PERIOD = { fromIso: TODAY, toIso: AS_OF };
const occurrences = occurrencesFrom(sim.appointments, AS_OF);
const keys = sessionKeysFrom(occurrences);
const all = () => keys.map((key) => sessionRecommendation(occurrences, key, 2, PERIOD));

const KEY = { clinicianId: "c1", weekday: 4 as Weekday };
const ran = (rates: readonly number[], offered = 6): SessionOccurrence[] =>
  rates.map((rate, i) => ({
    clinicianId: KEY.clinicianId,
    dayIso: `2026-06-${String(i + 1).padStart(2, "0")}`,
    weekday: KEY.weekday,
    slotsOffered: offered,
    slotsFilled: Math.round(rate * offered),
  }));

describe("W225 no patient can enter the recommendation, by three doors", () => {
  it("takes no patient in any exported signature", () => {
    const seen: string[] = [];
    for (const match of SOURCE.matchAll(/^export function (\w+)\s*\(([^)]*)\)/gms)) {
      seen.push(match[1]!);
      const params = match[2]!.replace(/\s+/g, " ");
      expect(params, `${match[1]} takes a patient`).not.toMatch(
        /\bpatient\b|\bpatientId\b|Patient\[\]|readonly Patient/i,
      );
    }
    // Non-vacuity: the regex must have found the functions it claims to have checked.
    expect(seen.sort()).toEqual(["sessionRecommendation", "withheldRecommendationCopy"]);
    expect(Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function").sort()).toEqual(
      ["sessionRecommendation", "withheldRecommendationCopy"],
    );
  });

  it("carries no patient identity in any recommendation it produces", () => {
    const serialised = JSON.stringify(all());
    expect(serialised.length).toBeGreaterThan(1000);
    for (const patient of sim.patients.slice(0, 100)) {
      expect(serialised).not.toContain(String(patient.id));
    }
  });

  it("imports nothing that holds a patient", () => {
    // The door MATCH-1 came through. A recall register or a matcher imported here would put the
    // data one line from the recommendation, and the line would look reasonable.
    const imports = [...SOURCE.matchAll(/from "([^"]+)"/g)].map((m) => m[1]!).sort();
    expect(imports).toEqual(["./forecast", "./model", "./score", "@/reporting/model"].sort());
  });
});

describe("W225 it is a conditional, and the practice supplies the number", () => {
  it("offers a recommendation for every session in the simulated practice", () => {
    const results = all();
    expect(results).toHaveLength(70);
    expect(results.filter((r) => r.offered)).toHaveLength(70);
  });

  it("states an if, never an instruction, and passes the advice linter", () => {
    for (const result of all()) {
      if (!result.offered) continue;
      const { sentence, demandEvidence } = result.recommendation;
      expect(sentence).toMatch(/^If \d+ more slots? were opened on \w+: between \d+ and \d+ filled/);
      expect(sentence).not.toMatch(/\byou should\b|\bwe recommend\b|\bconsider\b|\bnext step/i);
      expect(lintEducationCopy(sentence).map((f) => f.rule)).toEqual([]);
      expect(lintEducationCopy(demandEvidence).map((f) => f.rule)).toEqual([]);
    }
  });

  it("echoes the practice's own number rather than choosing one", () => {
    for (const slots of [1, 2, 9]) {
      const result = sessionRecommendation(occurrences, keys[0]!, slots, PERIOD);
      expect(result.offered).toBe(true);
      if (!result.offered) continue;
      expect(result.recommendation.slotsConsidered).toBe(slots);
      expect(result.recommendation.range.high).toBeLessThanOrEqual(slots);
      expect(result.recommendation.sentence).toContain(`If ${slots} more slot`);
    }
    // Singular and plural both read correctly — a stray "1 more slots" is the kind of thing a
    // reader stops trusting a page over.
    const one = sessionRecommendation(occurrences, keys[0]!, 1, PERIOD);
    expect(one.offered && one.recommendation.sentence).toContain("If 1 more slot were opened");
  });

  it("carries the hit rate into the sentence, so the range is never read unqualified", () => {
    const result = sessionRecommendation(occurrences, keys[0]!, 2, PERIOD);
    expect(result.offered).toBe(true);
    if (!result.offered) return;
    expect(result.recommendation.sentence).toMatch(/contained what happened \d+ per cent of the time/);
    expect(result.recommendation.score.scored).toBe(true);
  });
});

describe("W225 the score it carries is the method's, and it says so", () => {
  it("declares exactly one score scope, by value", () => {
    // A second reading of "scored" is a real thing somebody may want; it must arrive as a visible
    // widening rather than as the same word quietly meaning something else.
    expect(ALL_SCORE_SCOPES).toEqual(["method_across_this_practice"]);
    for (const result of all()) {
      if (!result.offered) continue;
      expect(result.recommendation.scoreScope).toBe("method_across_this_practice");
    }
  });

  it("offers nothing at all where the forecaster is unscored — not a hedged version", () => {
    // One session, six weeks: enough to forecast, nowhere near enough scored predictions.
    const oneSession = ran([1, 0.5, 1, 0.5, 1, 0.5]);
    const result = sessionRecommendation(oneSession, KEY, 2, PERIOD);
    expect(result.offered).toBe(false);
    if (result.offered) return;
    expect(result.why).toBe("forecaster_unscored");
    expect(result.copy).toBe(RECOMMENDATION_WITHHELD_COPY.forecaster_unscored);
    expect(result.copy).toMatch(/hedged version of it would be read as one anyway/);
    expect(MIN_SCORED_PREDICTIONS.predictions).toBeGreaterThan(2);
  });

  it("carries W223's words when there is no forecast, rather than writing its own", () => {
    const result = sessionRecommendation([], KEY, 2, PERIOD);
    expect(result.offered).toBe(false);
    if (result.offered) return;
    expect(result.why).toBe("no_forecast");
    expect(result.copy).toContain(NO_HISTORY_COPY.never_run);
    expect(withheldRecommendationCopy(result)).toBe(result.copy);
  });

  it("declares every refusal it can produce, both directions", () => {
    const produced = new Set<string>();
    for (const result of [
      sessionRecommendation([], KEY, 2, PERIOD),
      sessionRecommendation(ran([1, 0.5, 1, 0.5, 1, 0.5]), KEY, 2, PERIOD),
    ]) {
      if (!result.offered) produced.add(result.why);
    }
    expect([...produced].sort()).toEqual(Object.keys(RECOMMENDATION_WITHHELD_COPY).sort());
    expect(withheldRecommendationCopy(sessionRecommendation(occurrences, keys[0]!, 2, PERIOD))).toBeNull();
  });
});

describe("W225 the demand evidence describes the record and claims nothing beyond it", () => {
  it("has both readings present in the simulated practice, so neither branch is untested", () => {
    const offered = all().flatMap((r) => (r.offered ? [r.recommendation] : []));
    const neverFull = offered.filter((r) => r.weeksRunFull === 0);
    const sometimesFull = offered.filter((r) => r.weeksRunFull > 0);
    expect(neverFull).toHaveLength(6);
    expect(sometimesFull).toHaveLength(64);
    for (const one of neverFull) {
      expect(one.demandEvidence).toMatch(/never filled every slot it offered/);
      // The sentence a record like this must not be allowed to imply.
      expect(one.demandEvidence).toMatch(/not the same as there being none/);
    }
    for (const one of sometimesFull) {
      expect(one.demandEvidence).toMatch(/cannot show whether more would have been taken/);
    }
  });

  it("counts a week that offered nothing as neither full nor recorded", () => {
    // W222's rule inherited: a cancelled list did not run full and did not run empty.
    const withCancelled: SessionOccurrence[] = [
      ...ran([1, 1, 1, 1, 1, 1]),
      { clinicianId: KEY.clinicianId, dayIso: "2026-06-09", weekday: KEY.weekday, slotsOffered: 0, slotsFilled: 0 },
    ];
    // Enough OTHER sessions to clear W224's pooled floor, or this test would take the refusal
    // branch and never check the counts it exists to check. Caught by reading the first version's
    // branch rather than its result: two sessions give four predictions against a floor of five.
    const others = ["c2", "c3", "c4"].flatMap((clinicianId) =>
      ran([1, 0.5, 1, 0.5, 1, 0.5]).map((o) => ({ ...o, clinicianId })),
    );
    const result = sessionRecommendation([...withCancelled, ...others], KEY, 2, PERIOD);
    expect(result.offered, withheldRecommendationCopy(result) ?? "").toBe(true);
    if (!result.offered) return;
    expect(result.recommendation.weeksRecorded).toBe(6);
    expect(result.recommendation.weeksRunFull).toBe(6);
  });
});
