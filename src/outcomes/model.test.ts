// W170 verify gate: "every outcome traces to recorded events; nothing is concluded from silence
// (W120's three-valued rule inherited)."
//
// The second clause is the one with teeth, and it is tested in two directions: silence must not
// become a failure, and `not_recorded` must not be quietly folded into `stopped` downstream. The
// first is a property of one verdict; the second is a property of the AGGREGATE, and it is where
// the harm would actually land — a dashboard reading "62% did not go anywhere" that is really
// "38% recorded as complete, 62% unknown".

import { describe, expect, it } from "vitest";
import * as outcomes from "./model";
import {
  OUTCOME_VERDICT_COPY,
  outcomeOf,
  summarise,
  type ChainDefinition,
  type RecordedEvent,
} from "./model";

/** A referral chain, expressed in W93's event kinds without re-implementing its state machine. */
const REFERRAL: ChainDefinition = {
  name: "GP-to-GP referral",
  stages: [
    { stage: "written", reachedBy: ["referral_written"], stoppedBy: ["referral_cancelled"] },
    { stage: "seen", reachedBy: ["appointment_recorded"], stoppedBy: ["appointment_cancelled"] },
    { stage: "completed", reachedBy: ["completion_recorded"] },
  ],
};

const at = (kind: string, when = "2026-03-01", chainId = "ref-1"): RecordedEvent => ({
  chainId,
  kind,
  at: when,
});

describe("W170 silence is not a conclusion", () => {
  it("returns not_recorded when nothing has been written down at all", () => {
    const outcome = outcomeOf("ref-1", [], REFERRAL);
    expect(outcome.verdict).toBe("not_recorded");
    expect(outcome.furthestStage).toBeNull();
    expect(outcome.evidence).toEqual([]);
  });

  it("returns not_recorded — never stopped — when the chain simply goes quiet", () => {
    // The case this module exists for. A referral written and then nothing: it may have been
    // completed with nobody recording it. Calling that a failure measures the record-keeping.
    const outcome = outcomeOf("ref-1", [at("referral_written")], REFERRAL);
    expect(outcome.verdict).toBe("not_recorded");
    expect(outcome.verdict).not.toBe("stopped");
    expect(outcome.furthestStage).toBe("written");
  });

  it("says what would settle it, so silence becomes a list of things to record", () => {
    // W181 CORRECTED THIS EXPECTATION, WHICH PINNED A DEFECT. It previously asked for
    // `appointment_cancelled` — a stop declared on the stage AFTER this one, for an appointment
    // that has not been recorded — while omitting `referral_cancelled`, the way a referral
    // sitting at "written" actually stops. The assertion had been written to match the code.
    const outcome = outcomeOf("ref-1", [at("referral_written")], REFERRAL);
    expect(outcome.wouldSettleIt).toEqual(["appointment_recorded", "referral_cancelled"]);
  });

  it("says in words that a silent record is not a failure", () => {
    expect(OUTCOME_VERDICT_COPY.not_recorded).toContain("not a failure");
    expect(OUTCOME_VERDICT_COPY.not_recorded).toContain("statement about the record");
  });
});

describe("W170 both other verdicts are positive statements", () => {
  it("reaches the end only when an event evidences the final stage", () => {
    const outcome = outcomeOf(
      "ref-1",
      [at("referral_written"), at("appointment_recorded"), at("completion_recorded")],
      REFERRAL,
    );
    expect(outcome.verdict).toBe("reached");
    expect(outcome.furthestStage).toBe("completed");
  });

  it("stops only when an event RECORDS a stop", () => {
    const outcome = outcomeOf("ref-1", [at("referral_written"), at("appointment_cancelled")], REFERRAL);
    expect(outcome.verdict).toBe("stopped");
    expect(outcome.evidence.map((e) => e.kind)).toContain("appointment_cancelled");
  });

  it("does not let a stop recorded after completion undo a completed chain", () => {
    // A cancellation dated after a demonstrated completion is a record to go and look at, not a
    // reason to call the chain stopped — and quietly reclassifying it would hide the anomaly.
    const outcome = outcomeOf(
      "ref-1",
      [at("referral_written"), at("appointment_recorded"), at("completion_recorded"), at("appointment_cancelled")],
      REFERRAL,
    );
    expect(outcome.verdict).toBe("reached");
  });
});

describe("W170 every verdict traces to recorded events", () => {
  it("cites the events a reached verdict rests on", () => {
    const outcome = outcomeOf("ref-1", [at("referral_written"), at("completion_recorded")], REFERRAL);
    expect(outcome.evidence.map((e) => e.kind).sort()).toEqual([
      "completion_recorded",
      "referral_written",
    ]);
  });

  it("never returns reached or stopped with nothing cited", () => {
    // Structural: a verdict that cannot name an event is not one this module can produce.
    for (const events of [
      [at("referral_written"), at("appointment_recorded"), at("completion_recorded")],
      [at("referral_written"), at("referral_cancelled")],
      [],
      [at("referral_written")],
    ]) {
      const outcome = outcomeOf("ref-1", events, REFERRAL);
      if (outcome.verdict !== "not_recorded") expect(outcome.evidence.length).toBeGreaterThan(0);
    }
  });

  it("ignores an event kind the chain does not mention rather than guessing at it", () => {
    const outcome = outcomeOf("ref-1", [at("referral_written"), at("something_else")], REFERRAL);
    expect(outcome.verdict).toBe("not_recorded");
    expect(outcome.evidence.map((e) => e.kind)).toEqual(["referral_written"]);
  });

  it("reads only this chain's events", () => {
    const outcome = outcomeOf(
      "ref-1",
      [at("referral_written"), at("completion_recorded", "2026-03-02", "ref-2")],
      REFERRAL,
    );
    expect(outcome.verdict).toBe("not_recorded");
  });
});

