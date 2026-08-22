// W234 (O142): a SYNTHETIC roster, fixture only, so the clarifier's behaviour at scale can be
// measured instead of assumed.
//
// WHY THIS EXISTS. `clarifiers()` carries a doc comment that states a premise the year plan's
// Q3 item 10 is built on: "with two clinicians every disagreement is an even split, so the order
// barely matters today and will matter a lot at twenty." Nobody had checked either half. The
// roster is three real people and cannot be grown to twenty — that is a founder decision behind
// gate G6, and inventing seventeen doctors to sit beside Dr Saxena is precisely what the W193
// real-person law forbids. So the roster does not grow: a FIXTURE does, and it never leaves the
// test process.
//
// THE HARD LAW OF THIS FILE. Nothing here may ever reach a patient. These entries are not people,
// they hold no appointments, and a surface that rendered one would be publishing a fabricated
// doctor. `scale-fixture.test.ts` fails if this module is imported from anywhere under `app/`,
// which makes the law executable rather than a comment — the same posture as the latent-findings
// register, and for the same reason: a rule nobody can run is a rule that decays.
//
// WHY THE RATES ARE DERIVED AND NOT INVENTED. A synthetic roster measures nothing if its facet
// distribution is something I chose, because then the measurement is about my choice. Each
// synthetic clinician therefore declares each facet at the MARGINAL RATE THE REAL ROSTER
// DECLARES IT, drawn deterministically. A roster edit moves the rates, which moves the
// measurement, which fails the pin — deliberately, so the number is re-earned rather than
// inherited.
//
// WHAT THIS CANNOT TELL YOU, stated because the number is worth less if its limits are not.
// Marginal rates estimated from THREE people are a weak estimate, and drawing each facet
// independently models no correlation between them — real GPs who declare `titration` are
// likelier to declare `shared-care`, and this fixture does not know that. So it answers a
// structural question (does the evenness sort have choices to make at this size, and does the
// signature dedup do work) and NOT a predictive one (which questions a twenty-GP roster would
// actually ask). The structural question is the one Q3 item 10 turns on.

import { clarifiers, declaredKeys } from "./clarify";
import { clinicians } from "@/demo/clinicians";
import type { CareArea, Clinician } from "@/demo/roster";
import { EI_QUALITY_KEYS, type EIQuality } from "@/demo/emotional-fit";

/**
 * Every care area a clinician can declare.
 *
 * O153: `CareArea` has no derived key list the way `EIQuality` does, so exhaustiveness is enforced
 * by the COMPILER instead. This is a `Record<CareArea, true>`, so adding a member to the union
 * without adding it here is a type error rather than a silent narrowing of the measured facet
 * space — which is what the hand-written array this replaces would have allowed, with the pins
 * below staying green while measuring less than they claim.
 */
const EVERY_CARE_AREA: Record<CareArea, true> = {
  "adhd-assessment": true,
  "child-adolescent-adhd": true,
  titration: true,
  "shared-care": true,
  depression: true,
  anxiety: true,
  "trauma-informed": true,
  "complex-mental-health": true,
  "autism-adhd": true,
  "substance-history": true,
  "emotional-regulation": true,
  "non-medication": true,
};
const CARE_AREAS: readonly CareArea[] = Object.keys(EVERY_CARE_AREA) as CareArea[];

/**
 * O153: DERIVED, not hand-copied. This was a nine-item literal, and a tenth trait would have
 * narrowed the measured facet space in silence while the `[1, 4, 7, 9]` and `[16, 16]` pins stayed
 * green — defeating this module's own stated law that a vocabulary change must move the
 * measurement and fail the pin.
 */
const MANNER_TRAITS: readonly EIQuality[] = EI_QUALITY_KEYS;

/**
 * A deterministic draw in [0, 1) from a seed string.
 *
 * Deterministic on purpose and not `Math.random`: the measurement below is PINNED, and a pin over
 * a random fixture is a flake with a test id. FNV-1a, which is enough for "spread these draws out"
 * and is not pretending to be anything more.
 */
function draw(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0x100000000;
}

/** The share of the real roster declaring `predicate` — the rate a synthetic entry inherits. */
function rateAmongReal(predicate: (clinician: Clinician) => boolean): number {
  return clinicians.filter(predicate).length / clinicians.length;
}

/**
 * `size` synthetic clinicians whose facet distribution mirrors the real roster's.
 *
 * The identifying fields are deliberately unusable as a person: no name that reads like one, no
 * practice, no booking route that goes anywhere, `realPerson` absent. If one of these ever
 * appeared on a screen it should look obviously wrong, because it IS obviously wrong.
 */
