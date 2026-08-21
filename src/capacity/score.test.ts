// W224 verify gate: "back-test over the sim; the score is recorded and rendered beside the
// forecast, so a forecaster that is usually wrong cannot present as one that is usually right."
//
// The decisive test in this file is not the hit rate — it is the one that shows a USELESS
// forecaster beating the real one on hit rate alone. If that comparison did not run, every other
// assertion here would pass over a score that rewards width, which is the failure the unit exists
// to prevent. The second decisive one proves the back-test walks forward: a week that would be a
// hit if it leaked into its own forecast is asserted to be a MISS.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { occurrencesFrom, sessionKeysFrom, type SessionOccurrence, type Weekday } from "./model";
import { MIN_RECORDED_WEEKS, forecastFill } from "./forecast";
import {
  MIN_SCORED_PREDICTIONS,
  SCORE_WITHHELD_COPY,
  backTest,
  forecastWithScore,
  scorePredictions,
  type Prediction,
} from "./score";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const TODAY = sim.config.todayIso;
const AS_OF = isoDaysFrom(TODAY, 6 * 7 + 1);
const PERIOD = { fromIso: TODAY, toIso: AS_OF };
const occurrences = occurrencesFrom(sim.appointments, AS_OF);
const keys = sessionKeysFrom(occurrences);

const KEY = { clinicianId: "c1", weekday: 4 as Weekday };

const ran = (rates: readonly number[], offered = 6): SessionOccurrence[] =>
  rates.map((rate, i) => ({
    clinicianId: KEY.clinicianId,
    dayIso: `2026-06-${String(i + 1).padStart(2, "0")}`,
    weekday: KEY.weekday,
    slotsOffered: offered,
    slotsFilled: Math.round(rate * offered),
  }));

describe("W224 the back-test walks forward, so no week is scored against a forecast that saw it", () => {
  it("scores a week that would only be a hit if it leaked into its own forecast as a MISS", () => {
    // The decisive check. Four full weeks then an empty one: the forecast for week five is built
    // from [1,1,1,1] and is 6-6, so an empty week is a miss. If week five reached its own forecast
    // the range would be 0-6 and it would be a hit — and every other test here would still pass.
    const result = backTest(ran([1, 1, 1, 1, 0]), KEY, PERIOD);
    expect(result.predictions).toHaveLength(1);
    const last = result.predictions[0]!;
    expect(last.dayIso).toBe("2026-06-05");
    expect(last.range).toEqual({ low: 6, high: 6 });
    expect(last.actualFilled).toBe(0);
    expect(last.hit).toBe(false);
  });

  it("does not report the perfect score that scoring against its own input would give", () => {
    // W223's range is the min and max of what it saw, so a self-scored forecast is right by
    // construction. Computed here rather than asserted, so the contrast is measured: the naive
    // version is 100% and the honest one is not.
    const naive = keys.map((key) => {
      const mine = occurrences.filter((o) => o.clinicianId === key.clinicianId && o.weekday === key.weekday);
      const forecast = forecastFill(mine, key, mine[0]!.slotsOffered, PERIOD);
      if (!forecast.forecast) return true;
      return mine.every((o) => {
        const scaled = forecastFill(mine, key, o.slotsOffered, PERIOD);
        return scaled.forecast && o.slotsFilled >= scaled.range.low && o.slotsFilled <= scaled.range.high;
      });
    });
    expect(naive.every(Boolean), "self-scoring is not vacuously perfect, so this contrast is moot").toBe(true);

    const honest = scorePredictions(keys.flatMap((key) => backTest(occurrences, key, PERIOD).predictions), PERIOD);
    expect(honest.scored).toBe(true);
    if (!honest.scored) return;
    expect(honest.hitRate).toBeLessThan(1);
  });

  it("makes no prediction before enough weeks have accumulated to clear W223's floor", () => {
    const result = backTest(ran([1, 1, 1, 1, 1, 1]), KEY, PERIOD);
    expect(result.predictions).toHaveLength(6 - MIN_RECORDED_WEEKS.weeks);
    expect(result.skipped).toHaveLength(MIN_RECORDED_WEEKS.weeks);
  });
});

