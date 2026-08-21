// W193 (O162): the BASIS of every field this tree holds about a real, named clinician.
//
// WHY THIS EXISTS, AND WHY IT IS EMBARRASSING THAT IT DID NOT.
//
// `src/directory/disclosure.ts` already does this properly: one entry per publishable field, each
// naming whose claim it is and why disclosing it is justified, checked both directions so a field
// added without an entry fails the build. It is the best piece of compliance machinery in the
// tree — and it governs the PUBLIC DIRECTORY, which is empty behind gate G6 and renders to nobody.
//
// The live surface is `/finder`, which today puts three real named doctors in front of patients.
// It had no such register. The sourcing existed only as prose in roster.ts, which is to say it
// existed only while somebody remembered to read it.
//
// THE COST WAS REAL AND RECENT. O156 published "Dr Saxena has an ownership interest in ADHD.ME" —
// a disclosed field about a named doctor whose basis nobody could state, because there was nowhere
// to state it. It took the founder to catch it (O158). With this register the sentence is not
// writable by accident: `disclosedInterest` is `founder-stated`, so entering one means citing what
// the founder actually said, and there was no such statement to cite.
//
// This does NOT change any value. It records where each already comes from, and refuses to guess
// where it cannot tell.

/** Whose claim a field is, and therefore what a reader may rely on. */
export type FieldBasis =
  /** Verifiable by the reader against a public register or the clinician's own published page. */
  | "checkable"
  /** The clinician told us, or publishes it about themselves. ADHD.ME has not assessed it. */
  | "declared"
  /** Relayed by the founder about a third party. Not checked, and the surfaces say so. */
  | "founder-stated"
  /** Derived by this tree from its own records — not a claim about the person at all. */
  | "derived"
  /** Product plumbing. Says nothing about anybody. */
  | "identifier";

export interface RealPersonField {
  basis: FieldBasis;
  /** Where it comes from, specifically enough to check. */
  source: string;
}

/**
 * One entry per field that may appear on a `realPerson` roster record.
 *
 * Checked BOTH directions by real-person-fields.test.ts: a field present on a real clinician with
 * no entry here fails, and an entry naming a field no real clinician carries fails too. "We know
 * where our claims about named doctors come from" is otherwise a statement about what the author
 * remembered on the day — which is exactly how O158 happened.
 */
export const REAL_PERSON_FIELDS: Readonly<Record<string, RealPersonField>> = {
  id: { basis: "identifier", source: "Internal slug. Not rendered as copy." },
  name: { basis: "checkable", source: "The doctor's own published name (practice page, Ahpra register)." },
  shortName: { basis: "derived", source: "Their surname, shortened by this tree for row copy." },
  gender: { basis: "checkable", source: "Publicly evident from the doctor's own published profile; read only by the woman-GP preference." },
  pronouns: { basis: "checkable", source: "As the doctor publishes them on their own practice profile." },
  title: { basis: "checkable", source: "Qualifications as the doctor publishes them; Ahpra registration is publicly checkable." },
  suburb: { basis: "checkable", source: "The practice's published address." },
  alsoConsultsAt: { basis: "founder-stated", source: "O86, founder-supplied 2026-08-20: 'add Beecroft and Double Bay'. The suburb is the whole of what was supplied." },
  practice: { basis: "checkable", source: "The practice's own published name." },
  reach: { basis: "declared", source: "How the practice describes the appointments it offers." },
  image: { basis: "declared", source: "A portrait supplied by its subject, cropped only. Nothing here generates a face for a real person." },
  acceptingNewPatients: { basis: "declared", source: "The practice's own capacity declaration." },
  capacityDeclaredAt: { basis: "derived", source: "The date the declaration landed in this file, from its git history — not a survey answer nobody ran." },
  focus: { basis: "declared", source: "What the doctor says they see often. Not a competence claim and not an assessment." },
  matchLine: { basis: "declared", source: "Composed from the doctor's own declared focus and manner; no attribute that is not declared elsewhere in the record." },
  fitSignals: { basis: "declared", source: "The doctor's declared care areas, in reader-facing words." },
  practicalSignals: { basis: "declared", source: "Billing and appointment facts as the practice states them." },
  about: { basis: "declared", source: "Written from the doctor's public record. Dr Yadav's is a stated stopgap — his public record plus colleagues' account, not his own words — and roster.ts says so." },
  experience: { basis: "declared", source: "Prior posts and areas the doctor publishes about themselves." },
  languages: { basis: "declared", source: "Languages the doctor declares they consult in; the speech picker is derived from this list, never the reverse." },
  careAreas: { basis: "declared", source: "The doctor's declared care areas, closed vocabulary." },
  careAreasSometimes: { basis: "declared", source: "Areas declared 'sometimes' in the onboarding interview's three-state answer." },
  manner: { basis: "declared", source: "How the doctor says they work — declared in the onboarding interview, never characterised by us." },
  wheelchairAccessible: { basis: "checkable", source: "A physical fact about the rooms, checkable by anybody who visits or asks." },
  appointmentLength: { basis: "declared", source: "The practice's stated appointment length." },
  booking: { basis: "checkable", source: "The practice's own live booking page (Healthengine profile or practice site)." },
  telehealthFirstAppointment: { basis: "declared", source: "Whether the FIRST appointment may be by telehealth, as the practice states." },
  nswAdhdTrained: { basis: "founder-stated", source: "Relayed from the founders. There is no public register of who has completed it, so ADHD.ME cannot confirm it and the surfaces say 'declared, not checked'." },
  realPerson: { basis: "identifier", source: "Marks the entry as describing an identifiable person, so surfaces can treat it accordingly." },
  disclosedInterest: {
    basis: "founder-stated",
    source:
      "The founder's own statement of the relationship. O158 is why this entry is explicit: O156 wrote 'has an ownership interest in ADHD.ME' from an inference, and the founder corrected it — Dr Saxena owns his CLINIC and is ADHD.ME's first clinic partner. Entering a value here means citing what was actually said.",
  },
  disclosedInterestLabel: { basis: "founder-stated", source: "The short form of the same statement, rendered beside the listing." },
};

/*
 * DELIBERATELY ABSENT: `mannerPending`. It is a valid optional field but no real clinician carries
 * one today, and the register describes what is actually held rather than what could be. The
 * both-directions test is what makes that safe: re-adding the field to a real record fails the
 * build until somebody writes its basis here, which is the whole mechanism working forwards.
 */

export const realPersonFieldNames = (): string[] => Object.keys(REAL_PERSON_FIELDS);
