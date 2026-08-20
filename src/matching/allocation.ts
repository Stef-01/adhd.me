// W236 (O79, founder-directed): weighted multi-criteria pair scoring — patients seeking an
// ADHD prescriber matched to prescribing doctors, hard filters first, then five declared
// criteria at 30/25/20/15/10.
//
// WHERE THIS SITS BESIDE THE FINDER, because the two answer different questions and obey
// different laws. The finder (`rankClinicians`) LISTS a roster for one reader: closed books
// are shown with a sentence (O4), order is earned facet overlap, and nothing is excluded.
// This module ALLOCATES: given many requests and many doctors, which introductions are worth
// making at all, and in what order per patient. An allocation may exclude a doctor at
// capacity — you cannot introduce somebody to a full list — and the exclusion is NAMED per
// pair rather than silent, W213's posture applied to refusals. Neither module feeds the
// other; a surface that adopts this output adopts its sentences with it.
//
// THE LAWS THIS MODULE IS BUILT UNDER, reconciled explicitly:
//
//   G7 / TGA. Every input is a DECLARED datum: the patient's stated urgency is their own
//   timing preference ("how soon do you want to be seen"), never a clinical judgement of
//   need; stated needs are asks in the same preference reading needs.ts takes; nothing here
//   reads symptoms, infers severity, or orders PATIENTS against each other. The output is
//   per-patient doctor lists — no ranking of patients exists anywhere in this module, which
//   is what keeps the W201 ADM notice's "no ordering of patients by need" true (MATCH-1).
//
//   C2 / no per-clinician weights. The five weights are GLOBAL criterion weights, coarse and
//   declared (`CRITERION_WEIGHTS`, pinned to sum to 1). No number in this file is keyed to a
//   named doctor; a doctor's score moves only by what they declared.
//
//   W213 / explainability floor. Every sub-score is 0–1 by a stated formula and carries a
//   sentence composed from the fixed templates below — only numerals and declared facts are
//   interpolated, never a patient's own text. The total is the weighted sum of the printed
//   breakdown, rounded per item then in total (the O8 arithmetic law), so an audit can hold
//   `total === sum(breakdown.weighted)` with no carve-outs.
//
//   G2 / synthetic only. `patientRef` is an opaque synthetic reference; the type has nowhere
//   to put a name, a birth date, or a symptom. Real patient data does not enter this tree.

import { distanceKm, resolvePlace } from "@/geo/suburbs";

/** A request, synthetic, carrying only declared preferences. */
export type PatientRequest = {
  patientRef: string;
  /** Suburb name or NSW/QLD postcode, resolved against the gazetteer. */
  location: string;
  /** The billing arrangement the patient asked for, e.g. "bulk-billing", "medicare-gap", "private". */
  insuranceType: string;
  /** The patient's own stated timing preference — a want, never a triage judgement. */
  urgency: Urgency;
  /** Manner-vocabulary words the patient asked for, e.g. ["unhurried", "sense_making"]. */
  communicationPreference: readonly string[];
  /** Optional stated care asks (care-area ids). Absent means "no further asks stated". */
  statedNeeds?: readonly string[];
};

export type Urgency = "this-week" | "this-month" | "whenever";

/** A doctor's declared record. Every field is the doctor's own declaration. */
export type DoctorRecord = {
  doctorRef: string;
  /** Must equal the run's required specialty to pass the hard filter. */
  specialty: string;
  location: string;
  /** Declared list places: booked of limit. Full means excluded, with the reason named. */
  capacity: { booked: number; limit: number };
  /** Billing arrangements accepted outright. */
  insuranceAccepted: readonly string[];
  /** Arrangements served only with a declared gap fee — accepted, at half cost fit. */
  insuranceAcceptedWithGap?: readonly string[];
  /** Manner-vocabulary words the doctor declared for how they work. */
  communicationStyle: readonly string[];
  /** Declared typical days to a first appointment. Undeclared is never invented. */
  waitDays?: number;
  /** Declared care areas, for clinical-fit depth beyond the specialty filter. */
  careAreas?: readonly string[];
};

