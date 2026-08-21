// W223 verify gate: "every forecast carries its basis and its uncertainty, and refuses below a
// floor of recorded weeks rather than emitting a confident number over thin data."
//
// Three things need proving and each needs a different kind of check. The absence of a point
// estimate is a property of the TYPE. The floor being on WEEKS rather than slots is a
// discrimination — one session with many slots and few weeks must refuse while another with few
// slots and enough weeks must not, or the test passes with the floor on the wrong quantity. And
// the interval's width meaning something is a comparison: two sessions with identical totals and
// different spreads must get different answers, which is the one thing an aggregate cannot do.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { NO_HISTORY_COPY, occurrencesFrom, sessionKeysFrom, type SessionOccurrence, type Weekday } from "./model";
import {
  FORECAST_REFUSAL_COPY,
  MIN_RECORDED_WEEKS,
  forecastFill,
  withheldForecastCopy,
} from "./forecast";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const TODAY = sim.config.todayIso;
const AS_OF = isoDaysFrom(TODAY, 6 * 7 + 1);
const PERIOD = { fromIso: TODAY, toIso: AS_OF };
const occurrences = occurrencesFrom(sim.appointments, AS_OF);
const keys = sessionKeysFrom(occurrences);

const KEY = { clinicianId: "c1", weekday: 4 as Weekday };

/** A session that ran on `rates.length` Thursdays, each offering `offered` slots. */
const ran = (rates: readonly number[], offered = 6): SessionOccurrence[] =>
  rates.map((rate, i) => ({
    clinicianId: KEY.clinicianId,
    dayIso: `2026-0${i < 3 ? 5 : 6}-0${(i % 3) + 1}`,
    weekday: KEY.weekday,
    slotsOffered: offered,
    slotsFilled: Math.round(rate * offered),
  }));

describe("W223 the forecast is a range, and there is no point estimate to reach for", () => {
  it("returns low and high and nothing else", () => {
    const result = forecastFill(ran([1, 1, 1, 1]), KEY, 6, PERIOD);
    expect(result.forecast).toBe(true);
    if (!result.forecast) return;
    expect(Object.keys(result.range).sort()).toEqual(["high", "low"]);
    // @ts-expect-error — no expected, no midpoint, no mean. A caller wanting one number can
    // average the two and own that claim; this module does not hand it over.
    void result.range.expected;
  });

  it("produces the row's own example over the simulated practice", () => {
    // "open 6 slots Thursday → 4 to 6 fill", from the real diary rather than a fixture.
    const forecasts = keys.map((key) => forecastFill(occurrences, key, 6, PERIOD));
    expect(forecasts).toHaveLength(70);
    expect(forecasts.filter((f) => f.forecast)).toHaveLength(70);
    const spans = forecasts.map((f) => (f.forecast ? `${f.range.low}-${f.range.high}` : "refused"));
    expect(spans).toContain("4-6");
    for (const forecast of forecasts) {
      if (!forecast.forecast) continue;
      expect(forecast.range.low).toBeLessThanOrEqual(forecast.range.high);
      expect(forecast.range.high).toBeLessThanOrEqual(6);
      expect(forecast.sentence).toMatch(/between \d+ and \d+ filled, going by the \d+ /);
    }
  });

  it("carries its basis and its uncertainty on every forecast", () => {
    for (const key of keys) {
      const forecast = forecastFill(occurrences, key, 6, PERIOD);
      if (!forecast.forecast) continue;
      expect(forecast.basis.recordedFacts).toBe(forecast.observed.recordedWeeks);
      expect(forecast.basis.fromIso).toBe(TODAY);
      expect(forecast.observed.lowestRate).toBeLessThanOrEqual(forecast.observed.highestRate);
    }
  });
});