export function syntheticRoster(size: number): Clinician[] {
  const womanRate = rateAmongReal((c) => c.gender === "woman");
  const telehealthRate = rateAmongReal((c) => c.telehealthFirstAppointment === true);
  const bulkRate = rateAmongReal((c) => c.practicalSignals.some((s) => /bulk/i.test(s)));
  const oftenRate = (area: CareArea) => rateAmongReal((c) => c.careAreas.includes(area));
  const sometimesRate = (area: CareArea) =>
    rateAmongReal((c) => (c.careAreasSometimes ?? []).includes(area));
  const mannerRate = (trait: EIQuality) => rateAmongReal((c) => c.manner.includes(trait));

  return Array.from({ length: size }, (_, index) => {
    const id = `synthetic-${String(index).padStart(2, "0")}`;
    const careAreas = CARE_AREAS.filter((area) => draw(`${id}:often:${area}`) < oftenRate(area));
    const careAreasSometimes = CARE_AREAS.filter(
      (area) => !careAreas.includes(area) && draw(`${id}:sometimes:${area}`) < sometimesRate(area),
    );
    const manner = MANNER_TRAITS.filter((trait) => draw(`${id}:manner:${trait}`) < mannerRate(trait));
    const bulkBills = draw(`${id}:bulk`) < bulkRate;

    const entry: Clinician = {
      id,
      name: `Synthetic fixture entry ${index}`,
      shortName: `Entry ${index}`,
      gender: draw(`${id}:woman`) < womanRate ? "woman" : "man",
      pronouns: "they/them",
      title: "Fixture entry — not a clinician",
      suburb: "Nowhere",
      reach: "Fixture entry; holds no appointments",
      image: null,
      practice: "Fixture practice — does not exist",
      booking: { via: "practice", url: "", note: "Fixture entry; not bookable." },
      acceptingNewPatients: true,
      focus: "Fixture entry",
      matchLine: "Fixture entry; carries no claim about anybody.",
      fitSignals: [],
      practicalSignals: bulkBills ? ["Bulk billing"] : ["Private fee"],
      summary: "Generated for matching scale measurement. This is not a real clinician.",
      about: "Generated for measurement. Not a person, and not a description of one.",
      experience: [],
      languages: ["English"],
      careAreas,
      manner,
      wheelchairAccessible: draw(`${id}:access`) < 0.5,
      appointmentLength: "n/a",
    };
    if (careAreasSometimes.length > 0) entry.careAreasSometimes = careAreasSometimes;
    if (draw(`${id}:telehealth`) < telehealthRate) entry.telehealthFirstAppointment = true;
    return entry;
  });
}

/**
 * What the clarifier selector has to work with, at a given roster size.
 *
 * Every number is computed from `clarifiers()` itself rather than from a re-implementation of it,
 * so this report cannot drift from the selector it describes — the same rule W234's tie-quality
 * panel follows, and for the same reason.
 */
export type ClarifierScaleReport = {
  rosterSize: number;
  /** Facets that split the roster AND have a prompt: the questions actually available to ask. */
  candidates: number;
  /** Distinct holder signatures among them — how many genuinely different reorderings exist. */
  distinctSignatures: number;
  /**
   * Distinct evenness values among the candidates.
   *
   * THE NUMBER THIS UNIT WAS BUILT FOR. The selector sorts on `|heldBy/size - 0.5|`, so a roster
   * where every candidate shares one evenness value gives that sort NOTHING TO DECIDE: the order
   * falls entirely through to the tie-break beneath it. 1 means the sort is inert at this size.
   */
  distinctEvenness: number;
  /** The questions the selector actually offers, in order. */
  offered: string[];
  /** What the tie-break alone would have offered, ignoring evenness. The gap is the sort's work. */
  offeredIfAlphabetical: string[];
};

export function clarifierScaleReport(query: string, roster: readonly Clinician[]): ClarifierScaleReport {
  const all = clarifiers(query, roster, Number.POSITIVE_INFINITY);
  const declared = all.map((entry) => ({
    key: entry.facetKey,
    signature: roster.map((c) => (declaredKeys(c).has(entry.facetKey) ? "1" : "0")).join(""),
    evenness: Math.abs(entry.heldBy / roster.length - 0.5),
  }));
  return {
    rosterSize: roster.length,
    candidates: all.length,
    distinctSignatures: new Set(declared.map((d) => d.signature)).size,
    distinctEvenness: new Set(declared.map((d) => d.evenness.toFixed(6))).size,
    offered: clarifiers(query, roster, 3).map((entry) => entry.facetKey),
    offeredIfAlphabetical: [...all]
      .sort((a, b) => a.facetKey.localeCompare(b.facetKey))
      .slice(0, 3)
      .map((entry) => entry.facetKey),
  };
}
