// W233 (O57): the applications view — what a reviewer reads about an application, derived
// from the stored row by pure functions so every sentence the console renders is testable
// WITHOUT a staff grant existing.
//
// WHY A PRESENTER MODULE AT ALL. The ADHD.ME staff list (W105) ships empty by founder design,
// so the granted view of `/console/applications` cannot be walked end-to-end today — nobody
// can sign in as staff. If the sentences lived inline in the page, the page's whole promise
// (the mix renders as STATED PREFERENCE, the Ahpra number renders as UNCHECKED SHAPE, a
// declaration renders AS a declaration) would ship unverified until the first grant. Here
// they are functions of the row, pinned by unit tests, and the page maps over the result.
//
// EVERY SENTENCE REPORTS; NONE VOUCHES. The W193 rule that governs the roster governs its
// applicants harder: an application is entirely "the clinician told us" — including the
// registration number, which is checkable in principle and unchecked at this moment. So the
// fragments here say "says they", "asked for", "gave" — never "is", "has", "qualified".
//
// THE MIX IS THE DEBT THIS CLOSES. `desiredMixPercent` is stored only when the GP actually
// moved the hero's control (O26); this module renders it only when the row carries it, and
// only as what it is — a stated preference about their own week, feeding the Q3 reciprocity
// work. It is not a promise of referral volume (the product has none to make), not a ranking
// input today, and never a directory field.

import type { ClinicianApplication } from "./types";
import { CARE_AREA_LABELS } from "./types";
import { EI_QUALITIES } from "@/demo/emotional-fit";

const CARE_LABELS = new Map(CARE_AREA_LABELS.map((area) => [area.id, area.label]));

/** One application, said in the reviewer's register. Strings only — the page adds no words. */
export interface ApplicationView {
  id: string;
  /** Verbatim applicant text (already spreadsheet-neutralised at the writer). The page must
   *  render it under the W153 public_form attribution, as the interest register does. */
  fullName: string;
  email: string;
  practiceLine: string;
  /** The number plus what it is NOT: shape-checked only, unverified on the register. */
  ahpraLine: string;
  careAreaLabels: string[];
  mannerLabels: string[];
  languages: string[];
  trainingLine: string;
  booksLine: string;
  /** Present only when the row carries a mix — a GP who never touched the control said
   *  nothing, and this line must not exist for them. */
  mixLine: string | null;
  submittedOn: string;
}

/** The stated-preference sentence, alone, so its two halves can be pinned by name. */
export function mixLine(application: ClinicianApplication): string | null {
  if (application.desiredMixPercent === undefined) return null;
  return `Asked for about ${application.desiredMixPercent}% of their week to be this work — their stated preference, recorded as stated; not a referral promise in either direction.`;
}

export function applicationView(application: ClinicianApplication): ApplicationView {
  return {
    id: application.id,
    fullName: application.fullName,
    email: application.email,
    practiceLine: `${application.practiceName}, ${application.practiceSuburb}`,
    ahpraLine: `Ahpra ${application.ahpraRegistrationNumber} — the shape of a registration number, given by the applicant and not yet checked against the register.`,
    careAreaLabels: application.careAreas.map((area) => CARE_LABELS.get(area) ?? area),
    mannerLabels: application.manner.map((trait) => EI_QUALITIES[trait].label),
    languages: application.languages,
    trainingLine: application.nswAdhdTrained
      ? "Says they have completed the NSW ADHD prescribing training — a declaration; there is no public register to check it against."
      : "Has not claimed the NSW ADHD training.",
    booksLine: application.acceptingNewPatients
      ? "Says their books are open to new patients."
      : "Says their books are closed at the moment.",
    mixLine: mixLine(application),
    submittedOn: application.submittedAt.slice(0, 10),
  };
}
