import type { CareArchetype, CareArea } from "./care-archetypes";
import { describeDistance, distanceKm, resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import { facetKey, languageNeeds, readNeeds, type NeedSignal } from "@/matching/needs";
import { type EIQuality } from "./emotional-fit";

/**
 * The roster behind /finder and the walkthrough.
 *
 * EVERY ENTRY IS NOW A REAL PERSON, WHICH INVERTS WHAT THIS FILE USED TO BE. It held fifteen
 * invented personas — invented people, invented availability, invented suburbs — with Dr Saxena
 * as the single marked exception, and that is what let the finder be shown to anybody without a
 * practice agreement in place. The personas are gone. Two real GPs at Beecroft Family & Skin
 * Cancer Clinic remain, and `realPerson` is set on both.
 *
 * THE COST OF THAT IS THAT NOTHING HERE MAY BE INVENTED ANY MORE, and several fields did not
 * survive the change. `nextAvailable` held a written-in time and is deleted (see `booking`).
 * Qualifications, languages, practice, prior posts and the biographies are taken from what each
 * doctor publishes about himself; where this file says something neither of them has published —
 * `nswAdhdTrained` above all — it is a DECLARATION relayed from the founders, not a check ADHD.ME
 * performed, and the surfaces say so.
 *
 * A NOTE ON WHAT IS STILL OWED. Dr Yadav's biography is written from his public record and his
 * co-founders' account of how he works, not from his own words. That is a stopgap: a biography is
 * the one field a clinician should write himself, and this one should be replaced with his copy
 * before the directory gate (G6) lifts.
 *
 * WHY `careAreas` IS A CLOSED VOCABULARY AND NOT FREE TEXT. Matching reads these, and a free
 * string would let a demo persona claim an area the archetypes cannot express, which produces
 * a finder that appears to work and silently cannot match. `CareArea` is therefore a union, and
 * an archetype requiring an area no clinician holds is a type error rather than an empty result.
 *
 * NOTHING HERE IS A COMPETENCE CLAIM. `focus`, `about` and `experience` are what a clinician says
 * they see often. This product does not assess clinicians, does not rank them by quality, and —
 * per src/directory/profile.ts — could not publish "ADHD specialist" even if somebody asked,
 * because ADHD is not an Ahpra-recognised specialty and s 133 governs the word.
 */

export type { CareArea };

export type Clinician = {
  id: string;
  name: string;
  shortName: string;
  gender: "woman" | "man" | "non-binary";
  pronouns: string;
  title: string;
  suburb: string;
  /**
   * Only meaningful for a practice somebody travels to.
   *
   * The `distance` string this replaced was a fabricated "4.8 km away" measured from nowhere: the
   * same number rendered for a reader in the next street and one two suburbs over. Distance is now
   * computed from the suburb the person gives (src/geo/suburbs.ts), and this field carries only
   * what is true without knowing where they are.
   */
  reach: string;
  /**
   * A portrait, or null.
   *
   * Null is a supported state, not a gap to fill later: the demo personas are synthetic and their
   * portraits are too, and a real clinician's likeness is theirs to supply. Surfaces render a
   * monogram when this is null. Nothing in this tree generates a face for a real person.
   */
  image: string | null;
  /** The practice these rooms belong to, as the practice writes it. */
  practice: string;
  /**
   * How a reader actually gets an appointment — PHASE 1, AND DELIBERATELY NOT A SLOT PICKER.
   *
   * `nextAvailable: string` used to live here, holding "Thursday, 8:30 am", and the booking screen
   * offered it beside two more times that were written into the component. That was survivable
   * while every clinician was invented. It is not survivable now: both entries are real people at
   * a real practice, and a hardcoded time is a fabricated appointment offered under a named
   * doctor. Deleted rather than moved somewhere safer.
   *
   * ADHD.ME DOES NOT HOLD AVAILABILITY, AND PHASE 1 DOES NOT TRY TO. Healthengine's own API is
   * inbound-only — a practice management system PUSHES a column to them; there is no sanctioned
   * read endpoint for a third party — and their robots.txt disallows `/api/`, `/json/`, `/book/`
   * and `/appointment/` to everyone. Scraping the GraphQL call their page makes would put stale
   * times under a real doctor's name and pick a fight with the platform this product will want a
   * partnership with. So the reader is handed OFF: they choose a clinician here, and the
   * appointment is chosen and confirmed on Healthengine, which is the system that actually knows.
   */
  booking:
    | {
        /** Bookable on Healthengine. `url` is their profile, which carries their live picker. */
        via: "healthengine";
        practitionerId: string;
        url: string;
      }
    | {
        /** Not synced to any online platform. The reader is sent to the practice, and told why. */
        via: "practice";
        url: string;
        note: string;
      };
  acceptingNewPatients: boolean;
  focus: string;
  matchLine: string;
  fitSignals: string[];
  practicalSignals: string[];
  about: string;
  experience: string[];
  languages: string[];
  careAreas: CareArea[];
  /**
   * Areas declared "sometimes" rather than "often" — the interview's three-state answer
   * (docs/MATCHING-PLAN.md §5), made representable by O2/F1. Breadth has to cost something:
   * a sometimes-declared area answers an ask at half its weight, so ticking every box in the
   * interview is no longer the dominant strategy. Absent means the profile predates the
   * three-state interview and every declaration is read as "often" — which is exactly what
   * those interviews asked.
   */
  careAreasSometimes?: CareArea[];
  /**
   * How this clinician works, declared by them, closed vocabulary (`MannerTrait`).
   *
   * The half of "will they understand me" that clinical scope cannot carry. Somebody writing "I
   * get rushed every time and I lose my thread" is not naming a care area; they are naming a way
   * of working. Before this field the only way to express that was a hand-written keyword weight
   * on one doctor's name in `rankClinicians`, which is a private editorial judgement about a
   * named person. Declared in the onboarding interview instead — see docs/MATCHING-PLAN.md §5.
   */
  manner: EIQuality[];
  wheelchairAccessible: boolean;
  appointmentLength: string;
  keywords: string[];
  /**
   * Set when the FIRST appointment can be by telehealth, not just the follow-ups.
   *
   * The distinction matters for ranking rather than for display. A clinician somebody can see
   * without travelling is equally reachable from every suburb, so sorting them by the distance to
   * rooms they do not need to visit measures the wrong thing: Dr Saxena sat 3rd on stated
   * preference and fell to 13th the moment a Beecroft origin was given, which put him behind a
   * "show the other eleven" fold for a service that is available anywhere in the state.
   *
   * Deliberately not inferred from `practicalSignals`. Several clinicians offer telehealth
   * FOLLOW-UPS and still need a first visit in person, and reading a display string to decide a
   * ranking rule would collapse that difference silently.
   */
  telehealthFirstAppointment?: true;
  /**
   * The clinician says they have completed the training NSW requires to carry ADHD care without
   * ongoing psychiatrist involvement.
   *
   * DECLARED, NOT CHECKED, and the surfaces say so. W193 splits every published field into
   * "checkable on a public register" and "the clinician told us", and this is firmly the second:
   * there is no public register of who has done it, so ADHD.ME cannot confirm it and must not
   * render it as though it had. It is a boolean rather than a certificate reference for the same
   * reason W183 refuses a free-text bio: a field that can hold evidence invites publishing it.
   */
  nswAdhdTrained?: true;
  /**
   * Set when the entry describes a real, identifiable clinician rather than a demo persona.
   *
   * The finder shows synthetic and real entries side by side, and a reader cannot tell them apart
   * from the copy. Holding it as data means a surface can say which is which, and means nobody
   * later mistakes a real person's record for one they may freely edit.
   */
  realPerson?: true;
  /**
   * A material interest the reader would want disclosed — carried BESIDE the listing, always.
   *
   * A founder of this product appearing in its own directory is a conflict whether or not the
   * ranking favours them, because the reader cannot see the ranking. The disclosure is a field on
   * the record rather than a sentence in someone's `about`, so it cannot be edited out of the copy
   * while the interest remains, and so the finder renders it without having to know who is who.
   *
   * The public directory (src/directory/profile.ts) has no equivalent field yet and does not need
   * one while `SHIPPED_DIRECTORY_PROFILES` is empty behind founder gate G6. It WILL need one
   * before that gate lifts, and adding it there means an entry in W193's `DISCLOSED_FIELDS` too.
   */
  founderInterest?: string;
};

export const clinicians: Clinician[] = [
  {
    id: "anubhav-saxena",
    name: "Dr Anubhav Saxena",
    shortName: "Dr Saxena",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, MBBS FRACGP MPhil BSc(Adv) DCH",
    suburb: "Beecroft",
    practice: "Beecroft Family & Skin Cancer Clinic",
    reach: "Practice appointments and phone consultations",
    image: "/clinicians/anubhav-saxena.png",
    acceptingNewPatients: true,
    focus: "Structured assessment, baseline physical screening & titration",
    matchLine: "A measured assessment with the physical baseline done properly, then titration reviewed on a schedule.",
    fitSignals: ["ADHD assessment", "Baseline physical screening", "Titration", "Phone consultations"],
    practicalSignals: ["Mixed billing", "Phone consultations", "Structured review schedule"],
    about:
      "Anubhav trained at the University of Sydney and has worked in general practice right across Sydney — Seven Hills, Double Bay, Hoxton Park, Hornsby — before settling at Beecroft. He works from measurement rather than impression: a documented baseline before anything starts, then review at set intervals instead of whenever a problem gets loud enough to prompt a call. He covers cardiovascular and sleep screening before a stimulant is considered, and treats a substance history as a safety question rather than a character one. He also does aged-care and home visits, and gives a good deal of his spare time to the long-suffering cause of the Parramatta Eels.",
    experience: [
      "Structured adult ADHD assessment",
      "Baseline cardiovascular and metabolic screening",
      "Titration and scheduled review",
      "Chronic disease management",
    ],
    languages: ["English", "Hindi", "Urdu"],
    careAreas: [
      "adhd-assessment",
      "adult-adhd",
      "titration",
      "cardiac-screening",
      "substance-history",
      "sleep",
      "shared-care",
    ],
    manner: ["structured", "non_judgmental", "sense_making"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Long first appointment, scheduled reviews",
    telehealthFirstAppointment: true,
    booking: {
      via: "healthengine",
      practitionerId: "123180",
      url: "https://healthengine.com.au/doctor/nsw/beecroft/dr-anubhav-saxena/p123180",
    },
    keywords: ["adhd", "assessment", "structured", "thorough", "measured", "baseline", "bloods", "pathology", "physical", "heart", "cardiac", "cardiovascular", "blood pressure", "metabolic", "sleep", "titration", "dose", "medication", "stimulant", "monitoring", "review", "telehealth", "phone", "remote", "online", "substance", "drinking", "alcohol", "cannabis", "history", "non-stimulant", "shared care", "hindi", "urdu", "adult", "founder"],
    realPerson: true,
    founderInterest:
      "Dr Saxena is a co-founder of ADHD.ME. Disclosed because he appears in a directory his own company operates, and a reader cannot see the ranking that put him there.",
  },
  {
    id: "tushar-yadav",
    name: "Dr Tushar Yadav",
    shortName: "Dr Yadav",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, MBBS",
    suburb: "Beecroft",
    practice: "Beecroft Family & Skin Cancer Clinic",
    reach: "Practice appointments",
    // No portrait supplied. Renders as a monogram; nothing here generates a face for a real person.
    image: null,
    acceptingNewPatients: true,
    focus: "Unhurried first appointments & ADHD care alongside the rest of general practice",
    matchLine: "A longer first appointment with a GP who will take the whole history before reaching for a conclusion.",
    fitSignals: ["ADHD assessment", "Longer first appointment", "Hindi", "Family context"],
    practicalSignals: ["Mixed billing", "Beecroft rooms", "Longer first appointment"],
    about:
      "Tushar qualified in medicine at Monash and has worked across Western Sydney and the North Shore — Royal North Shore, Western Sydney Local Health District, North Sydney — before joining the Beecroft practice. He sees ADHD the way he sees the rest of general practice: as something that arrives in the middle of a whole life, usually alongside sleep that has never been right, a job that has become hard to hold, or a family who have their own view about what is going on. He would rather spend a long first appointment getting the history straight than reach a conclusion quickly, and he speaks Hindi, which for a good number of families in this part of Sydney is the difference between explaining something and explaining it properly.",
    experience: [
      "Adult ADHD assessment",
      "Longer first appointments",
      "Sleep and mood alongside ADHD",
      "Family and cultural context",
    ],
    languages: ["English", "Hindi"],
    careAreas: [
      "adhd-assessment",
      "adult-adhd",
      "comorbid-mood",
      "sleep",
      "shared-care",
    ],
    manner: ["unhurried", "collaborative", "culturally_attuned", "attuned"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Longer first appointments available",
    // NOT BOOKABLE ONLINE, AND THIS IS A FACT RATHER THAN A GAP. Healthengine lists Dr Yadav at
    // this practice as "Not Available" with no Book control, because his column is not synced to
    // their platform. Inventing a slot picker for him would be inventing appointments for a real
    // clinician, so the surface sends the reader to the practice instead and says why.
    booking: {
      via: "practice",
      url: "https://healthengine.com.au/medical-centre/nsw/beecroft/beecroft-family-and-skin-cancer-clinic/s15072",
      note: "Dr Yadav's appointments are not online yet — the practice books him by phone.",
    },
    keywords: ["adhd", "assessment", "adult", "unhurried", "longer", "long appointment", "history", "sleep", "insomnia", "mood", "anxiety", "depression", "family", "cultural", "culture", "hindi", "indian", "south asian", "work", "job", "beecroft", "shared care", "explain", "calm"],
    realPerson: true,
  },
];

/**
 * Rank the roster against a free-text request.
 *
 * The weights are per-clinician and per-phrase, which is a deliberate refusal to build a general
 * relevance model: a general model would be a quality ranking of named clinicians derived from
 * inference, which W83 refused internally and which is worse in public. These weights only
 * express what each clinician SAYS they see often, matched against what the person SAID they want.
 */
export function rankClinicians(query: string, roster: readonly Clinician[] = clinicians): Clinician[] {
  const needs = needsFor(query);
  return [...roster].sort((a, b) => {
    const byScore = scoreAgainst(b, needs) - scoreAgainst(a, needs);
    if (byScore !== 0) return byScore;

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
    total += need.weight * declarationFactor(clinician, need);
  }
  return total;
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
  switch (facet.preference) {
    case "woman-gp":
      return clinician.gender === "woman";
    case "telehealth-first":
      return clinician.telehealthFirstAppointment === true;
    case "longer-appointment":
      return clinician.manner.includes("unhurried");
    case "bulk-billing":
      return clinician.practicalSignals.some((signal) => /bulk/i.test(signal));
  }
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
export function unservedAsks(query: string): string[] {
  const declared = new Set(clinicians.flatMap((clinician) => clinician.careAreas));
  return readNeeds(query)
    .filter((need) => need.facet.kind === "care" && !declared.has(need.facet.area))
    .map((need) => need.label);
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
  const needs = needsFor(query);
  if (needs.length === 0) return "unmatched";
  const scores = roster.map((clinician) => scoreAgainst(clinician, needs));
  return new Set(scores).size > 1 ? "informed" : "tied";
}

/** What the finder says when the order is not earned. Closed vocabulary, like every other reason. */
export const MATCH_QUALITY_COPY: Record<MatchQuality, string> = {
  informed: "",
  tied: "Both of these answer what you asked for equally well, so this is not a ranking — read both.",
  unmatched:
    "We could not tell from that what you are looking for, so this is everyone we list rather than an order. Saying more about what you want helps.",
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
  const needs = needsFor(query);
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
export function needsFor(query: string): NeedSignal[] {
  const signals = [...readNeeds(query), ...languageNeeds(query, SPOKEN_ON_ROSTER)];
  return signals.map((need) => ({
    ...need,
    weight: need.weight * separation(clinicians.filter((c) => answers(c, need)).length, clinicians.length),
  }));
}

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

/** Every language anybody on the roster declares. Grows with the roster, never enumerated. */
const SPOKEN_ON_ROSTER: readonly string[] = [...new Set(clinicians.flatMap((c) => c.languages))];

/**
 * The needs this clinician actually answers, in the reader's asking order.
 *
 * ONE COMPUTATION, TWO CONSUMERS. The ranking and the explanation both read this, so the page
 * cannot rank somebody first for a reason it then fails to print — which is exactly what the two
 * separate lexicons used to allow. A language the reader did not ask for is not in here at all,
 * because it was never a `NeedSignal`.
 */
export function matchEvidence(clinician: Clinician, query: string): NeedSignal[] {
  return needsFor(query)
    .filter((need) => answers(clinician, need))
    // The weight the card's evidence carries is the weight this clinician's answer actually
    // earned - halved where they declared "sometimes" - so the audit and the unity test can
    // hold score === sum of evidence with no carve-outs.
    .map((need) => ({ ...need, weight: need.weight * declarationFactor(clinician, need) }));
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
): Clinician[] {
  const byFit = rankClinicians(query, roster);
  if (!origin) return byFit;

  const needs = needsFor(query);
  const score = new Map(byFit.map((c) => [c.id, scoreAgainst(c, needs)]));
  // Carries the fit tie-breaks (founder-behind, then file order) into ties distance cannot see.
  const fitRank = new Map(byFit.map((c, i) => [c.id, i]));
  const km = (c: Clinician) => {
    const point = resolvePlace(c.suburb);
    return point ? distanceKm(origin, point) : null;
  };

  return [...byFit].sort((a, b) => {
    const byScore = score.get(b.id)! - score.get(a.id)!;
    if (byScore !== 0) return byScore;
    const byFitOrder = fitRank.get(a.id)! - fitRank.get(b.id)!;
    // Somebody you do not travel to is equally near from everywhere, so distance has nothing to
    // say about them and their stated-preference position stands.
    if (a.telehealthFirstAppointment || b.telehealthFirstAppointment) return byFitOrder;
    const da = km(a);
    const db = km(b);
    if (da === null || db === null || da === db) return byFitOrder;
    return da - db;
  });
}

/** The distance sentence for a clinician, or null when there is nothing honest to say. */
export function distanceTo(clinician: Clinician, origin: SuburbPoint | null): string | null {
  // A kilometre figure beside somebody you never travel to is a number that answers no question.
  if (clinician.telehealthFirstAppointment) return "by telehealth, wherever you are";
  if (!origin) return null;
  const point = resolvePlace(clinician.suburb);
  if (!point) return null;
  return describeDistance(distanceKm(origin, point));
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
