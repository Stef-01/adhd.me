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
   * The corpus aspiration(s) this refusal LEFT STANDING, when it left any.
   *
   * O138 added this because the register could not answer the question it looked like it could.
   * It keys on the sentence that REFUSED a cue, which is the right key for "do not re-add this
   * phrase" and the wrong one for "what is still unheard" — so every refusal that was reasoned
   * about carefully reappeared as unfinished work. Counting the corpus gave 25 open aspirations
   * across 18 facets, and the list included "I need more than fifteen minutes to get through
   * this" (O65 measured and refused a cue for it) and "a she not a he, if that makes sense"
   * (O125: it strips to the single token [not], so there is nothing to build on).
   *
   * That is the O65 pattern working as designed — the reason gets written down instead of the
   * cue being forced — and nothing recorded the link, so finished thinking counted as a backlog.
   * Third register in one day to need the distinction between "examined and left" and "nobody
   * has looked", after O123's `awaitingFounder` and O131's `accepted`.
   */
  leavesStanding?: readonly string[];
  /**
   * Set when the phrase is refused because ANOTHER FACET ALREADY OWNS IT, not because it
   * measured badly. Names the owning facet.
   *
   * The register's own test taught me this field, the same way O131's bar taught that one its
   * `accepted` status. It asserts no refused phrase appears in the lexicon — correct for a
   * measurement refusal, wrong here: "white coat" IS a live cue, on `care:anxiety` since O124,
   * and the refusal is only that `manner:steadying` cannot have it too. First-claim dedup
   * (O7/F10) means a phrase belongs to exactly one facet, so there is nothing to measure — the
   * phrase is spoken for. Conflating "never use this" with "already used elsewhere" would have
   * made the register demand the deletion of a working cue.
   *
   * FOURTH REGISTER IN ONE DAY to discover it was conflating two kinds of entry, after
   * `awaitingFounder`, `accepted` and `leavesStanding`. The pattern is worth more than any of
   * them individually: a register built to record one thing almost always turns out to be
   * recording two, and the second one is invisible until something counts them.
   */
  ownedBy?: string;
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
    leavesStanding: [
      "skills first, then we can discuss whether a script helps",
    ],
  },
  {
    phrase: "non drug",
    facet: "care:non-medication",
    refusedBy: "I would consider a non stimulant drug",
    because: "a medication ask; findCue spans gaps, so [non, drug] reads it as its opposite",
    unit: "O103",
    leavesStanding: [
      "I want to try the non-drug route first",
      "my psychologist suggested I ask about the non-drug options",
    ],
  },
  {
    phrase: "more than a prescription",
    facet: "care:non-medication",
    refusedBy: "I want to talk more about my prescription",
    because: "a titration ask, again read as its opposite",
    unit: "O103",
    leavesStanding: [
      "I want a plan that is more than a prescription",
    ],
  },
  {
    phrase: "another way",
    facet: "care:non-medication",
    refusedBy: "explain it another way so it makes sense",
    because: "a sense-making ask, nothing to do with medication",
    unit: "O103",
    leavesStanding: [
      "I would rather not take medication if there is another way",
    ],
  },
  {
    /**
     * BACK-FILLED FROM O65, which predates this register by two months.
     *
     * It is the oldest refusal in the tree still doing work, and it was invisible here until
     * O138 went looking for why a reasoned-about sentence counted as open work. A register
     * created mid-history only knows what somebody remembers to put in it.
     */
    phrase: "more than fifteen minutes",
    facet: "pref:longer-appointment",
    refusedBy: "fifteen minutes from the station",
    because:
      "it strips to [fifteen, minute], which is also how distance talk reads — the precision is not worth the recall, and O65 wrote that down rather than forcing the cue",
    unit: "O65",
    leavesStanding: ["I need more than fifteen minutes to get through this"],
  },
  {
    phrase: "what adhd actually is",
    facet: "manner:sense_making",
    refusedBy: "um so I think I might have ADHD and I want to actually get tested",
    because:
      "it strips to [adhd, actually] and CONSUMES the token `adhd`, so the commonest sentence anybody types stopped reaching care:adhd-assessment — the third span theft caught by pins after O123 and O125",
    unit: "O139",
    protects: "care:adhd-assessment",
    leavesStanding: ["explain what ADHD actually is, properly"],
  },
  {
    phrase: "prescription continued",
    facet: "care:shared-care",
    refusedBy: "my prescription continued to cost more each month",
    because: "a cost complaint read as a continuity ask — the words are identical and the request is not",
    unit: "O139",
    leavesStanding: ["I need my prescription continued after moving from Perth"],
  },
  {
    phrase: "someone patient",
    facet: "manner:unhurried",
    refusedBy: "the patient is waiting in room three",
    because:
      "it turns on the word PATIENT, which on this product means the reader — a cue that fires on the name for the person using it cannot stay narrow",
    unit: "O139",
    leavesStanding: ["bulk billed titration review with someone patient"],
  },
  {
    phrase: "transplant",
    facet: "pref:telehealth-first",
    refusedBy: "my transplant team wants a GP closer to home",
    because: "a referral context, not a telehealth ask — the word names a circumstance, not a preference",
    unit: "O139",
    leavesStanding: ["the practice is a risk for me, I have a transplant"],
  },
  {
    phrase: "white coat",
    facet: "manner:steadying",
    refusedBy: "white coat panic is real for me",
    because:
      "REFUSED BY A MECHANISM RATHER THAN A MEASUREMENT, which is a distinct reason worth recording as such: O124 gave this phrase to care:anxiety, and first-claim dedup (O7/F10) means a phrase belongs to exactly ONE facet. There is nothing to measure here — the phrase is spoken for",
    unit: "O139",
    ownedBy: "care:anxiety",
    leavesStanding: ["white coat panic is real for me"],
  },
  {
    phrase: "know better",
    facet: "manner:non_judgmental",
    refusedBy: "I know better than to expect much",
    because: "a flat statement of low expectations, not an ask for anything",
    unit: "O113",
    leavesStanding: [
      "I am a nurse and I need someone who will not treat me like I should know better",
    ],
  },
  {
    phrase: "not a man",
    facet: "pref:woman-gp",
    refusedBy: "my GP is not a man of many words",
    because: "a real English idiom about somebody being terse",
    unit: "O114",
    leavesStanding: [
      "someone who is not a man, please",
      "a she not a he, if that makes sense",
    ],
  },
  {
    phrase: "year old",
    facet: "care:child-adolescent-adhd",
    refusedBy: "I am forty years old and finally asking",
    because: "an adult stating their age would be ranked against paediatric GPs — an age is not a relationship",
    unit: "O122",
    leavesStanding: [
      "our ten year old needs an assessment",
    ],
  },
  {
    phrase: "our daughter",
    facet: "care:child-adolescent-adhd",
    refusedBy: "our daughter cries over homework every single night",
    because: "a G7 pin: a parent describing distress, not asking for care. A bare family reference cannot tell the two apart",
    unit: "O122",
    leavesStanding: [
      "year seven has been a disaster, we need answers for our boy",
    ],
  },
  {
    phrase: "more than one diagnosis",
    facet: "care:complex-mental-health",
    refusedBy: "complex needs, more than one diagnosis already",
    because: "at three tokens it outranks care:adhd-assessment's \"diagnosis\" and CONSUMES the span, so the sentence stops reaching assessment",
    unit: "O123",
    leavesStanding: [
      "more than one diagnosis in my file and I need a GP who can hold it all",
    ],
    protects: "care:adhd-assessment",
  },
  {
    phrase: "my mood",
    facet: "care:depression",
    refusedBy: "my moods flip fast and I say things I regret",
    because: "one of the ten sentences marked awaitingFounder — the cue would answer the founder's G7 question sideways",
    unit: "O123",
    leavesStanding: [
      "keep an eye on my mood while we sort the attention side",
    ],
  },
  {
    phrase: "put a name to",
    facet: "care:adhd-assessment",
    refusedBy: "put a name to what has been going on since childhood",
    because: "takes the span manner:sense_making already reads in the same sentence",
    unit: "O125",
    leavesStanding: ["put a name to what has been going on since childhood"],
    protects: "manner:sense_making",
  },
];

/**
 * The lexicon's GENUINE remaining queue: aspirations nobody has examined.
 *
 * Subtracts the two kinds of finished thinking from the corpus's standing aspirations — those
 * waiting on the founder's G7 call (`awaitingFounder`, O123) and those a refusal already
 * accounted for (`leavesStanding`, above). What is left is work somebody could pick up.
 *
 * The number this returns is the only honest answer to "is there lexicon work left?", and
 * before O138 it could not be computed at all: the raw aspiration count read 25 while including
 * sentences two separate units had measured and written reasons about.
 */
export function openAspirations(
  corpus: ReadonlyArray<{ text: string; aspires?: readonly string[]; awaitingFounder?: string }>,
  refusals: readonly RefusedCue[] = REFUSED_CUES,
): Array<{ text: string; aspires: readonly string[] }> {
  const accountedFor = new Set(refusals.flatMap((r) => r.leavesStanding ?? []));
  return corpus
    .filter((e) => e.aspires?.length && !e.awaitingFounder && !accountedFor.has(e.text))
    .map((e) => ({ text: e.text, aspires: e.aspires! }));
}