describe("W223 the width comes from the record, not from a constant", () => {
  it("gives two sessions with the same total and different spreads different answers", () => {
    // The one thing an aggregate cannot do. Both sessions filled 24 of 32 slots across four
    // weeks; one ran steadily and one swung, and a forecast that reported them alike would be
    // describing the average while calling itself a range. (The equality is asserted rather than
    // assumed — the first draft of this fixture used six-slot weeks and the two totals were 20
    // and 18, so the comparison would have been between two different sessions.)
    const steady = ran([0.75, 0.75, 0.75, 0.75], 8);
    const swinging = ran([0.5, 1, 0.5, 1], 8);
    const total = (o: SessionOccurrence[]) => o.reduce((sum, x) => sum + x.slotsFilled, 0);
    expect(total(steady)).toBe(24);
    expect(total(swinging)).toBe(24);

    const a = forecastFill(steady, KEY, 6, PERIOD);
    const b = forecastFill(swinging, KEY, 6, PERIOD);
    expect(a.forecast && b.forecast).toBe(true);
    if (!a.forecast || !b.forecast) return;
    expect(a.range).toEqual({ low: 4, high: 5 });
    expect(b.range).toEqual({ low: 3, high: 6 });
  });

  it("has both tight and wide spreads in the simulated diary, so neither is the only case", () => {
    const spreads = keys
      .map((key) => forecastFill(occurrences, key, 6, PERIOD))
      .filter((f) => f.forecast)
      .map((f) => (f.forecast ? f.observed.highestRate - f.observed.lowestRate : 0));
    expect(Math.min(...spreads)).toBe(0);
    expect(Math.max(...spreads)).toBeGreaterThan(0.2);
  });

  it("rounds outwards, because a range narrowed by rounding claims more than the record holds", () => {
    // Rates 0.5 and 0.9 over 7 slots: 3.5 → 3 and 6.3 → 7.
    const result = forecastFill(ran([0.5, 0.5, 0.9, 0.9], 10), KEY, 7, PERIOD);
    expect(result.forecast).toBe(true);
    if (!result.forecast) return;
    expect(result.range).toEqual({ low: 3, high: 7 });
  });
});

describe("W223 the floor is on recorded weeks, not on recorded slots", () => {
  it("refuses many slots over few weeks, and allows few slots over enough weeks", () => {
    // The discrimination the floor exists for. A test that only checked "small data refuses"
    // would pass with the floor on the denominator, which is the error this rule prevents.
    const oneBigWeek = ran([0.8, 0.8, 0.8], 200);
    const fourSmallWeeks = ran([0.5, 0.5, 1, 1], 2);
    expect(oneBigWeek.reduce((s, o) => s + o.slotsOffered, 0)).toBe(600);
    expect(fourSmallWeeks.reduce((s, o) => s + o.slotsOffered, 0)).toBe(8);

    const thin = forecastFill(oneBigWeek, KEY, 6, PERIOD);
    const enough = forecastFill(fourSmallWeeks, KEY, 6, PERIOD);
    expect(thin.forecast).toBe(false);
    expect(enough.forecast).toBe(true);
    if (thin.forecast || thin.why !== "too_few_recorded_weeks") throw new Error("wrong refusal");
    expect(thin.recordedWeeks).toBe(3);
    expect(thin.weeksNeeded).toBe(MIN_RECORDED_WEEKS.weeks - 3);
  });

  it("moves with the declared floor rather than a number written here", () => {
    const atFloor = forecastFill(ran(Array(MIN_RECORDED_WEEKS.weeks).fill(0.5)), KEY, 6, PERIOD);
    const justBelow = forecastFill(ran(Array(MIN_RECORDED_WEEKS.weeks - 1).fill(0.5)), KEY, 6, PERIOD);
    expect(atFloor.forecast).toBe(true);
    expect(justBelow.forecast).toBe(false);
  });

  it("takes no floor argument, so it cannot be lowered after seeing the answer", () => {
    // @ts-expect-error — W196: a floor passed per call is a floor somebody tunes.
    void forecastFill(ran([0.5]), KEY, 6, PERIOD, { minWeeks: 1 });
    expect(MIN_RECORDED_WEEKS.why.length).toBeGreaterThan(100);
  });

  it("does not count a week that offered nothing as a week that filled nothing", () => {
    // W222's refusal one level down: a cancelled list is not an observation of demand, so it
    // contributes no rate — and four weeks, one of them cancelled, is three weeks of evidence.
    const withACancelledWeek: SessionOccurrence[] = [
      ...ran([1, 1, 1]),
      { clinicianId: KEY.clinicianId, dayIso: "2026-06-09", weekday: KEY.weekday, slotsOffered: 0, slotsFilled: 0 },
    ];
    const result = forecastFill(withACancelledWeek, KEY, 6, PERIOD);
    expect(result.forecast).toBe(false);
    if (result.forecast || result.why !== "too_few_recorded_weeks") throw new Error("wrong refusal");
    expect(result.recordedWeeks).toBe(3);
  });
});

