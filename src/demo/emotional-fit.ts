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
    cues: ["feel heard", "been heard", "not heard", "understood", "really listen", "listened to", "dismissed", "brushed off", "taken seriously", "not believed", "talked over",
      // W221 probe: "decides before I finish the sentence" reached nothing.
      "decides before", "made up their mind", "did not listen", "didn't listen", "not listened to"],
  },
  steadying: {
    label: "Calm and steadying",
    matchLine: "has a calm, steadying manner",
    cues: ["calm", "gentle", "reassuring", "put me at ease", "at ease", "overwhelmed", "nervous", "on edge", "reassurance"],
  },
  sense_making: {
    label: "Helps it make sense",
    matchLine: "helps you make sense of what is going on",
    cues: ["make sense", "understand what", "figure out", "what is going on", "what's going on", "clarity", "join the dots", "name it", "confusing"],
  },
  motivating: {
    label: "Strengths-focused",
    matchLine: "works from your strengths, not only the problems",
    // "a plan i can" degenerated to the single token "plan" once stopwords were stripped, which
    // made ANY mention of a plan read as a strengths preference — including the structured
    // clarifier's own answer. The O7 self-reach pin caught it; the cue now keeps its verb.
    cues: ["hopeful", "strengths", "not just problems", "not just what is wrong", "not just what's wrong", "encourag", "motivat", "plan i can follow", "plan i can stick"],
  },
  unhurried: {
    label: "Unhurried first appointment",
    matchLine: "gives you an unhurried first appointment",
    cues: ["not rushed", "won't rush", "wont rush", "unhurried", "longer appointment", "longer first", "feel rushed", "always rushed", "enough time", "time to explain", "not a number",
      // W221 probe: none of these reached `unhurried`, and every one of them is somebody
      // describing being rushed without using the word.
      // "in and out" was removed by O7's self-reach pin: every word in it is a stopword, so it
      // tokenised to nothing and had been structurally dead since W222. "ten minutes" and "out
      // the door" already carry the experience it was written for.
      "get a word in", "finish the sentence", "finish a sentence", "before i finish", "cut me off", "out the door", "ten minutes", "fifteen minutes", "lose my thread",
      // W222: every cue above is multi-word, so "she rushes me every time" reached none of them.
      // The bare stem is the commonest way anybody says it.
      "rushes", "rushing", "hurried", "hurry me",
      // W223: "take my time" was dropped. "my" is a stopword, so it matched [take, time] — and
      // "I can take time off work" is a sentence this product puts in its OWN barrier list on the
      // landing page. Recall lost is nil: "not rushed", "rushes", "hurried", "enough time" and
      // "longer appointment" all still reach this facet.
      ],
  },
  non_judgmental: {
    label: "Non-judgmental",
    matchLine: "is non-judgmental, so you can be honest",
    cues: ["won't judge", "wont judge", "no judgment", "no judgement", "without judgment", "without being judged", "judged", "ashamed", "shame", "embarrassed", "safe to say", "honest about",
      // W221 probe: "won't make me feel like I'm making it up" reached nothing.
      "making it up", "make it up", "attention seeking", "drug seeking", "faking", "believe me", "not believed"],
  },
  collaborative: {
    label: "Explains and decides with you",
    matchLine: "explains the options and decides them with you",
    cues: ["explain", "involve me", "part of the decision", "talk it through", "understand my choices", "shared decision", "decide together", "work together",
      // W223: "work with me", "my options", "the options" and "my say" were dropped. Under token
      // matching each reduces to ONE very common word — [work], [option], [say] — because the
      // rest are stopwords, so "I can take time off work" proposed that the reader wanted a
      // collaborative GP. They were authored when matching was literal substrings and the whole
      // phrase had to be present. Replaced with phrasings that survive as more than one token.
      ],
  },
  culturally_attuned: {
    label: "Understands your background",
    matchLine: "understands your background and family",
    cues: ["my family", "cultural", "culture", "background", "my community", "migrant", "south asian", "indian",
      // W221 probe: "my mum thinks this is nonsense and she'll be in the room" reached nothing.
      "my mum", "my mother", "my dad", "my father", "my parents", "in the room with me", "nonsense", "not real", "just lazy", "an excuse"],
  },
  structured: {
    label: "A structured, measured approach",
    matchLine: "works to a documented baseline and follows up on a schedule",
    cues: ["structured", "thorough", "measured", "properly", "on a schedule", "monitoring", "follow-up plan", "baseline"],
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
