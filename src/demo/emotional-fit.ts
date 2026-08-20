// W221: emotional-intelligence / personality FIT — the manner half of the roster match.
//
// HEADER ADDED RATHER THAN THE FLOOR RAISED. This file shipped without a `// W<n>` unit header and
// tripped CENSUS-1 in `src/quality/latent-findings.ts` — W200's copy census decides which modules
// it must cover by reading that header, so a module without one is invisible to it: not declared,
// not linted, and not reported as missing. Bumping the head-count floor would have silenced the
// finding while leaving this file outside the census, which is the failure mode the finding names.
//
// It also now owns the SINGLE manner vocabulary. `src/matching/needs.ts` reads `EI_QUALITIES`
// directly rather than restating the cues, because two overlapping manner lexicons is the exact
// defect W221 removed from the ranker.
//
// THE BOUNDARY, STATED FIRST, BECAUSE IT IS THE WHOLE DESIGN. This matches a clinician's DECLARED
// interpersonal and emotional-intelligence qualities to the preferences a reader EXPRESSES in their
// own words. It does NOT assess the reader, does not sort them into a personality category, and does
// not read their clinical or emotional STATE and act on it — that is reasoning ABOUT the patient,
// which is the G7 / TGA-CDSS line this product does not cross. It is exactly the move the roster
// already makes for language, gender and care area (`clinicians.ts`): a stated want matched to a
// declared attribute, and nothing beyond it.
//
// THE QUALITIES ARE THE CLINICIAN'S TO DECLARE, like `careAreas` or `languages`. Where a doctor has
// not published them himself they are a DECLARATION relayed from the founders, not a judgement
// ADHD.ME made — the same posture `nswAdhdTrained` takes, and the surfaces say which is which. This
// product does not administer an EI test to anyone, does not score a clinician's EI, and could not:
// a facet here means "this is a quality I lead with", not a measured result.
//
// THE FACETS DRAW ON MSCEIT's four branches (perceiving, using, understanding and managing emotion)
// and add the plain interpersonal qualities that decide whether an ADHD consult goes well. The CUES
// are PREFERENCE expressions — words that show a reader would value a given manner — never a reading
// of the reader. "I don't want to feel rushed" is a preference; it is not a finding about them.

/** The qualities a clinician may declare, and a reader may prefer. A closed vocabulary on purpose. */
export type EIQuality =
  /** MSCEIT: perceiving emotion — notices and responds to how you are, so you feel heard. */
  | "attuned"
  /** MSCEIT: managing emotion — keeps the room settled, which helps when things feel like a lot. */
  | "steadying"
  /** MSCEIT: understanding emotion — helps you understand what is going on for you. */
  | "sense_making"
  /** MSCEIT: using emotion — works from strengths and leaves you with a plan you can act on. */
  | "motivating"
  /** Gives you time; the first appointment is not run against a stopwatch. */
  | "unhurried"
  /** Safe to be honest — no shame about drinking, coping, or how past care went. */
  | "non_judgmental"
  /** Explains the options and decides them WITH you, not for you. */
  | "collaborative"
  /** Understands your background and family, so you are not translating yourself. */
  | "culturally_attuned"
  /**
   * W221: documented baseline, then review on a schedule rather than when something goes wrong.
   *
   * Not an emotional-intelligence quality and deliberately not dressed as one — it is a way of
   * ORGANISING care rather than a way of being with somebody. It is here because this union is
   * now the single manner vocabulary the matcher reads (`src/matching/needs.ts`), and a second
   * union alongside it would be the two-lexicon drift W221 removed from the ranker.
   */
  | "structured";

interface EIQualityDef {
  /** Short, reader-facing label. Used as a match signal. No clinical claim. */
  label: string;
  /** The reason fragment when it matches, addressed to the reader. */
  matchLine: string;
  /** Words that EXPRESS a preference for this quality. Preference, never a diagnosis of the reader. */
  cues: readonly string[];
}