describe("W224 a wider guess is right more often, and the score says so", () => {
  it("ranks an always-wide forecaster ABOVE the real one on hit rate and below it on width", () => {
    // The unit's reason for existing. "Between 0 and 6 will fill" is correct every week; a score
    // that reported only the hit rate would put it top. Both scores come from the same instrument.
    const real = scorePredictions(keys.flatMap((key) => backTest(occurrences, key, PERIOD).predictions), PERIOD);
    const useless: Prediction[] = keys
      .flatMap((key) => backTest(occurrences, key, PERIOD).predictions)
      .map((p) => ({
        ...p,
        range: { low: 0, high: p.slotsOffered },
        hit: true,
        widthSlots: p.slotsOffered,
      }));
    const scored = scorePredictions(useless, PERIOD);

    expect(real.scored && scored.scored).toBe(true);
    if (!real.scored || !scored.scored) return;
    // It wins on the number a naive score would report…
    expect(scored.hitRate).toBe(1);
    expect(scored.hitRate).toBeGreaterThan(real.hitRate);
    // …and loses badly on the number that is reported beside it.
    expect(scored.meanWidthShare).toBe(1);
    expect(real.meanWidthShare).toBeLessThan(0.2);
  });

  it("does not dilute the width share with predictions over no slots", () => {
    // Finding 9 of W234's review. Adding 0 for a zero-slot prediction and dividing by the full
    // count understates the width — and the width is the one number in this module whose job is to
    // stop a forecaster looking better than it is.
    const real = { dayIso: "2026-06-01", slotsOffered: 4, range: { low: 0, high: 4 }, actualFilled: 2, hit: true, widthSlots: 4 };
    const empty = { ...real, dayIso: "2026-06-08", slotsOffered: 0, widthSlots: 0 };
    const withEmpties = scorePredictions(
      [real, { ...real, dayIso: "2026-06-15" }, { ...real, dayIso: "2026-06-22" },
       empty, { ...empty, dayIso: "2026-06-29" }, { ...empty, dayIso: "2026-07-06" }],
      PERIOD,
    );
    expect(withEmpties.scored).toBe(true);
    if (!withEmpties.scored) return;
    // Three real predictions, each 4 of 4 wide: the share is 1, not 0.5.
    expect(withEmpties.meanWidthShare).toBe(1);
  });

  it("puts both numbers in one sentence, since either alone misleads", () => {
    const score = scorePredictions(keys.flatMap((key) => backTest(occurrences, key, PERIOD).predictions), PERIOD);
    expect(score.scored).toBe(true);
    if (!score.scored) return;
    expect(score.sentence).toMatch(/contained what happened \d+ times \(\d+ per cent\)/);
    expect(score.sentence).toMatch(/averaged [\d.]+ slots wide/);
    expect(score.sentence).toContain("A wider range is right more often and says less.");
  });

  it("has no hit rate without a width beside it, by type", () => {
    const score = scorePredictions(keys.flatMap((key) => backTest(occurrences, key, PERIOD).predictions), PERIOD);
    if (!score.scored) throw new Error("expected a score");
    expect(Object.keys(score).sort()).toEqual([
      "basis",
      "hitRate",
      "hits",
      "meanWidthShare",
      "meanWidthSlots",
      "predictions",
      "scored",
      "sentence",
    ]);
  });
});

