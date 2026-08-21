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
import { bareNegatorBefore, collapsedCueRunPresent, collapsedCueSatisfied, commaBreaksBefore, findCue, isTightNegator, lackingNotDeclining, onBehalfBefore, reportedRefusal, selfClaimedPatient, softenedNotJust, stem, suppressedByDesireNegation, tokenise, tokeniseKeepingStopwords, withinHedge } from "./read";

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
/**
 * Phrases a PREFERENCE facet owns, even though a manner quality also lists them (O116).
 *
 * `manner:unhurried` and `pref:longer-appointment` both cue "longer appointment". While
 * `stem("longer")` was "longer" the two never met, so the collision sat here unseen since both
 * were authored. O116 taught the stemmer that "longer" is "long" — correctly, since the facet
 * whose LABEL is "A longer first appointment" could not otherwise hear its own adjective — and
 * the two cues immediately collided. FIRST_CLAIM gives a phrase one owner, and the winner was
 * decided by lexicon order and phrase length, which is no way to decide anything: unhurried
 * silently owned the words for the facet named after them, and "a long appointment" stopped
 * reaching `pref:longer-appointment` at all.
 *
 * THE OWNERSHIP IS DECLARED HERE RATHER THAN LEFT TO SORT ORDER. Note what this does NOT do:
 * it does not remove the phrases from `EI_QUALITIES`, because the onboarding interview reads
 * those cue lists DIRECTLY to propose facets from a doctor's own words (W221/O22), and a GP
 * who says "I book longer appointments" is describing an unhurried manner. The two readers
 * legitimately want different answers about the same phrase — one is reading a patient's ask,
 * the other a clinician's description of their practice — and this is the seam where they
 * differ, stated once, in the reader that needs the exception.
 */
const PREFERENCE_OWNED_PHRASES: ReadonlySet<string> = new Set(["longer appointment", "longer first"]);

function mannerPhrases(quality: MannerTrait): readonly string[] {
  return EI_QUALITIES[quality].cues.filter((phrase) => !PREFERENCE_OWNED_PHRASES.has(phrase));
}