export const EI_QUALITIES: Record<EIQuality, EIQualityDef> = {
  attuned: {
    label: "Listens and takes you seriously",
    matchLine: "listens and takes you seriously",
    cues: ["feel heard", "been heard", "not heard", "understood", "really listen", "listened to", "dismissed", "brushed off", "taken seriously", "not believed",
      // "talked over" was dropped: "over" is a stopword, so it collapsed to the single token [talk]
      // and false-matched "before anyone talks about a stimulant". "talked over the top" keeps the
      // sense as two content tokens; the dismissal family is also covered by "dismissed"/"brushed off".
      "talked over the top",
      // W221 probe: "decides before I finish the sentence" reached nothing.
      "decides before", "made up their mind", "did not listen", "didn't listen", "not listened to",
      // O13: "takes me seriously" missed — the stemmer keeps "taken" and "takes" apart
      // ("taken" has no strippable suffix), so the present-tense ask needs its own cue.
      "take seriously", "takes me seriously", "attentive",
      // O53: the listening ask in its commonest surface form ([someone, listen]).
      "someone who listens",
      // O30 psychographics: "treat me as a whole person" is the plainest values statement in
      // the corpus family this facet answers.
      "whole person"],
  },
  steadying: {
    label: "Calm and steadying",
    matchLine: "has a calm, steadying manner",
    cues: ["calm", "gentle", "reassuring", "put me at ease", "at ease", "overwhelmed", "nervous", "on edge", "reassurance"],
  },
  sense_making: {
    label: "Helps it make sense",
    matchLine: "helps you make sense of what is going on",
    cues: ["make sense", "understand what", "figure out", "what is going on", "what's going on", "clarity", "join the dots", "name it", "confusing",
      // O30 psychographics: the plain-language ask is a values statement about how somebody
      // wants medicine spoken to them. Every cue keeps two content tokens (the O25 law);
      // "without"/"no" survive stripping because negations are never stopwords.
      "plain language", "plain english", "simple terms", "without the jargon", "no jargon",
      // O49 (corpus aspirations): late diagnosis as a sense-making ask, and the ask for
      // mechanism over reassurance. Both keep two content tokens.
      "head around", "want the science"],
  },
  motivating: {
    label: "Strengths-focused",
    matchLine: "works from your strengths, not only the problems",
    // "a plan i can" degenerated to the single token "plan" once stopwords were stripped, which
    // made ANY mention of a plan read as a strengths preference — including the structured
    // clarifier's own answer. The O7 self-reach pin caught it; the cue now keeps its verb.
    cues: ["hopeful", "strengths", "not just problems", "not just what is wrong", "not just what's wrong", "encourag", "motivat", "plan i can follow", "plan i can stick",
      // O30 psychographics: neurodiversity-affirming language is how a large cohort states
      // the strengths-not-deficits value. "neuroaffirming" is a single WORD (precise, so
      // allowed); the multi-word cues keep two content tokens.
      "neurodiversity affirming", "neuroaffirming", "neurodivergent friendly",
      // O49: "a plan I can actually act on" — the verb kept, per this list's own header.
      "plan i can act"],
  },
  unhurried: {
    label: "Unhurried first appointment",
    matchLine: "gives you an unhurried first appointment",
    cues: ["not rushed", "won't rush", "wont rush", "unhurried", "longer appointment", "longer first", "feel rushed", "always rushed", "enough time", "time to explain", "not a number",
      // W221 probe: none of these reached `unhurried`, and every one of them is somebody
      // describing being rushed without using the word.
      // "in and out" was removed by O7's self-reach pin: every word in it is a stopword, so it
      // tokenised to nothing and had been structurally dead since W222 — main's rebuild kept it
      // unaware, and the removal stands through the merge. "ten minutes" and "out the door"
      // carry the experience it was written for.
      "get a word in", "finish the sentence", "finish a sentence", "before i finish", "cut me off", "out the door", "ten minutes", "fifteen minutes", "lose my thread",
      // Main's W221 recall fix, kept: the stemmer takes plural "minutes" to "minut" but leaves
      // singular "minute", so the plural cues could not hear "a ten minute appointment"; the
      // singular forms are added rather than touching the stemmer's length guards.
      "ten minute", "fifteen minute",
      // O53: the ask for the appointment's texture, not its length label ([time, talk]).
      "time to talk",
      // W222: every cue above is multi-word, so "she rushes me every time" reached none of them.
      // The bare stem is the commonest way anybody says it.
      "rushes", "rushing", "hurried", "hurry me",
      // O13 considered and REFUSED "takes their time": "their" is a stopword, so it survives
      // as the same [take, time] W223 dropped for firing on "take time off work". The recall
      // it would add is already carried by "not rushed", "unhurried" and "rushes".
      // W223: "take my time" was dropped. "my" is a stopword, so it matched [take, time] — and
      // "I can take time off work" is a sentence this product puts in its OWN barrier list on the
      // landing page. Recall lost is nil: "not rushed", "rushes", "hurried", "enough time" and
      // "longer appointment" all still reach this facet.
      ],
  },
  non_judgmental: {
    label: "Non-judgmental",
    matchLine: "is non-judgmental, so you can be honest",
    cues: ["won't judge", "wont judge", "no judgment", "no judgement", "without judgment", "without judgement", "without being judged", "judged", "ashamed", "shame", "embarrassed", "safe to say", "honest about",
      // W221 probe: "won't make me feel like I'm making it up" reached nothing.
      "making it up", "make it up", "attention seeking", "drug seeking", "faking", "believe me", "not believed",
      // O13, from a real query this facet's own NAME could not reach: "Kind Hindi speaking and
      // non judgemental" read as nothing but the language. The cue list was verb-phrase-heavy
      // ("won't judge", "judged") and the stemmer cannot bridge "judgemental"→"judg", so the
      // single commonest ADJECTIVE form — the word on the label itself — was unreadable in
      // either spelling, negated or not. "non-judgemental" tokenises to "non judgemental", so
      // the bare adjective covers the hyphenated ask too; a complaint ("she was so judgemental")
      // is the same preference, which is the reading this file always takes.
      "judgemental", "judgmental",
      // O49: two corpus asks. "no lectures" is the refusal of moralising; "tell the truth" is
      // what being unjudged is FOR. Both two content tokens ("no" is a negator, never dropped).
      "no lectures", "tell the truth"],
  },
  collaborative: {
    label: "Explains and decides with you",
    matchLine: "explains the options and decides them with you",
    // O13: the facet's own name was not a cue — "a collaborative GP" reached nothing.
    cues: ["collaborative", "explain", "involve me", "part of the decision", "talk it through", "understand my choices", "shared decision", "decide together", "work together",
      // W221/W223: "work with me", "my options", "the options" and "my say" were dropped. Under token
      // matching each reduces to ONE very common word — [work], [option], [say] — because the
      // rest are stopwords, so "I can take time off work" proposed that the reader wanted a
      // collaborative GP. They were authored when matching was literal substrings and the whole
      // phrase had to be present. Replaced with phrasings that survive as more than one token.
      //
      // W221 recall: "works with me on the options rather than dictating" reached nothing — the tokens
      // that survive are [work, option, rather, dictat] and none of the cues above is a subsequence
      // of them. "rather than dictating" → [rather, dictat] catches the family (nobody says they
      // want to be dictated to) and cannot be reached by "time off work", the false positive W221
      // removed. Kept two-token deliberately, for the same reason W221 dropped the one-token cues.
      "rather than dictating", "rather than telling me", "not just told what",
      // O49: the corpus asks in their own words. [decision, made] and [say, plan] both keep
      // two content tokens; W223's dropped one-token [say] stays dropped.
      "decisions made with me", "say in the plan",
      ],
  },
  culturally_attuned: {
    label: "Understands your background",
    matchLine: "understands your background and family",
    // O13: "culturally sensitive" missed — "culturally" does not stem to "culture".
    cues: ["culturally", "my family", "cultural", "culture", "background", "my community", "migrant", "south asian", "indian",
      // W221 probe: "my mum thinks this is nonsense and she'll be in the room" reached nothing.
      // O25: "in the room with me" stopword-stripped down to the single token [room], so
      // "my rooms are above the pharmacy" claimed this facet (found by the W227 reach-gap
      // feed). Replaced with a variant that keeps two content tokens — [come, room] — so the
      // family-presence meaning survives and a wall with rooms in it does not. The probe
      // sentence stays covered by "my mum".
      "my mum", "my mother", "my dad", "my father", "my parents", "come into the room", "nonsense", "not real", "just lazy", "an excuse",
      // O84 (the O78 audit queue's last item): the sit-register ("she will sit in the room
      // with me") stays UNCUED, and this comment is the record so it is not re-attempted
      // cue-first. Both candidate designs were built and MEASURED into refusal: a
      // two-token [sit, room] cue hears "I hate sitting in waiting rooms" through the
      // insertion gap, and the collapsed "room with me" cue (O45 pair [room, with]) hears
      // "I need to be in the room with someone" — a face-to-face ask, and the O77 boundary
      // pin caught it in-build, which is the corpus defending its own line. The
      // discriminating word is "me", a stopword no pair can carry; hearing this register
      // needs a raw-RUN demand the O45 machinery deliberately does not make (contractions
      // rely on any-pair). The aspiration stands in corpus.ts with this reason — the O65
      // "more than fifteen minutes" pattern. What precision DOES allow is the register's
      // other phrasing, added instead:
      "support person",
      // O94: O25's removed phrase comes home under the raw-RUN demand (needs.ts's
      // RUN_DEMANDED, read.ts's collapsedCueRunPresent). O84 measured every PAIR design
      // into leaks; the full contiguous run "in the room with me" hears the presence ask
      // and stays silent on "with someone", waiting rooms, cold rooms and walls — the
      // O84 leak pins in corpus.ts now guard this cue by name.
      "in the room with me",
      // O30 psychographics: faith named as part of the appointment is the same values ask as
      // family-in-the-room. Verb+noun pairs so nothing collapses ("my faith" alone would
      // strip to [faith] and claim "faith in doctors").
      "respects my faith", "respect my faith", "faith is important", "respects my religion",
      // O53: the shorter way the same value is said ([faith, matter]).
      "faith matters",
      // O49: family presence stated as a fact rather than a fear — "family will be involved".
      "family involved"],
  },
  structured: {
    label: "A structured, measured approach",
    matchLine: "works to a documented baseline and follows up on a schedule",
    // O13: "methodical" is the plain word for this way of working and missed (kept through the
    // merge alongside main's continuity family below).
    cues: ["structured", "methodical", "thorough", "measured", "properly", "on a schedule", "monitoring", "follow-up plan", "baseline",
      // W221 recall: continuity is part of this facet by its own definition — the onboarding ask is
      // "documented baseline and scheduled follow-up" — so "follow up and not just leave me to it"
      // belongs here rather than in a second, overlapping follow-through facet (the duplication
      // W221 removed). Bare "follow up" is deliberately NOT a cue: it collapses to [follow] once
      // "up" is dropped as a stopword, and [follow] would also fire on "I can't follow a
      // conversation" — reading an inattention SYMPTOM into a facet, the G7 line. These phrasings
      // are about wanting continuity of CARE and each survives as two content tokens.
      "not just leave me", "leave me to figure", "stay on top of", "keep an eye", "ongoing care",
      // O49 REMOVED "not one and done": it survived as [not, done] with two insertions allowed,
      // which matched "will NOT be judGED for the coping I have DONE" — and by claiming that
      // span it SHADOWED the non_judgmental cue sitting inside it ("judged"), the corpus's
      // first shadowing find. Its recall is carried by "ongoing care", "keep an eye",
      // "stay on top of" and "not just leave me", the same trade W223 made for [take, time].
      // O45: the cardiac-safety ask, heard as itself. "I need to know it's not going to hurt my
      // heart" was previously COUNTED as reached because the collapsed cue "what is going on"
      // fired on "…not GOING to…" — a wrong facet propping up the reach number. The real ask is
      // this facet's own definition (the baseline physical — heart, blood pressure — before a
      // stimulant), so it gets real cues. Each survives as two content tokens; none collapses.
      "hurt my heart", "safe for my heart", "heart checked", "check my heart"],
  },
};

