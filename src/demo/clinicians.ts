import type { CareArchetype, CareArea } from "./care-archetypes";
import { describeDistance, distanceKm, resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import { facetKey, holdsPreference, languageNeeds, readNeeds, type NeedSignal, type Preference } from "@/matching/needs";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
// Value import of copy tables only. `clarify.ts` imports nothing but TYPES from this module, so
// this direction is the one that keeps the graph acyclic at runtime.
import { CARE_PROMPTS, MANNER_PROMPTS, PREF_PROMPTS } from "@/matching/clarify";
import { type EIQuality } from "./emotional-fit";

/**
 * The ranking, the copy tables and the geo helpers behind /finder and the walkthrough.
 *
 * O100 moved the roster DATA and the `Clinician` type to ./roster — including the page of
 * real-person law that used to head this file, which belongs with the entries it governs.
 * Both are re-exported below, so this module is still the one every consumer imports and
 * nothing outside these two files changed.
 */
export type { CareArea, Clinician } from "./roster";
export { clinicians } from "./roster";

import { clinicians, type Clinician } from "./roster";

/**
 * Rank the roster against a free-text request.
 *
 * The weights are per-clinician and per-phrase, which is a deliberate refusal to build a general
 * relevance model: a general model would be a quality ranking of named clinicians derived from
 * inference, which W83 refused internally and which is worse in public. These weights only
 * express what each clinician SAYS they see often, matched against what the person SAID they want.
 */
/**
 * How long a books declaration stays fresh: a quarter. Long enough that nobody is nagged
 * weekly, short enough that a directory cannot spend a year advertising capacity nobody has —
 * the NRMP lesson the year plan cites, priced in as data rather than trusted as a boolean.
 */
export const CAPACITY_FRESH_DAYS = 90;

export type CapacityGrade = "fresh-open" | "stale-open" | "closed";

/**
 * Grade a capacity declaration by its age (O56). `today` is injected so ranking stays a pure
 * function of its arguments — tests pin the boundary with a fixed clock, the UI passes now.
 * An UNDATED open declaration grades stale: freshness is a claim, and a claim nobody dated
 * cannot make it.
 */
export function capacityGrade(clinician: Clinician, today: Date = new Date()): CapacityGrade {
  if (!clinician.acceptingNewPatients) return "closed";
  if (!clinician.capacityDeclaredAt) return "stale-open";
  const ageDays = (today.getTime() - new Date(clinician.capacityDeclaredAt).getTime()) / 86_400_000;
  return ageDays <= CAPACITY_FRESH_DAYS ? "fresh-open" : "stale-open";
}

/** Exported so the console's audit sort is the SAME order the finder uses, not a re-guess. */
export const CAPACITY_ORDER: Record<CapacityGrade, number> = { "fresh-open": 0, "stale-open": 1, closed: 2 };

export function rankClinicians(query: string, roster: readonly Clinician[] = clinicians, today: Date = new Date()): Clinician[] {
  const needs = needsFor(query, roster);
  return [...roster].sort((a, b) => {
    const aProfile = rankingProfile(a, needs);
    const bProfile = rankingProfile(b, needs);

    /*
     * ACCESS BEFORE ACCUMULATION (2026-08-22 audit).
     *
     * A language or access request is not one more keyword in a health-directory query. If a
     * reader asks for Urdu or telehealth, a clinician who does not answer that constraint must
     * not leapfrog one who does by accumulating several lower-stakes care-area overlaps. This is
     * still the reader's stated preference, not an inferred clinical rule, and every point remains
     * explainable through the same evidence shown on the profile.
     */
    const byConstraintCoverage = bProfile.constraintCoverage - aProfile.constraintCoverage;
    if (byConstraintCoverage !== 0) return byConstraintCoverage;

    const byConstraint = bProfile.constraintScore - aProfile.constraintScore;
    if (byConstraint !== 0) return byConstraint;

    /*
     * TIERS BEFORE ACCUMULATION, WITHIN THE REMAINING SCORE TOO (M9/F9).
     *
     * The two lines above already stop a language or preference constraint from being
     * outvoted by anything else. But everything past that point used to fall into ONE
     * compensatory sum — `weightedScore`, care and manner added together — so three soft
     * manner traits (structured, non-judgmental, helps-it-make-sense) could still outrank one
     * real care-area match, because 24+24+24 is more than 12. A care-area declaration is a
     * clinical scope claim; a manner trait is a style preference. Comparing care before manner,
     * as its own step, is the same "constraint before accumulation" idea one rung down: care
     * is STRONG, manner is CONTRIBUTORY, and a contributory tier is never allowed to buy its
     * way past a strong one by piling up.
     */
    const byCare = bProfile.careScore - aProfile.careScore;
    if (byCare !== 0) return byCare;

    const byManner = bProfile.mannerScore - aProfile.mannerScore;
    if (byManner !== 0) return byManner;

    /* Equal weighted evidence is resolved by completeness: the clinician answering more of the
       distinct things the reader named comes first. This only breaks a numerical tie; it never
       overrides importance weights or access constraints. */
    const byCoverage = bProfile.coverage - aProfile.coverage;
    if (byCoverage !== 0) return byCoverage;

    /**
     * WITHIN EQUAL FIT, SOMEBODY WHO CAN ACTUALLY SEE YOU COMES FIRST (O4/F5).
     *
     * The one structural lesson of every reciprocal-recommendation system since RECON: in a
     * two-sided market, ranking by one side's preference alone fails both sides. This tree
     * refuses learned mutual preference (C3/C4, G7), but the clinician side of reciprocity here
     * is not a model — it is DECLARED CAPACITY, already on the record and already filterable in
     * the directory, and until O4 invisible to the finder: a perfect-fit GP whose books were
     * closed ranked first with nothing saying the match was unactionable. Closed books never
     * outrank open ones at equal fit — and never cost a single point of fit either, because a
     * reader may want exactly that GP and their waitlist; the card says why they are still
     * shown (`CLOSED_BOOKS_COPY`). Position from an operational fact, sayable in one sentence.
     */
    /* O56: the O4 boundary, now three grades. A stale open declaration still beats closed
       books (there is still a door to knock on), but no longer beats one confirmed this
       quarter — capacity that nobody has reconfirmed is capacity the mechanism stops
       vouching for at a tie. */
    const byCapacity = CAPACITY_ORDER[capacityGrade(a, today)] - CAPACITY_ORDER[capacityGrade(b, today)];
    if (byCapacity !== 0) return byCapacity;

    // Exact ties remain peers in the UI's rank band, but source-file position must not decide
    // which named clinician appears first inside that band. Mix the request with the stable id so
    // the arbitrary display order is deterministic, independent of roster order, and not a
    // permanent advantage for whichever record happens to be written first.
    const shuffle = (clinician: Clinician) => tieHash(`${query}|${clinician.id}`);
    return shuffle(a) - shuffle(b) || a.id.localeCompare(b.id);
  });
}

export type RankingProfile = {
  /** Number of distinct language and access constraints this clinician answers. */
  constraintCoverage: number;
  /** Weight of explicitly requested language and access constraints this clinician answers. */
  constraintScore: number;
  /** Weighted overlap on care-area facets alone — the STRONG tier (M9/F9). */
  careScore: number;
  /** Weighted overlap on manner facets alone — the CONTRIBUTORY tier (M9/F9). */
  mannerScore: number;
  /** The full explainable weighted-overlap score, across every tier — kept for `scoreAgainst`
   *  and `matchQuality`'s "did anything at all differ" check. NOT used to compare two
   *  clinicians directly any more: `rankClinicians` compares `careScore` and `mannerScore` as
   *  their own steps so a contributory tier can never outvote a strong one by summing. */
  weightedScore: number;
  /** Number of distinct requested needs answered, used only after an exact score tie. */
  coverage: number;
};

/**
 * The full, auditable ranking vector for one clinician.
 *
 * Keeping this vector public gives tests, the matching console and future outcome evaluation one
 * definition of the order. It deliberately contains no opaque quality estimate, popularity,
 * symptom severity, or clinician-specific coefficient.
 *
 * M9 (F9) SPLITS THE OLD SINGLE SUM INTO TIERS. Language and preference facets were already
 * pulled out ahead of everything else by O185 (`constraintCoverage`/`constraintScore`) — a
 * language ask can no longer be outvoted by anything. What O185 left alone is everything
 * PAST that point: care and manner facets were still added into one `weightedScore`, so three
 * manner traits could still outrank one care-area match. `careScore` and `mannerScore` give
 * each its own sum, so `rankClinicians` can compare them as separate steps — strong before
 * contributory — instead of letting a contributory tier buy its way past a strong one.
 */
export function rankingProfile(clinician: Clinician, needs: readonly NeedSignal[]): RankingProfile {
  let constraintCoverage = 0;
  let constraintScore = 0;
  let careScore = 0;
  let mannerScore = 0;
  let weightedScore = 0;
  let coverage = 0;
  for (const need of needs) {
    const strength = facetStrength(clinician, need.facet);
    if (strength === 0) continue;
    const contribution = roundScore(need.weight * strength);
    coverage += 1;
    weightedScore += contribution;
    if (need.facet.kind === "preference" || need.facet.kind === "language") {
      constraintCoverage += 1;
      constraintScore += contribution;
    } else if (need.facet.kind === "care") {
      careScore += contribution;
    } else {
      mannerScore += contribution;
    }
  }
  return {
    constraintCoverage,
    constraintScore: roundScore(constraintScore),
    careScore: roundScore(careScore),
    mannerScore: roundScore(mannerScore),
    weightedScore: roundScore(weightedScore),
    coverage,
  };
}

/**
 * FNV-1a over a string, as a stable arbitrary number. Not a security hash and not trying to be:
 * it needs to be deterministic, cheap, dependency-free, and to have no relationship to anything a
 * reader or a clinician could care about — which is the whole requirement for an arbitrary
 * tie-break that must not be editable into a favour.
 */
function tieHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * How well one clinician answers what was asked for.
 *
 * THE WHOLE SCORE IS OVERLAP BETWEEN TWO DECLARED SETS. A facet the reader asked for and the
 * clinician declared earns its weight; a facet they did not declare earns nothing. There is no
 * per-clinician coefficient anywhere in this function, which is the property that lets a new GP
 * be added by declaring facets rather than by an engineer inventing weights for them.
 *
 * Exported so the explanation can be shown to derive from the same evidence — see
 * `matchEvidence` and the test that asserts a clinician can never be ranked for a reason the
 * page then declines to give.
 */
export function scoreAgainst(clinician: Clinician, needs: readonly NeedSignal[]): number {
  return rankingProfile(clinician, needs).weightedScore;
}

/**
 * How strongly one clinician's declared record answers one facet — M1 (Q-M item 1).
 *
 * THE ONE PLACE THAT READS `careAreasSometimes`. Scoring, rarity and eligibility used to compute
 * this quantity three separate ways: `declarationFactor` below (weight for scoring, once
 * `answers` had filtered), `declaredMass` for rarity, and a fourth, independent copy inline in
 * `cliniciansMatchingArchetype`. F5 (O182's appraisal) found the fourth had drifted — it read
 * `careAreasSometimes` as a FULL match while scoring paid it HALF, so a clinician could rank
 * FIRST for a journey they were formally ineligible for. This function is now the only place any
 * of the three reads that field; every caller below asks IT rather than recomputing.
 *
 * `0` undeclared, `0.5` declared "sometimes" (care facets only), `1` declared "often" or held at
 * all (manner/language/preference are boolean, so they are never `0.5`). NOT A PER-CLINICIAN
 * COEFFICIENT — C2 forbids an engineered number keyed to a named person; this is the clinician's
 * OWN interview answer given its stated price, the same way the declaration itself is their own
 * datum. Half is a judgement, and a sayable one: "they see this sometimes rather than often" is a
 * sentence, where a tuned 0.63 would not be.
 */
export function facetStrength(clinician: Clinician, facet: NeedSignal["facet"]): 0 | 0.5 | 1 {
  if (facet.kind === "care") {
    if (clinician.careAreas.includes(facet.area)) return 1;
    return (clinician.careAreasSometimes ?? []).includes(facet.area) ? 0.5 : 0;
  }
  if (facet.kind === "manner") return clinician.manner.includes(facet.trait) ? 1 : 0;
  if (facet.kind === "language") {
    return clinician.languages.some((spoken) => spoken.toLowerCase() === facet.language.toLowerCase()) ? 1 : 0;
  }
  return holdsPreference(clinician, facet.preference) ? 1 : 0;
}

/**
 * A free-text field a patient reads whose wording can assert the same real-world fact a
 * structured, closed-vocabulary field answers separately — and can therefore drift from it
 * silently (M3, F6). `appointmentLength` and the `unhurried` manner trait are one instance:
 * `interview.ts`'s "length" question and its "unhurried" question ask the same thing in two
 * places, and nothing before this forced their answers to agree.
 *
 * Detection only. Nothing here changes what the matcher reads — `holdsPreference` still reads
 * the closed-vocabulary field exclusively, so a display twin's wording can never itself decide a
 * ranking, the exact inference `telehealthFirstAppointment`'s own doc comment (above) already
 * refuses for a different field. A hit here is surfaced to a person, and the record is corrected
 * by hand with its own citation, the way M3 corrected `anubhav-saxena`'s.
 */
export type DisplayTwin = {
  /** The clinician field a patient reads as prose. */
  field: "appointmentLength";
  /** Whether THIS clinician's own wording, as written, asserts the claim. */
  impliesClaim: (clinician: Clinician) => boolean;
  /** The preference the matcher must then hold true. */
  preference: Preference;
};

export const DISPLAY_TWINS: readonly DisplayTwin[] = [
  {
    field: "appointmentLength",
    impliesClaim: (clinician) => /\blonger?\s+(?:first\s+)?appointment/i.test(clinician.appointmentLength),
    preference: "longer-appointment",
  },
];

/**
 * Every display twin whose wording asserts a claim on this clinician that the matcher does not
 * hold. Empty is the healthy state; a non-empty result is the F6 shape — a promise on the page
 * the ranker cannot act on.
 */
export function unheldDisplayClaims(clinician: Clinician): DisplayTwin[] {
  return DISPLAY_TWINS.filter((twin) => twin.impliesClaim(clinician) && !holdsPreference(clinician, twin.preference));
}

/** Whether this clinician answers one stated need at all. Derived from `facetStrength`. */
function answers(clinician: Clinician, need: NeedSignal): boolean {
  return facetStrength(clinician, need.facet) > 0;
}

/**
 * Care areas the reader asked for that NOBODY on the roster declares.
 *
 * The probe found nine of the seventeen care areas are declared by neither GP — trauma-informed
 * care, children and adolescents, co-occurring autism, disability rights and five more. With two
 * clinicians that is expected and it is not a defect. Saying nothing about it IS a defect: a
 * reader who asks for trauma-informed care currently gets a list of two GPs, neither of whom said
 * they do it, and no indication that the gap is in the listing rather than in their question.
 *
 * Same posture as the Gold Coast answer in the sequence: name the gap, put it on the directory,
 * and do not let the reader conclude it is about them.
 */
/**
 * The sentence a reader is owed when nobody listed answers what they asked for (O110).
 *
 * ONE SHAPE FOR EVERY FACET KIND, and it is a fact about a DECLARATION rather than a claim
 * about ability — W193's posture, the same one the profile's missed-asks list uses. "No GP
 * listed today says they do bulk billing" was the old shape and it only ever had to work for
 * care areas; the labels this now covers are noun phrases ("Bulk billing") and adjectival
 * ones ("Calm and steadying", "Strengths-focused"), and the declaration framing is the one
 * form all three read correctly in.
 *
 * It lives here rather than in the JSX because a sentence that decides an honesty claim
 * should be unit-testable, not only walkable in a browser.
 */
/**
 * A facet label, lowered to sit inside a sentence — without breaking the words that must not be.
 *
 * O21 learned this on the REASON line: lower-casing labels "read tidily until a label carried a
 * proper noun — 'Hindi-speaking' became 'hindi-speaking', which is a typo on the one word in the
 * sentence a reader is scanning for" — and stopped doing it there. The missed-asks line never
 * got the same treatment and printed "You also asked for adhd in children and adolescents".
 *
 * NEITHER PURE APPROACH IS RIGHT, which is why this is a helper rather than a deletion. Six of
 * the twenty-seven labels break when lowered (ADHD ×2, PTSD, GP, Hindi, Urdu); the other
 * twenty-one read WORSE unlowered, because "You also asked for A longer first appointment" is as
 * wrong as "adhd". Three rules, each from a real label in the vocabulary:
 *
 *   1. Only the FIRST CHARACTER is ever touched. That alone saves "Trauma and PTSD" and
 *      "A woman GP", where the acronym is interior.
 *   2. A first word that is an ACRONYM is left alone — "ADHD assessment".
 *   3. A LANGUAGE facet is left alone entirely: its label is built from a language name, so it
 *      is a proper noun by construction. The caller always knows this, because it is holding
 *      the `NeedSignal` the label came from.
 */
export function labelInSentence(need: NeedSignal): string {
  const label = need.label;
  if (need.facet.kind === "language") return label;
  const firstWord = label.split(/[\s-]/)[0] ?? "";
  if (firstWord.length > 1 && firstWord === firstWord.toUpperCase()) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * What the profile says about an ask this clinician has not declared (O51, moved here by O118).
 *
 * Declaration-framed: "not something they declare" is a fact about a declaration and never a
 * claim about ability (W193). It lives beside `unservedCopy` for the reason O110 moved that
 * one — copy that decides an honesty claim should be unit-testable, not only walkable.
 *
 * RETURNED AS PARTS, and the reason is a design decision rather than a convenience: the profile
 * emphasises the ASK inside an otherwise muted line (`.fit-missed-label` — ink, weight 600),
 * because the reader is scanning for the thing they asked for. Returning one flat string forced
 * the surface to choose between that emphasis and composing its own sentence, which is the
 * duplication this move exists to end. `missedAskCopy` joins the parts for callers that just
 * want the sentence, so there is still exactly one place the words live.
 */
export function missedAskParts(need: NeedSignal): { before: string; label: string; after: string } {
  const facet = need.facet;
  let after = " — not something they declare. Another listing may.";
  if (facet.kind === "language") {
    after = " — not listed among the languages they consult in. Another listing may.";
  } else if (facet.kind === "preference") {
    const detail: Record<typeof facet.preference, string> = {
      "woman-gp": "this GP does not match that preference",
      "telehealth-first": "this listing does not show a telehealth first appointment",
      "bulk-billing": "this listing does not show bulk billing",
      "longer-appointment": "this listing does not show a longer first appointment",
    };
    after = ` — ${detail[facet.preference]}. Another listing may.`;
  }
  return {
    before: "You also asked for ",
    label: labelInSentence(need),
    after,
  };
}

export function missedAskCopy(need: NeedSignal): string {
  const { before, label, after } = missedAskParts(need);
  return `${before}${label}${after}`;
}

export function unservedCopy(label: string): string {
  return `${label} is not something any GP listed today declares. That is a gap in our listing, not in what you asked for.`;
}

/**
 * What the reader asked for that NOBODY on the roster declares.
 *
 * O110 widened this from care areas to care + manner + preference. It had been reading a
 * quarter of what it claimed to cover: measured against the real roster, the three facets no
 * listed GP declares today are `pref:bulk-billing` and the manner traits `steadying` and
 * `motivating` — so every reader asking about cost, or for a calm or strengths-focused GP,
 * was heard by the lexicon, ranked against a roster that could not answer them, and told
 * nothing at all. The line built for exactly that case could not see them.
 *
 * Language asks use the same closed vocabulary as onboarding. That lets the directory name a
 * known coverage gap even before a clinician who speaks that language joins the roster.
 */
export function unservedAsks(query: string, roster: readonly Clinician[] = clinicians): string[] {
  // A "sometimes" declaration is still a declaration (O2): a clinician the ranking scores for
  // an area must not appear under "no GP listed today says they do this" on the same screen.
  // O78 (audit): the roster is injectable like every other entry point — this was the last
  // reader of the global roster, so a caller ranking a custom roster reported the GLOBAL
  // roster's gaps beside it, the exact class the O8 review fixed in `needsFor`.
  const declared = new Set(
    roster.flatMap((clinician) => [...clinician.careAreas, ...(clinician.careAreasSometimes ?? [])]),
  );
  return needsFor(query, roster)
    .filter((need) => {
      const facet = need.facet;
      if (facet.kind === "care") return !declared.has(facet.area);
      // A way of working nobody declares is a listing gap exactly as a care area is.
      if (facet.kind === "manner") {
        return !roster.some((clinician) => clinician.manner.includes(facet.trait));
      }
      // The preference kinds are where a three-GP roster's real gaps are — billing above all.
      if (facet.kind === "preference") {
        return !roster.some((clinician) => holdsPreference(clinician, facet.preference));
      }
      if (facet.kind === "language") {
        return !roster.some((clinician) =>
          clinician.languages.some((language) => language.toLowerCase() === facet.language.toLowerCase()),
        );
      }
      return false;
    })
    .map((need) => unservedCopy(need.label));
}

/**
 * WHETHER THE ORDER MEANS ANYTHING, which the finder has to be able to say.
 *
 * THE DEFECT THIS EXISTS FOR, measured rather than suspected. A probe over seventeen realistic
 * first-person queries found the lexicon reached NOTHING on nine of them and that ten produced an
 * exact score tie — including "I think I might have ADHD", which is the single most likely thing
 * anybody types. In every one of those cases the list still rendered as a ranked list, and the
 * order was decided by the owner-behind tie-break: by nothing, presented as by something.
 *
 * That is the same class of defect as the fabricated `nextAvailable` this file deleted. A ranking
 * nobody can act on is worse than no ranking, because the reader spends their trust on it. So the
 * fact is computed and surfaced, and the finder says which of the three it is:
 *
 *   informed  — the words reached facets and the clinicians differ on them. The order is earned.
 *   tied      — facets were reached and every clinician answers them equally. Order is arbitrary.
 *   unmatched — nothing was reached. There is no order; this is just the roster.
 *
 * It is not a confidence score. It is a statement about whether a comparison happened at all,
 * which is a fact rather than an estimate, and it can therefore be said in one sentence — W213's
 * floor applies to this as much as to a match reason.
 */
/**
 * What the order on the results screen is worth.
 *
 * O111 split `unserved` out of `unmatched`. The two had always been different situations —
 * NOTHING WAS READ, versus SOMETHING WAS READ THAT NOBODY ANSWERS — and `matchQuality` had
 * routed both to one value with copy describing only the first. A reader asking about bulk
 * billing was told "we could not tell what you are looking for" directly above a line naming
 * bulk billing. Everything that branches on `!== "informed"` is unaffected: `unserved` is not
 * an informed order either, and only the sentence differs.
 */
export type MatchQuality = "informed" | "tied" | "unmatched" | "unserved";

/**
 * The smallest share of the DISTINCT facets a query reached that must actually separate the
 * roster before the order earns `informed` — M7 (F8, Q-M Phase 2).
 *
 * THE DEFECT THIS FIXES. `matchQuality` used to call the order `informed` the moment ANY two
 * scores differed AT ALL — the appraisal's own diagnosis (F8): at this roster's real size (two
 * GPs) one differing facet always clears that bar, because there is no partial-tie middle
 * ground at N=2 (M5's `partialTie` finding). "This order was earned" was thereby the weakest
 * claim the grade could make.
 *
 * WHY HALF, MEASURED RATHER THAN GUESSED. A query asking about exactly one thing (the
 * appraisal's own worked example, weight 24 vs 0) differs on the WHOLE ask — ratio 1, correctly
 * `informed`. A query asking about two things where one ties and one does not differs on HALF
 * the ask — ratio 0.5 — and every existing pinned case at that ratio (O13's Hindi-plus-
 * non_judgemental example, and all three live clarifier answers in `clarify.test.ts`) is one
 * this tree already calls earned, so the boundary is inclusive rather than strict. What stops
 * qualifying: a query asking about three or four things where a single thin facet decides it
 * while the rest tie uninformatively. Measured on the real 447-sentence corpus, exactly three
 * sentences move from `informed` to `tied` — "a gentle GP who takes trauma seriously and bulk
 * bills" (ratio 0.25), "telehealth assessment and I speak Hindi at home" and "a calm doctor for
 * my anxious mum, she speaks Hindi" (both 0.33) — and the M6 ladder tally moves with them
 * (`extractor-quality.test.ts` re-pins both `informed`/`tied`).
 */
export const INFORMED_SEPARATION_RATIO = 0.5;

/** `separationRatio`'s computation, given needs already resolved — the shared inner step. */
function separationRatioForNeeds(needs: readonly NeedSignal[], roster: readonly Clinician[]): number | null {
  if (needs.length === 0) return null;
  const askedFacets = new Map<string, NeedSignal["facet"]>();
  for (const need of needs) askedFacets.set(facetKey(need.facet), need.facet);
  const differing = [...askedFacets.values()].filter(
    (facet) => new Set(roster.map((clinician) => facetStrength(clinician, facet))).size > 1,
  ).length;
  return differing / askedFacets.size;
}

/**
 * The fraction of distinct facets a query reached on which the roster's declared strength
 * actually differs — the measure `matchQuality` grades `informed` against. `null` when the
 * query reached nothing. Exported so the boundary can be asserted directly rather than only
 * through the four-way label.
 */
export function separationRatio(query: string, roster: readonly Clinician[] = clinicians): number | null {
  return separationRatioForNeeds(needsFor(query, roster), roster);
}

export function matchQuality(query: string, roster: readonly Clinician[] = clinicians): MatchQuality {
  const needs = needsFor(query, roster);
  if (needs.length === 0) return "unmatched";
  const profiles = roster.map((clinician) => rankingProfile(clinician, needs));
  const scores = profiles.map((profile) => profile.weightedScore);
  // Words that were READ but that nobody on the roster answers are not a tie — "both of these
  // answer what you asked for equally well" would be false. O111: they are not `unmatched`
  // either, which is the claim that the request could not be read. This branch always knew the
  // difference (the note said "`unservedAsks` names whose gap it is") and said it out loud only
  // in a comment; now it says it to the reader.
  if (scores.every((score) => score === 0)) return "unserved";
  // The facet-count ratio alone is not sufficient: on "English is my second language and
  // appointments move too fast" enough facets differ to clear the ratio while their individual
  // gains and losses cancel to an EXACT weightedScore tie — the ratio said informed on a query
  // where the actual order the reader would see is a dead heat. `informed` must still imply a
  // real score gap, never just a real facet-count gap.
  if (new Set(scores).size === 1) return "tied";
  const ratio = separationRatioForNeeds(needs, roster)!;
  return ratio >= INFORMED_SEPARATION_RATIO ? "informed" : "tied";
}

/**
 * The sentences beside a closed-books listing (O4/F5). Shown, not filtered: hiding a clinician
 * whose books are closed would decide for the reader that the waitlist is not worth their time,
 * and quietly ranking them first without this sentence is the dating-app anti-pattern of
 * recommending a profile that never swipes back. A fact, one sentence, inside W213's floor.
 *
 * TWO SENTENCES, NOT ONE, because "shown because they fit what you asked" is only true when a
 * fit was actually computed. On an unmatched query — or a zero-score row — no such fit exists,
 * and the fitting sentence would be the finder explaining a ranking that never happened, the
 * exact defect O1 removed. The caller picks by whether the clinician has match evidence.
 */
export const CLOSED_BOOKS_COPY =
  "Their books are closed to new patients right now — shown because they fit what you asked. The practice can say when that changes.";
export const CLOSED_BOOKS_NEUTRAL_COPY =
  "Their books are closed to new patients right now. The practice can say when that changes.";

/** The right closed-books sentence for this clinician and query. Empty when books are open. */
export function closedBooksNote(clinician: Clinician, query: string): string | null {
  if (clinician.acceptingNewPatients) return null;
  return matchEvidence(clinician, query).length > 0 ? CLOSED_BOOKS_COPY : CLOSED_BOOKS_NEUTRAL_COPY;
}

/** What the finder says when the order is not earned. Closed vocabulary, like every other reason. */
export const MATCH_QUALITY_COPY: Record<MatchQuality, string> = {
  informed: "",
  tied: "Both of these answer what you asked for equally well, so this is not a ranking — read both.",
  // O48: one sentence, not three lines. The clarifier beneath owns the "say more" invitation,
  // so this line only has to state the fact.
  unmatched:
    "We could not tell what you are looking for, so this is everyone we list — not an order.",
  /* O111: the sentence for a request that WAS read and that nobody listed answers. The old
     copy claimed a failure of comprehension where the real failure is coverage, which is the
     product blaming the reader for its own gap — and it rendered directly above the line that
     names the gap. This one is true, and it hands off to that line instead of contradicting
     it. `unservedAsks` supplies the specifics; this only has to stop lying. */
  unserved: "We understood what you asked for. Nobody listed today answers it — so this is everyone we list, not an order.",
};

/**
 * The ranked roster, grouped where the scores are exactly equal.
 *
 * WHY BANDS EXIST (the O3/F3 repair). `matchQuality` is roster-global: any two differing scores
 * read `informed`, so "one GP scored 24 and fifteen scored 0" would dress fifteen arbitrary
 * file-order positions in a banner that only disclaims full ties. The honesty the quality flag
 * bought at roster level has to exist at every boundary the reader acts on: within a band the
 * order is NOT a ranking, and a surface can now say so exactly where it is true rather than
 * only when it is true everywhere. Same closed-vocabulary posture as everything else — a band
 * is a fact about equal numbers, not an estimate.
 */
export type RankBand = {
  score: number;
  constraintCoverage: number;
  constraintScore: number;
  /** Care-tier score (M9). Part of the band key: a care-score difference is a real tie-break,
   *  not the arbitrary kind bands are meant to absorb. */
  careScore: number;
  /** Manner-tier score (M9). Same reasoning as `careScore`. */
  mannerScore: number;
  coverage: number;
  clinicians: Clinician[];
};

export function rankBands(query: string, roster: readonly Clinician[] = clinicians): RankBand[] {
  const needs = needsFor(query, roster);
  const bands: RankBand[] = [];
  for (const clinician of rankClinicians(query, roster)) {
    const profile = rankingProfile(clinician, needs);
    const last = bands.at(-1);
    if (
      last &&
      last.score === profile.weightedScore &&
      last.constraintCoverage === profile.constraintCoverage &&
      last.constraintScore === profile.constraintScore &&
      last.careScore === profile.careScore &&
      last.mannerScore === profile.mannerScore &&
      last.coverage === profile.coverage
    ) {
      last.clinicians.push(clinician);
    } else {
      bands.push({
        score: profile.weightedScore,
        constraintCoverage: profile.constraintCoverage,
        constraintScore: profile.constraintScore,
        careScore: profile.careScore,
        mannerScore: profile.mannerScore,
        coverage: profile.coverage,
        clinicians: [clinician],
      });
    }
  }
  return bands;
}

/**
 * The sentence for a top-of-list tie that the roster-global verdict cannot see.
 *
 * `informed` with a tied first band is the case F3 found: an order exists somewhere in the
 * list, just not at the boundary the reader acts on first. Only the count is interpolated —
 * a numeral is arithmetic, not authored copy, the same rule the audit's "declares N of M" uses.
 */
export function topTieNote(query: string, roster: readonly Clinician[] = clinicians): string | null {
  if (matchQuality(query, roster) !== "informed") return null;
  const top = rankBands(query, roster)[0];
  if (!top || top.clinicians.length < 2) return null;
  return `The first ${top.clinicians.length} all answer what you asked equally well, so the order between them is not a ranking — read them as a group.`;
}

/**
 * Everything the reader asked for that this roster can be compared on: the lexicon's closed
 * vocabulary plus the languages the roster itself declares.
 *
 * THIS IS THE ONE ENTRY POINT (the O1/F2 repair). Until the overhaul, language signals were
 * appended to `matchEvidence` alone — shown on the card, invisible to `scoreAgainst` and
 * `matchQuality` — so somebody who asked only for a Tamil-speaking GP was told "this is
 * everyone we list rather than an order" beside a card explaining a ranking that never
 * happened. The ranking, the quality verdict, the explanation and the console audit now all
 * read this function, so none of them can see a signal the others cannot.
 */
export function needsFor(query: string, roster: readonly Clinician[] = clinicians): NeedSignal[] {
  // The language vocabulary and the rarity statistics both come from the roster ACTUALLY being
  // ranked — the O8 review caught the first draft reading the global roster here while every
  // ranking entry point accepted an injectable one, which scored a custom roster against a
  // different roster's statistics (clarify.ts states the rule: the list the reader is looking at).
  const spoken = [...new Set([...MATCHABLE_LANGUAGES, ...roster.flatMap((c) => c.languages)])];
  const signals = [...readNeeds(query), ...languageNeeds(query, spoken)];
  const said = query.toLowerCase();
  return signals.map((need) => {
    const answer = CLARIFIER_ANSWERS.get(facetKey(need.facet));
    const confirmed = answer !== undefined && said.includes(answer);
    return {
      ...need,
      weight: roundScore(
        need.weight *
          (confirmed ? STATED_IMPORTANCE_LIFT : 1) *
          separation(declaredMass(roster, need), roster.length),
      ),
    };
  });
}

/**
 * Scores snap to three decimal places wherever one is produced.
 *
 * WHY (O8 review): the separation factor puts `(N − heldBy + 1) / N` into every weight, which
 * is not exactly representable in floating point once N is not a power of two — so two
 * mathematically equal totals could compare unequal, and a band boundary or an "informed"
 * verdict would then be dressing float dust as preference information. The smallest real
 * difference the arithmetic can produce is far above a thousandth; anything below it is noise,
 * rounded away at the source so every comparison downstream stays a plain `===`.
 */
export function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Every clarifier answer sentence, keyed by the facet it confirms.
 *
 * WHY SUBSTRING DETECTION IS FINE HERE AND WAS NOT IN W222: these are OUR OWN fixed sentences,
 * appended verbatim by the clarifier UI ("tapping appends the answer in the reader's own
 * request") — this is marker detection on constants, not an attempt to read a person's
 * language. A reader who types the sentence unprompted has still said it, and the lift is
 * still their own statement being taken at its word.
 */
const CLARIFIER_ANSWERS: ReadonlyMap<string, string> = new Map(
  Object.entries({ ...CARE_PROMPTS, ...MANNER_PROMPTS, ...PREF_PROMPTS }).map(([key, copy]) => [
    key,
    copy.answer.toLowerCase(),
  ]),
);

/**
 * OkCupid's deepest design insight, collected conversationally (O5/F6): importance is the
 * READER'S datum, not the platform's. The lexicon's 30/20/12 weights guess how much any asker
 * cares about titration vs sleep — the same guess for everyone. An answered clarifier is the
 * reader SAYING a facet matters, so a confirmed facet carries half again its lexicon weight:
 * "you told us this was the main thing" is a sentence about their own words, inside the floor.
 * One-and-a-half is a judgement, and a sayable one — more than a passing mention, not a veto.
 */
const STATED_IMPORTANCE_LIFT = 1.5;

/**
 * How much of a facet's weight survives, given how many of the roster hold it (the O2/F1
 * rarity discount — OkCupid's normalisation and IR's IDF, reduced to a sentence).
 *
 * `(N − heldBy + 1) / N`, capped at 1. A facet nobody else declares keeps its whole weight; a
 * facet the entire roster declares keeps 1/N of it — it is still true of everyone shown, so it
 * still counts, but it cannot decide an order between people it does not separate. The quantity
 * is the same `heldBy / roster` the clarifier already ranks its questions by, and it is sayable
 * within W213's floor: "declared by most of the GPs listed, so it separates them less" or "few
 * of the GPs listed say they do this".
 *
 * O182 — THE SENTENCE THAT USED TO END THIS COMMENT WAS FALSE, AND IS CORRECTED RATHER THAN
 * DELETED. It read: "Without this, `scoreAgainst` is monotone in declarations and ticking every
 * interview box is the dominant strategy the day the roster self-declares." That is not what this
 * function does. It discounts POPULAR FACETS; it does not penalise BROAD DECLARERS. Nothing in the
 * formula reads how many facets a clinician declared, and the two are different axes — a clinician
 * who ticks a RARE box pays nothing for the breadth and collects the facet at full weight.
 *
 * So `scoreAgainst` is still monotone in declarations, and box-ticking is still profitable; it is
 * merely profitable on rare facets instead of common ones, which is the worse of the two for a
 * patient, because rare facets are the ones nobody else can serve if the claim is false. The
 * discount is weakest exactly where box-ticking pays best.
 *
 * This is recorded here, unfixed, on purpose. The instrument that would actually price breadth is a
 * DECLARATION BUDGET — a fixed allocation each clinician spends across facets, so breadth has a
 * self-enforced opportunity cost and no coupling between clinicians at all — and that is a change
 * to what the onboarding interview ASKS, not to how an answer is weighed. It is the first item of
 * the Q-A quarter in docs/MATCHING-YEAR-PLAN.md. What must not happen in the meantime is this
 * comment going on claiming a property the code does not have, because the next reader would build
 * on it: an overstated justification is worse than none, which is a rule this tree already wrote
 * for itself in `src/matching/match.ts`.
 */
function separation(heldBy: number, rosterSize: number): number {
  if (rosterSize === 0) return 1;
  return Math.min(1, (rosterSize - heldBy + 1) / rosterSize);
}

/**
 * How much of the roster's DECLARED CAPABILITY covers this facet — O182.
 *
 * THE EXPLOIT THIS CLOSES, MEASURED BEFORE IT WAS FIXED. `heldBy` used to be
 * `roster.filter((c) => answers(c, need)).length` — a count of booleans, where `answers()` is true
 * for an "often" declaration and equally true for a "sometimes" one. Scoring does not agree with
 * that: `declarationFactor` pays a "sometimes" declarer HALF. So the two halves of the same idea
 * disagreed, and the gap between them was a strategy.
 *
 * Measured on a two-clinician roster, one facet, one request:
 *   A declares anxiety OFTEN, B declares nothing      -> the facet is worth 24, A scores 24.
 *   A declares anxiety OFTEN, B declares it SOMETIMES -> the facet is worth 12, A scores 12, B 6.
 * B halved A's facet by making a claim B is only paid half for. Diluting a rival cost half what
 * matching them would have, so the cheapest way to compete on a facet you do not really do was to
 * say you sometimes do it — which is precisely the box-ticking the rarity discount was introduced
 * to prevent, arriving through the discount itself.
 *
 * The fix is to make the two halves agree: rarity now counts the SAME quantity scoring pays out,
 * summed across the roster. A "sometimes" declarer contributes 0.5 to the facet's coverage and is
 * paid 0.5 for it, so dilution costs exactly what it buys and the strategy disappears.
 *
 * WHAT THIS IS NOT. Not a per-clinician weight (C2) — the number comes from the roster's own
 * declarations, and no clinician's identity enters it. Still sayable inside W213's floor: "one of
 * the two GPs listed says they do this often and the other sometimes, so it separates them less
 * than if only one of them did it at all."
 *
 * KNOWN AND ACCEPTED: on a roster where EVERY clinician declares a facet at "sometimes", coverage
 * is N/2 rather than N, so the facet keeps more weight than one everybody declares "often". That is
 * the arithmetic being consistent rather than a defect — those clinicians are each claiming half —
 * and it cannot change an ORDER, because every score in that case is scaled by the same factor.
 */
function declaredMass(roster: readonly Clinician[], need: NeedSignal): number {
  return roster.reduce((mass, clinician) => mass + facetStrength(clinician, need.facet), 0);
}

/**
 * The needs this clinician actually answers, in the reader's asking order.
 *
 * ONE COMPUTATION, TWO CONSUMERS. The ranking and the explanation both read this, so the page
 * cannot rank somebody first for a reason it then fails to print — which is exactly what the two
 * separate lexicons used to allow. A language the reader did not ask for is not in here at all,
 * because it was never a `NeedSignal`.
 */
export function matchEvidence(
  clinician: Clinician,
  query: string,
  roster: readonly Clinician[] = clinicians,
): NeedSignal[] {
  return needsFor(query, roster)
    .filter((need) => answers(clinician, need))
    // The weight the card's evidence carries is the weight this clinician's answer actually
    // earned - halved where they declared "sometimes" - so the audit and the unity test can
    // hold score === sum of evidence with no carve-outs.
    .map((need) => ({ ...need, weight: roundScore(need.weight * facetStrength(clinician, need.facet)) }));
}

/**
 * The other half of the profile's honesty (O51, year plan "Explaining the fit", Q1): the asks
 * THIS clinician does not answer, named per clinician instead of living only in the console's
 * "Missed" column and the global unserved note.
 *
 * SAME READ AS THE EVIDENCE, INVERTED FILTER — `matchEvidence` and this function consume one
 * `needsFor` pass, so the profile's two lists partition the reader's asks exactly and can
 * never disagree with the ranking or with each other.
 *
 * Every recognised ask is included. The copy helper uses declaration language only for care and
 * manner; language and access constraints get literal, facet-specific wording.
 */
export function missedAsks(
  clinician: Clinician,
  query: string,
  roster: readonly Clinician[] = clinicians,
): NeedSignal[] {
  return needsFor(query, roster).filter((need) => !answers(clinician, need));
}

export type RequestFitSummary = {
  recognizedNeedCount: number;
  constraintCount: number;
  fullMatchCount: number;
  bestCoverage: number;
  bestConstraintCoverage: number;
};

/** Roster-level fit without conflating collective coverage with one clinician meeting every ask. */
export function requestFitSummary(
  query: string,
  roster: readonly Clinician[] = clinicians,
): RequestFitSummary {
  const needs = needsFor(query, roster);
  const profiles = roster.map((clinician) => rankingProfile(clinician, needs));
  const constraintCount = needs.filter(
    (need) => need.facet.kind === "preference" || need.facet.kind === "language",
  ).length;
  return {
    recognizedNeedCount: needs.length,
    constraintCount,
    fullMatchCount: needs.length === 0 ? 0 : profiles.filter((profile) => profile.coverage === needs.length).length,
    bestCoverage: Math.max(0, ...profiles.map((profile) => profile.coverage)),
    bestConstraintCoverage: Math.max(0, ...profiles.map((profile) => profile.constraintCoverage)),
  };
}

/** Honest results copy for how many individual listings, if any, answer the complete request. */
export function requestFitCopy(summary: RequestFitSummary, rosterSize: number): string | null {
  if (summary.recognizedNeedCount === 0 || rosterSize === 0) return null;
  if (summary.fullMatchCount === rosterSize) {
    if (rosterSize === 1) return "This listed GP matches every part of your request we understood.";
    if (rosterSize === 2) return "Both listed GPs match every part of your request we understood.";
    return `All ${rosterSize} listed GPs match every part of your request we understood.`;
  }
  if (summary.fullMatchCount > 0) {
    return `${summary.fullMatchCount} of ${rosterSize} listed GPs ${summary.fullMatchCount === 1 ? "matches" : "match"} every part of your request we understood.`;
  }
  return "No listed GP matches every part of your request we understood. Showing the strongest declared matches.";
}

/**
 * Rank by stated preference, then bring the near ones forward.
 *
 * TWO-STAGE ON PURPOSE. Distance does not outrank fit: somebody who asked for a Tamil-speaking GP
 * is not helped by the nearest one who does not speak Tamil, and a directory that sorted purely by
 * kilometres would quietly undo everything the preference weights express. So the preference order
 * is computed first and distance only reorders WITHIN comparable fit.
 *
 * COMPARABLE FIT IS AN EXACT SCORE TIE, NOT A NUMBER OF LIST POSITIONS (the O3/F4 repair). The
 * old band was four RANK positions — but rank positions inside a score tie are arbitrary (stable
 * sort = file order), so on an unmatched query with an origin the nearest clinician at file
 * position 13 could not rise past a band that was protecting nothing but file order. Inside an
 * exact tie no preference information exists, so distance — a fact the reader gave us — is the
 * only honest sort; across ANY real score difference, the stated preference stands, however
 * small the gap. No threshold, no judgement call: the predicate is "did the preferences
 * separate them at all". An unmatched query with an origin is now fully distance-sorted, which
 * is exactly what the reader asked for. This is also how the dating platforms treat distance:
 * a hard input within preference-comparable candidates, never a post-hoc shuffle bounded by
 * list position.
 *
 * Clinicians whose suburb is not in the gazetteer keep their preference position rather than
 * sinking. An unknown location is a gap in our data, and penalising a practice for it would be
 * making them pay for our missing row.
 */
export function rankCliniciansNear(
  query: string,
  origin: SuburbPoint | null,
  roster: readonly Clinician[] = clinicians,
  today: Date = new Date(),
): Clinician[] {
  const byFit = rankClinicians(query, roster, today);
  if (!origin) return byFit;

  const needs = needsFor(query, roster);
  // O85: the distance a clinician sorts on is the nearest of their consulting locations —
  // somebody with Hornsby rooms IS near a Hornsby reader, whatever their primary suburb says.
  const km = (c: Clinician) => nearestLocation(c, origin)?.km ?? null;

  /**
   * NOT A COMPARATOR, ON PURPOSE (O8 review). The pairwise version was intransitive: a
   * telehealth clinician compared by fit order against neighbours who compared by distance
   * against each other, which is a cycle the moment those two orders disagree — and a sort
   * over a cyclic comparator renders whatever the engine's pivot choices happen to produce.
   * So the reorder is structural instead: within each (score, capacity) tie, the clinicians
   * with a real distance swap among the POSITIONS they already occupy, sorted by kilometres;
   * telehealth-first and unknown-suburb clinicians keep their exact fit position, because
   * somebody you do not travel to is equally near from everywhere, and an unknown location is
   * our missing row, not their penalty. Total, deterministic, and every guarantee holds by
   * construction: distance never crosses a score or capacity boundary, and equal kilometres
   * keep the fit order (which carries the owner-behind rule).
   */
  const out = [...byFit];
  const tieKey = (c: Clinician) => {
    const profile = rankingProfile(c, needs);
    return `${profile.constraintCoverage}|${profile.constraintScore}|${profile.weightedScore}|${profile.coverage}|${CAPACITY_ORDER[capacityGrade(c, today)]}`;
  };
  let start = 0;
  while (start < out.length) {
    let end = start;
    while (end + 1 < out.length && tieKey(out[end + 1]!) === tieKey(out[start]!)) end += 1;

    const movable: number[] = [];
    for (let i = start; i <= end; i += 1) {
      const c = out[i]!;
      if (!c.telehealthFirstAppointment && km(c) !== null) movable.push(i);
    }
    const nearestFirst = movable
      .map((i) => out[i]!)
      .sort((a, b) => km(a)! - km(b)!);
    movable.forEach((position, j) => {
      out[position] = nearestFirst[j]!;
    });

    start = end + 1;
  }
  return out;
}

/**
 * A clinician's consulting locations that the gazetteer can place: the primary suburb plus
 * any declared `alsoConsultsAt` (O85). A location the gazetteer cannot resolve is simply
 * absent from the list — our missing row, never their penalty (the standing law).
 */
function consultingPoints(clinician: Clinician): Array<{ suburb: string; point: SuburbPoint }> {
  return [clinician.suburb, ...(clinician.alsoConsultsAt ?? [])]
    .map((suburb) => ({ suburb, point: resolvePlace(suburb) }))
    .filter((entry): entry is { suburb: string; point: SuburbPoint } => entry.point !== null);
}

/** The nearest of a clinician's consulting locations to an origin, or null if none resolve. */
function nearestLocation(clinician: Clinician, origin: SuburbPoint): { suburb: string; km: number } | null {
  let best: { suburb: string; km: number } | null = null;
  for (const { suburb, point } of consultingPoints(clinician)) {
    const km = distanceKm(origin, point);
    if (!best || km < best.km) best = { suburb, km };
  }
  return best;
}

/**
 * Every place this clinician consults, as one label: "Double Bay & Hornsby" (O85). The row
 * and the profile render this instead of the bare suburb, so a second location is a fact
 * the reader sees rather than one only the distance sort knows.
 */
export function locationLabel(clinician: Clinician): string {
  return [clinician.suburb, ...(clinician.alsoConsultsAt ?? [])].join(" & ");
}

/** The distance sentence for a clinician, or null when there is nothing honest to say. */
export function distanceTo(clinician: Clinician, origin: SuburbPoint | null): string | null {
  // A kilometre figure beside somebody you never travel to is a number that answers no question.
  if (clinician.telehealthFirstAppointment) return "by telehealth, wherever you are";
  if (!origin) return null;
  const nearest = nearestLocation(clinician, origin);
  if (!nearest) return null;
  const said = describeDistance(nearest.km);
  /* O85: with more than one consulting location the sentence names the rooms it measured
     whenever they are not the primary suburb — a distance to the Hornsby rooms must never
     render as though it were the distance to Double Bay. */
  return nearest.suburb === clinician.suburb ? said : `${said} (their ${nearest.suburb} rooms)`;
}

/**
 * F5's threshold — M1 stated it rather than letting it fall out of the refactor; M2 (this unit)
 * is where its polarity gets DECIDED, in public, on evidence rather than left open.
 *
 * DECIDED: WIDEN, staying at `0.5`. `care-archetypes.test.ts`'s M2 test measures both ways —
 * narrowing to `1` (only a formal "often" declaration is eligible; a "sometimes" declaration
 * scores ZERO instead of half) empties `anxiety-differential-hindi` to NO eligible clinician at
 * all, because it routes to a clinician who holds its required area at the "sometimes" grade
 * and nowhere stronger. (O191: the evidence was two journeys of six until the sleep journey —
 * the other "sometimes"-dependent one — was replaced; the argument is unchanged.) Widening keeps all six servable and pays
 * the interest-grade declaration exactly the half-weight it earned — never rendered as a full
 * match, per W213's explain module — rather than a directory that either advertises care it
 * cannot reach (narrowing) or inflates a "sometimes" into an "often" (the bug F5 named).
 */
export const ELIGIBILITY_CARE_THRESHOLD = 0.5;

/**
 * `careThreshold` defaults to the decided value and exists so M2's measurement can call this
 * SAME function at the narrow threshold (`1`) rather than a shadow reimplementation — every
 * production caller keeps the default and is unaffected.
 */
export function cliniciansMatchingArchetype(
  archetype: CareArchetype,
  careThreshold: number = ELIGIBILITY_CARE_THRESHOLD,
): Clinician[] {
  const { requirements } = archetype;

  return clinicians.filter((clinician) => {
    const matchesGender = !requirements.preferredGender || clinician.gender === requirements.preferredGender;
    const matchesLanguage = !requirements.languageOptions?.length || requirements.languageOptions.some((language) =>
      clinician.languages.some((spoken) => spoken.toLowerCase() === language.toLowerCase()),
    );
    const matchesCareAreas = requirements.careAreas.every(
      (area) => facetStrength(clinician, { kind: "care", area }) >= careThreshold,
    );
    const matchesAccess = !requirements.wheelchairAccessible || clinician.wheelchairAccessible;

    return matchesGender && matchesLanguage && matchesCareAreas && matchesAccess;
  });
}

/**
 * "a", "a and b", "a, b and c" - a readable list, so no surface needs a separator character.
 *
 * `Intl.ListFormat` rather than hand-rolled joining, for two reasons. It gets the Australian
 * conjunction right (no Oxford comma) without this file holding an opinion about it, and the
 * hand-rolled version indexed `items[items.length - 1]`, which W167's fold-site register counts
 * as a fold and would have needed a declared rationale. A fold that does not have to exist is
 * better removed than declared.
 */
const LIST_FORMAT = new Intl.ListFormat("en-AU", { style: "long", type: "conjunction" });

function asList(items: readonly string[]): string {
  return LIST_FORMAT.format(items);
}

export function getPersonalizedMatch(clinician: Clinician, query: string, roster: readonly Clinician[] = clinicians) {
  /**
   * DERIVED, NOT RE-DERIVED. This used to be a second lexicon: a forty-line if-chain testing its
   * own phrase lists against the same care areas the ranker tested against different ones. Two
   * lexicons for one job, and they had already drifted — the ranker weighted "wearing off" and
   * this did not, so a clinician could be ranked first for a reason the page then declined to
   * print. Both now read `matchEvidence`, so the explanation IS the ranking's evidence and the
   * two cannot disagree. `src/matching/needs.test.ts` asserts that property directly.
   */
  // O222: `roster` threads through — the evidence weights and the language vocabulary derive
  // from the roster the RANKING ran over, so the explanation can never describe a different one.
  const evidence = matchEvidence(clinician, query, roster);
  const signals = evidence.map((need) => need.label);

  /**
   * The reason sentence, composed from the closed vocabulary and nothing else — W213's floor. It
   * is never templated from the reader's own words: echoing somebody's phrasing back at them
   * reads as understanding and is only string interpolation, and on a health surface the
   * difference matters.
   */
  const reason = signals.length === 0
    ? clinician.matchLine
    /* Labels keep the case they were authored in. Lower-casing them read tidily until a label
       carried a proper noun — "Hindi-speaking" became "hindi-speaking", which is a typo on the
       one word in the sentence a reader is scanning for. */
    : `${clinician.shortName}: ${asList(signals.slice(0, 3))}.`;

  return { reason, signals };
}
