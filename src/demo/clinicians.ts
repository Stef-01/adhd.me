import type { CareArchetype, CareArea } from "./care-archetypes";
import { describeDistance, distanceKm, resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import { facetKey, holdsPreference, languageNeeds, readNeeds, type NeedSignal } from "@/matching/needs";
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
    const byScore = scoreAgainst(b, needs) - scoreAgainst(a, needs);
    if (byScore !== 0) return byScore;

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

    /**
     * A TIE MUST NEVER BE BROKEN IN THE FOUNDER'S FAVOUR, AND UNTIL W221 IT SILENTLY WAS.
     *
     * `Array.prototype.sort` is stable, so equal scores kept source order — and Dr Saxena is the
     * first record in the file. On a request that names nothing either GP is declared for, both
     * score identically and the founder took first place every time. Reordering the file would
     * only move the accident, so the rule is stated: where the stated preference does not separate
     * them, a clinician with a disclosed interest in this product sorts BEHIND one without.
     */
    const conflicted = (clinician: Clinician) => (clinician.founderInterest ? 1 : 0);
    return conflicted(a) - conflicted(b);
  });
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
  let total = 0;
  for (const need of needs) {
    if (!answers(clinician, need)) continue;
    // Each contribution is rounded EXACTLY as `matchEvidence` rounds it, then the total is
    // rounded again — the same arithmetic in the same order, so the audit's sum of evidence
    // can never differ from the score by a thousandth (Codex review on PR #1 constructed the
    // counterexample: per-item rounding on one path, total-only rounding on the other).
    total += roundScore(need.weight * declarationFactor(clinician, need));
  }
  // Rounded so equal-by-arithmetic totals are equal-by-===; see `roundScore`.
  return roundScore(total);
}

/**
 * What one declared answer is worth: everything for "often", half for "sometimes".
 *
 * NOT A PER-CLINICIAN COEFFICIENT. C2 forbids an engineered number keyed to a named person;
 * this is the clinician's OWN interview answer given its stated price, the same way the
 * declaration itself is their own datum. Half is a judgement, and a sayable one: "they see
 * this sometimes rather than often" is a sentence, where a tuned 0.63 would not be.
 */
function declarationFactor(clinician: Clinician, need: NeedSignal): number {
  const facet = need.facet;
  if (facet.kind !== "care") return 1;
  if (clinician.careAreas.includes(facet.area)) return 1;
  return (clinician.careAreasSometimes ?? []).includes(facet.area) ? 0.5 : 1;
}

/** Whether this clinician answers one stated need. Declared facets only. */
function answers(clinician: Clinician, need: NeedSignal): boolean {
  const facet = need.facet;
  if (facet.kind === "care") {
    return clinician.careAreas.includes(facet.area) || (clinician.careAreasSometimes ?? []).includes(facet.area);
  }
  if (facet.kind === "manner") return clinician.manner.includes(facet.trait);
  if (facet.kind === "language") {
    return clinician.languages.some((spoken) => spoken.toLowerCase() === facet.language.toLowerCase());
  }
  return holdsPreference(clinician, facet.preference);
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
 * Languages are deliberately absent: `languageNeeds` only creates a need for a language the
 * roster SPEAKS, so an unspoken language never becomes a silent miss and has nothing to
 * report here.
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
  return readNeeds(query)
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
 * order was decided by the founder-behind tie-break: by nothing, presented as by something.
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
export type MatchQuality = "informed" | "tied" | "unmatched";

export function matchQuality(query: string, roster: readonly Clinician[] = clinicians): MatchQuality {
  const needs = needsFor(query, roster);
  if (needs.length === 0) return "unmatched";
  const scores = roster.map((clinician) => scoreAgainst(clinician, needs));
  // Main's W221 rebuild carried one improvement the overhaul had not made, kept through the
  // merge: words that were READ but that nobody on the roster answers are not a tie — "both of
  // these answer what you asked for equally well" would be false. It is an unmatched listing,
  // and `unservedAsks` names whose gap it is.
  if (scores.every((score) => score === 0)) return "unmatched";
  return new Set(scores).size > 1 ? "informed" : "tied";
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
export type RankBand = { score: number; clinicians: Clinician[] };

export function rankBands(query: string, roster: readonly Clinician[] = clinicians): RankBand[] {
  const needs = needsFor(query, roster);
  const bands: RankBand[] = [];
  for (const clinician of rankClinicians(query, roster)) {
    const score = scoreAgainst(clinician, needs);
    const last = bands.at(-1);
    if (last && last.score === score) last.clinicians.push(clinician);
    else bands.push({ score, clinicians: [clinician] });
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
  const spoken = [...new Set(roster.flatMap((c) => c.languages))];
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
          separation(roster.filter((c) => answers(c, need)).length, roster.length),
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
 * of the GPs listed say they do this". Without this, `scoreAgainst` is monotone in declarations
 * and ticking every interview box is the dominant strategy the day the roster self-declares.
 */
function separation(heldBy: number, rosterSize: number): number {
  if (rosterSize === 0) return 1;
  return Math.min(1, (rosterSize - heldBy + 1) / rosterSize);
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
    .map((need) => ({ ...need, weight: roundScore(need.weight * declarationFactor(clinician, need)) }));
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
 * CARE AND MANNER ONLY, because the surface copy frames these as DECLARATIONS ("not something
 * they declare", W193's posture): a care area or a way of working is a thing a clinician
 * declares or does not. A preference like "a woman GP" or a language is a fact about who they
 * are, and "they have not declared being a woman" is not a sentence this product should put
 * beside a name — those asks keep their existing surfaces (the preference ordering itself,
 * and the language line).
 */
export function missedAsks(
  clinician: Clinician,
  query: string,
  roster: readonly Clinician[] = clinicians,
): NeedSignal[] {
  return needsFor(query, roster).filter(
    (need) =>
      (need.facet.kind === "care" || need.facet.kind === "manner") && !answers(clinician, need),
  );
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
   * keep the fit order (which carries the founder-behind rule).
   */
  const out = [...byFit];
  const tieKey = (c: Clinician) => `${scoreAgainst(c, needs)}|${CAPACITY_ORDER[capacityGrade(c, today)]}`;
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

export function cliniciansMatchingArchetype(archetype: CareArchetype): Clinician[] {
  const { requirements } = archetype;

  return clinicians.filter((clinician) => {
    const matchesGender = !requirements.preferredGender || clinician.gender === requirements.preferredGender;
    const matchesLanguage = !requirements.languageOptions?.length || requirements.languageOptions.some((language) =>
      clinician.languages.some((spoken) => spoken.toLowerCase() === language.toLowerCase()),
    );
    const matchesCareAreas = requirements.careAreas.every((area) => clinician.careAreas.includes(area));
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

export function getPersonalizedMatch(clinician: Clinician, query: string) {
  /**
   * DERIVED, NOT RE-DERIVED. This used to be a second lexicon: a forty-line if-chain testing its
   * own phrase lists against the same care areas the ranker tested against different ones. Two
   * lexicons for one job, and they had already drifted — the ranker weighted "wearing off" and
   * this did not, so a clinician could be ranked first for a reason the page then declined to
   * print. Both now read `matchEvidence`, so the explanation IS the ranking's evidence and the
   * two cannot disagree. `src/matching/needs.test.ts` asserts that property directly.
   */
  const evidence = matchEvidence(clinician, query);
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