/** The qualities, as a stable list. Exported so the matcher and the interview iterate one order. */
export const EI_QUALITY_KEYS = Object.keys(EI_QUALITIES) as EIQuality[];

/** How much a single matched facet is worth. Comparable to a language or gender preference (18), a
 *  touch lower so clinical fit still leads and EI reorders within it rather than overturning it. */
const EI_FACET_WEIGHT = 12;

const ALL_QUALITIES = Object.keys(EI_QUALITIES) as EIQuality[];

/** The qualities a reader's words EXPRESS a preference for. Not a profile of the reader. */
export function preferredQualities(query: string): EIQuality[] {
  const words = query.toLowerCase();
  return ALL_QUALITIES.filter((quality) => EI_QUALITIES[quality].cues.some((cue) => words.includes(cue)));
}

/** The EI contribution to a clinician's score: their DECLARED qualities that the reader ASKED for. */
export function emotionalFitScore(query: string, declared: readonly EIQuality[]): number {
  const wanted = new Set(preferredQualities(query));
  return declared.reduce((total, quality) => total + (wanted.has(quality) ? EI_FACET_WEIGHT : 0), 0);
}

/** The reader-facing signals for the EI facets that matched, in the clinician's declared order. */
export function emotionalFitSignals(query: string, declared: readonly EIQuality[]): string[] {
  const wanted = new Set(preferredQualities(query));
  return declared.filter((quality) => wanted.has(quality)).map((quality) => EI_QUALITIES[quality].label);
}
