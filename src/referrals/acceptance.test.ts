// W134 verify gate: "no patient-linked obligation exists without a recorded acceptance."
//
// Tested three ways, because each catches something the others do not: exhaustively over every
// reachable state (no state but `accepted` yields an obligation), at compile time (the function
// cannot be called without proof), and over act ORDER (W129's finding — a fold that resolves by
// array position loses exactly this kind of fact).

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import {
  ACCEPTANCE_STATE_COPY,
  acceptanceStatus,
  acceptedReferral,
  ALL_REFERRAL_OBLIGATIONS,
  careHolderWhile,
  obligationsFor,
  type AcceptanceAct,
  type AcceptanceState,
  type AcceptedReferral,
} from "./acceptance";

const FROM = "prac-a" as PracticeId;
const TO = "prac-b" as PracticeId;
const PATIENT = "pat-1" as PatientId;
const REF = "ref-1";

const sent = (at = "2026-02-01"): AcceptanceAct => ({
  kind: "sent", referralId: REF, at, by: "clin-a",
  fromPracticeId: FROM, toPracticeId: TO, patientId: PATIENT,
});
const accepted = (at = "2026-02-03"): AcceptanceAct => ({
  kind: "accepted", referralId: REF, at, by: "clin-b", byPracticeId: TO,
});
const declined = (at = "2026-02-03"): AcceptanceAct => ({
  kind: "declined", referralId: REF, at, by: "clin-b", byPracticeId: TO,
  reason: "Placeholder decline reason — fixture only.",
});
const handedBack = (at = "2026-03-01"): AcceptanceAct => ({
  kind: "handed_back", referralId: REF, at, by: "clin-b", byPracticeId: TO,
  reason: "Placeholder hand-back reason — fixture only.",
});

const status = (acts: AcceptanceAct[]) => acceptanceStatus(acts, REF);

/** Every reachable state, with the acts that reach it. */
const REACHABLE: Record<AcceptanceState, AcceptanceAct[]> = {
  not_sent: [],
  awaiting_acceptance: [sent()],
  accepted: [sent(), accepted()],
  declined: [sent(), declined()],
  handed_back: [sent(), accepted(), handedBack()],
};

describe("W134 no patient-linked obligation without a recorded acceptance", () => {
  it("yields obligations ONLY from the accepted state, checked over every reachable state", () => {
    for (const [state, acts] of Object.entries(REACHABLE) as [AcceptanceState, AcceptanceAct[]][]) {
      const proof = acceptedReferral(status(acts));
      if (state === "accepted") {
        expect(proof, state).not.toBeNull();
        expect(obligationsFor(proof!)).toHaveLength(ALL_REFERRAL_OBLIGATIONS.length);
      } else {
        expect(proof, `${state} produced proof of acceptance`).toBeNull();
      }
    }
  });

  it("cannot be called without proof — a caller's belief is not enough", () => {
    // Every field is a plain literal of the right type, so the ONLY thing wrong with this
    // object is the missing brand (the W65 trap, avoided).
    // @ts-expect-error — AcceptedReferral is branded; knowing its fields is not enough.
    const forged: AcceptedReferral = {
      referralId: REF,
      patientId: PATIENT,
      acceptingPracticeId: TO,
      acceptedBy: "clin-b",
      acceptedAt: "2026-02-03",
    };
    expect(forged).toBeDefined();
  });

  it("has no overload taking a status, a referral id, or anything else", () => {
    // @ts-expect-error — obligationsFor takes AcceptedReferral, not a status.
    void (() => obligationsFor(status([sent(), accepted()])));
    // @ts-expect-error — nor an id.
    void (() => obligationsFor(REF));
    expect(true).toBe(true);
  });

  it("obligations name the RECEIVING practice, since they are the ones who took it on", () => {
    const proof = acceptedReferral(status(REACHABLE.accepted))!;
    for (const obligation of obligationsFor(proof)) {
      expect(obligation.practiceId).toBe(TO);
      expect(obligation.patientId).toBe(PATIENT);
      expect(obligation.since).toBe("2026-02-03");
    }
  });

  it("a hand-back ends the obligation", () => {
    expect(acceptedReferral(status(REACHABLE.handed_back))).toBeNull();
  });
});

describe("W134 silence is not acceptance", () => {
  it("an unanswered referral stays awaiting_acceptance however old it is", () => {
    // Deliberately no timeout and no 'assumed accepted after N days'. Uncomfortable and
    // correct — the discomfort is the signal, and W93's leakage report is where it shows up.
    const ancient = status([sent("2020-01-01")]);
    expect(ancient.state).toBe("awaiting_acceptance");
    expect(acceptedReferral(ancient)).toBeNull();
  });

  it("says plainly that the other practice is not looking after the patient yet", () => {
    expect(ACCEPTANCE_STATE_COPY.awaiting_acceptance).toContain("not looking after this patient yet");
  });

  it("declining is an ACT, distinct from never answering", () => {
    // W125's distinction between `refused` and `not_recorded`: opposite instructions to the
    // referring practice.
    expect(status([sent()]).state).toBe("awaiting_acceptance");
    expect(status([sent(), declined()]).state).toBe("declined");
    expect(status([sent(), declined()]).endedReason).toContain("Placeholder decline reason");
  });
});

