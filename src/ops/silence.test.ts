// W179 verify gate: "a dead feed and a quiet week render as DIFFERENT states, because they lead
// an operator to opposite actions (W127's lesson, applied to live data)."
//
// The headline test is the one asserting the two states differ. The rest exist because "they
// differ" is easy to satisfy accidentally and easy to lose silently — so the evidence space is
// swept exhaustively rather than sampled, and the copy is checked for the collapse that would
// make two causes render the same sentence.

import { describe, expect, it } from "vitest";
import {
  CAUSE_ORDER,
  SILENCE_COPY,
  type FeedEvidence,
  type SilenceCause,
  explainSilence,
  readCount,
} from "./silence";
import type { PmsHealth } from "@/pms/resilience";
import { lintCopyBundle } from "@/compliance/landing";
import { lintPartyToCare } from "@/compliance/party-to-care";

const WELL: FeedEvidence = {
  lastSuccessfulReadAt: "2026-03-05T09:00:00Z",
  health: "ok",
  usableForSending: true,
  recordsArrived: 40,
};

/** Every shape the evidence can take, so nothing here is argued from a chosen example. */
const EVERY_EVIDENCE: FeedEvidence[] = [];
for (const lastSuccessfulReadAt of [null, "2026-03-05T09:00:00Z"]) {
  for (const health of ["ok", "degraded", "unavailable"] as PmsHealth[]) {
    for (const usableForSending of [true, false]) {
      for (const recordsArrived of [0, 40]) {
        EVERY_EVIDENCE.push({ lastSuccessfulReadAt, health, usableForSending, recordsArrived });
      }
    }
  }
}

describe("W179 a dead feed and a quiet week are different states", () => {
  it("gives them different causes, which is the gate", () => {
    const quiet = explainSilence(WELL, false);
    const dead = explainSilence({ ...WELL, health: "unavailable" }, false);
    expect(quiet).toEqual(["nothing_eligible"]);
    expect(dead).not.toEqual(quiet);
    expect(dead).toContain("feed_down");
    expect(dead).not.toContain("nothing_eligible");
  });

  it("sends the operator to opposite actions, which is why it matters", () => {
    // The count is identical in both. The ACTION is the thing that must not be.
    expect(SILENCE_COPY.nothing_eligible.action).toContain("No action needed");
    expect(SILENCE_COPY.feed_down.action).toContain("Check the connection");
    expect(SILENCE_COPY.feed_down.action).not.toContain("No action needed");
  });
});

describe("W179 the reassuring reading has to be earned", () => {
  it("is unreachable without health, freshness and delivery — all three, every combination", () => {
    // The load-bearing rule, swept rather than sampled: `nothing_eligible` says "all is well, do
    // nothing", and it is the one answer that must never be a fallback.
    for (const evidence of EVERY_EVIDENCE) {
      const causes = explainSilence(evidence, false);
      if (!causes.includes("nothing_eligible")) continue;
      expect(evidence.lastSuccessfulReadAt, JSON.stringify(evidence)).not.toBeNull();
      expect(evidence.health, JSON.stringify(evidence)).toBe("ok");
      expect(evidence.usableForSending, JSON.stringify(evidence)).toBe(true);
      expect(evidence.recordsArrived, JSON.stringify(evidence)).toBeGreaterThan(0);
    }
  });

  it("is never reached with no evidence at all", () => {
    // Absence of an observation is not a quiet week. W120's rule, at the surface an operator
    // is most likely to read as reassurance.
    for (const halted of [true, false]) {
      const causes = explainSilence(null, halted);
      expect(causes).toContain("cannot_determine");
      expect(causes).not.toContain("nothing_eligible");
      expect(causes).not.toContain("nothing_arrived");
    }
  });

  it("distinguishes a healthy feed that delivered nothing from one that delivered non-matches", () => {
    // Both are "no problem", but they answer different questions: an empty book versus rules
    // that matched nobody. Only the second is a reason to look at the rules.
    expect(explainSilence({ ...WELL, recordsArrived: 0 }, false)).toEqual(["nothing_arrived"]);
    expect(explainSilence(WELL, false)).toEqual(["nothing_eligible"]);
    expect(SILENCE_COPY.nothing_arrived.headline).not.toBe(SILENCE_COPY.nothing_eligible.headline);
  });

  it("never leaves a zero unexplained, in any evidence shape", () => {
    for (const evidence of [...EVERY_EVIDENCE, null]) {
      for (const halted of [true, false]) {
        expect(explainSilence(evidence, halted).length, JSON.stringify(evidence)).toBeGreaterThan(0);
      }
    }
  });
});