export type RefusalReason = "insurance_not_accepted" | "at_capacity" | "specialty_mismatch";

export type Criterion = "clinicalFit" | "availability" | "proximity" | "costMatch" | "communicationFit";

/**
 * The five weights, exactly as directed: clinical fit 30%, availability 25%, proximity 20%,
 * cost 15%, communication 10%. Global, coarse, and pinned to sum to 1 — a tuned continuum
 * would be a number nobody could defend in a sentence (the lexicon's own 30/20/12 argument).
 */
export const CRITERION_WEIGHTS: Readonly<Record<Criterion, number>> = {
  clinicalFit: 0.3,
  availability: 0.25,
  proximity: 0.2,
  costMatch: 0.15,
  communicationFit: 0.1,
};

/** Distance at which proximity bottoms out. Beyond this, "far" stops getting farther. */
export const PROXIMITY_CAP_KM = 50;

/** The stated horizons behind each urgency word, in days. "whenever" binds nothing. */
export const URGENCY_HORIZON_DAYS: Readonly<Record<Urgency, number | null>> = {
  "this-week": 7,
  "this-month": 30,
  whenever: null,
};

export type CriterionScore = {
  criterion: Criterion;
  weight: number;
  /** Normalised 0–1 before weighting, by the stated formula for this criterion. */
  raw: number;
  /** weight × raw, rounded — the number the total sums. */
  weighted: number;
  /** The W213 sentence: fixed template, numerals and declared facts only. */
  sentence: string;
};

export type PairScore = {
  doctorRef: string;
  /** Weighted sum of the breakdown, rounded. Equals the printed evidence by construction. */
  total: number;
  breakdown: readonly CriterionScore[];
};

export type ExcludedPair = { doctorRef: string; reasons: readonly RefusalReason[] };

export type PatientMatches = {
  patientRef: string;
  /** Top matches, best first, at most MATCHES_PER_PATIENT. Ties break on doctorRef, which is arbitrary and says so. */
  matches: readonly PairScore[];
  /** Said when equal totals sit inside the top list or the cut at three fell inside a tie. */
  tieNote: string | null;
  /** Every filtered pair with every reason that applied — a refusal is never silent. */
  excluded: readonly ExcludedPair[];
};

export const MATCHES_PER_PATIENT = 3;

export type AllocationConfig = {
  /** The specialty the whole run requires. The cohort is ADHD patients seeking a prescriber. */
  requiredSpecialty: string;
};

export const DEFAULT_ALLOCATION_CONFIG: AllocationConfig = {
  requiredSpecialty: "adhd-prescribing-gp",
};

/** Same snap as the finder's roundScore (the O8 law), local so machinery stays roster-free. */
const round = (value: number) => Math.round(value * 1000) / 1000;

/** Every hard-filter reason that applies to this pair. Empty means the pair proceeds. */
export function hardFilterReasons(
  patient: PatientRequest,
  doctor: DoctorRecord,
  config: AllocationConfig = DEFAULT_ALLOCATION_CONFIG,
): RefusalReason[] {
  const reasons: RefusalReason[] = [];
  if (doctor.specialty !== config.requiredSpecialty) reasons.push("specialty_mismatch");
  if (doctor.capacity.limit <= 0 || doctor.capacity.booked >= doctor.capacity.limit) {
    reasons.push("at_capacity");
  }
  const accepted =
    doctor.insuranceAccepted.includes(patient.insuranceType) ||
    (doctor.insuranceAcceptedWithGap ?? []).includes(patient.insuranceType);
  if (!accepted) reasons.push("insurance_not_accepted");
  return reasons;
}