describe("W170 the verdict cannot depend on the order events arrive in", () => {
  // W167's register and W168's finding: the furthest stage is a max over the SET, so there is no
  // sort and no tie. Asserted rather than assumed, including for two events at one instant.
  const events = [
    at("referral_written", "2026-03-01"),
    at("appointment_recorded", "2026-03-01"),
    at("completion_recorded", "2026-03-01"),
  ];

  it("is the same forwards and backwards, with every event sharing a timestamp", () => {
    const forwards = outcomeOf("ref-1", events, REFERRAL);
    const backwards = outcomeOf("ref-1", [...events].reverse(), REFERRAL);
    expect(backwards.verdict).toBe(forwards.verdict);
    expect(backwards.furthestStage).toBe(forwards.furthestStage);
  });

  it("resolves a same-instant stop and completion the same way in either order", () => {
    const pair = [at("referral_written"), at("appointment_cancelled"), at("completion_recorded")];
    const a = outcomeOf("ref-1", pair, REFERRAL);
    const b = outcomeOf("ref-1", [...pair].reverse(), REFERRAL);
    expect(a.verdict).toBe(b.verdict);
  });
});

describe("W170 the aggregate keeps the third answer separate", () => {
  const chain = (id: string, kinds: string[]) =>
    outcomeOf(id, kinds.map((k) => at(k, "2026-03-01", id)), REFERRAL);

  const ALL = [
    chain("a", ["referral_written", "appointment_recorded", "completion_recorded"]),
    chain("b", ["referral_written", "referral_cancelled"]),
    chain("c", ["referral_written"]),
    chain("d", []),
  ];

  it("counts three buckets that sum to the total", () => {
    const summary = summarise(ALL, REFERRAL);
    expect(summary).toMatchObject({ reached: 1, stopped: 1, notRecorded: 2, total: 4 });
    expect(summary.reached + summary.stopped + summary.notRecorded).toBe(summary.total);
  });

  it("states the denominator caveat when anything is unknown", () => {
    // The specific misreading is expensive — "62% did not go anywhere" that is really "62%
    // unknown" — so the summary says it rather than leaving it to a footnote.
    const summary = summarise(ALL, REFERRAL);
    expect(summary.basis).toContain("not the same as not having happened");
    expect(summary.basis).toContain("2 of 4");
  });

  it("says the opposite plainly when nothing is unknown", () => {
    const settled = [ALL[0]!, ALL[1]!];
    expect(summarise(settled, REFERRAL).basis).toContain("something recorded either way");
  });

  it("exports no way to collapse the third answer into a failure rate", () => {
    // A single "success rate" is exactly the number somebody would compute by dividing reached
    // into total, which silently treats every unknown as a failure.
    for (const name of Object.keys(outcomes)) {
      expect(name, `"${name}" reads as a collapsed rate`).not.toMatch(
        /rate|percent|score|failureCount|successRate/i,
      );
    }
  });
});

describe("W170 this is not a quality measure", () => {
  it("exports nothing that assesses, scores or judges", () => {
    // W15 owns the clinician's own judgement of whether a visit was useful. Blurring the two
    // would present records completeness as clinical quality — the most flattering error
    // available and the hardest to notice.
    for (const name of Object.keys(outcomes)) {
      expect(name, `"${name}" reads as a quality judgement`).not.toMatch(
        /quality|useful|benefit|effective|improve|good|assess/i,
      );
    }
  });

  it("has no field for a narrative or an opinion on any outcome", () => {
    const outcome = outcomeOf("ref-1", [at("referral_written")], REFERRAL);
    expect(Object.keys(outcome).sort()).toEqual([
      "chainId",
      "evidence",
      "furthestStage",
      "verdict",
      "wouldSettleIt",
    ]);
    for (const key of Object.keys(outcome)) {
      expect(key).not.toMatch(/narrative|note|comment|quality|score|rating/i);
    }
  });
});

describe("W181 hardening findings", () => {
  it("asks for the stop this stage owns, not the next stage's", () => {
    // A referral that has only been written can settle two ways: an appointment is recorded, or
    // it is cancelled. `stoppedBy` is declared on the stage it applies to, so reading the NEXT
    // stage's stop kinds asked for one that stage does not have — and dropped the cancellation.
    const outcome = outcomeOf(
      "ref-a",
      [at("referral_written", "2026-03-01", "ref-a")],
      REFERRAL,
    );
    expect(outcome.verdict).toBe("not_recorded");
    expect(outcome.wouldSettleIt).toContain("appointment_recorded");
    expect(outcome.wouldSettleIt).toContain("referral_cancelled");
  });

  it("refuses a chain with no stages rather than calling it reached", () => {
    // Both indices are -1, so the equality that means "at the final stage" was satisfied by a
    // definition with no stages — returning `reached` with no evidence at all.
    expect(() => outcomeOf("x", [], { name: "Empty", stages: [] })).toThrow(/no stages/);
  });
});
