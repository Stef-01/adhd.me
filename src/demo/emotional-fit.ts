// Emotional-intelligence / personality FIT — a multifaceted layer over the roster match.
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
  | "culturally_attuned";

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
    cues: ["feel heard", "been heard", "not heard", "understood", "really listen", "listened to", "dismissed", "brushed off", "taken seriously", "not believed", "talked over"],
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
    cues: ["hopeful", "strengths", "not just problems", "not just what is wrong", "not just what's wrong", "encourag", "motivat", "a plan i can"],
  },
  unhurried: {
    label: "Unhurried first appointment",
    matchLine: "gives you an unhurried first appointment",
    cues: ["not rushed", "won't rush", "wont rush", "take my time", "unhurried", "longer appointment", "longer first", "feel rushed", "always rushed", "enough time", "time to explain", "not a number"],
  },
  non_judgmental: {
    label: "Non-judgmental",
    matchLine: "is non-judgmental, so you can be honest",
    cues: ["won't judge", "wont judge", "no judgment", "no judgement", "without judgment", "without being judged", "judged", "ashamed", "shame", "embarrassed", "safe to say", "honest about"],
  },
  collaborative: {
    label: "Explains and decides with you",
    matchLine: "explains the options and decides them with you",
    cues: ["explain", "involve me", "my options", "the options", "part of the decision", "talk it through", "work with me", "understand my choices", "shared decision", "my say"],
  },
  culturally_attuned: {
    label: "Understands your background",
    matchLine: "understands your background and family",
    cues: ["my family", "cultural", "culture", "background", "my community", "migrant", "south asian", "indian"],
  },
};

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
