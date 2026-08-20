// W231 (O125): the cues this tree has measured and REFUSED, as data.
//
// WHY THIS FILE EXISTS. Three times in one day a unit re-added a cue an earlier unit had
// already measured and refused: O122 wrote "before any script" (O103 refused it for firing on
// "we talked before my script ran out"), and O125 wrote both "know better" (O113: "I know
// better than to expect much") and "not a man" (O114: "my GP is not a man of many words").
// Every one was caught — by a pin, within a minute — so nothing shipped. But being caught
// three times is a signal about the PROCESS, not about the three cues: the refusals lived in
// test names and prose comments, which an author writing a new cue does not read first.
//
// A refusal is a measurement somebody paid for. Recording it here makes it findable by the
// person about to repeat it, and `refused-cues.test.ts` asserts the lexicon does not contain
// any of these phrases — so re-adding one fails the build with the reason attached rather than
// with a distant pin that says only "expected not to include".
//
// THIS IS NOT A BAN LIST. A refusal can be overturned deliberately: the entry names the
// sentence that refused it, so a later author can decide the sentence no longer matters, or
// that a mechanism now separates the two readings — which is exactly how O94 reversed O84's
// refusal once a second case earned the raw-run mechanism. Overturning means deleting the
// entry and saying why in the unit that does it. Meeting it by accident is what this prevents.

export type RefusedCue = {
  /** The phrase, exactly as it would be written in a cue list. */
  phrase: string;
  /** The facet it was proposed for. */
  facet: string;
  /** The sentence that refused it — the measurement, not an opinion. */
  refusedBy: string;
  /** What that sentence actually is, so the reader can judge whether it still matters. */
  because: string;
  /** The unit that measured it. */
  unit: string;
  /**
   * Set when the refusal is SPAN THEFT rather than a false positive.
   *
   * The register's liveness check assumes a refusal means "this sentence must not reach this
   * facet", and for most entries it does. Span theft is a different failure: the cue reads its
   * own facet correctly and does it by CONSUMING tokens another facet was already reading, so
   * the sentence keeps reaching the proposed facet and quietly stops reaching the robbed one.
   * The check caught this on its own first entry — "complex needs, more than one diagnosis
   * already" does reach `care:complex-mental-health`, through the older cue "complex". What the
   * refusal protects is the OTHER read, so that is what gets asserted.
   */
  protects?: string;
};

export const REFUSED_CUES: readonly RefusedCue[] = [
  {
    phrase: "before any script",
    facet: "care:non-medication",
    refusedBy: "we talked before my script ran out",
    because: "a titration sentence — the reader is asking about a prescription, not asking to avoid one",
    unit: "O103",
  },
  {
    phrase: "non drug",
    facet: "care:non-medication",
    refusedBy: "I would consider a non stimulant drug",
    because: "a medication ask; findCue spans gaps, so [non, drug] reads it as its opposite",
    unit: "O103",
  },
  {
    phrase: "more than a prescription",
    facet: "care:non-medication",
    refusedBy: "I want to talk more about my prescription",
    because: "a titration ask, again read as its opposite",
    unit: "O103",
  },
  {
    phrase: "another way",
    facet: "care:non-medication",
    refusedBy: "explain it another way so it makes sense",
    because: "a sense-making ask, nothing to do with medication",
    unit: "O103",
  },
  {
    phrase: "know better",
    facet: "manner:non_judgmental",
    refusedBy: "I know better than to expect much",
    because: "a flat statement of low expectations, not an ask for anything",
    unit: "O113",
  },
  {
    phrase: "not a man",
    facet: "pref:woman-gp",
    refusedBy: "my GP is not a man of many words",
    because: "a real English idiom about somebody being terse",
    unit: "O114",
  },
  {
    phrase: "year old",
    facet: "care:child-adolescent-adhd",
    refusedBy: "I am forty years old and finally asking",
    because: "an adult stating their age would be ranked against paediatric GPs — an age is not a relationship",
    unit: "O122",
  },
  {
    phrase: "our daughter",
    facet: "care:child-adolescent-adhd",
    refusedBy: "our daughter cries over homework every single night",
    because: "a G7 pin: a parent describing distress, not asking for care. A bare family reference cannot tell the two apart",
    unit: "O122",
  },
  {
    phrase: "more than one diagnosis",
    facet: "care:complex-mental-health",
    refusedBy: "complex needs, more than one diagnosis already",
    because: "at three tokens it outranks care:adhd-assessment's \"diagnosis\" and CONSUMES the span, so the sentence stops reaching assessment",
    unit: "O123",
    protects: "care:adhd-assessment",
  },
  {
    phrase: "my mood",
    facet: "care:depression",
    refusedBy: "my moods flip fast and I say things I regret",
    because: "one of the ten sentences marked awaitingFounder — the cue would answer the founder's G7 question sideways",
    unit: "O123",
  },
  {
    phrase: "put a name to",
    facet: "care:adhd-assessment",
    refusedBy: "put a name to what has been going on since childhood",
    because: "takes the span manner:sense_making already reads in the same sentence",
    unit: "O125",
    protects: "manner:sense_making",
  },
];
