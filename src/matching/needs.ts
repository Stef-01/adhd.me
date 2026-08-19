// W221: one lexicon, read once, used by both the ranking and the explanation.
//
// See docs/MATCHING-PLAN.md for the options this was chosen from and the constraints that
// eliminated the rest. The short version of why this file exists:
//
// WHAT IT REPLACES. `rankClinicians` held a `focusSignals` map keyed by CLINICIAN ID — about
// twenty-five hand-authored `[phrase, weight]` pairs per doctor. That works for two clinicians
// and fails for the next ten, in two distinct ways. It fails practically, because every new GP
// becomes an engineering task where somebody reads them and invents weights. And it fails
// ethically, because those weights are a private editorial judgement about a named person with
// no audit trail and no way for that person to see or contest what was written about them.
//
// Worse, the EXPLANATION was authored separately, in `getPersonalizedMatch`, as a second lexicon
// covering the same ideas with different phrase lists. Two lexicons for one job, already drifted:
// the ranker weighted "wearing off" and the explainer did not, so a query could be ranked for a
// reason the page then declined to give. This file makes them one computation, and a test asserts
// they cannot disagree again.
//
// WHAT IT IS. A phrase → facet map, owned centrally rather than per clinician. A clinician
// declares facets; a patient's words are read into facets; the score is the overlap. Adding a GP
// is a declaration, not a code change.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE CONSTRAINT THAT SHAPES EVERY LINE OF THIS FILE, stated so the next reader does not have to
// rediscover it: this reads a PREFERENCE ABOUT CARE, never a clinical fact about the person.
//
// "I drink more than I should" is not read as a substance-use finding. It is read as *this person
// wants that conversation held safely*, which is a fact about what they want from a clinician and
// not a fact about them. The distinction is the whole of G7's boundary (docs/GATE-DOSSIER-Q17.md):
// the finder reasons over a clinician's declared attributes, and the moment it starts classifying
// the patient it becomes something the TGA regulates. Where a phrase could be read either way,
// THE PREFERENCE READING IS TAKEN. Every `label` below is written in that voice for the same
// reason — they are the words the reason sentence is built from, and a label like "substance use"
// would be a finding about somebody, where "a substance history held safely" is a description of
// care.

import type { CareArea } from "@/demo/care-archetypes";
import { EI_QUALITIES, EI_QUALITY_KEYS, type EIQuality } from "@/demo/emotional-fit";
import { collapsedCueSatisfied, findCue, negatedWant, stem, tokenise, tokeniseKeepingStopwords } from "./read";

/**
 * How a clinician works, as opposed to what they see.
 *
 * THIS VOCABULARY IS NOT DEFINED HERE. It is `EIQuality` in `src/demo/emotional-fit.ts`, which
 * arrived in parallel with this file and is the better-grounded of the two — its facets are the
 * four MSCEIT branches plus the plain interpersonal qualities that decide whether an ADHD consult
 * goes well, and it carries a reader-facing label for each. Two overlapping manner vocabularies
 * would have been the same defect this unit removed from the ranker: one job, two lexicons,
 * drifting. So there is one, it lives there, and this file reads its cues.
 *
 * The one facet added to it here is `structured`, because "documented baseline, review on a
 * schedule" is a real declared way of working that is not an emotional-intelligence quality and
 * that one of the two GPs on the roster leads with.
 */
export type MannerTrait = EIQuality;

export const MANNER_TRAITS: readonly MannerTrait[] = EI_QUALITY_KEYS;

/** A facet is either something a clinician sees or a way they work. Both are declared. */
export type Facet = { kind: "care"; area: CareArea } | { kind: "manner"; trait: MannerTrait };

/**
 * A preference that is a hard filter or a strong lift rather than a facet — the things somebody
 * says that are about access rather than about the care itself.
 */
export type Preference = "woman-gp" | "telehealth-first" | "bulk-billing" | "longer-appointment";

/**
 * One thing the reader asked for, with the words to say it back to them.
 *
 * `label` is the closed-vocabulary phrase the reason sentence is composed from. It is not
 * generated, not templated from the patient's own text, and not a paraphrase of it: W213's floor
 * requires the reason to come from a fixed set, and the fixed set is the `label` column below.
 */
export type NeedSignal = {
  facet: Facet | { kind: "preference"; preference: Preference } | { kind: "language"; language: string };
  /** The phrase from the reader's own words that reached this facet. Used for tests and logging. */
  matched: string;
  /** Closed vocabulary. What a surface may say back. */
  label: string;
  /** Relative importance of this facet when it is asked for. */
  weight: number;
};

