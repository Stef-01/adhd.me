// W213 (O117): what a patient is told about a named clinician, enumerated so the clinician
// can read it — the explainability floor pointed at the person it describes.
//
// Filed under W213 because that unit is where "every point of score is sayable in closed
// vocabulary" became law, and this module is that vocabulary read back to its subject. The
// header is not decoration: W200's copy census finds a module by this first line, and a module
// without one is invisible to it (CENSUS-1, which fired on this file's first draft exactly as
// it did on O100's).
//
// WHY THIS EXISTS AS A MODULE RATHER THAN AS JSX IN THE CONSOLE. W190 gives a clinician a
// path to correct a profile that is wrong about them, and a correction path is only real if
// the thing to be corrected is legible — a doctor cannot object to a sentence they have never
// been shown. That makes this an honesty surface, not a report, so it is built where a test
// can hold it to the finder's own output rather than assembled in a page and hoped over.
//
// EVERY LINE IS COMPOSED BY THE FUNCTIONS THE FINDER CALLS. Nothing here authors copy. The
// reason sentence comes from `getPersonalizedMatch`, the closed-books line from
// `closedBooksNote`, the distance line from `distanceTo`, the not-declared line from the same
// frame the profile prints. If the finder's wording changes, this changes with it — which is
// the property that stops a "what patients see" panel from slowly becoming fiction.

import {
  closedBooksNote,
  distanceTo,
  getPersonalizedMatch,
  locationLabel,
  unservedCopy,
  type Clinician,
} from "@/demo/clinicians";
import { facetKey, holdsPreference, type MannerTrait, type Preference } from "@/matching/needs";
import { CARE_AREA_LABELS } from "@/onboarding/types";

/** The console's own care-area vocabulary, keyed for lookup. */
const CARE_LABEL = new Map(CARE_AREA_LABELS.map((entry) => [entry.id, entry.label]));
import { EI_QUALITIES } from "@/demo/emotional-fit";

/** One thing a patient can be told, and the declaration it was composed from. */
export type ToldLine = {
  /** The words a patient reads. */
  said: string;
  /** The field on this clinician's record that produced it. */
  from: string;
  /** Closed-vocabulary key, where the line comes from a facet. */
  key?: string;
};

const PREFERENCE_LABELS: Readonly<Record<Preference, string>> = {
  "woman-gp": "A woman GP",
  "telehealth-first": "By phone or telehealth",
  "bulk-billing": "Bulk billing",
  "longer-appointment": "A longer first appointment",
};

const PREFERENCE_SOURCE: Readonly<Record<Preference, string>> = {
  "woman-gp": "gender",
  "telehealth-first": "telehealthFirstAppointment",
  "bulk-billing": "practicalSignals",
  "longer-appointment": "manner (unhurried)",
};

/**
 * Every reason line this clinician's declarations can put in front of a patient.
 *
 * Enumerated from the DECLARATIONS rather than from a query, which is what makes it complete:
 * the set of things the finder can say about a GP is fixed by what they declared, so this can
 * list all of it instead of sampling whichever sentence somebody happens to type.
 */
export function reasonsPatientsCanSee(clinician: Clinician): ToldLine[] {
  const lines: ToldLine[] = [];
  for (const area of clinician.careAreas) {
    lines.push({ said: CARE_LABEL.get(area) ?? area, from: "careAreas", key: `care:${area}` });
  }
  for (const area of clinician.careAreasSometimes ?? []) {
    if (clinician.careAreas.includes(area)) continue;
    lines.push({
      said: CARE_LABEL.get(area) ?? area,
      // A "sometimes" declaration answers at half weight (O2) and the patient is never told
      // which it was — worth saying here, because the clinician chose between them.
      from: "careAreasSometimes (answers at half weight)",
      key: `care:${area}`,
    });
  }
  for (const trait of clinician.manner) {
    lines.push({
      said: EI_QUALITIES[trait as MannerTrait].label,
      from: "manner",
      key: facetKey({ kind: "manner", trait: trait as MannerTrait }),
    });
  }
  for (const language of clinician.languages) {
    if (language.toLowerCase() === "english") continue;
    lines.push({ said: `${language}-speaking`, from: "languages", key: `language:${language.toLowerCase()}` });
  }
  for (const preference of Object.keys(PREFERENCE_LABELS) as Preference[]) {
    if (!holdsPreference(clinician, preference)) continue;
    lines.push({ said: PREFERENCE_LABELS[preference], from: PREFERENCE_SOURCE[preference], key: `pref:${preference}` });
  }
  return lines;
}

/**
 * The sentences that surround those labels, rendered as sentences.
 *
 * A vocabulary list is not what a patient reads; these frames are. Shown with a worked example
 * so a clinician sees the actual shape — the alternative is asking them to imagine it, which is
 * how a correction path stays theoretical.
 */
export function sentencesPatientsSee(clinician: Clinician): ToldLine[] {
  const lines: ToldLine[] = [];
  const declared = reasonsPatientsCanSee(clinician);

  // The reason line, composed by the finder itself from a query this clinician answers.
  const example = declared.length > 0 ? declared[0]!.said.toLowerCase() : clinician.focus;
  lines.push({
    said: getPersonalizedMatch(clinician, example).reason,
    from: "the reason line, from getPersonalizedMatch — closed vocabulary only (W213)",
  });

  lines.push({
    said: `${clinician.title}, ${clinician.pronouns} · ${locationLabel(clinician)}`,
    from: "title, pronouns, suburb and alsoConsultsAt",
  });

  if (clinician.nswAdhdTrained) {
    lines.push({
      said: "NSW ADHD training",
      from: "nswAdhdTrained — a declaration relayed from the founders, not a check ADHD.ME performed",
    });
  }
  if (clinician.founderInterest) {
    lines.push({ said: "Co-founder of ADHD.ME", from: "founderInterest — a material interest, stated beside the listing" });
  }

  const distance = distanceTo(clinician, null);
  lines.push({ said: distance ?? clinician.reach, from: "reach (the distance line reads from the suburb a patient gives)" });

  const closed = closedBooksNote(clinician, example);
  if (closed) lines.push({ said: closed, from: "acceptingNewPatients + capacityDeclaredAt" });

  return lines;
}

/**
 * What a patient is told when they ask this clinician for something they have NOT declared.
 *
 * The mirror of the list above, and the half a clinician is most likely to want to check: O51
 * prints "you also asked for X — not something they declare" on the profile, and O110's line
 * names a facet nobody on the roster declares. Both are facts about a declaration and never
 * claims about ability (W193), which is exactly the distinction a doctor reading this page
 * will be looking for.
 */
export function notDeclaredFrames(clinician: Clinician): ToldLine[] {
  const held = new Set(reasonsPatientsCanSee(clinician).map((line) => line.key));
  const missing = CARE_AREA_LABELS.find((entry) => !held.has(`care:${entry.id}`));
  const label = missing ? missing.label : "an area you have not declared";
  return [
    {
      said: `You also asked for ${label.toLowerCase()} — not something they declare. Another listing may.`,
      from: "the profile's missed-asks line (O51), shown for any facet this clinician has not declared",
    },
    {
      said: unservedCopy(label),
      from: "the results line (O110), shown only when NOBODY listed declares it",
    },
  ];
}