/**
 * Clinical fit, 0–1. The specialty hard filter already guarantees the doctor prescribes in
 * this cohort's scope, so the sub-score prices DEPTH: the share of the patient's stated care
 * asks the doctor declares. No stated asks means nothing to compare — that is a 1 with a
 * sentence saying why, not a guess in either direction.
 */
function clinicalFit(patient: PatientRequest, doctor: DoctorRecord): { raw: number; sentence: string } {
  const asks = patient.statedNeeds ?? [];
  if (asks.length === 0) {
    return { raw: 1, sentence: "Specialty matches the ask; no further care areas were stated." };
  }
  const declared = new Set(doctor.careAreas ?? []);
  const met = asks.filter((area) => declared.has(area)).length;
  return {
    raw: round(met / asks.length),
    sentence: `Declares ${met} of the ${asks.length} stated care areas.`,
  };
}

/**
 * Availability, 0–1: the TIGHTER of two declared facts — open places as a fraction of the
 * list, and the declared wait against the patient's stated horizon. min() is used because
 * the binding constraint is the honest one to report; the sentence names it. An undeclared
 * wait binds nothing (never invented); "whenever" binds nothing from the patient's side.
 */
function availability(patient: PatientRequest, doctor: DoctorRecord): { raw: number; sentence: string } {
  const open = doctor.capacity.limit - doctor.capacity.booked;
  const openFraction = round(open / doctor.capacity.limit);
  const horizon = URGENCY_HORIZON_DAYS[patient.urgency];

  let horizonFit = 1;
  if (horizon !== null && doctor.waitDays !== undefined && doctor.waitDays > horizon) {
    horizonFit = round(horizon / doctor.waitDays);
  }

  if (horizonFit < openFraction) {
    return {
      raw: horizonFit,
      sentence: `Declared wait is ${doctor.waitDays} days against a stated ${horizon}-day horizon.`,
    };
  }
  const waitNote =
    doctor.waitDays === undefined ? " Typical wait is not declared." : "";
  return {
    raw: openFraction,
    sentence: `${open} of ${doctor.capacity.limit} list places are open.${waitNote}`,
  };
}

/**
 * Proximity, 0–1: 1 − min(km, cap)/cap over the gazetteer's straight-line distance. A
 * location the gazetteer cannot resolve — either side — scores the 0.5 midpoint: an unknown
 * location is OUR missing row, and it must neither sink a doctor nor lift one
 * (rankCliniciansNear's law, restated for a scored model).
 */
function proximity(patient: PatientRequest, doctor: DoctorRecord): { raw: number; sentence: string } {
  const from = resolvePlace(patient.location);
  const to = resolvePlace(doctor.location);
  if (!from || !to) {
    return {
      raw: 0.5,
      sentence: "A location here is not in the gazetteer, so distance is scored at the midpoint — a gap in our data, not theirs.",
    };
  }
  const km = distanceKm(from, to);
  const raw = round(1 - Math.min(km, PROXIMITY_CAP_KM) / PROXIMITY_CAP_KM);
  return { raw, sentence: `About ${Math.round(km)} km away, scored against a ${PROXIMITY_CAP_KM} km range.` };
}

/**
 * Cost match, 0–1 in two declared steps: the asked arrangement accepted outright is 1;
 * accepted only with a declared gap fee is 0.5. Anything else was hard-filtered, so this
 * criterion never sees it. Half is a judgement and a sayable one — "accepted, with a gap
 * fee" is a sentence; a tuned 0.63 would not be.
 */
function costMatch(patient: PatientRequest, doctor: DoctorRecord): { raw: number; sentence: string } {
  if (doctor.insuranceAccepted.includes(patient.insuranceType)) {
    return { raw: 1, sentence: `${patient.insuranceType} accepted as asked.` };
  }
  return { raw: 0.5, sentence: `${patient.insuranceType} accepted with a declared gap fee.` };
}