type Entry = {
  facet: NeedSignal["facet"];
  label: string;
  weight: number;
  /**
   * Phrases that reach this facet. Ordered longest-first at read time so a specific phrase wins
   * over a general one contained inside it — "not just medication" must not be reached by
   * "medication" and then labelled as though the reader asked for the opposite of what they said.
   */
  phrases: readonly string[];
};

const care = (area: CareArea, label: string, weight: number, phrases: readonly string[]): Entry => ({
  facet: { kind: "care", area },
  label,
  weight,
  phrases,
});

const manner = (trait: MannerTrait, label: string, weight: number, phrases: readonly string[]): Entry => ({
  facet: { kind: "manner", trait },
  label,
  weight,
  phrases,
});

const pref = (preference: Preference, label: string, weight: number, phrases: readonly string[]): Entry => ({
  facet: { kind: "preference", preference },
  label,
  weight,
  phrases,
});

/**
 * THE LEXICON. One artifact, reviewed as one artifact.
 *
 * Weights are coarse on purpose — 30 / 20 / 12 rather than a tuned continuum. A tuned weight is a
 * number somebody would have to defend, and the honest position is that these express "this is
 * the thing they asked for" versus "this is context they mentioned", not a calibrated belief.
 * Anything finer would be false precision of exactly the kind the stat rail refuses.
 */
