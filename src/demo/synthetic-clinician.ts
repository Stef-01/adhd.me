// W193 (O179): a synthetic clinician template, so a ranking LAW is never pinned to a real person.
//
// FILED UNDER W193 because that unit drew the seam this file completes. W193 split the roster DATA
// out of clinicians.ts so "a roster edit can never touch a ranking line"; this is the same seam from
// the other side — so a ranking TEST can never depend on a roster entry. Both halves exist for one
// reason: a change to who is listed is a factual review, and a change to how they are ordered is an
// engineering one, and the tree keeps discovering what it costs to have them share a file.
//
// WHY THIS FILE EXISTS, AND THE INCIDENT THAT PRODUCED IT. Dr Tushar Yadav left the platform on
// 2026-08-22 and his roster entry was removed. Fifty tests went red — and almost none of them were
// about him. They were the ranking laws: closed books never outrank open ones at equal fit, a
// disclosed founder never wins a tie, staleness orders ties but costs no fit, distance never
// crosses a real score difference. Every one of those built its fixtures as `{ ...yadav(), id:
// "closed", acceptingNewPatients: false }` — a real doctor's record used as a convenient blank.
//
// SO A ROSTER EDIT BROKE THE LAWS OF THE MATCHER, which is exactly backwards. The laws are
// properties of `rankClinicians`; they should hold over ANY roster, and a test that cannot survive
// a colleague leaving was never testing the law — it was testing the law *and* the file. The two
// were tangled, and the tangle stayed invisible for as long as nobody left.
//
// WHAT THIS TEMPLATE DELIBERATELY IS. Neutral in every field the ranker reads: one care area, one
// language, no manner facets, open books with a dated declaration, and — the field that matters
// most for the tie laws — **no `disclosedInterest`**. Both remaining roster members are founders
// with a declared interest, so after Dr Yadav left there was no unconflicted clinician left in the
// tree at all; the founder-behind rule became untestable against the real roster. It is testable
// here because this template has no interest to declare.
//
// WHAT IT MUST NEVER BECOME. This is not a persona and it must never reach the roster, a fixture
// that renders, or any surface. The roster holds real people only (W193, and the header of
// `roster.ts`); this exists so the tests of the ENGINE stop borrowing them. `realPerson` is
// deliberately absent and the name says what it is out loud, so a stray import is obvious in a
// snapshot rather than plausible.

import type { CareArea, Clinician } from "./roster";

/**
 * A neutral clinician for engine tests. Spread it and override only the field under test.
 *
 * The default is intentionally boring: overriding one field is then the ONLY difference between
 * two fixtures, which is what makes `expect(rank(...)).toEqual([...])` a statement about that
 * field rather than about whatever else happened to differ.
 */
export function syntheticClinician(overrides: Partial<Clinician> = {}): Clinician {
  return {
    id: "synthetic-gp",
    name: "Dr Synthetic Example",
    shortName: "Dr Example",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner",
    suburb: "Beecroft",
    reach: "Practice appointments",
    image: null,
    practice: "Synthetic Test Practice",
    booking: { via: "practice", url: "https://example.invalid/book", note: "Synthetic fixture." },
    acceptingNewPatients: true,
    // Dated so the freshness grades (O56) have something to measure. Tests that care about the
    // grade override it; tests that do not get a stable "declared" reading rather than an undated
    // one, which would silently exercise the never-claims-freshness branch instead.
    capacityDeclaredAt: "2026-08-01",
    focus: "Synthetic fixture",
    matchLine: "Synthetic fixture.",
    fitSignals: [],
    practicalSignals: [],
    about: "Synthetic fixture used by engine tests. Not a person.",
    experience: [],
    languages: ["English"],
    careAreas: ["adhd-assessment"] as CareArea[],
    manner: [],
    wheelchairAccessible: true,
    appointmentLength: "Synthetic fixture",
    ...overrides,
  };
}