describe("W223 a withheld forecast is not a forecast of zero", () => {
  it("carries W222's verdict and W222's words rather than writing a second sentence", () => {
    const result = forecastFill([], KEY, 6, PERIOD);
    expect(result.forecast).toBe(false);
    if (result.forecast || result.why !== "no_recorded_history") throw new Error("wrong refusal");
    expect(result.carriedFrom).toBe("never_run");
    // Verbatim, not paraphrased: two phrasings of one refusal drift and the drift is invisible.
    expect(result.copy).toContain(NO_HISTORY_COPY.never_run);
  });

  it("says in words that it is not a forecast of nothing filling", () => {
    expect(FORECAST_REFUSAL_COPY.no_recorded_history).toMatch(/not a forecast that nothing will fill/i);
    expect(withheldForecastCopy(forecastFill([], KEY, 6, PERIOD))).toContain("not a forecast");
    expect(withheldForecastCopy(forecastFill(ran([1, 1, 1, 1]), KEY, 6, PERIOD))).toBeNull();
  });

  it("refuses a question with no slots in it rather than answering nought to nought", () => {
    for (const slots of [0, -3, 2.5, Number.NaN]) {
      const result = forecastFill(ran([1, 1, 1, 1]), KEY, slots, PERIOD);
      expect(result.forecast, `slotsToOpen=${slots}`).toBe(false);
      if (result.forecast) continue;
      expect(result.why).toBe("no_slots_to_open");
    }
  });

  it("declares every refusal it can produce, both directions", () => {
    const produced = new Set<string>();
    for (const result of [
      forecastFill([], KEY, 6, PERIOD),
      forecastFill(ran([1]), KEY, 6, PERIOD),
      forecastFill(ran([1, 1, 1, 1]), KEY, 0, PERIOD),
    ]) {
      if (!result.forecast) produced.add(result.why);
    }
    expect([...produced].sort()).toEqual(Object.keys(FORECAST_REFUSAL_COPY).sort());
  });
});

describe("W223 the copy states a range and never advises", () => {
  it("passes the advice linter", () => {
    const forecast = forecastFill(ran([0.5, 1, 0.5, 1]), KEY, 6, PERIOD);
    const texts = [
      ...Object.values(FORECAST_REFUSAL_COPY),
      MIN_RECORDED_WEEKS.why,
      forecast.forecast ? forecast.sentence : "",
    ];
    for (const text of texts) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });

  it("never states the forecast as a single number in the sentence a practice reads", () => {
    for (const key of keys.slice(0, 10)) {
      const forecast = forecastFill(occurrences, key, 6, PERIOD);
      if (!forecast.forecast) continue;
      expect(forecast.sentence).not.toMatch(/\bwill fill\b|\bexpect\b|\blikely\b|\baround \d/i);
      expect(forecast.sentence).toContain("between");
    }
  });
});