const LEXICON: readonly Entry[] = [
  // ── What somebody is trying to get done ───────────────────────────────────────────────────
  // ── ADHD ──────────────────────────────────────────────────────────────────────────────────
  care("adhd-assessment", "ADHD assessment", 12, [
    "adhd", "assessment", "assessed", "diagnosis", "diagnosed", "attention",
    // O49 (corpus aspirations): "diagnose me" collapses to [diagnose] ("me" is a stopword), so
    // the O45 rule demands the authored pair — "can a GP diagnose me" fires, a stray
    // "diagnose" in an unrelated clause does not. "get checked" collapses to [check] and is
    // safe the same way; its raw pair also hears "getting checked" through the stemmer.
    "diagnose me", "get checked",
  ]),
  // ── G7 BOUNDARY — DO NOT ADD SYMPTOM DESCRIPTIONS TO ANY CARE FACET ──────────────────────────
  // A prior probe read "my brain has never let me finish anything" as a recall gap and closed it by
  // adding "never finish anything" to a care facet. That is a description of the reader's own
  // impairment — DSM inattention text — not a preference about care, and reading it into a facet is
  // the product concluding a diagnosis from a symptom: the move docs/GATE-DOSSIER-Q17.md holds shut
  // and the pitch states publicly ("keyed to clinician attributes — never to a patient's symptoms").
  // Every care cue below names a condition the reader is ASKING FOR CARE ABOUT, the same
  // preference-reading `substance-history` takes for "I drink too much" — never a symptom the finder
  // infers. Symptom sentences are pinned as an intentional non-reach in reach.test.ts. Widen cues
  // for what a reader WANTS or SAYS THEY HAVE, never for what the finder would have to deduce.
  care("child-adolescent-adhd", "Children and adolescents", 26, [
    "my son", "my daughter", "my child", "my kid", "teenager", "adolescent", "children", "school report",
    // O49: the ask phrased from the clinician side — "someone who sees kids". Both verb forms;
    // bare "kids" is refused because stem("kidding") is "kid" and "no kidding" is not a child.
    "sees kids", "see kids",
    // O53: the clinical adjective parents actually type; single and precise.
    "paediatric",
  ]),
  care("titration", "Titration and dose review", 28, [
    "titration", "dose", "wearing off", "wears off", "side effects", "not working", "adjust the dose",
  ]),
  care("shared-care", "Shared care with a psychiatrist", 18, [
    "shared care", "psychiatrist", "already diagnosed", "existing prescription",
    // O49: the paediatric half of shared care, both spellings — the corpus ask names the
    // clinician to be shared WITH, exactly like "psychiatrist" above.
    "paediatrician", "pediatrician",
    // O53: the handover said as itself. Two content tokens ([take, script]).
    "take over my scripts",
  ]),
  // ── Depression & anxiety ────────────────────────────────────────────────────────────────────
  care("depression", "Depression and low mood", 24, [
    "depression", "depressed", "low mood", "antidepressant", "antidepressants",
    // Probe: "I've been on antidepressants for six years and nothing shifted" reached nothing.
    "nothing shifted", "nothing helped", "nothing worked",
  ]),
  care("anxiety", "Anxiety", 24, [
    "anxiety", "anxious", "panic", "treated for anxiety",
    // Working the anxiety/ADHD line out — the reader asking which one it is, not the finder deciding.
    "misdiagnosed", "differential", "wrong answer", "wrong diagnosis",
  ]),
  // ── Other mental health ─────────────────────────────────────────────────────────────────────
  care("trauma-informed", "Trauma-informed care", 28, [
    "trauma", "trauma history", "difficult childhood", "boundaries", "permission", "ptsd", "cptsd",
  ]),
  care("complex-mental-health", "Bipolar and complex mental health", 26, ["bipolar", "complex", "psychosis", "schizophrenia",
    // O53: how people name the whole file rather than one diagnosis. Two content tokens.
    "psych history", "schizoaffective"]),
  care("autism-adhd", "Autism and neurodevelopmental", 26, ["autism", "autistic", "audhd", "sensory",
    // O49: the self-identification word, single and precise (the "neuroaffirming" precedent).
    "neurodivergent"]),
  care("substance-history", "Substance history held safely", 26, [
    "drink", "drinking", "alcohol", "cannabis", "substance", "non-stimulant",
    // O49: the word people actually use. Two content tokens, so a garden stays a garden.
    "smoke weed",
  ]),
  care("emotional-regulation", "Emotional regulation", 24, [
    "rejection sensitivity", "rsd", "emotional regulation", "shame", "overwhelmed",
    // O17: this area's own doc comment calls dysregulation "what people describe first" — and
    // "emotional dysregulation" reached nothing, because "dysregulation" does not stem to
    // "regulation". The clinical word and the plain phrasings people actually use, added.
    "dysregulation", "big emotions", "big feelings", "emotions take over",
  ]),
  care("non-medication", "Non-medication supports", 26, [
    "without medication", "no medication", "not just medication", "alternatives", "coaching", "habits",
    // O49: the script-shaped refusal of scripts. Negators are never stopwords, so both keep
    // two tokens; O40 does not suppress them because the negator is inside the cue's own words.
    "not a script", "without a script",
  ]),

  /**
   * ── How somebody wants to be treated while it happens ──────────────────────────────────────
   *
   * DERIVED FROM `EI_QUALITIES` RATHER THAN RESTATED. Their cue lists and reader-facing labels are
   * the source of truth; restating them here would recreate the two-lexicon drift this unit
   * exists to remove. Weight is uniform because these are alternatives to each other, not a
   * ranking of which way of working is better — that judgement is not the product's to make.
   */
  ...EI_QUALITY_KEYS.map((quality) =>
    manner(quality, EI_QUALITIES[quality].label, 24, EI_QUALITIES[quality].cues),
  ),

  // ── Access ────────────────────────────────────────────────────────────────────────────────
  pref("woman-gp", "A woman GP", 30, ["woman gp", "female gp", "woman doctor", "female doctor", "prefer a woman"]),
  pref("telehealth-first", "By phone or telehealth", 28, ["telehealth", "by phone", "over the phone", "remote", "online",
    // O53: video is how half of them say it, and "phone first" is the ask in appointment order.
    "video appointment", "video call", "phone first"]),
  pref("bulk-billing", "Bulk billing", 24, ["bulk bill", "bulk billed", "bulk billing", "cannot afford", "cheap"]),
  pref("longer-appointment", "A longer first appointment", 20, ["longer first appointment",
    // O65 (the O22 loop on O64's corpus finding): the facet carried ONE three-token cue, so
    // the commonest phrasings of this ask were all unheard — measured, not guessed, in
    // corpus tranche three. Each cue keeps two content tokens (the O25 collapse rule).
    // "more than fifteen minutes" stays UNCUED on purpose: it strips to [fifteen, minute],
    // which is also how distance talk reads ("fifteen minutes from the station"), and that
    // precision is not worth this recall — the corpus carries it as a standing aspiration.
    "long appointment", "long consult", "double appointment", "double session", "extended appointment"]),
];

/**
 * Cues, pre-tokenised, longest first.
 *
 * ORDER MATTERS AND THE REASON IS A REAL DEFECT IT PREVENTS. "not just medication" contains
 * "medication"; "treated for anxiety" contains "anxiety". Reading short cues first would let a
 * general term claim a sentence whose specific term says something different — in the first case
 * close to the opposite. Sorted by TOKEN count now rather than character length, because that is
 * what specificity means once matching is done on tokens.
 */