/**
 * Communication fit, 0–1: the share of the patient's stated manner preferences the doctor
 * declares. No stated preference means the criterion cannot separate anybody — a 1 for
 * every doctor, said so, rather than an invented differentiation.
 */
function communicationFit(patient: PatientRequest, doctor: DoctorRecord): { raw: number; sentence: string } {
  const prefs = patient.communicationPreference;
  if (prefs.length === 0) {
    return { raw: 1, sentence: "No communication preference was stated, so every doctor scores alike here." };
  }
  const declared = new Set(doctor.communicationStyle);
  const met = prefs.filter((p) => declared.has(p)).length;
  return {
    raw: round(met / prefs.length),
    sentence: `Declares ${met} of the ${prefs.length} stated communication preferences.`,
  };
}

const CRITERIA: ReadonlyArray<{
  criterion: Criterion;
  score: (patient: PatientRequest, doctor: DoctorRecord) => { raw: number; sentence: string };
}> = [
  { criterion: "clinicalFit", score: clinicalFit },
  { criterion: "availability", score: availability },
  { criterion: "proximity", score: proximity },
  { criterion: "costMatch", score: costMatch },
  { criterion: "communicationFit", score: communicationFit },
];

/** Score one surviving pair. Total is the weighted sum of the printed breakdown, exactly. */
export function scorePair(patient: PatientRequest, doctor: DoctorRecord): PairScore {
  const breakdown = CRITERIA.map(({ criterion, score }) => {
    const { raw, sentence } = score(patient, doctor);
    const weight = CRITERION_WEIGHTS[criterion];
    return { criterion, weight, raw, weighted: round(weight * raw), sentence };
  });
  return {
    doctorRef: doctor.doctorRef,
    total: round(breakdown.reduce((sum, item) => sum + item.weighted, 0)),
    breakdown,
  };
}

/**
 * The whole run: hard filters with named refusals, weighted scores, top three per patient.
 *
 * Deterministic and order-independent: results are keyed and sorted on refs, ties break on
 * `doctorRef` — arbitrary on purpose, because a tie-break that meant something would be a
 * judgement about who deserves patients more (match.ts's law). A tie inside the top list, or
 * a cut at three that falls inside a tie, is SAID rather than rendered as a ranking.
 */
export function matchPatientsToPrescribers(
  patients: readonly PatientRequest[],
  doctors: readonly DoctorRecord[],
  config: AllocationConfig = DEFAULT_ALLOCATION_CONFIG,
): PatientMatches[] {
  return [...patients]
    .sort((a, b) => a.patientRef.localeCompare(b.patientRef))
    .map((patient) => {
      const excluded: ExcludedPair[] = [];
      const scored: PairScore[] = [];
      for (const doctor of [...doctors].sort((a, b) => a.doctorRef.localeCompare(b.doctorRef))) {
        const reasons = hardFilterReasons(patient, doctor, config);
        if (reasons.length > 0) excluded.push({ doctorRef: doctor.doctorRef, reasons });
        else scored.push(scorePair(patient, doctor));
      }
      scored.sort((a, b) => (a.total === b.total ? a.doctorRef.localeCompare(b.doctorRef) : b.total - a.total));

      const matches = scored.slice(0, MATCHES_PER_PATIENT);
      const cutTied =
        scored.length > MATCHES_PER_PATIENT &&
        scored[MATCHES_PER_PATIENT]!.total === matches.at(-1)?.total;
      const insideTie = matches.some((m, i) => i > 0 && m.total === matches[i - 1]!.total);

      let tieNote: string | null = null;
      if (cutTied) {
        tieNote = `The cut at ${MATCHES_PER_PATIENT} fell inside an exact tie — doctors beyond the list scored the same as the last shown, so the boundary is not a ranking.`;
      } else if (insideTie) {
        tieNote = "Equal totals inside this list are not an order — the tie-break is alphabetical and means nothing.";
      }

      return { patientRef: patient.patientRef, matches, tieNote, excluded };
    });
}