const LEXICON: readonly Entry[] = [
  // ── What somebody is trying to get done ───────────────────────────────────────────────────
  // ── ADHD ──────────────────────────────────────────────────────────────────────────────────
  care("adhd-assessment", "ADHD assessment", 12, [
    /* O125: the late-diagnosis register. "put a name to" was refused — it would have taken the
       span `manner:sense_making` is already reading in "put a name to what has been going on
       since childhood", the span-theft O123 caught in its own work. */
    "finally sorting this out",
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
    /* O122: THE FIRST-PERSON PLURAL. This facet knew "my son" and "my daughter" and not "our" —
       and a parent booking for a child says "our ten year old", "our boy", "we need answers".
       Each of these collapses to one token, so O45's pair demand is what keeps them precise: a
       stray "boy" cannot fire, only the authored pair can.

       THE PLURAL FORMS WERE REFUSED BY THE CORPUS ITSELF, which is a stronger reason than any
       measurement I could have made. "our son", "our daughter", "our boy", "our girl" were
       written, and "our daughter" immediately broke a G7 `never` pin: "our daughter cries over
       homework every single night" is pinned as reaching NOTHING — a parent describing their
       child's distress, not asking for care — and the cue read the relationship as an ask.
       A bare family reference cannot tell "we need answers for our boy" from "our daughter
       cries over homework", because the difference between them is the ASK, and the cue only
       sees the relationship. That weakness is not new here: the existing "my son"/"my daughter"
       cues share it exactly, and are untested only because no pin happened to use them in a
       description. So the plural forms are not added, and the sentences that wanted them stay
       standing rather than a G7 boundary being moved to fit a cue.

       "year old" was refused too, on measurement: it fires on "I am forty years old and finally
       asking" — an ADULT stating their age — which is the harm O120 fixed from the other
       direction, an adult ranked against paediatric GPs. An age is not a relationship. */
    "educational psychologist",
    "my son", "my daughter", "my child", "my kid", "teenager", "adolescent", "children", "school report",
    // O49: the ask phrased from the clinician side — "someone who sees kids". Both verb forms;
    // bare "kids" is refused because stem("kidding") is "kid" and "no kidding" is not a child.
    "sees kids", "see kids",
    // O53: the clinical adjective parents actually type; single and precise.
    "paediatric",
  ]),
  care("titration", "Titration and dose review", 28, [
    /* O139: the review question in the words people use for it. Three tokens keep it clear of
       "the right medication took two years to find", which is a history, not a request. */
    "still the right medication",
    /* O116: the register a dose review is actually asked in — the script needing adjusting,
       the generic brand, the afternoon rebound, and "medication management" as the thing
       being asked FOR rather than therapy. */
    "script needs adjusting", "the generic brand", "afternoon rebound", "medication management",
    "titration", "dose", "wearing off", "wears off", "side effects", "not working", "adjust the dose",
  ]),
  care("shared-care", "Shared care with a psychiatrist", 18, [
    /* O139: the two registers this facet arrives in — the script that must not lapse, and the
       specialist service that has finished with somebody. "prescription continued" was REFUSED
       on measurement: it fires on "my prescription continued to cost more each month", a cost
       complaint read as a continuity ask. */
    "scripts kept going", "clinic discharged me",
    /* O116: continuity language. Somebody discharged from a clinic, or newly moved, asks for
       their prescribing to be CONTINUED or HANDED BACK — none of which the facet could hear. */
    "hand the prescribing back", "scripts managed", "continue my prescriptions", "between pharmacies",
    "shared care", "psychiatrist", "already diagnosed", "existing prescription",
    // O49: the paediatric half of shared care, both spellings — the corpus ask names the
    // clinician to be shared WITH, exactly like "psychiatrist" above.
    "paediatrician", "pediatrician",
    // O53: the handover said as itself. Two content tokens ([take, script]).
    "take over my scripts",
  ]),
  // ── Depression & anxiety ────────────────────────────────────────────────────────────────────
  care("depression", "Depression and low mood", 24, [
    /* O123: the facet reads "depression", "depressed", "low mood" already; these are the same
       thing in the words people actually use for it. "black dog" is the Australian idiom and
       carries two content tokens, so it cannot fire on a literal dog sentence alone.

       A MOOD CUE WAS ATTEMPTED TWICE AND REFUSED TWICE, which is the whole unit in miniature.
       "eye on my mood" swallowed "keep an eye", which `manner:structured` was legitimately
       reading as monitoring — a corpus pin caught that. Narrowing to "my mood" then fired on
       "my moods flip fast and I say things I regret", one of the ten sentences marked
       `awaitingFounder`: the cue would have QUIETLY ANSWERED the founder's G7 question in a
       unit written to stop exactly that, and O119's precision probe caught it. So depression
       gains only the idiom, and "keep an eye on my mood while we sort the attention side"
       stays standing. */
    "black dog",
    "depression", "depressed", "low mood", "antidepressant", "antidepressants",
    // Probe: "I've been on antidepressants for six years and nothing shifted" reached nothing.
    "nothing shifted", "nothing helped", "nothing worked",
  ]),
  care("anxiety", "Anxiety", 24, [
    /* O124: the clinic-anxiety phrasings, cued WITHOUT re-adding the word O119 removed.
       That unit deleted bare "panic" because it fired on "a doctor who won't panic about my
       drinking" — a figurative line about the DOCTOR, not a person asking for help with
       anxiety. Both cues here carry a second content token, so neither can reach that
       sentence: "white coat" is [white, coat] and means one thing in a clinic, and "panic in
       the waiting" is [panic, wait] — order-sensitive, which is a bonus rather than the
       point: "I had to wait and then panic set in about the cost" has the tokens the other
       way round and stays silent. Measured against O119's exact false positive first. */
    "white coat", "panic in the waiting",
    /* O123: "worried sick" is the same register this facet already reads ("anxious",
       "anxiety") and is specific enough not to repeat O119's mistake — that unit removed BARE
       "panic" because it fired on "a doctor who won't panic about my drinking", a figurative
       line about the DOCTOR. The two waiting-room panic phrasings stay uncued for that
       precision reason and NOT for a G7 one: "waiting room" would fire on "the waiting room
       was full". They are a cue-authoring problem, not a founder question. */
    "worried sick",
    "anxiety", "anxious", "treated for anxiety",
    /* O119 NARROWED "panic" → "panic attack". The bare word fired on "a doctor who won't panic
       about my drinking", where "panic" describes the DOCTOR'S reaction and the ask is that
       substance history be held safely — the opposite of a request for anxiety care. Every
       corpus sentence that legitimately wanted this facet says "panic attacks". Bare "panic"
       would otherwise only have reached a description of the reader's own state, which is the
       G7 reading O114 refused for "anger" and "rage" in the facet next door. */
    "panic attack",
    // Working the anxiety/ADHD line out — the reader asking which one it is, not the finder deciding.
    "misdiagnosed", "differential", "wrong answer", "wrong diagnosis",
  ]),
  // ── Other mental health ─────────────────────────────────────────────────────────────────────
  care("trauma-informed", "Trauma-informed care", 28, [
    "trauma", "trauma history", "difficult childhood", "boundaries", "permission", "ptsd", "cptsd",
    /* O104: the PACE-AND-CONSENT-OVER-HISTORY register. Every cue above names the condition
       ("trauma", "ptsd") or the era ("difficult childhood"); nine phrasings stood unheard in
       the corpus and four of them never mention trauma at all — they ask for a way of being
       asked. "Please go slowly with the history questions" is a preference about how the
       appointment is conducted, which is the reading G7 requires and the safest possible
       thing this facet can be cued on: it names no experience and diagnoses nobody.

       "relive" ships as a single word deliberately. It is not a collapse (a one-WORD cue is
       not a multi-word phrase that collapsed, so the O45 pair rule does not apply to it), and
       it is rare enough in this domain to carry the whole ask — "without having to relive
       it", "I don't want to relive everything" — where a two-token version would hear only
       one phrasing of it.

       "not be pushed" CARRIES ITS OWN NEGATOR, and it has to. The first draft cued "pushed
       on the details", which is present in the corpus sentence and reached nothing: O72's
       bare-negator rule saw the "not" sitting directly before the cue span and read the ask
       as a refusal of it. But "I need to NOT be pushed on the details" is the ask — the same
       shape as "I don't want to feel rushed", which manner is exempt from by design. Care
       facets are not exempt, so the negator has to live inside the cue's own words, which is
       exactly what O49 did for "not a script". Measured both ways before shipping. */
    "relive", "slowly with the history", "not be pushed",
    /* THE OTHER FIVE ASPIRATIONS ARE NOT CUED, AND THAT IS THIS UNIT'S MAIN DECISION.
       They name what happened to the person — family violence, an abusive relationship,
       "what happened to me before" — or, in one case, use a clinical term for a symptom ("I
       dissociate when doctors rush me"). Cueing those means the matcher reading a history off
       a sentence somebody typed into a finder, which is the G7 line, and Q1's first sweep
       already set the precedent for exactly this: three attuned aspirations were left
       standing because "their phrasings read distress rather than a want, and authoring cues
       for them needs a founder-side judgment call". The same call is owed here and a build
       loop is not the thing to make it. Raised in BUILD-STATE as a named founder question. */
  ]),
  care("complex-mental-health", "Bipolar and complex mental health", 26, [
    /* O140: "a thick file" is how somebody with a long psychiatric history describes it when
       they are asking to be read rather than re-triaged. Two content tokens, and it fires on
       nothing else in the corpus. */
    "file is thick",
    /* O123: the register this facet ALREADY reads. Its settled vocabulary is "bipolar",
       "psychosis", "schizophrenia", "schizoaffective", "psych history" — pure diagnosis
       disclosure — so a sentence saying "borderline personality disorder plus the attention
       problems" was never a new G7 question. It was a missing word, parked under the founder
       gate because the unit that met it was moving fast. Nothing here reads a symptom the
       reader is describing in themselves; every one names a diagnosis or an admission the
       reader is DISCLOSING in order to ask that it be held.

       "more than one diagnosis" was written and then REMOVED: at three tokens it outranks
       `care:adhd-assessment`'s "diagnosis" and CONSUMES the span, so "complex needs, more than
       one diagnosis already" stopped reaching assessment — a pin caught it. A cue that reads
       one facet by taking a word another facet needs is not a gain, and the aspiration it
       would have served stays standing. */
    "borderline", "personality disorder", "hear voices", "psych ward","bipolar", "complex", "psychosis", "schizophrenia",
    // O53: how people name the whole file rather than one diagnosis. Two content tokens.
    "psych history", "schizoaffective"]),
  care("autism-adhd", "Autism and neurodevelopmental", 26, ["autism", "autistic", "audhd", "sensory",
    // O49: the self-identification word, single and precise (the "neuroaffirming" precedent).
    "neurodivergent"]),
  care("substance-history", "Substance history held safely", 26, [
    /* O123: same register as "I drink more than I should", which the year plan uses as its own
       worked example of the G7 line — a disclosure made in order to ask that the conversation
       be held safely. This facet has read that register since it was written. */
    "clean two years", "past drug use",
    "drink", "drinking", "alcohol", "cannabis", "substance", "non-stimulant",
    // O49: the word people actually use. Two content tokens, so a garden stays a garden.
    "smoke weed",
    /* O107, first register: THE SUBSTANCES THE LIST NEVER LEARNED. The lexicon knew the two
       legal ones and none of the rest, which reads as a list written quickly rather than one
       that made a judgement. Each is a single unambiguous word — no collapse rule applies to
       a one-WORD cue — and naming a substance is the established reading for this facet, not
       a new one: the header of this module uses it as the worked example of G7's preference
       reading ("I drink more than I should" is a request about how a conversation is held,
       not a finding about the person). */
    "methamphetamine", "opioids", "cocaine", "suboxone", "heroin", "vaping weed",
    /* O107, second register: RECOVERY — how people raise this most carefully, and where the
       finder heard nothing at all. Somebody who volunteers "I am in recovery" is asking to be
       met a particular way, which is the whole facet.

       "in recovery" is deliberately TWO WORDS that collapse to one token, which makes the O45
       rule demand the authored pair in the raw stream. That is precisely what makes it safe:
       bare "recovery" fires on "recovery time after surgery", and the pair does not. */
    "in recovery", "sober",
    /* FOUR REFUSED ON MEASUREMENT (O103's method, now standard):
         "clean"     fires on "a clean bill of health"
         "recovery"  fires on "recovery time after surgery" — hence the pair above
         "drug use"  fires on "the drug I use works well"
         "ice"       fires on "ice packs for the headaches" — the Australian street term is
                     the tempting one and the least safe of all
       Their sentences stay aspirations. A facet about meeting somebody without raised
       eyebrows is the last place to accept a cue that fires on a bill of health. */
  ]),
  care("emotional-regulation", "Emotional regulation", 24, [
    /* O114: THE WANT HALF ONLY, and the cues are shaped to require it. Each of these carries
       the HELP-WITH framing or names the emotional side as a thing to be TAKEN SERIOUSLY —
       "help with the anger", "help with the rage" — rather than the emotion word alone.

       The bare words are deliberately absent and pinned absent. "rejection hits me like a
       truck", "my temper goes from zero to a hundred", "my moods flip fast and I say things I
       regret", "crying at work over nothing" are the reader describing their own state, and
       this module's header names that exact trap: a prior probe closed a "recall gap" by
       cueing DSM inattention text into a care facet. Cueing "anger" or "rage" would do the
       same thing to this one. The state half stays standing and goes to the founder question
       with trauma's and attuned's — the third facet to split the same way. */
    "help with the anger", "help with the rage", "the emotional side",
    "rejection sensitivity", "rsd", "emotional regulation", "shame",
    /* O119 REMOVED bare "overwhelmed" and kept the want-framing, which is O114's rule applied
       to the word that unit did not reach. "somebody calm, because I arrive overwhelmed" is a
       person describing their own state and asking for a CALM GP — it reaches
       `manner:steadying` on "calm", correctly, and reading it into a care facet as well is the
       DSM-text trap this module's header names. "overwhelmed" survives in the steadying cue
       list, where it expresses a preference about the clinician rather than a finding about
       the reader. */
    "help with the overwhelm", "feeling overwhelmed by",
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
    /* O103 (the O64→O65 loop, run on the gap that replaced longer-appointment at the top of
       the list): this facet was the loudest on record at ELEVEN unheard phrasings, and the
       reason was register. Every cue above hears a REFUSAL — "without medication", "not a
       script" — and the corpus had collected two registers this facet is actually asked in
       and neither was cued:

         SEQUENCE — the ask is about ORDER, not refusal. "strategies first, tablets later",
         "medication as a last resort". Nobody here is declining a script; they are saying
         where it goes in the plan, which is a different sentence and a real preference.

         ALTERNATIVE — the ask names the other thing. "psychological approaches", "lifestyle
         changes", "what works besides medication".

       Each keeps two content tokens (O25). */
    "strategies first", "tablets later", "last resort",
    "psychological approaches", "skills and strategies", "lifestyle changes",
    "diet and exercise", "besides medication", "not ready for medication",
    /* FOUR CUES REFUSED, AND THE REASON IS MEASURED RATHER THAN ASSERTED (the O65 pattern).
       `findCue` matches in order ACROSS intervening words, so each of these fires on a
       sentence that means something else — checked against the real matcher before being
       dropped, not reasoned about:
         "non drug"              fires on "a non stimulant drug" — a MEDICATION ask, the opposite
         "more than a prescription" fires on "talk more about my prescription" — titration
         "before any script"     fires on "before my script ran out" — titration
         "another way"           fires on "explain it another way" — sense-making
       Their corpus sentences stay aspirations with this note as their reason. Precision here
       is worth more than recall: three of the four would mislabel the ask as its opposite. */
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
    manner(quality, EI_QUALITIES[quality].label, 24, mannerPhrases(quality)),
  ),

  // ── Access ────────────────────────────────────────────────────────────────────────────────
  pref("woman-gp", "A woman GP", 30, [
    /* O128 (tranche seven): "female practitioner" — the corpus asked for it in a sentence the
       existing "female gp" and "female doctor" could not read. The tranche's job is to supply
       the phrasings the author of a cue list did not think of, and this is one. */
    "female practitioner",
    /* O125 WROTE "not a man" HERE AND THE SUITE REVERSED IT, correctly: O114 had already measured
       that cue and refused it, because it fires on "my GP is not a man of many words" — a real
       English idiom about somebody being terse. §O114's pin caught the re-add within a minute.
       "a she not a he" was refused separately: it strips to [not] alone, with no content word
       to anchor a pair. Both phrasings stay standing, and the refusals are now in
       REFUSED_CUES so the next author meets them before writing rather than after. */
    "woman gp", "female gp", "woman doctor", "female doctor", "prefer a woman",
    /* O114: the words Australians actually use. Six sentences were lost to a synonym list on
       a preference this roster can genuinely answer, so every one was a reader who would have
       been ordered correctly and was not. Nobody here is describing themselves — they are
       naming who they want to see — so there is no judgement in this half of the unit at all.

       TWO REFUSED, both measured:
         "not a man"      fires on "my GP is not a man of many words", a real English idiom
         "a she not a he" collapses to the single token [not], which is far too loose to ship
                          under any pair rule — hearing it needs the raw RUN demand, and one
                          sentence does not earn a mechanism (the O84 bar) */
    "lady doctor", "lady gp", "safer with a woman", "women doctors"]),
  pref("telehealth-first", "By phone or telehealth", 28, [
    /* O128: "immunosuppressed" beside O125's "immunocompromised". They are the same reason in
       two words people use interchangeably, and stemming does not bridge them — a reader does
       not get to be unheard because they picked the other one. */
    "immunosuppressed",
    /* O125: the two REASONS people give for wanting telehealth rather than the word itself. A
       reader who says why does not also say "telehealth", which is exactly the register a
       cue list built from the feature name misses. */
    "immunocompromised", "phone calls easier","telehealth", "by phone", "over the phone", "remote", "online",
    // O53: video is how half of them say it, and "phone first" is the ask in appointment order.
    "video appointment", "video call", "phone first",
    /* O108: VIDEO AS A PREPOSITION, and the appointment noun the list somehow lacked.
       "by video" and "over video" collapse to [video] and therefore ship under O45's rule
       demanding the authored pair — which is what makes them safe, because bare "video"
       fires on "I watched a video about ADHD". Same device as O107's "in recovery": the
       precision comes from a mechanism already here rather than a new one.

       "phone appointments" sounds like it should already have worked and did not: "by phone"
       collapses to [phone] and rightly demands its pair, so the commonest way anybody says
       this reached nothing at all. */
    "by video", "over video", "video only", "video reviews", "phone appointments",
    /* THE REGISTER THIS UNIT COULD NOT SAFELY HEAR, and the reason is worth the space.
       Three corpus sentences ask for telehealth by refusing the alternative — "no more
       waiting rooms", "clinic visits are a risk", "phone calls easier than visits". The want
       is real and it is the other side of what they said. But a cue read off the AVOIDED
       thing cannot tell the ask from its mirror image, and each of these was measured firing
       on a sentence meaning the OPPOSITE:
         "clinic visits" fires on "I would prefer clinic visits to telehealth"
         "phone calls"   fires on "I hate phone calls, please do it in person"
         "waiting rooms" fires on "the waiting room makes my anxiety worse" — an anxiety
                         sentence, and the [wait, room] collision O84 already paid for
       Hearing the want here needs to read the REFUSAL and invert it, which is a mechanism
       (the negation family, pointed the other way) and not a cue. Left standing, deliberately.
       "video only" survives this test because it names the wanted thing, not the avoided one. */
  ]),
  pref("bulk-billing", "Bulk billing", 24, ["bulk bill", "bulk billed", "bulk billing", "cannot afford", "cheap",
    /* O109: THE FACET KNEW ITS OWN NAME AND NO SYNONYM FOR THE THING IT IS ABOUT. All six of
       its standing aspirations asked about money in words the list did not contain — out of
       pocket, gap fees, Medicare-only, "does it cost anything" — on the ask most likely to
       decide whether somebody books at all.

       "out of pocket" collapses to [pocket] and so ships under O45's pair demand, which is
       what keeps it honest. */
    "out of pocket", "gap fee", "gap fees", "medicare only", "cost anything",
    "how much does it cost",
    /* "no out of pocket" CARRIES ITS OWN NEGATOR, the O104 lesson met a second time: the bare
       cue is present in "no out of pocket costs please" and reached nothing, because O72 read
       the adjacent "no" as a refusal of the facet — when wanting NO out-of-pocket cost is
       precisely the bulk-billing ask. The negator has to live inside the cue's own words. */
    "no out of pocket",
    /* TWO REFUSED, AND THE FIRST IS THE MOST IMPORTANT REFUSAL IN THE DAY'S SWEEPS:
         "cannot pay" fires on "I CANNOT PAY ATTENTION for long" — an ADHD symptom sentence,
                      and reading that as a request about billing would be both wrong and
                      exactly the kind of wrong G7 exists to prevent. The two corpus sentences
                      it was meant for are covered by "gap fees" and "medicare only" anyway.
         "free"       fires on "free up my afternoons". */
  ]),
  pref("longer-appointment", "A longer first appointment", 20, [
    /* O116: "double slot" and "forty minutes" — and the comparative itself now reaches through
       the stemmer entry rather than through a cue, so every "long…" cue O65 wrote hears
       "longer" too. "more than fifteen minutes" stays refused exactly as O65 refused it. */
    "double slot", "forty minutes","longer first appointment",
    // O65 (the O22 loop on O64's corpus finding): the facet carried ONE three-token cue, so
    // the commonest phrasings of this ask were all unheard — measured, not guessed, in
    // corpus tranche three. Each cue keeps two content tokens (the O25 collapse rule).
    // "more than fifteen minutes" stays UNCUED on purpose: it strips to [fifteen, minute],
    // which is also how distance talk reads ("fifteen minutes from the station"), and that
    // precision is not worth this recall — the corpus carries it as a standing aspiration.
    "long appointment", "long consult", "double appointment", "double session", "extended appointment"]),
];

/**
 * One authored phrase, ready to match: both tokenisations the matcher uses, whether it
 * collapsed, and the facet it speaks for.
 *
 * O101 named this type. It was written inline on `CUES` and reached for elsewhere as
 * `(typeof CUES)[number]`, which made the matcher's central record legible only by
 * inference from the expression that happened to build it.
 */
type Cue = {
  phrase: string;
  tokens: string[];
  raw: string[];
  collapsed: boolean;
  entry: Entry;
};

/*
 * THE CUE TABLE IS BUILT IN FOUR NAMED STAGES (O101).
 *
 * It used to be one chained expression under two doc comments stranded above it in an order
 * that read backwards — the paragraph about sort order sat directly above the dedup loop, which
 * answers a different question. Every comment below is the original prose, moved to the stage
 * it is actually about. No step changed.
 */

/**
 * STAGE 1 — A PHRASE BELONGS TO ONE FACET, and the first entry to list it wins (O7/F10).
 * "overwhelmed" appears in both `care:emotional-regulation` and the steadying manner cues;
 * before this dedup the second copy was DEAD — the stable sort meant the earlier entry always
 * claimed the words, and nothing said so. Dropping later duplicates makes the same behaviour
 * explicit, keeps the self-reach pin honest (every cue in `LEXICON_CUES` genuinely reaches its
 * facet), and leaves the emotional-fit interview's own use of its cue lists untouched.
 */
const FIRST_CLAIM = new Map<string, { phrase: string; entry: Entry }>();
for (const entry of LEXICON) {
  for (const phrase of entry.phrases) {
    if (!FIRST_CLAIM.has(phrase)) FIRST_CLAIM.set(phrase, { phrase, entry });
  }
}

/**
 * STAGE 2 — pre-tokenise, both ways, once.
 *
 * The matcher reads a stripped stream and a raw one, so every cue carries both rather than
 * being re-tokenised per sentence.
 */
const TOKENISED_CUES: readonly Cue[] = [...FIRST_CLAIM.values()].map(({ phrase, entry }) => ({
  phrase,
  tokens: tokenise(phrase),
  raw: tokeniseKeepingStopwords(phrase),
  /* O45: an authored multi-word phrase that ships as at most one content token is matched
     under the collapse-aware rule — see `collapsedCueSatisfied` in read.ts. Computed here,
     once, from the same two tokenisations the matcher itself uses, so the rule's membership
     can never drift from what actually collapses. */
  collapsed: phrase.trim().split(/\s+/).length >= 2 && tokenise(phrase).length <= 1,
  entry,
}));

/**
 * STAGE 3 — drop cues that tokenise to nothing at all.
 *
 * A phrase made entirely of stopwords has no content token to match on, so it would either
 * match everything or nothing depending on the rule that read it. Neither is a cue.
 */
const MATCHABLE_CUES: readonly Cue[] = TOKENISED_CUES.filter((cue) => cue.tokens.length > 0);

/**
 * STAGE 4 — most specific first.
 *
 * ORDER MATTERS AND THE REASON IS A REAL DEFECT IT PREVENTS. "not just medication" contains
 * "medication"; "treated for anxiety" contains "anxiety". Reading short cues first would let a
 * general term claim a sentence whose specific term says something different — in the first case
 * close to the opposite. Sorted by TOKEN count now rather than character length, because that is
 * what specificity means once matching is done on tokens.
 */
const CUES: readonly Cue[] = [...MATCHABLE_CUES].sort(
  (a, b) => b.tokens.length - a.tokens.length || b.phrase.length - a.phrase.length,
);

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
const RUN_DEMANDED = new Set(["over the phone", "in the room with me"]);

export function readNeeds(text: string): NeedSignal[] {
  const sentence = tokenise(text);
  // The same words with the function words kept, for the collapse-aware rule only (O45).
  const rawSentence = tokeniseKeepingStopwords(text);
  const signals: NeedSignal[] = [];
  const seen = new Set<string>();
  /* O106: the token positions already spoken for. Positions, not ranges — a cue claims the
     words it MATCHED, never the words it straddled. See the claiming step below. */
  const claimed = new Set<number>();

  /* PHASE 1 (O78 shape, O81 arrangement): collect every occurrence of every cue that
     survives the occurrence-local rules. findCue retries past a refused span (O78: a
     clause-one refusal must not silence a clause-two ask); the sentence-global collapse
     check skips the cue outright. Desire negation is deliberately NOT decided here —
     it needs to see all spans at once, which is the whole of O81. */
  type Candidate = { cue: Cue; from: number; to: number; at: number[] };
  const candidates: Candidate[] = [];
  for (const cue of CUES) {
    /* O45 (Q1 item 1): a cue that collapsed to one content token fires only when the sentence
       also carries an adjacent pair of the cue's AUTHORED words — "out the door" must look
       like "out the door" somewhere, not merely contain "door". A refused collapsed cue
       claims nothing, so the words stay readable by any cue that genuinely matches them.
       SENTENCE-GLOBAL (the pair test reads the whole raw stream), so no retry can help. */
    /* O94: two collapsed cues demand their FULL raw run rather than any pair — the
       opt-in read.ts's collapsedCueRunPresent documents. "over the phone" leaked through
       [the, phone] onto a phone-menu complaint (O87's pin); "in the room with me" is
       O25's removed phrase come home — every pair design leaked (O84's measurements) and
       the run hears the presence ask while staying silent on "with someone", waiting
       rooms and cold rooms. A cue with a contraction form must never join this set. */
    if (
      cue.collapsed &&
      !(RUN_DEMANDED.has(cue.phrase)
        ? collapsedCueRunPresent(rawSentence, cue.raw)
        : collapsedCueSatisfied(rawSentence, cue.raw))
    ) {
      continue;
    }
    let searchFrom = 0;
    while (true) {
      const at = findCue(sentence, cue.tokens, searchFrom);
      if (!at) break;
      searchFrom = at.from + 1;
      /* O76 (the rule O75's hedge pin demanded): a cue sitting wholly inside a conversational
         hedge is filler, not an ask — "a she not a he, if that makes sense" must not reach
         sense_making. The mapping is span-precise, so a genuine ask elsewhere in the sentence
         keeps reaching — before the hedge via findCue's order, after it via the O78 retry. */
      if (withinHedge(sentence, rawSentence, at.from, at.to)) continue;
      /* O77 (O75's other pin): "for my mum" / "on behalf of my mum" names the PATIENT, not a
         relative joining the appointment, so the culturally_attuned reading stands down. ONLY
         that facet: the child facet's whole register is on-behalf ("this is for my teenager"
         IS the ask), the same exemption shape O40 gives manner. */
      if (
        facetKey(cue.entry.facet) === "manner:culturally_attuned" &&
        onBehalfBefore(sentence, rawSentence, at.from, at.to)
      ) {
        continue;
      }
      /* O120: the counter-signal the child facet needs precisely BECAUSE O77 exempts it. That
         exemption says on-behalf IS this facet's register, which is right — and it leaves the
         facet with no way to hear a sentence where the relative is CONTEXT rather than the
         patient. "after my son was diagnosed I recognised myself and now I want my own
         assessment" is an adult asking for their own assessment, and the facet firing ranks
         paediatric GPs for them: a wrong appointment, not a shade of emphasis. "my own" is the
         narrowest construction that says it (see `selfClaimedPatient` for why a general
         self-reference is unsafe and unmeasurable here). */
      if (
        facetKey(cue.entry.facet) === "care:child-adolescent-adhd" &&
        selfClaimedPatient(rawSentence)
      ) {
        continue;
      }
      /* O72: a bare "no"/"not" immediately before a care/pref cue span is a refusal ("not
         bulk billing, I am happy to pay for time") — UNLESS the raw stream shows the
         additive "not just" idiom pointing at this cue ("assess me for ADHD, not just the
         anxiety" means anxiety AND MORE). Adjacency-tight, so it is already consume-once
         and stays an occurrence-local check; the negator inside a cue's own phrase is
         untouched because the check looks strictly before the span. Manner exempt (O40). */
      /* O83 joins the same guard: a reporting verb directly before the negator marks the
         refusal as somebody ELSE's — "they said no to titration and I want it anyway" is a
         complaint, which O40/O72 read as a want everywhere else — unless the raw stream
         shows the reader reporting their OWN no ("I said no to titration"), which is a
         refusal that stands. */
      if (
        (cue.entry.facet.kind === "care" || cue.entry.facet.kind === "preference") &&
        bareNegatorBefore(sentence, at.from) &&
        !softenedNotJust(rawSentence, cue.tokens[0]!) &&
        !reportedRefusal(sentence, rawSentence, at.from)
      ) {
        continue;
      }
      /* O92 (O87's second pin): a cue that carries its OWN negator means DECLINING the
         thing — unless the raw determiner says the reader is LACKING it. "what can we do
         without medication" declines; "leaving me without MY script" is a supply
         complaint, and reading it as a non-medication preference was the pinned false
         positive. Same claims-nothing rule, same care/pref scope. */
      if (
        (cue.entry.facet.kind === "care" || cue.entry.facet.kind === "preference") &&
        isTightNegator(cue.tokens[0]!) &&
        lackingNotDeclining(sentence, rawSentence, at.from, at.to)
      ) {
        continue;
      }
      candidates.push({ cue, from: at.from, to: at.to, at: at.at });
    }
  }

  /* PHASE 2 (O81, the O78 audit's headline demand): a desire negation spends itself on the
     NEAREST following span, and only that one — "I don't want a woman GP, bulk billing
     matters more" refuses the woman GP and keeps the bulk-billing ask, where O40's
     everything-in-lead scope suppressed both. MANNER stays exempt exactly as O40 designed
     ("I don't want to feel rushed" IS the unhurried ask) but now also SPENDS the trigger,
     so a care ask sitting behind a manner object is no longer swallowed. Scope per trigger
     is unchanged: forward, within the lead, never across a clause boundary. */
  const negated = suppressedByDesireNegation(
    sentence,
    candidates.map((candidate) => ({
      from: candidate.from,
      negatable:
        candidate.cue.entry.facet.kind === "care" || candidate.cue.entry.facet.kind === "preference",
    })),
    // O105: where the commas were. A comma ends a negation's scope without ending a cue's.
    commaBreaksBefore(text),
  );

  /* PHASE 3: claiming, in the same specificity order as always. A suppressed occurrence
     claims nothing; words another facet claimed are occupied, not poisoned, so a later
     occurrence of the same cue may still land (the O78 retry, preserved). */
  candidates.forEach((candidate, index) => {
    if (negated.has(index)) return;
    const { cue } = candidate;
    /* O106: A CUE CLAIMS THE WORDS IT MATCHED, NOT THE WORDS IT STRADDLED.
       This compared RANGES, so a cue matching across a gap marked the intervening tokens
       spoken for as well. manner:attuned's "take seriously" therefore claimed
       [take, trauma, seriously] in "a gentle GP who takes trauma seriously", and the word
       "trauma" — which that cue never matched — was unavailable to the trauma cue that
       would have. The reader's own word went to another facet and vanished from the read.
       Specificity ordering still does its work: "not just medication" claims [not,
       medication], so the bare "medication" cue finds its token taken exactly as before. */
    if (candidate.at.some((position) => claimed.has(position))) return;

    const key = facetKey(cue.entry.facet);
    if (seen.has(key)) return;

    for (const position of candidate.at) claimed.add(position);
    seen.add(key);
    signals.push({
      facet: cue.entry.facet,
      matched: cue.phrase,
      label: cue.entry.label,
      weight: cue.entry.weight,
    });
  });

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