describe("W134 sending is not transferring", () => {
  it("leaves care with the referring practice at every state but accepted", () => {
    // There is no state in which the answer is "nobody", and none in which it is the receiving
    // practice alone before they accepted. That blur is what this unit exists to prevent.
    for (const [state, acts] of Object.entries(REACHABLE) as [AcceptanceState, AcceptanceAct[]][]) {
      const holder = careHolderWhile(status(acts));
      if (state === "accepted") expect(holder).toBe("both_practices");
      else expect(holder, state).toBe("referring_practice");
    }
  });

  it("never answers 'receiving practice alone'", () => {
    for (const acts of Object.values(REACHABLE)) {
      expect(careHolderWhile(status(acts))).not.toBe("receiving_practice");
    }
  });

  it("has copy for every state, and none of it leaves the patient unwatched", () => {
    for (const state of Object.keys(REACHABLE) as AcceptanceState[]) {
      const copy = ACCEPTANCE_STATE_COPY[state];
      expect(copy.length, state).toBeGreaterThan(20);
      expect(copy.toLowerCase(), state).toMatch(/practice/);
    }
  });
});

describe("W134 the fold does not depend on act order", () => {
  // W129's finding, applied before it could happen again: a consent withdrawal was lost to
  // array order, and an acceptance is the same shape of fact.
  it("resolves the same however the acts are ordered", () => {
    const acts = [sent(), accepted(), handedBack()];
    const shuffles = [
      acts,
      [...acts].reverse(),
      [acts[1]!, acts[2]!, acts[0]!],
      [acts[2]!, acts[0]!, acts[1]!],
    ];
    const answers = shuffles.map((s) => status(s).state);
    expect(new Set(answers).size, `orders disagreed: ${answers.join(", ")}`).toBe(1);
    expect(answers[0]).toBe("handed_back");
  });

  it("takes the LATEST act by date, not the last in the array", () => {
    // Accepting after a decline is a fresh transfer, not a correction — but it is still an
    // explicit act, which is all this unit insists on.
    const outOfOrder = [accepted("2026-02-10"), sent("2026-02-01"), declined("2026-02-03")];
    expect(status(outOfOrder).state).toBe("accepted");
    expect(status([...outOfOrder].reverse()).state).toBe("accepted");
  });

  it("ignores acts belonging to another referral", () => {
    const other: AcceptanceAct = { ...accepted(), referralId: "ref-other" };
    expect(status([sent(), other]).state).toBe("awaiting_acceptance");
    expect(acceptedReferral(status([sent(), other]))).toBeNull();
  });
});

describe("W134 an obligation here is never a clinical one", () => {
  it("is a closed vocabulary about what the SOFTWARE does", () => {
    // The word "obligation" invites the other reading, which is why this is checked rather
    // than assumed (W114/W121's rule).
    expect([...ALL_REFERRAL_OBLIGATIONS].sort()).toEqual([
      "appears_on_receiving_worklist",
      "return_report_outstanding",
    ]);
    for (const obligation of ALL_REFERRAL_OBLIGATIONS) {
      expect(obligation).not.toMatch(/treat|assess|diagnos|prescrib|review_patient|must_see|urgent/i);
    }
  });
});

describe("W142 two acts on the same day cannot resolve by array order", () => {
  // The finding: sorting by date alone is stable, so same-day acts resolved by array position —
  // accept-then-decline gave `declined`, decline-then-accept gave `accepted`. W134's own commit
  // claimed order-independence and tested four orderings, ALL with distinct dates. The claim was
  // wider than the test, and a practice answering then correcting the same morning is ordinary.
  const sameDayAccept = accepted("2026-02-05");
  const sameDayDecline = declined("2026-02-05");

  it.each([
    ["accept then decline", [sent(), sameDayAccept, sameDayDecline]],
    ["decline then accept", [sent(), sameDayDecline, sameDayAccept]],
  ])("resolves to declined with %s", (_label, acts) => {
    // Day-granular dates cannot order two events within a day, so the tie-break is by SAFETY:
    // among same-day acts the one leaving the referring practice watching wins. Not knowing
    // whether a practice took the patient on must never resolve to "they did".
    expect(status(acts as AcceptanceAct[]).state).toBe("declined");
  });

  it("yields no obligation on a same-day conflict, in either order", () => {
    for (const acts of [
      [sent(), sameDayAccept, sameDayDecline],
      [sent(), sameDayDecline, sameDayAccept],
    ]) {
      expect(acceptedReferral(status(acts as AcceptanceAct[]))).toBeNull();
    }
  });

  it("leaves care with the referring practice on a same-day conflict", () => {
    expect(careHolderWhile(status([sent(), sameDayAccept, sameDayDecline]))).toBe(
      "referring_practice",
    );
  });

  it("still lets a LATER acceptance win over an earlier decline", () => {
    // The tie-break is for same-day acts only; a genuine change of mind on a later date is a
    // fresh transfer and must still work.
    expect(status([sent(), declined("2026-02-05"), accepted("2026-02-09")]).state).toBe("accepted");
  });
});