/**
 * A PHRASE BELONGS TO ONE FACET, and the first entry to list it wins (O7/F10). "overwhelmed"
 * appears in both `care:emotional-regulation` and the steadying manner cues; before this dedup
 * the second copy was DEAD — the stable sort meant the earlier entry always claimed the words,
 * and nothing said so. Dropping later duplicates makes the same behaviour explicit, keeps the
 * self-reach pin honest (every cue in `LEXICON_CUES` genuinely reaches its facet), and leaves
 * the emotional-fit interview's own use of its cue lists untouched.
 */
const FIRST_CLAIM = new Map<string, { phrase: string; entry: Entry }>();
for (const entry of LEXICON) {
  for (const phrase of entry.phrases) {
    if (!FIRST_CLAIM.has(phrase)) FIRST_CLAIM.set(phrase, { phrase, entry });
  }
}

const CUES: ReadonlyArray<{ phrase: string; tokens: string[]; raw: string[]; collapsed: boolean; entry: Entry }> = [...FIRST_CLAIM.values()]
  .map(({ phrase, entry }) => ({
    phrase,
    tokens: tokenise(phrase),
    raw: tokeniseKeepingStopwords(phrase),
    /* O45: an authored multi-word phrase that ships as at most one content token is matched
       under the collapse-aware rule — see `collapsedCueSatisfied` in read.ts. Computed here,
       once, from the same two tokenisations the matcher itself uses, so the rule's membership
       can never drift from what actually collapses. */
    collapsed: phrase.trim().split(/\s+/).length >= 2 && tokenise(phrase).length <= 1,
    entry,
  }))
  .filter((cue) => cue.tokens.length > 0)
  .sort((a, b) => b.tokens.length - a.tokens.length || b.phrase.length - a.phrase.length);

/**
 * Read what somebody said into the closed vocabulary.
 *
 * Deterministic and total: the same text always yields the same signals, and text that reaches
 * nothing yields an empty list rather than a guess. An empty list is a supported outcome — the
 * finder says so (`matchQuality`) rather than presenting an arbitrary order as a ranking.
 *
 * MATCHING IS ORDERED-SUBSEQUENCE OVER STEMMED TOKENS — see `read.ts` for why, and for the two
 * failure classes it fixes that a substring search could not. The claiming below is unchanged in
 * spirit: a cue that matched some words takes them, so one clause produces one facet.
 *
 * THIS IS THE PLUGGABLE HALF of docs/MATCHING-PLAN.md's architecture. A dense retriever lands here
 * behind this same signature and everything downstream is unchanged, because what crosses the
 * boundary is a closed vocabulary rather than a similarity score.
 */
export function readNeeds(text: string): NeedSignal[] {
  const sentence = tokenise(text);
  // The same words with the function words kept, for the collapse-aware rule only (O45).
  const rawSentence = tokeniseKeepingStopwords(text);
  const signals: NeedSignal[] = [];
  const seen = new Set<string>();
  const claimed: Array<[number, number]> = [];

  for (const cue of CUES) {
    const at = findCue(sentence, cue.tokens);
    if (!at) continue;
    /* O45 (Q1 item 1): a cue that collapsed to one content token fires only when the sentence
       also carries an adjacent pair of the cue's AUTHORED words — "out the door" must look
       like "out the door" somewhere, not merely contain "door". A refused collapsed cue
       claims nothing, so the words stay readable by any cue that genuinely matches them. */
    if (cue.collapsed && !collapsedCueSatisfied(rawSentence, cue.raw)) continue;
    /* O40 (Q1 item 4): a CARE or PREFERENCE cue in the scope of a desire negation is a refusal,
       not an ask — "I don't want my dose changed" must not reach titration. MANNER stays exempt
       BY DESIGN: patients state manner wants through negation ("I don't want to feel rushed" is
       the unhurried ask itself), so suppressing it would silence the very sentences the facet
       exists for. A suppressed cue claims nothing, so it cannot shadow a different, unnegated
       reading of the same words. */
    if (
      (cue.entry.facet.kind === "care" || cue.entry.facet.kind === "preference") &&
      negatedWant(sentence, at.from)
    ) {
      continue;
    }
    if (claimed.some(([from, to]) => at.from <= to && from <= at.to)) continue;

    const key = facetKey(cue.entry.facet);
    if (seen.has(key)) continue;

    claimed.push([at.from, at.to]);
    seen.add(key);
    signals.push({
      facet: cue.entry.facet,
      matched: cue.phrase,
      label: cue.entry.label,
      weight: cue.entry.weight,
    });
  }

  return signals;
}

