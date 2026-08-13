// W173 verify gate (unit half): the dashboard's data states its own denominator and ranks no
// clinician. The e2e half is e2e/outcomes.spec.ts.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import type { ReferralEvent, ReferralEventKind } from "@/referrals/leakage";
import * as mod from "./dashboard";
import {
  DASHBOARD_BASIS,
  REFERRAL_CHAIN,
  describeAsk,
  referralChainOutcomes,
  whatWouldSettleIt,
} from "./dashboard";
import { summarise } from "./model";

const P = "prac-1" as PracticeId;

const ev = (referralId: string, kind: ReferralEventKind, at: string): ReferralEvent => ({
  practiceId: P,
  patientId: "pat-1" as PatientId,
  referralId,
  kind,
  at,
});

const RAIL: ReferralEvent[] = [
  // Went all the way.
  ev("ref-c", "referral_written", "2026-02-01"),
  ev("ref-c", "appointment_recorded", "2026-02-10"),
  ev("ref-c", "completion_recorded", "2026-02-20"),
  // Booked, nothing since.
  ev("ref-b", "referral_written", "2026-02-01"),
  ev("ref-b", "appointment_recorded", "2026-02-11"),
  // Written, nothing since.
  ev("ref-a", "referral_written", "2026-02-02"),
  // Recorded as not proceeding.
  ev("ref-d", "referral_written", "2026-02-03"),
  ev("ref-d", "referral_cancelled", "2026-02-05"),
];

describe("W173 the rail becomes one verdict per referral", () => {
  it("reads reached, stopped and not-recorded off the recorded events", () => {
    const byId = new Map(referralChainOutcomes(RAIL).map((o) => [o.chainId, o]));
    expect(byId.get("ref-c")!.verdict).toBe("reached");
    expect(byId.get("ref-d")!.verdict).toBe("stopped");
    expect(byId.get("ref-a")!.verdict).toBe("not_recorded");
    expect(byId.get("ref-b")!.verdict).toBe("not_recorded");
  });

  it("orders by referral id and by nothing else", () => {
    // Any other order would be a judgement about which referral matters more.
    expect(referralChainOutcomes(RAIL).map((o) => o.chainId)).toEqual([
      "ref-a",
      "ref-b",
      "ref-c",
      "ref-d",
    ]);
    expect(referralChainOutcomes([...RAIL].reverse()).map((o) => o.chainId)).toEqual([
      "ref-a",
      "ref-b",
      "ref-c",
      "ref-d",
    ]);
  });

  it("does not read a cancelled appointment as the chain stopping", () => {
    // W170's verdict is a max over a SET, so it cannot tell "cancelled then rebooked" from
    // "cancelled". Mapping appointment_cancelled to a stop would report a rebooked referral as
    // stopped; leaving it out of the definition means it contributes nothing, which is the
    // honest answer. W93's replay is what answers the sequence question.
    const rebooked = [
      ev("ref-r", "referral_written", "2026-03-01"),
      ev("ref-r", "appointment_recorded", "2026-03-05"),
      ev("ref-r", "appointment_cancelled", "2026-03-06"),
      ev("ref-r", "appointment_recorded", "2026-03-09"),
      ev("ref-r", "completion_recorded", "2026-03-20"),
    ];
    expect(referralChainOutcomes(rebooked)[0]!.verdict).toBe("reached");
    const kinds = REFERRAL_CHAIN.stages.flatMap((s) => [...s.reachedBy, ...(s.stoppedBy ?? [])]);
    expect(kinds).not.toContain("appointment_cancelled");
  });

  it("every verdict short of the end cites what would settle it", () => {
    for (const outcome of referralChainOutcomes(RAIL)) {
      if (outcome.verdict === "not_recorded") expect(outcome.wouldSettleIt.length).toBeGreaterThan(0);
    }
  });

  it("returns nothing for an empty rail rather than inventing a chain", () => {
    expect(referralChainOutcomes([])).toEqual([]);
  });
});

