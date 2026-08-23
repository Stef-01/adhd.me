// W210 (M4): the contradiction register — invariants that must hold NOW, checked continuously.
//
// WHY THIS EXISTS, AND THE INCIDENT THAT PROVED IT NECESSARY. Q-M item 4 asked for "a load-time
// pass asserting the invariants this quarter establishes, including the one F3 broke silently".
// Between the plan being written and this being built, a second one broke silently — and it was
// worse. A commit titled "feat: strengthen matching and simplify clinician profiles" (one line, no
// reasoning) removed `disclosedInterest` from both real GPs, deleted the component that rendered
// it, and deleted the unit test that required it. The suite stayed green because the test that
// would have failed had been removed in the same change. Two real doctors with a commercial
// interest in the directory that lists them, and no disclosure anywhere on the product.
//
// **THE GAP THAT LET IT THROUGH IS STRUCTURAL, NOT A MISSING TEST.** Every guard this tree had for
// that property lived beside the thing it guarded: the assertion was in `clinicians.test.ts`, next
// to the data, so deleting the feature and its test was one coherent-looking edit. A guard that can
// be removed by the same hand, in the same commit, as the thing it guards is not a guard.
//
// SO THE REGISTER IS DELIBERATELY SOMEWHERE ELSE, AND IT IS A LIST BEFORE IT IS A CHECK. Each entry
// names a property the product must have, in prose, independently of any module that implements it.
// Removing the implementation does not remove the entry; it turns the entry red. Deleting an entry
// is its own visible act, in a file whose only purpose is to hold them, rather than a side effect
// of simplifying something else.
//
// HOW THIS DIFFERS FROM `latent-findings.ts`, since the two are neighbours and easily confused.
// A LATENT FINDING is a problem that is not live yet and carries the condition that would make it
// live — the register is kept EMPTY of fired rows. A CONTRADICTION is a property that must hold
// today; the register is kept empty of BROKEN rows. Latent findings look forward, contradictions
// look at now. A contradiction that cannot be fixed yet is `accepted` with a reason and a trigger,
// and the accepted COUNT is pinned so acceptance cannot become the resting state.

import { clinicians, unheldDisplayClaims } from "@/demo/clinicians";

export type Contradiction = {
  id: string;
  /** The property, stated so a reader can check it against the product without reading the code. */
  invariant: string;
  /** True when the property HOLDS. A false return is the contradiction. */
  holds: () => boolean;
  /**
   * `required` — must hold; a false return fails the build.
   * `accepted` — known broken, with the reason and what would fix it. Counted and pinned.
   */
  disposition: { kind: "required" } | { kind: "accepted"; why: string; trigger: string };
};

export const CONTRADICTIONS: readonly Contradiction[] = [
  {
    id: "DISCLOSE-1",
    invariant:
      "Every clinician who has a material interest in ADHD.ME states it on their own listing, in a sentence that names ADHD.ME and says why it is being disclosed. A directory that ranks people cannot stay silent about the ones connected to it, and the reader cannot see the ranking that put them there.",
    holds: () =>
      clinicians
        .filter((clinician) => clinician.disclosedInterest !== undefined)
        .every(
          (clinician) =>
            /ADHD\.ME/.test(clinician.disclosedInterest!) &&
            /Disclosed because/i.test(clinician.disclosedInterest!) &&
            Boolean(clinician.disclosedInterestLabel),
        ),
    disposition: { kind: "required" },
  },
  {
    id: "DISCLOSE-2",
    invariant:
      "The two clinicians known to have a declared interest — Dr Anubhav Saxena and Dr Anusha Saxena — still carry one. Stated as a NAMED expectation rather than as a count, because a count is satisfied by an empty roster and this is the exact property that was removed silently: the guard has to know who it is watching.",
    holds: () => {
      const expected = ["anubhav-saxena", "anusha-saxena"];
      return expected.every((id) => {
        const listed = clinicians.find((clinician) => clinician.id === id);
        // A clinician who has LEFT is not a contradiction — Dr Yadav did (O179). One who is still
        // listed without their disclosure is.
        return listed === undefined || listed.disclosedInterest !== undefined;
      });
    },
    disposition: { kind: "required" },
  },
  {
    id: "DISCLOSE-3",
    invariant:
      "No disclosure uses the word 'founder'. O156 was founder-directed — remove the word from the whole site — and O158 answered it by REWORDING the disclosure rather than deleting it. Both halves are the rule: the word stays gone, and the disclosure stays.",
    holds: () =>
      clinicians.every(
        (clinician) =>
          !/founder|co-?found/i.test(`${clinician.disclosedInterest ?? ""} ${clinician.disclosedInterestLabel ?? ""}`),
      ),
    disposition: { kind: "required" },
  },
  {
    id: "DISPLAY-1",
    invariant:
      "No clinician's free-text field asserts a claim the matcher does not hold (F6). A page that promises a longer first appointment while the ranker grades that request `unserved` is telling a reader something the product cannot act on.",
    holds: () => clinicians.every((clinician) => unheldDisplayClaims(clinician).length === 0),
    disposition: { kind: "required" },
  },
  {
    id: "CONFLICT-1",
    invariant:
      "At least one listed clinician has NO declared interest, so the tie-break that spends ties against the house has something to spend them on (W221).",
    holds: () => clinicians.some((clinician) => clinician.disclosedInterest === undefined),
    disposition: {
      kind: "accepted",
      why:
        "FALSE TODAY AND KNOWN. Both listed clinicians are disclosed, so W221's comparator returns 0 for every pair and cannot protect anybody — O182 finding F3. The floor O182 shipped is a request-seeded hash so file order no longer decides, but that is a floor, not the property. Accepted rather than fixed because every real fix is a founder decision (G-A1: does commercial interest belong in the ranking at all, given that penalising a voluntary disclosure taxes disclosure?) or a recruitment outcome.",
      trigger: "The first listed clinician without a declared interest. On that day this becomes `required`.",
    },
  },
];

/** Contradictions that are live: required properties that do not hold. Kept empty. */
export function broken(register: readonly Contradiction[] = CONTRADICTIONS): Contradiction[] {
  return register.filter((entry) => entry.disposition.kind === "required" && !entry.holds());
}

/**
 * Accepted entries that have started HOLDING — the other direction, and the one an acceptance list
 * always forgets. An acceptance that has quietly become true is a stale excuse; it must be promoted
 * to `required` deliberately, or the register slowly fills with reasons nobody rechecks.
 */
export function resolvedAcceptances(register: readonly Contradiction[] = CONTRADICTIONS): Contradiction[] {
  return register.filter((entry) => entry.disposition.kind === "accepted" && entry.holds());
}

/** Pinned so acceptance cannot become the resting state. Falls only by a deliberate edit. */
export const ACCEPTED_AT_M4 = 1;