describe("W179 causes are a set, not a winner", () => {
  it("reports a halt AND a dead feed, so fixing one does not look like fixing it", () => {
    // The worst outcome available here is an operator who releases the switch, sees the zero
    // persist, and concludes the product is broken.
    const causes = explainSilence({ ...WELL, health: "unavailable" }, true);
    expect(causes).toContain("held_by_switch");
    expect(causes).toContain("feed_down");
  });

  it("reports a halt even when nothing is known about the feed", () => {
    // The switch is OUR state. It is the one cause never in doubt, so it survives not knowing.
    expect(explainSilence(null, true)).toEqual(["cannot_determine", "held_by_switch"]);
  });

  it("names a never-connected practice separately from an outage", () => {
    // Never-delivered points at onboarding; not-lately points at an integration partner.
    const causes = explainSilence(
      { lastSuccessfulReadAt: null, health: "unavailable", usableForSending: false, recordsArrived: 0 },
      false,
    );
    expect(causes).toContain("never_connected");
    expect(SILENCE_COPY.never_connected.action).not.toBe(SILENCE_COPY.feed_down.action);
  });

  it("orders causes by the declared order, not by the order the checks happen to run", () => {
    const causes = explainSilence(
      { lastSuccessfulReadAt: null, health: "degraded", usableForSending: false, recordsArrived: 0 },
      true,
    );
    const positions = causes.map((c) => CAUSE_ORDER.indexOf(c));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(causes).toEqual(["never_connected", "feed_down", "feed_stale", "held_by_switch"]);
  });
});

describe("W179 a zero cannot be rendered without its cause", () => {
  it("models the zero as a different shape from a count, so the type carries the rule", () => {
    const some = readCount(3, null, false);
    expect(some).toEqual({ kind: "some", count: 3 });
    const none = readCount(0, WELL, false);
    expect(none.kind).toBe("none");
    if (none.kind === "none") expect(none.causes).toEqual(["nothing_eligible"]);
    // @ts-expect-error — a `some` reading has no causes to read, so a caller cannot forget them.
    void (() => readCount(3, null, false).causes);
  });

  it("explains the zero even when the feed is well, rather than falling through", () => {
    const reading = readCount(0, { ...WELL, recordsArrived: 0 }, false);
    expect(reading).toEqual({ kind: "none", causes: ["nothing_arrived"] });
  });
});

describe("W179 the copy keeps the states distinguishable", () => {
  const causes = Object.keys(SILENCE_COPY) as SilenceCause[];

  it("declares copy for every cause, and nothing else", () => {
    // `Record<SilenceCause, …>` makes the build fail on a missing entry; this catches the
    // opposite — a cause removed from the union leaving orphaned copy behind.
    expect([...causes].sort()).toEqual([...CAUSE_ORDER].sort());
  });

  it("says something different for every cause, in all three fields", () => {
    // Two causes sharing a sentence is how a distinction dies quietly: the union still has both
    // members, the switch is still exhaustive, and the page renders one state.
    for (const field of ["headline", "detail", "action"] as const) {
      const values = causes.map((c) => SILENCE_COPY[c][field]);
      expect(new Set(values).size, `two causes share a ${field}`).toBe(values.length);
      for (const value of values) expect(value.length).toBeGreaterThan(20);
    }
  });

  it("passes the tree's own copy linters, applied rather than re-implemented", () => {
    // W23's linter and W54's party-to-care rules, not a third regex written here. A local
    // pattern would drift from the real rules and pass copy the product would reject
    // elsewhere — and it did: an earlier draft said "Treat this as unknown", which the real
    // no-clinical-claims rule catches on the bare verb and a hand-rolled check did not.
    expect(lintCopyBundle(SILENCE_COPY)).toEqual([]);
    for (const cause of causes) {
      const text = Object.values(SILENCE_COPY[cause]).join(" ");
      expect(lintPartyToCare(text), `${cause} implies Meherr is party to care`).toEqual([]);
    }
  });

  it("passes no judgement on the practice", () => {
    // "Nothing was eligible" is a fact about the rules, never a verdict on anybody's care.
    // Not in the shared linters because it is this surface's risk: an ops page reporting a
    // zero is one adjective away from reading as a performance score (W83's line).
    // Aimed at the PRACTICE, not at the feed: "reads are failing" is a fact about an
    // integration and has to stay sayable, while "this practice is failing" is a score.
    const all = causes.flatMap((c) => Object.values(SILENCE_COPY[c])).join(" ");
    expect(all).not.toMatch(
      /\b(?:your|this)\s+practice\s+(?:is\s+)?(?:under|poor|fail|lagg?|behind|worse)/i,
    );
    expect(all).not.toMatch(/\b(?:underperform\w*|should have|compared with other|than average)\b/i);
  });
});