/**
 * Whether a clinician's declared record answers an access preference.
 *
 * ONE PLACE (O5/F7). This predicate used to live only inside the ranker's `answers`, which
 * meant the clarifier could not compute `heldBy` for preference facets and so never asked the
 * questions that separate rosters hardest — "do you want a woman GP" splits any mixed roster
 * and is the single most-stated preference in real directory search. The parameter is
 * structural on purpose: this file cannot import the `Clinician` type without a cycle, and the
 * four fields named here are the whole of what a preference reads.
 */
export function holdsPreference(
  clinician: {
    gender: string;
    telehealthFirstAppointment?: boolean;
    manner: readonly string[];
    practicalSignals: readonly string[];
  },
  preference: Preference,
): boolean {
  switch (preference) {
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

/** Stable identity for a facet, so a reader asking twice for one thing counts once. */
export function facetKey(facet: NeedSignal["facet"]): string {
  if (facet.kind === "care") return `care:${facet.area}`;
  if (facet.kind === "manner") return `manner:${facet.trait}`;
  if (facet.kind === "language") return `language:${facet.language.toLowerCase()}`;
  return `pref:${facet.preference}`;
}

/**
 * A language the reader asked for, read against the languages the roster actually declares.
 *
 * WHY THIS IS NOT IN THE LEXICON. Every other facet is a fixed vocabulary shared by all
 * clinicians, so it can live in the static table above. Languages are per-clinician DATA: a
 * static lexicon would have to enumerate every language any clinician might ever speak, a list
 * that goes stale the day somebody who speaks Tamil joins. Reading against the roster's own
 * declarations keeps the property that matters — no per-clinician WEIGHT anywhere — while
 * letting the vocabulary grow with the roster.
 *
 * WHY IT IS IN THIS FILE ANYWAY (the F2 repair). Until the overhaul this lived beside
 * `matchEvidence` as a raw `String.includes` — the exact mechanism W222 tore out of the lexicon
 * for cause — and its signals were shown on the card but never seen by the score, so a
 * language-only query rendered "unmatched" beside a card explaining a ranking that never
 * happened. It now goes through the same tokenise-and-stem pipeline as every cue and returns
 * ordinary `NeedSignal`s, so the ranking, the quality verdict and the explanation all read it
 * or none of them do.
 *
 * English is excluded: "speaks English" is not a match reason in Australia, it is the
 * assumption. And a language the reader never mentioned is never a signal — telling somebody
 * their GP speaks a language they did not ask about is a guess about who they are.
 */
export function languageNeeds(text: string, spoken: readonly string[]): NeedSignal[] {
  const tokens = new Set(tokenise(text));
  const signals: NeedSignal[] = [];
  const seen = new Set<string>();
  for (const language of spoken) {
    if (language.toLowerCase() === "english") continue;
    const key = facetKey({ kind: "language", language });
    if (seen.has(key) || !tokens.has(stem(language.toLowerCase()))) continue;
    seen.add(key);
    signals.push({
      facet: { kind: "language", language },
      matched: language.toLowerCase(),
      label: `${language}-speaking`,
      weight: LANGUAGE_WEIGHT,
    });
  }
  return signals;
}

/**
 * Same tier as the lexicon's strongest facets (30/20/12): an asked-for language is a hard
 * requirement of the appointment, not a nice-to-have, and it was already rendered at this
 * weight before it was scored at all.
 */
const LANGUAGE_WEIGHT = 30;

/** Every label a surface may say back, for the test that pins the vocabulary closed. */
export const NEED_LABELS: readonly string[] = LEXICON.map((entry) => entry.label);

/**
 * Every phrase in the lexicon with the facet it belongs to, for the self-reachability pin
 * (O7/F10): a stemmer or tokeniser edit that silently unhooks a cue from its own facet must
 * fail a test, not wait for a probe. Phrases only — no weights, no labels — so nothing new is
 * sayable from here.
 */
export const LEXICON_CUES: ReadonlyArray<{ phrase: string; key: string }> = [...FIRST_CLAIM.values()].map(
  ({ phrase, entry }) => ({ phrase, key: facetKey(entry.facet) }),
);