describe("W173 the unsettled pile becomes a list of things to record", () => {
  it("counts chains per ask, most-settling first", () => {
    // ref-a waits on an appointment or a cancellation; ref-b waits on a completion.
    //
    // W181: the cancellation was missing from this assertion while the comment above it named
    // it. `wouldSettleIt` read the NEXT stage's stop kinds instead of the current stage's, so a
    // referral sitting at "written" was never told that recording a cancellation would settle
    // it — and `SETTLEMENT_ASK_COPY.referral_cancelled` was dead copy as a result. Ties are
    // ordered by name, so the third ask sorts last.
    expect(whatWouldSettleIt(referralChainOutcomes(RAIL))).toEqual([
      { kind: "appointment_recorded", chains: 1 },
      { kind: "completion_recorded", chains: 1 },
      { kind: "referral_cancelled", chains: 1 },
    ]);
  });

  it("counts a chain once per kind however many times the kind is listed", () => {
    const outcomes = [
      { chainId: "x", verdict: "not_recorded" as const, furthestStage: null, evidence: [], wouldSettleIt: ["a", "a", "b"] },
    ];
    expect(whatWouldSettleIt(outcomes)).toEqual([
      { kind: "a", chains: 1 },
      { kind: "b", chains: 1 },
    ]);
  });

  it("ties resolve by name, not by the order the chains arrived", () => {
    const mk = (id: string, kinds: string[]) => ({
      chainId: id,
      verdict: "not_recorded" as const,
      furthestStage: null,
      evidence: [],
      wouldSettleIt: kinds,
    });
    const tied = [mk("1", ["zebra"]), mk("2", ["alpha"])];
    expect(whatWouldSettleIt(tied)).toEqual(whatWouldSettleIt([...tied].reverse()));
    expect(whatWouldSettleIt(tied)[0]!.kind).toBe("alpha");
  });

  it("names an unmapped kind instead of rendering a raw code as copy", () => {
    expect(describeAsk("completion_recorded")).toBe("a completion or letter back recorded");
    expect(describeAsk("something_new")).toContain("something_new");
  });
});

describe("W173 it states its own denominator", () => {
  it("says what the population is, not only how much of it is unknown", () => {
    // W170's `basis` answers "how many are unknown". That is a different denominator from
    // "which referrals are on this rail at all", and only the second stops "12 referrals, 9
    // unknown" from being read as "we wrote 12 referrals".
    expect(DASHBOARD_BASIS).toMatch(/not counted as an unknown outcome/);
    expect(DASHBOARD_BASIS).toMatch(/what the record contains/);
  });

  it("carries W170's unknown-count caveat alongside it", () => {
    const summary = summarise(referralChainOutcomes(RAIL), REFERRAL_CHAIN);
    expect(summary).toMatchObject({ reached: 1, stopped: 1, notRecorded: 2, total: 4 });
    expect(summary.reached + summary.stopped + summary.notRecorded).toBe(summary.total);
    expect(summary.basis).toContain("2 of 4");
  });
});

describe("W173 it ranks nobody", () => {
  it("has no export that could group an outcome by a person", () => {
    // Guarantee-as-absence. W83: a per-clinician breakdown "turns a capability graph into a
    // productivity board", and outcomes are a shorter step from there, because the thing being
    // measured is whether somebody at the OTHER end wrote anything down.
    expect(Object.keys(mod).sort()).toEqual([
      "DASHBOARD_BASIS",
      "REFERRAL_CHAIN",
      "SETTLEMENT_ASK_COPY",
      "describeAsk",
      "referralChainOutcomes",
      "whatWouldSettleIt",
    ]);
  });

  it("carries no clinician through to a verdict", () => {
    // The input has a clinician nowhere to begin with, and the output does not acquire one.
    const withPeople = RAIL.map((e) => ({ ...e, clinicianId: "clin-1" }));
    for (const outcome of referralChainOutcomes(withPeople)) {
      expect(JSON.stringify(outcome)).not.toContain("clin-1");
    }
  });

  it("exports no rate, percent or score", () => {
    // W170's rule, for W170's reason: one figure is computed by dividing reached into total,
    // which treats every unknown as a failure — and here the unknowns are most of the rail.
    for (const name of Object.keys(mod)) {
      expect(name, `${name} names a single figure`).not.toMatch(/rate|percent|score|ratio/i);
    }
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