describe("W224 a score over too few predictions reports counts and withholds the rate", () => {
  it("refuses every per-session score in the simulation, and scores the pooled one", () => {
    // Measured, not assumed: each session in the sim yields about two predictions against a floor
    // of five, so the honest per-session answer is that the forecaster cannot be scored on any one
    // session yet — while the pooled question, "is this method usually right", can be answered.
    const perSession = keys.map((key) => scorePredictions(backTest(occurrences, key, PERIOD).predictions, PERIOD));
    expect(perSession.filter((s) => s.scored)).toHaveLength(0);
    expect(perSession.filter((s) => !s.scored)).toHaveLength(70);

    const pooled = scorePredictions(keys.flatMap((key) => backTest(occurrences, key, PERIOD).predictions), PERIOD);
    expect(pooled.scored).toBe(true);
    if (!pooled.scored) return;
    expect(pooled.predictions).toBe(131);
    expect(pooled.hits).toBe(111);
  });

  it("still reports the counts when the rate is withheld", () => {
    const thin = scorePredictions(backTest(ran([1, 1, 1, 1, 1, 0]), KEY, PERIOD).predictions, PERIOD);
    expect(thin.scored).toBe(false);
    if (thin.scored) return;
    expect(thin.predictions).toBe(2);
    expect(thin.hits).toBe(1);
    expect(thin.predictionsNeeded).toBe(MIN_SCORED_PREDICTIONS.predictions - 2);
    expect(thin.copy).toBe(SCORE_WITHHELD_COPY.too_few_predictions);
    // @ts-expect-error — and there is no rate on the withheld arm to reach for.
    void thin.hitRate;
  });

  it("moves with the declared floor rather than a number written here", () => {
    const at = Array.from({ length: MIN_SCORED_PREDICTIONS.predictions }, () => ({
      dayIso: "2026-06-01", slotsOffered: 6, range: { low: 0, high: 6 }, actualFilled: 3, hit: true, widthSlots: 6,
    }));
    expect(scorePredictions(at, PERIOD).scored).toBe(true);
    expect(scorePredictions(at.slice(1), PERIOD).scored).toBe(false);
  });
});

describe("W224 nothing is silently dropped from the denominator", () => {
  it("accounts for every recorded week as either a prediction or a named skip", () => {
    let accounted = 0;
    for (const key of keys) {
      const result = backTest(occurrences, key, PERIOD);
      const mine = occurrences.filter((o) => o.clinicianId === key.clinicianId && o.weekday === key.weekday);
      expect(result.predictions.length + result.skipped.length).toBe(mine.length);
      accounted += mine.length;
      for (const skip of result.skipped) expect(skip.why.length).toBeGreaterThan(20);
    }
    expect(accounted).toBe(411);
    expect(keys.flatMap((k) => backTest(occurrences, k, PERIOD).predictions)).toHaveLength(131);
    expect(keys.flatMap((k) => backTest(occurrences, k, PERIOD).skipped)).toHaveLength(280);
  });

  it("names a week that offered nothing as untestable rather than as a miss", () => {
    // A cancelled list cannot be right or wrong about how full it got. Counting it as a miss would
    // punish the forecaster for a week nobody could have forecast.
    const withCancelled: SessionOccurrence[] = [
      ...ran([1, 1, 1, 1]),
      { clinicianId: KEY.clinicianId, dayIso: "2026-06-05", weekday: KEY.weekday, slotsOffered: 0, slotsFilled: 0 },
    ];
    const result = backTest(withCancelled, KEY, PERIOD);
    expect(result.predictions).toHaveLength(0);
    expect(result.skipped.map((s) => s.dayIso)).toContain("2026-06-05");
    expect(result.skipped.find((s) => s.dayIso === "2026-06-05")!.why).toMatch(/nothing for a forecast to be right or wrong about/);
  });
});

describe("W224 the score is not obtainable without the forecast it belongs to", () => {
  it("returns both from one call", () => {
    const paired = forecastWithScore(occurrences, keys[0]!, 6, PERIOD);
    expect(Object.keys(paired).sort()).toEqual(["backTest", "forecast", "score"]);
    expect(paired.forecast.forecast).toBe(true);
    expect(paired.score.scored).toBe(false);
    expect(paired.backTest.predictions.length + paired.backTest.skipped.length).toBeGreaterThan(0);
  });

  it("passes the advice linter on every sentence it authors", () => {
    const score = scorePredictions(keys.flatMap((key) => backTest(occurrences, key, PERIOD).predictions), PERIOD);
    const texts = [
      ...Object.values(SCORE_WITHHELD_COPY),
      MIN_SCORED_PREDICTIONS.why,
      score.scored ? score.sentence : "",
      ...backTest(occurrences, keys[0]!, PERIOD).skipped.map((s) => s.why),
    ];
    for (const text of texts) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
