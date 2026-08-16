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
import { findCue, tokenise } from "./read";

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
  facet: Facet | { kind: "preference"; preference: Preference };
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
  care("adhd-assessment", "ADHD assessment", 12, [
    "adhd", "assessment", "assessed", "diagnosis", "diagnosed", "attention",
  ]),
  care("adult-adhd", "Adult ADHD", 10, [
    "adult", "in my thirties", "in my forties", "at my age", "grown up",
    // Probe: "my brain has never let me finish anything and I'm 34" reached nothing. These are
    // the ways people describe the experience rather than the label.
    "never finish anything", "cannot finish", "can never finish", "my whole life", "always been like this",
  ]),
  care("child-adolescent-adhd", "Children and adolescents", 26, [
    "my son", "my daughter", "my child", "my kid", "teenager", "adolescent", "children", "school report",
  ]),
  care("adhd-in-women", "Late-recognised presentations in women", 24, [
    "missed as a child", "late diagnosis", "masking", "coping strategies", "perimenopause",
    "menopause", "hormonal", "as a woman", "in women",
  ]),
  care("autism-adhd", "Co-occurring autism", 26, ["autism", "autistic", "audhd", "sensory"]),
  care("titration", "Titration and dose review", 28, [
    "titration", "dose", "wearing off", "wears off", "side effects", "not working", "adjust the dose",
  ]),
  care("cardiac-screening", "Baseline physical screening", 26, [
    "heart", "cardiac", "blood pressure", "physical baseline", "baseline checks", "is it safe",
    "bloods", "pathology",
    // Probe: "not going to hurt my heart before I start anything" reached this only via "heart".
    "safe for me", "before i start", "check me over", "physical check",
  ]),
  care("comorbid-mood", "Anxiety and mood differential", 24, [
    "anxiety", "anxious", "depression", "antidepressant", "antidepressants", "misdiagnosed",
    "differential", "wrong answer", "wrong diagnosis", "treated for anxiety",
    // Probe: "I've been on antidepressants for six years and nothing shifted" reached nothing.
    "nothing shifted", "nothing helped", "nothing worked", "still not right",
  ]),
  care("substance-history", "Substance history held safely", 26, [
    "drink", "drinking", "alcohol", "cannabis", "substance", "non-stimulant",
  ]),
  care("sleep", "Sleep", 22, ["sleep", "insomnia", "exhausted", "never rested", "tired all the time"]),
  care("non-medication", "Non-medication supports", 26, [
    "without medication", "no medication", "not just medication", "alternatives", "coaching", "habits",
  ]),
  care("emotional-regulation", "Emotional regulation", 24, [
    "rejection sensitivity", "rsd", "emotional regulation", "shame", "overwhelmed",
  ]),
  care("shared-care", "Shared care with a psychiatrist", 18, [
    "shared care", "psychiatrist", "already diagnosed", "existing prescription",
  ]),
  care("trauma-informed", "Trauma-informed care", 28, [
    "trauma", "trauma history", "difficult childhood", "boundaries", "permission", "ptsd", "cptsd",
  ]),
  care("complex-mental-health", "Coordinated shared care", 26, ["bipolar", "complex", "comorbid"]),
  care("student-academic", "Study and workplace documentation", 24, [
    "university", "workplace", "employer", "adjustments", "letter", "documentation", "study",
  ]),
  care("disability-rights", "Disability rights", 28, [
    "disability", "disabled", "wheelchair", "ndis", "autonomy", "accessible",
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
  pref("telehealth-first", "By phone or telehealth", 28, ["telehealth", "by phone", "over the phone", "remote", "online"]),
  pref("bulk-billing", "Bulk billing", 24, ["bulk bill", "bulk billed", "bulk billing", "cannot afford", "cheap"]),
  pref("longer-appointment", "A longer first appointment", 20, ["longer first appointment"]),
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
const CUES: ReadonlyArray<{ phrase: string; tokens: string[]; entry: Entry }> = LEXICON.flatMap((entry) =>
  entry.phrases.map((phrase) => ({ phrase, tokens: tokenise(phrase), entry })),
)
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
  const signals: NeedSignal[] = [];
  const seen = new Set<string>();
  const claimed: Array<[number, number]> = [];

  for (const cue of CUES) {
    const at = findCue(sentence, cue.tokens);
    if (!at) continue;
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

/** Stable identity for a facet, so a reader asking twice for one thing counts once. */
export function facetKey(facet: NeedSignal["facet"]): string {
  if (facet.kind === "care") return `care:${facet.area}`;
  if (facet.kind === "manner") return `manner:${facet.trait}`;
  return `pref:${facet.preference}`;
}

/** Every label a surface may say back, for the test that pins the vocabulary closed. */
export const NEED_LABELS: readonly string[] = LEXICON.map((entry) => entry.label);
