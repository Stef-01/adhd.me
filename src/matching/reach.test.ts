import { describe, expect, it } from "vitest";
import { clinicians, matchQuality, MATCH_QUALITY_COPY, needsFor, rankClinicians, scoreAgainst, unservedAsks } from "@/demo/clinicians";
import { facetKey, readNeeds, LEXICON_CUES } from "./needs";
import { selfClaimedPatient, stem, tokenise, tokeniseKeepingStopwords } from "./read";
import { EI_QUALITIES } from "@/demo/emotional-fit";
import { CARE_PROMPTS, MANNER_PROMPTS, PREF_PROMPTS } from "./clarify";

/**
 * W221 follow-up: the lexicon's reach, measured and pinned.
 *
 * WHY THIS FILE EXISTS RATHER THAN A NUMBER IN A DOCUMENT. A one-off probe found the lexicon
 * reached nothing on nine of seventeen realistic queries and that ten tied exactly. Writing that
 * in the plan would have recorded it; it would not have stopped it coming back, and a
 * paraphrase-matching lexicon regresses silently — the tests all pass, the ranking still works,
 * and it quietly stops understanding anybody.
 *
 * THE CORPUS IS FIRST-PERSON AND DELIBERATELY NOT WRITTEN FROM THE LEXICON. Half of it is how
 * people actually describe these things: not "unhurried" but "I can never get a word in". If the
 * corpus were written by reading the lexicon it would measure nothing except that somebody can
 * copy a list, which is the trap that makes most coverage numbers meaningless.
 *
 * THE CEILING IS A RATCHET, NOT A TARGET. It is set just above where the lexicon actually sits so
 * a regression fails, and it is meant to be lowered as reach improves — never raised to make a
 * failing build pass. Raising it is how a control becomes a comment.
 */
const CORPUS: readonly string[] = [
  // Phrased close to the vocabulary.
  "I need an ADHD assessment and my dose keeps wearing off",
  "a thorough structured assessment with the heart checked first",
  "I get rushed every time and I want a longer first appointment",
  "a calm GP who speaks Hindi, I was treated for anxiety for years",
  "somewhere I can be honest about how much I drink",
  // Phrased the way people actually write. None of these use a lexicon word for the thing they want.
  "I can never get a word in before the appointment is over",
  "every doctor I've seen decides before I finish the sentence",
  "I want someone who won't make me feel like I'm making it up",
  "I need to know it's not going to hurt my heart before I start anything",
  "I've been on antidepressants for six years and nothing shifted",
  "I want to actually understand what's happening to me",
  "my mum thinks this is nonsense and she'll be in the room",
  // Paraphrases the lexicon was widened to hear, against measured misses — each resolves to a
  // clinician-attribute preference (how they want care given), never to a symptom.
  "I'd like a GP who works with me on the options rather than dictating",
  "I want the first appointment to not be a ten minute in and out",
  "I need someone who will follow up and not just leave me to it",
  // Genuinely uninformative. These SHOULD reach nothing; the product's job is to say so.
  "I think I might have ADHD",
  "help",
  "I don't know where to start",
];

/**
 * W221: THE G7 BOUNDARY, PINNED AS AN INTENTIONAL NON-REACH — not a corpus gap to close.
 *
 * Every sentence here describes the reader's OWN impairment: the DSM inattention and
 * executive-function experience. None of them expresses a preference about care. Reaching a facet
 * from any of them would be the product concluding something clinical ABOUT the patient from their
 * symptoms — the TGA/CDSS line docs/GATE-DOSSIER-Q17.md holds shut and the pitch states publicly:
 * matching is keyed to a clinician's declared attributes, never to a patient's symptoms.
 *
 * This is a TEST rather than a comment because the failure mode already happened once. A probe read
 * "my brain has never let me finish anything" as a recall miss and closed it by adding
 * "never finish anything" to the Adult-ADHD facet — reaching into symptom text to make a metric go
 * green. In a bare miss-rate number a symptom sentence and a genuine paraphrase gap look identical;
 * the only thing that tells them apart is a human decision, recorded here. The honest behaviour is
 * `matchQuality="unmatched"`: the finder says it could not tell from this alone, and never reaches a
 * facet by reading a symptom.
 */
const SYMPTOM_NONREACH: readonly string[] = [
  "my brain has never let me finish anything and I'm 34",
  "I can't concentrate on anything for more than five minutes",
  "I keep losing my keys and forgetting appointments",
  "I procrastinate on everything until the very last minute",
  "I've been like this my whole life",
];

const reached = (query: string) => readNeeds(query).length > 0;

describe("W221 how much of a real sentence the lexicon can hear", () => {
  it("reaches all but the queries that express no need", () => {
    const misses = CORPUS.filter((query) => !reached(query));
    const rate = misses.length / CORPUS.length;
    // Ratchet lowered 0.15 → 0.12 as the lexicon widened against measured misses. The only misses
    // left are the two deliberately-uninformative queries; the ceiling sits just above them.
    expect(
      rate,
      `miss rate ${(rate * 100).toFixed(0)}% — unreached: ${JSON.stringify(misses)}`,
    ).toBeLessThanOrEqual(0.12);
  });

  /**
   * The paraphrase half is the half that matters. A lexicon can score well overall by handling the
   * sentences that were written from it, which measures nothing.
   */
  it("reaches most of the sentences that avoid its own vocabulary", () => {
    const paraphrase = CORPUS.slice(5, 15);
    const misses = paraphrase.filter((query) => !reached(query));
    expect(misses.length, `unreached paraphrase: ${JSON.stringify(misses)}`).toBeLessThanOrEqual(1);
  });

  /**
   * The boundary is worth more than the recall number, so it is asserted directly and separately:
   * a symptom description reaches NOTHING and the finder says so. If a future change makes any of
   * these reach a facet, this fails — which is the point, because the miss-rate test above would go
   * quietly greener as G7 was quietly crossed.
   */
  it("never reads a symptom description into a facet", () => {
    for (const query of SYMPTOM_NONREACH) {
      expect(readNeeds(query), `"${query}" reached a facet from a symptom description`).toEqual([]);
      expect(matchQuality(query), `"${query}" was presented as a ranking`).toBe("unmatched");
    }
  });

  /**
   * THE INTEGRITY PROPERTY, and the reason `matchQuality` exists. Every query is either ordered on
   * something the reader said, or the finder says the order is not a ranking. There is no third
   * case where an arbitrary order is presented as a meaningful one.
   */
  it("never presents an unearned order as a ranking", () => {
    for (const query of CORPUS) {
      const quality = matchQuality(query);
      // Validated on the SAME score matchQuality grades on — needsFor includes language (O1),
      // so an order earned only on a spoken language is not mis-read here as unearned.
      const needs = needsFor(query);
      const scores = clinicians.map((clinician) => scoreAgainst(clinician, needs));

      if (quality === "informed") {
        expect(new Set(scores).size, `${query} is "informed" but every clinician scores the same`)
          .toBeGreaterThan(1);
      } else {
        // Tied or unmatched: the finder must have copy for it, so the reader is told.
        expect(quality === "tied" || quality === "unmatched" || quality === "unserved").toBe(true);
      }
    }
  });

  it("says nothing is a ranking when nothing was understood", () => {
    expect(matchQuality("help")).toBe("unmatched");
    expect(matchQuality("I don't know where to start")).toBe("unmatched");
  });

  /**
   * The single likeliest sentence anybody types. It reaches only the generic assessment facet,
   * which BOTH GPs declare, so it cannot separate them — and the finder has to admit that rather
   * than put one of two real doctors first for no reason.
   */
  it("admits that the commonest query does not separate anybody", () => {
    expect(matchQuality("I think I might have ADHD")).toBe("tied");
  });

  it("names a care area nobody declares instead of returning a silent list", () => {
    // Nine of the seventeen care areas are declared by neither GP while the roster is two people.
    const asks = unservedAsks("I need trauma-informed care, I have a difficult childhood");
    expect(asks.length).toBeGreaterThan(0);
    expect(unservedAsks("titration and telehealth")).toEqual([]);
  });

  /**
   * O110: it had been reading a QUARTER of what it claimed to cover.
   *
   * The filter was `kind === "care"`, so the two facet kinds where a three-GP roster actually
   * has gaps — preference and manner — produced silence. Measured against the real roster the
   * facets nobody declares today are bulk-billing, steadying and motivating, which is why
   * those three are the cases here: they are the live ones, not invented examples.
   */
  it("names an unanswered PREFERENCE, which is where this roster's real gap is", () => {
    const [said] = unservedAsks("I want a GP who bulk bills");
    expect(said).toContain("Bulk billing is not something any GP listed today declares");
    expect(said).toContain("a gap in our listing, not in what you asked for");
  });

  it("names an unanswered MANNER", () => {
    expect(unservedAsks("someone calm who can steady me")[0])
      .toContain("Calm and steadying is not something any GP listed today declares");
  });

  it("never says it about something the roster DOES declare", () => {
    // O2's self-contradiction pin, now across all three facet kinds: the line must never
    // appear beside a facet the ranking is simultaneously scoring.
    expect(unservedAsks("a woman GP please")).toEqual([]);
    expect(unservedAsks("can we do it over the phone")).toEqual([]);
    expect(unservedAsks("I need help with my sleep")).toEqual([]);

    // O179 pinned "I need a longer first appointment" as the unserved side, and said so itself:
    // "the day a GP declares longer-appointment... [it] becomes a ranking assertion again." M3
    // (F6) is that day — anubhav-saxena's own appointmentLength wording already answered this
    // question (roster.ts's M3 comment) — so the sentence MOVES SIDES again, to the roster that
    // DOES declare it, which is exactly the case this test exists to keep pinned.
    expect(unservedAsks("I need a longer first appointment")).toEqual([]);
  });

  it("stays a fact about a declaration, never a claim about ability (W193)", () => {
    const said = unservedAsks("I want a GP who bulk bills")[0]!;
    expect(said).toContain("is not something any GP listed today declares");
    for (const forbidden of ["cannot", "unable", "does not do", "no GP can"]) {
      expect(said.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe("O7 every clarifier answer keeps reaching its facet (F10)", () => {
  /**
   * Clarifier answers are re-read by the same `readNeeds` as anything else, so a lexicon edit
   * could orphan a prompt invisibly: the question still renders, the tap still appends, and the
   * appended sentence reaches nothing. Every answer is pinned to its facet here, which makes the
   * prompt tables part of the reach ratchet.
   */
  it("re-reads every prompt table answer to the facet its question is about", () => {
    const tables = { ...CARE_PROMPTS, ...MANNER_PROMPTS, ...PREF_PROMPTS };
    for (const [key, copy] of Object.entries(tables)) {
      const reachedKeys = readNeeds(copy.answer).map((need) => facetKey(need.facet));
      expect(reachedKeys, `"${copy.answer}" no longer reaches ${key}`).toContain(key);
    }
  });
});

describe("O7 the lexicon reaches itself (F10)", () => {
  /**
   * The bespoke stemmer is the right call versus Porter for this vocabulary size — but pairs
   * like "assessed"→"asses" vs "assessment"→"assessment" mean cue and word can share a root and
   * still miss. This pins every phrase in the lexicon as reachable through the full pipeline,
   * so a stemmer or tokeniser edit that unhooks a cue from its own facet fails here, by name.
   */
  it("reads every lexicon phrase back to its own facet", () => {
    for (const { phrase, key } of LEXICON_CUES) {
      const reachedKeys = readNeeds(phrase).map((need) => facetKey(need.facet));
      expect(reachedKeys, `lexicon phrase "${phrase}" no longer reaches ${key}`).toContain(key);
    }
  });

  it("records the stemmer's known conflation edge so it is not rediscovered", () => {
    // "assessed" and "assessment" share a root and do NOT share a stem. A cue written with one
    // inflection will not hear the other; the lexicon must carry both spellings where it cares.
    expect(stem("assessed")).toBe("asses");
    expect(stem("assessment")).toBe("assessment");
    expect(stem("assessed")).not.toBe(stem("assessment"));
  });
});

describe("O7 a cue cannot cross a full stop (F10)", () => {
  it("refuses the two-token bridge across a sentence boundary", () => {
    // Both content words present, two statements apart. Before the boundary marker this was
    // representable: sentence punctuation was deleted, so a two-token cue like [wear, off] saw
    // its halves as adjacent across the full stop. (Reworded in the W221-scope merge: the
    // original pinned the retired cardiac facet's [heart, safe]; the property is the reader's,
    // not any one facet's.)
    expect(readNeeds("my jumper is wearing. off to the shops after this").map((n) => n.label))
      .not.toContain("Titration and dose review");
    // And the same words inside ONE clause still match.
    expect(readNeeds("my dose is wearing off by lunch").map((n) => n.label))
      .toContain("Titration and dose review");
  });
});

describe("O13 every manner facet is reachable by its plain name", () => {
  /**
   * THE FAILURE THIS PINS, verbatim from production: "Kind Hindi speaking and non judgemental"
   * read as nothing but the language — the non_judgmental facet's own NAME was unreadable,
   * because the cue lists were verb-phrase-heavy and the stemmer cannot bridge
   * "judgemental"→"judg". O9's edge suite never asked the basic question this table asks:
   * can a person request each way-of-working by the word on its label?
   *
   * Deliberately absent: "kind" (survives as one token and fires on "what kind of doctor"),
   * "patient" as an adjective (this is a health product), "takes their time" (the [take, time]
   * shape W223 removed for cause). Precision refusals, recorded so they are not re-litigated.
   */
  const PLAIN_NAMES: ReadonlyArray<[string, string]> = [
    ["manner:non_judgmental", "non judgemental"],
    ["manner:non_judgmental", "non-judgmental"],
    ["manner:non_judgmental", "not judgemental please"],
    ["manner:non_judgmental", "she was so judgmental about it"],
    ["manner:non_judgmental", "without judgement"],
    ["manner:unhurried", "unhurried"],
    ["manner:unhurried", "not rushed"],
    ["manner:structured", "structured"],
    ["manner:structured", "methodical"],
    ["manner:collaborative", "a collaborative GP"],
    ["manner:sense_making", "helps me make sense of it"],
    ["manner:steadying", "calm and gentle"],
    ["manner:attuned", "takes me seriously"],
    ["manner:attuned", "attentive"],
    ["manner:culturally_attuned", "culturally sensitive"],
  ];

  it.each(PLAIN_NAMES)("%s is reached by %s", (key, phrase) => {
    expect(readNeeds(phrase).map((n) => facetKey(n.facet))).toContain(key);
  });
});

describe("O13 the query that failed in production, end to end", () => {
  it("reads both halves of 'Kind Hindi speaking and non judgemental' and earns the order", () => {
    const query = "Kind Hindi speaking and non judgemental";
    const keys = readNeeds(query).map((n) => facetKey(n.facet));
    expect(keys).toContain("manner:non_judgmental");
    // Hindi is spoken by both GPs (an honest tie on its own); non_judgmental is declared by
    // one — so the whole ask now separates the roster and the order is earned, not disclaimed.
    expect(matchQuality(query)).toBe("informed");
    const first = rankClinicians(query)[0]!;
    expect(first.manner).toContain("non_judgmental");
  });
});

describe("O17 every care area is reachable by its plain name", () => {
  /**
   * The O13 control, extended to the care half after the W221-scope merge brought a new
   * twelve-area vocabulary: every area must be reachable both by its clinical word and by the
   * words a person actually types. A probe on merge day found 27/29 already reached — and the
   * two that missed were on the facet whose own doc comment calls them "what people describe
   * first": "emotional dysregulation" (the stemmer cannot bridge dysregulation→regulation) and
   * "big emotions". Fixed, and the whole table pinned so the next re-scope fails by name.
   */
  const CARE_PLAIN_NAMES: ReadonlyArray<[string, string]> = [
    ["care:adhd-assessment", "an ADHD assessment"],
    ["care:child-adolescent-adhd", "this is for my teenager"],
    ["care:titration", "get the dose right"],
    ["care:shared-care", "shared care with my psychiatrist"],
    ["care:depression", "low mood"],
    ["care:depression", "depression"],
    ["care:anxiety", "anxiety"],
    ["care:anxiety", "panic attacks"],
    ["care:trauma-informed", "trauma"],
    ["care:complex-mental-health", "bipolar"],
    ["care:autism-adhd", "I think I am AuDHD"],
    ["care:substance-history", "honest about drinking"],
    ["care:emotional-regulation", "rejection sensitivity"],
    ["care:emotional-regulation", "emotional dysregulation"],
    ["care:emotional-regulation", "my emotions take over"],
    ["care:non-medication", "not just medication"],
  ];

  it.each(CARE_PLAIN_NAMES)("%s is reached by %s", (key, phrase) => {
    expect(readNeeds(phrase).map((n) => facetKey(n.facet))).toContain(key);
  });
});

describe("O25 a multi-word cue must not quietly become a one-word cue", () => {
  /**
   * THE DEFECT THIS PINS. Stopword stripping can collapse an authored phrase to a single
   * token, so the shipped matcher is looser than the phrase its author reviewed:
   * "in the room with me" collapsed to [room], and "my rooms are above the pharmacy" claimed
   * `manner:culturally_attuned` (found by the W227 reach-gap feed, O22). Many collapses are
   * intended — "my son" IS the word "son", "by phone" IS the word "phone" — so the set is
   * FROZEN rather than banned: every entry below was reviewed as fine-as-a-word, and a new
   * multi-word cue that collapses fails this test until somebody reviews the word it really is.
   * The list may shrink as the Q1 corpus re-authors cues; it must never grow silently.
   */
  const REVIEWED_SINGLE_TOKEN_PHRASES = [
    // "diagnose me" and "get checked" are O49 additions, reviewed under the O45 collapse rule:
    // each ships as one token BUT can only fire beside its authored adjacent pair, so a stray
    // "diagnose" and "the heart checked first" cannot claim them. Listed in sort order below.
    "an excuse", "at ease",
    // O112: reviewed and DELIBERATE — bare "believe" fires on "it is hard to believe how long
    // the wait is", and the pair does not.
    "be believed", "been heard", "believe me",
    // O113: four more collapses, each reviewed. Every one is a multi-word phrase whose content
    // reduces to a single token, so the O45 pair demand is what keeps it precise — bare
    // [build], [lecture], [right] and [mechanism] would each be far too loose alone.
    "build on what", "by phone",
    // O108: reviewed and DELIBERATE, the same device as "in recovery". Bare "video" fires on
    // "I watched a video about ADHD"; authored as a pair, the collapse rule demands "by video"
    // / "over video" in the raw stream and the innocent sentence is refused.
    "by video", "diagnose me", "figure out",
    "get a word in", "get checked", "honest about", "hurry me",
    // O107: reviewed and DELIBERATE. Bare "recovery" fires on "recovery time after surgery",
    // so the cue is authored as the pair — the collapse rule then demands "in recovery" in
    // the raw stream, which is exactly the precision the bare word could not give.
    "in recovery",
    // O94: O25's removed phrase, home under the raw-RUN demand (RUN_DEMANDED in needs.ts)
    // — reviewed as run-only, so the [room] collapse can never fire on a bare pair again.
    "in the room with me",
    "involve me", "just lazy", "lecture me", "listened to",
    "make it up", "making it up", "my child", "my community", "my dad", "my daughter",
    "my family", "my father", "my kid", "my mother", "my mum", "my parents", "my son",
    "name it", "on a schedule", "on edge",
    // O109: collapses to [pocket] and ships under the O45 pair demand. Its negated sibling
    // "no out of pocket" is NOT here and must not be: the negator is a content token, so that
    // cue keeps two and never collapses.
    "out of pocket", "out the door", "over the phone",
    // O108: see "by video" above — same phrase, other preposition.
    "over video", "really listen", "right with me", "the mechanism",
    "understand what", "what is going on",
  ];

  it("freezes the set of phrases that ship as one token", () => {
    const collapsed = LEXICON_CUES
      .filter((cue) => cue.phrase.trim().split(/\s+/).length >= 2 && tokenise(cue.phrase).length <= 1)
      .map((cue) => cue.phrase)
      .sort();
    expect(collapsed).toEqual(REVIEWED_SINGLE_TOKEN_PHRASES);
  });

  it("the pharmacy sentence no longer reaches anybody's background", () => {
    expect(readNeeds("my rooms are above the pharmacy and I trained at Westmead")).toEqual([]);
  });

  it("family presence in the room still reaches, through the two-token cue", () => {
    const labels = readNeeds("they want to come into the room for the appointment").map((n) => n.label);
    expect(labels).toContain("Understands your background");
  });
});

describe("O30 the psychographic asks, reachable and not over-reachable", () => {
  /**
   * The targeting audit (O23) called stated psychographics this matcher's strongest suit and
   * named the vocabulary gaps; these are the gaps closed, pinned in both directions. Every
   * new cue obeys O25's law (two content tokens, or a single precise WORD), and each family
   * ships with a near-miss probe because O25 also showed reach without a false-positive
   * control is how "room" claimed a pharmacy.
   */
  it.each([
    ["someone who explains things in plain language", "Helps it make sense"],
    ["can they say it in plain english without the jargon", "Helps it make sense"],
    ["a doctor who is neurodiversity affirming", "Strengths-focused"],
    ["someone neuroaffirming who gets adhd brains", "Strengths-focused"],
    ["a neurodivergent friendly gp", "Strengths-focused"],
    ["someone who respects my faith", "Understands your background"],
    ["my faith is important to me", "Understands your background"],
    ["treat me as a whole person not a diagnosis", "Listens and takes you seriously"],
  ])("reaches: %s", (query, label) => {
    expect(readNeeds(query).map((n) => n.label), query).toContain(label);
  });

  it.each([
    // "faith in doctors" is trust talk, not a faith-sensitivity ask: no respect+faith pair.
    "I have lost all faith in doctors",
    // Plain sight, not plain language.
    "the clinic was in plain sight of the station",
    // A whole afternoon is not a whole person.
    "the appointment took my whole afternoon",
  ])("does not over-reach: %s", (query) => {
    const labels = readNeeds(query).map((n) => n.label);
    expect(labels).not.toContain("Understands your background");
    expect(labels).not.toContain("Helps it make sense");
    expect(labels).not.toContain("Listens and takes you seriously");
  });
});

/**
 * O40 (Q1 item 4): negation clauses, pinned in both directions.
 *
 * The rule is NegEx's convention scaled to this reader: explicit desire-negation PHRASES
 * ("don't want", "not looking for", "don't need", "no interest"), scope forward to the clause
 * boundary, care and preference cues only. Every exemption below is a design decision with a
 * sentence that would break if it changed — not a case the pass happens to miss.
 */
describe("O40 negation clauses", () => {
  it.each([
    // The year plan's own example class: a negated desire verb on a care ask is a refusal.
    ["I don't want my dose changed", "Titration and dose review"],
    ["I'm not looking for a diagnosis, just someone to talk to", "ADHD assessment"],
    ["no interest in titration at all", "Titration and dose review"],
    ["I would rather not have an assessment yet", "ADHD assessment"],
    // Preferences take the same pass: a negated preference must not lift anybody.
    ["I don't need it bulk billed", "Bulk billing"],
  ])("suppresses the refused ask: %s", (query, label) => {
    expect(readNeeds(query).map((n) => n.label), query).not.toContain(label);
  });

  it.each([
    // MANNER IS EXEMPT BY DESIGN: patients state manner wants through negation — this sentence
    // IS the unhurried ask, and suppressing it would silence the facet's own vocabulary.
    ["I don't want to feel rushed", "Unhurried first appointment"],
    // A bare negator is not a trigger: a complaint about somebody ELSE refusing is a want.
    ["my GP won't do titration and I need someone who will", "Titration and dose review"],
    // "never had" is history, not refusal.
    ["I've never had an assessment and I want one", "ADHD assessment"],
    // Scope ends at the clause boundary: the negation lives in the previous sentence.
    ["they don't want to help me. my dose keeps wearing off", "Titration and dose review"],
    // And the plain positive stays reachable, so the pass cannot pass vacuously.
    ["I need an ADHD assessment", "ADHD assessment"],
  ])("still reaches the real ask: %s", (query, label) => {
    expect(readNeeds(query).map((n) => n.label), query).toContain(label);
  });
});

/**
 * O45 (Q1 item 1's deliverable): the collapse-aware rule, pinned in both directions.
 *
 * A cue that stopword-strips to one content token now also requires an ADJACENT, IN-ORDER pair
 * of its authored words (function words kept, stemming identical, content word included) in the
 * same clause — the year plan's "kept function-word skeleton" option, designed against this
 * file's corpus rather than by re-authoring cues one at a time. The false positives below are
 * the plan's own named examples; every preserved sentence is one the coupled precision/recall
 * analysis predicted a naive fix would lose.
 */
describe("O45 a collapsed cue must look like its authored phrase", () => {
  it.each([
    // The year plan's named false positives, dead.
    ["my GP is next door to the chemist", "Unhurried first appointment"],
    ["the practice name is on the sign", "Helps it make sense"],
    ["the school is on the edge of town", "Calm and steadying"],
    // The one the corpus itself was propping up: "…not GOING to…" is not "what is going on".
    ["I need to know it's not going to hurt my heart before I start anything", "Helps it make sense"],
  ])("no longer fires on: %s", (query, label) => {
    expect(readNeeds(query).map((n) => n.label), query).not.toContain(label);
  });

  it.each([
    // The intended sentences the plan said a naive per-cue fix would lose.
    ["I can never get a word in before the appointment is over", "Unhurried first appointment"],
    ["she rushed me out the door in ten minutes", "Unhurried first appointment"],
    ["I'm always on edge in waiting rooms", "Calm and steadying"],
    // A contraction elides the middle of the authored phrase; any surviving pair suffices.
    ["I just want to understand what's going on", "Helps it make sense"],
    ["somewhere I can be honest about how much I drink", "Substance history held safely"],
    ["my mum thinks this is nonsense and she'll be in the room", "Understands your background"],
  ])("still reaches through: %s", (query, label) => {
    expect(readNeeds(query).map((n) => n.label), query).toContain(label);
  });

  it("the cardiac-safety ask is now heard as itself, not as a collapse artefact", () => {
    const labels = readNeeds("I need to know it's not going to hurt my heart before I start anything").map((n) => n.label);
    expect(labels).toContain("A structured, measured approach");
  });
});

describe("§O76 a cue inside a conversational hedge is filler, not an ask", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("suppresses the corpus's second known false positive, exactly as the O75 pin demanded", () => {
    expect(facets("a she not a he, if that makes sense")).not.toContain("manner:sense_making");
    // The hedge alone, as a whole query, reaches nothing — filler is filler.
    expect(facets("if that makes sense")).toEqual([]);
  });

  it("is span-precise: the real ask beside a trailing hedge keeps reaching", () => {
    // A different facet's ask rides in front of the hedge and must survive it.
    const heard = facets("I want a woman doctor, if that makes sense");
    expect(heard).toContain("pref:woman-gp");
    expect(heard).not.toContain("manner:sense_making");
    // The SAME facet asked genuinely, then hedged: findCue matches the ask, not the filler.
    expect(facets("help me make sense of thirty years, if that makes sense")).toContain("manner:sense_making");
  });

  it("every neighbouring sense_making pin still reaches — the hedge is the idiom, not the words", () => {
    expect(facets("helps me make sense of it")).toContain("manner:sense_making");
    expect(facets("I want it to finally make sense")).toContain("manner:sense_making");
    // "if" and "that" apart do not make the idiom: a conditional that happens to carry the
    // words in another shape is left alone.
    expect(facets("I want that to make sense at last")).toContain("manner:sense_making");
  });
});

describe("§O84 the sit-register refusal, and the phrasing that survived", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("the support-person ask reaches, both ways round", () => {
    expect(facets("can I bring a support person to the appointment")).toContain("manner:culturally_attuned");
    expect(facets("I will have my support person with me")).toContain("manner:culturally_attuned");
  });

  it("support-adjacent talk that is not a presence ask stays silent", () => {
    expect(facets("peer support has helped me before")).not.toContain("manner:culturally_attuned");
    expect(facets("my support worker suggested this")).not.toContain("manner:culturally_attuned");
  });

  /**
   * THE REFUSAL, EXECUTABLE. Both candidate cues for the sit-register were built and
   * measured into leaks (emotional-fit.ts carries the full record): [sit, room] hears
   * waiting-room complaints through the insertion gap, and the collapsed "room with me"
   * hears "in the room with someone" — a face-to-face ask, caught by O77's own pin. These
   * sentences pin the leak surface silent, so a future attempt fails here by name instead
   * of rediscovering the measurements.
   */
  it("the leak surface that killed the candidate cues stays silent", () => {
    expect(facets("I hate sitting in waiting rooms")).not.toContain("manner:culturally_attuned");
    expect(facets("the room was cold last time")).not.toContain("manner:culturally_attuned");
    expect(facets("I don't want telehealth, I need to be in the room with someone")).not.toContain("manner:culturally_attuned");
    // The standing aspiration was honestly unheard from O84 until O94 landed the raw-run
    // demand this test's comment said would be needed — it reaches now, pinned in §O94.
    expect(facets("I am here for my mum's sake, she will sit in the room with me")).toContain("manner:culturally_attuned");
  });
});

describe("§O94 the raw-run demand: two cues must look exactly like themselves", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("the phone-menu leak is dead and the genuine phone ask lives", () => {
    expect(facets("the phone menu hung up on me twice")).not.toContain("pref:telehealth-first");
    expect(facets("could the whole thing happen over the phone")).toContain("pref:telehealth-first");
    expect(facets("can the first appointment be over the phone")).toContain("pref:telehealth-first");
  });

  it("O25's phrase is home: the presence run reaches, every O84 leak stays dead", () => {
    expect(facets("I am here for my mum's sake, she will sit in the room with me")).toContain("manner:culturally_attuned");
    expect(facets("I don't want telehealth, I need to be in the room with someone")).not.toContain("manner:culturally_attuned");
    expect(facets("I hate sitting in waiting rooms")).not.toContain("manner:culturally_attuned");
    expect(facets("the room was cold last time")).not.toContain("manner:culturally_attuned");
    expect(facets("my rooms are above the pharmacy and I trained at Westmead")).toEqual([]);
  });
});

describe("§O92 a cue's own negator declines a thing — unless the raw determiner says the reader LACKS it", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("deprivation stays silent: possessive and definite determiners inside the span", () => {
    expect(facets("the medication shortage keeps leaving me without my script")).not.toContain("care:non-medication");
    expect(facets("three weeks without the medication and nobody warned me")).not.toContain("care:non-medication");
  });

  it("declining keeps reaching: bare, indefinite, and the not-just idiom", () => {
    expect(facets("what can we do without medication")).toContain("care:non-medication");
    expect(facets("I want options that are not a script")).toContain("care:non-medication");
    expect(facets("not just medication")).toContain("care:non-medication");
    expect(facets("no medication please, I want strategies")).toContain("care:non-medication");
    expect(facets("coaching first, without a script if we can")).toContain("care:non-medication");
  });
});

describe("§O91 'without X' is going without X — with the double negative flipping it back", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("suppresses the independence ask O87 pinned, exactly as the pin's analysis predicted", () => {
    expect(facets("do any GPs do the whole thing without a psychiatrist referral")).not.toContain("care:shared-care");
    expect(facets("an appointment without the dose conversation for once")).not.toContain("care:titration");
  });

  it("a need-marker before 'without' in the same clause keeps the want", () => {
    expect(facets("I can't do this without bulk billing")).toContain("pref:bulk-billing");
    expect(facets("I cannot manage the trips without telehealth")).toContain("pref:telehealth-first");
    expect(facets("there is no way I keep going without bulk billing")).toContain("pref:bulk-billing");
  });

  it("the guard does not cross a clause boundary", () => {
    expect(facets("I said no to that. going without telehealth suits me fine")).not.toContain("pref:telehealth-first");
  });

  it("every exclusion O72 protected still stands", () => {
    // A cue whose OWN phrase starts with the negator is untouched — the check looks
    // strictly before the span, which is why the original exclusion protected nothing.
    expect(facets("what can we do without medication")).toContain("care:non-medication");
    expect(facets("not just medication")).toContain("care:non-medication");
    // Manner stays exempt: "without judgement" IS the non-judgmental ask.
    expect(facets("without judgement")).toContain("manner:non_judgmental");
    // A cue BEFORE the "without" is out of its reach entirely.
    expect(facets("I need someone to adjust the dose without a three month wait")).toContain("care:titration");
  });
});

describe("§O83 somebody else's 'no' is a complaint, not the reader's refusal", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("a reported refusal reaches — the ask survives being quoted", () => {
    expect(facets("they said no to titration and I want it anyway")).toContain("care:titration");
    expect(facets("my old GP told me no on a dose review, I need someone who will")).toContain("care:titration");
    expect(facets("the practice said no to telehealth, which is exactly what I need")).toContain("pref:telehealth-first");
  });

  it("the reader's OWN reported no keeps refusing, auxiliaries and all", () => {
    expect(facets("I said no to titration and I still mean it")).not.toContain("care:titration");
    // The subject walk crosses "have": still the reader speaking.
    expect(facets("I have said no to the dose before and nothing has changed")).not.toContain("care:titration");
    // FIRST-PERSON PLURAL, the hole this pin closes. "we" is a stopword, so before it joined
    // SELF_REPORTERS the walk stepped over it to the sentence start — which the rule reads as
    // somebody else — and a couple's own standing refusal came back as a request for the very
    // thing they had refused. The one direction this rule must never fail in.
    expect(facets("we said no to titration and we still mean it")).not.toContain("care:titration");
    expect(facets("we told them no titration")).not.toContain("care:titration");
    expect(facets("we've said no to titration")).not.toContain("care:titration");
    // Still somebody else when the plural possessive fronts a named refuser.
    expect(facets("our GP said no to titration and I want it")).toContain("care:titration");
  });

  it("a bare negator with no reporting verb is untouched — every §O72 suppression stands", () => {
    expect(facets("not bulk billing, I am happy to pay for time")).not.toContain("pref:bulk-billing");
    expect(facets("no titration for me thanks")).not.toContain("care:titration");
    expect(facets("no video appointments, my internet is hopeless")).not.toContain("pref:telehealth-first");
  });
});

describe("§O81 a desire negation spends itself on the nearest ask — consume-once scope", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("the refused ask is suppressed and the following ask survives, in one clause", () => {
    const womanGp = facets("I don't want a woman GP, bulk billing matters more");
    expect(womanGp).not.toContain("pref:woman-gp");
    expect(womanGp).toContain("pref:bulk-billing");
    // The aspiration that sat in the gap list since O68, never a lexicon gap after all.
    const dose = facets("no interest in the dose, I want the diagnosis question answered");
    expect(dose).not.toContain("care:titration");
    expect(dose).toContain("care:adhd-assessment");
  });

  it("a manner object SPENDS the negation without being suppressed", () => {
    // The negation's object is the rushing; the dose is the topic, not the refusal.
    const heard = facets("I don't want to feel rushed about the dose");
    expect(heard).toContain("manner:unhurried");
    expect(heard).toContain("care:titration");
  });

  it("a genuine refusal with inserted words still suppresses — the lead was not shortened", () => {
    expect(facets("I don't want anyone touching the dose")).not.toContain("care:titration");
  });

  it("every §O40 suppression still holds under the new scope", () => {
    expect(facets("I don't want my dose changed")).not.toContain("care:titration");
    expect(facets("I'm not looking for a diagnosis, just someone to talk to")).not.toContain("care:adhd-assessment");
    expect(facets("no interest in titration at all")).not.toContain("care:titration");
    expect(facets("I would rather not have an assessment yet")).not.toContain("care:adhd-assessment");
    expect(facets("I don't need it bulk billed")).not.toContain("pref:bulk-billing");
  });

  it("scope still ends at the clause boundary, and a spent trigger stays spent", () => {
    expect(facets("they don't want to help me. my dose keeps wearing off")).toContain("care:titration");
    // One trigger, one binding: the second ask two clauses of thought later is untouched.
    expect(facets("not looking for an assessment. my dose needs looking at")).toContain("care:titration");
  });
});

describe("§O78 suppression is per-occurrence: a refused clause does not silence a later ask", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("a clause-one refusal no longer kills the same cue's clause-two ask", () => {
    expect(facets("I don't want titration. but titration support is exactly what I came for")).toContain("care:titration");
    expect(facets("not bulk billing at my old clinic. bulk billing is essential now")).toContain("pref:bulk-billing");
  });

  it("a leading hedge no longer kills the genuine ask after it", () => {
    expect(facets("if that makes sense is all I ever say, but truly I need help to make sense of this")).toContain("manner:sense_making");
  });

  it("single-occurrence suppressions still suppress — the retry finds nothing to rescue", () => {
    expect(facets("I don't want titration")).not.toContain("care:titration");
    expect(facets("not bulk billing, I am happy to pay for time")).not.toContain("pref:bulk-billing");
    expect(facets("a she not a he, if that makes sense")).not.toContain("manner:sense_making");
    expect(facets("the appointment is for my mum, I am just organising it")).toEqual([]);
  });

  it("a collapse refusal is sentence-global and does NOT retry — the pair test already read the whole stream", () => {
    // Two occurrences of a collapsed cue's word, neither beside its authored pair: still silent.
    expect(facets("next door to the chemist, and another door past that")).not.toContain("manner:unhurried");
  });
});

describe("§O77 'for my mum' is a patient, not a presence", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("suppresses the on-behalf register, exactly as O75's second pin demanded", () => {
    const booking = facets("booking on behalf of my mum, she wants this looked into properly");
    expect(booking).not.toContain("manner:culturally_attuned");
    /* O119: this line used to assert `manner:structured` as "the honest half stays", which was
       only ever true because "properly" was a structured cue — a cue O119 removed as too loose
       (it fired on every sentence containing the adverb, none of which asks for a documented
       baseline). The suppression is what this pin is FOR, and it needs a positive control that
       does not depend on a cue somebody may delete for unrelated reasons, so the control moves
       to a sentence carrying a real second ask. */
    const withRealAsk = facets("booking on behalf of my mum, she needs an ADHD assessment");
    expect(withRealAsk).not.toContain("manner:culturally_attuned");
    expect(withRealAsk).toContain("care:adhd-assessment"); // the honest half stays
    expect(facets("the appointment is for my mum, I am just organising it")).toEqual([]);
  });

  it("every family-presence ask keeps reaching — the governor must sit directly before", () => {
    expect(facets("my mum thinks this is nonsense and she'll be in the room")).toContain("manner:culturally_attuned");
    expect(facets("my mother comes in to translate")).toContain("manner:culturally_attuned");
    expect(facets("family will be involved whether anyone likes it or not")).toContain("manner:culturally_attuned");
    // A "for" later in the clause governs something else; adjacency is the idiom (O72's lesson).
    expect(facets("I want my mum in the room for this")).toContain("manner:culturally_attuned");
  });

  it("the child facet is exempt BY DESIGN: on-behalf IS that facet's register", () => {
    expect(facets("this is for my teenager")).toContain("care:child-adolescent-adhd");
    expect(facets("a woman GP for my daughter's assessment, bulk billed if possible")).toContain("care:child-adolescent-adhd");
  });
});

describe("§O72 a bare negator adjacent to a care/pref cue is a refusal — with every boundary held", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("suppresses the corpus's founding false positive and its siblings", () => {
    expect(facets("not bulk billing, I am happy to pay for time")).not.toContain("pref:bulk-billing");
    expect(facets("not telehealth for this, it has to be face to face")).not.toContain("pref:telehealth-first");
    // (second clauses re-reach on their own words, honestly: "the dose is settled" would
    // re-earn titration through the dose cue — so the pin isolates the negated clause.)
    expect(facets("no titration for me thanks")).not.toContain("care:titration");
  });

  it("the additive 'not just' idiom is never read as refusal (the veto's own founding case)", () => {
    const heard = facets("assess me for ADHD, not just the anxiety");
    expect(heard).toContain("care:anxiety");
    expect(heard).toContain("care:adhd-assessment");
  });

  it("every exclusion the earlier units bled for still stands", () => {
    // "without" is an ask, not a refusal (O64's measured pin).
    expect(facets("what can we do without medication")).toContain("care:non-medication");
    // A cue whose OWN phrase begins with a negator is untouched — the check looks before the span.
    expect(facets("not just medication")).toContain("care:non-medication");
    // Manner stays exempt (O40): the negated phrasing IS the ask.
    expect(facets("I don't want to feel rushed")).toContain("manner:unhurried");
    // "never" is history and complaint, not refusal.
    expect(facets("I have never had a proper assessment")).toContain("care:adhd-assessment");
    // Adjacency only: a gap between negator and cue is not the idiom.
    expect(facets("not the usual bulk billing crowd, but bulk billed would help")).toContain("pref:bulk-billing");
  });
});

describe("§O103 non-medication is asked in three registers, and the cues hear the two that were deaf", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("hears the SEQUENCE register — the ask is about order, not refusal", () => {
    // Nobody in these sentences is declining a script. They are saying where it goes in the
    // plan, which is a different sentence and a real preference.
    expect(facets("I want strategies first, tablets later if ever")).toContain("care:non-medication");
    expect(facets("structure and skills first, medication as a last resort")).toContain("care:non-medication");
    expect(facets("lifestyle changes before we talk prescriptions")).toContain("care:non-medication");
  });

  it("hears the ALTERNATIVE register — the ask names the other thing", () => {
    expect(facets("what works besides medication")).toContain("care:non-medication");
    expect(facets("psychological approaches before anything else")).toContain("care:non-medication");
    expect(facets("skills and strategies before any script")).toContain("care:non-medication");
    expect(facets("what about diet and exercise before we go straight to stimulants")).toContain("care:non-medication");
    expect(facets("not ready for medication yet, what else is there")).toContain("care:non-medication");
  });

  it("keeps the REFUSAL register the earlier units cued", () => {
    expect(facets("what can we do without medication")).toContain("care:non-medication");
    expect(facets("I want options that are not a script")).toContain("care:non-medication");
  });

  /**
   * THE FOUR REFUSED CUES, PINNED AS THE SENTENCES THAT REFUSED THEM.
   *
   * `findCue` matches in order across intervening words, so each of these phrasings would
   * have fired non-medication on a sentence meaning something else — three of them meaning
   * close to the OPPOSITE. The cue list carries the reason; these are the measurements.
   * If somebody adds one of those cues later, this block is what tells them what it costs.
   */
  it("refuses the cues that would have misread a medication ask as its opposite", () => {
    // "non drug" would fire here — and a non-stimulant IS a medication.
    expect(facets("I would consider a non stimulant drug")).not.toContain("care:non-medication");
    // "more than a prescription" would fire on a titration ask.
    expect(facets("I want to talk more about my prescription")).not.toContain("care:non-medication");
    // "before any script" would fire on a script running out — titration again.
    expect(facets("we talked before my script ran out")).not.toContain("care:non-medication");
    // "another way" would fire on a sense-making ask.
    expect(facets("explain it another way so it makes sense")).not.toContain("care:non-medication");
  });

  it("the promoted register does not bleed into the facets it sits beside", () => {
    // The sequence sentences are about ORDER, and the medication facets they mention must
    // still be heard on their own words rather than swallowed by the new cues.
    expect(facets("my dose wears off by lunchtime")).toContain("care:titration");
    expect(facets("no interest in coaching, the medication is working")).not.toContain("care:non-medication");
  });
});

describe("§O104 trauma-informed hears how somebody wants to be asked, not what happened to them", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("hears the PACE-AND-CONSENT register, which names no experience and diagnoses nobody", () => {
    expect(facets("please go slowly with the history questions")).toContain("care:trauma-informed");
    expect(facets("I need to not be pushed on the details of the history")).toContain("care:trauma-informed");
    expect(facets("an assessment without having to relive it please")).toContain("care:trauma-informed");
  });

  it("keeps the named-condition register the earlier cues carried", () => {
    expect(facets("I have a trauma history")).toContain("care:trauma-informed");
    expect(facets("difficult childhood, and I want that handled carefully")).toContain("care:trauma-informed");
  });

  /**
   * "not be pushed" carries its own negator, and the pin records why.
   *
   * The first draft cued "pushed on the details". It is present in the corpus sentence and
   * reached NOTHING, because O72's bare-negator rule saw the "not" directly before the span
   * and read the ask as a refusal of it — when "I need to not be pushed" IS the ask. Care
   * facets are not exempt from that rule the way manner is, so the negator has to live inside
   * the cue, which is what O49 did for "not a script". If somebody later shortens this cue,
   * this is the case that fails.
   */
  it("the ask survives its own negator, and the shorter cue would not have", () => {
    expect(facets("I need to not be pushed on the details of the history")).toContain("care:trauma-informed");
    // The refusal register still refuses: this is somebody declining the facet, not asking.
    expect(facets("no trauma stuff please, just the ADHD assessment")).not.toContain("care:trauma-informed");
  });

  /**
   * THE SPAN-SWALLOW — pinned here as today's truth by O104, FIXED BY O106 the same day.
   *
   * O104 measured it and refused to fix it in a cue unit: "a gentle GP who takes trauma
   * seriously" did not reach this facet although "trauma" is right there, because
   * manner:attuned's "take seriously" matched across the gap and Phase 3 claimed the whole
   * RANGE — so a cue that never matched "trauma" made it unavailable to the cue that would.
   * The pin was deliberately written as a failing case waiting for the fix unit (the O68
   * pattern), and O106 flipped it by claiming matched POSITIONS instead of spans. Kept, with
   * both directions live, because the expectation reversing is the record of the fix.
   */
  it("a word a spanning cue never matched still reaches its own facet (O104 found, O106 fixed)", () => {
    const heard = facets("a gentle GP who takes trauma seriously and bulk bills");
    expect(heard).toContain("manner:attuned");
    expect(heard).toContain("care:trauma-informed");
    // And the same word reaches without the spanning cue at all, as it always did.
    expect(facets("a gentle GP who takes trauma into account")).toContain("care:trauma-informed");
  });
});

describe("§O105 a comma ends a negation's scope, and ends nothing else", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  /**
   * THE DEFECT, IN THE TWO SENTENCES THAT FOUND IT.
   *
   * O81's consume-once binds a trigger to its nearest FOLLOWING ask. When the thing actually
   * being declined carries no cue — nothing in "a big clinic" or "therapy" is in the lexicon —
   * there was no ask to consume, so the trigger floated across the comma and suppressed the
   * ask behind it. Both sentences reached NOTHING of what they asked for: a want the reader
   * stated, deleted. This is the register people ask in — what I don't want, then what I do.
   */
  it("keeps the want stated after the comma", () => {
    expect(facets("I don't want a big clinic, a woman GP in a small practice please"))
      .toContain("pref:woman-gp");
    expect(facets("I don't want a big clinic, bulk billing please")).toContain("pref:bulk-billing");
    expect(facets("not after therapy, I want the assessment done properly"))
      .toContain("care:adhd-assessment");
  });

  it("each clause reads exactly as it does standing alone", () => {
    // The strongest statement of the fix: the negated preamble now changes nothing about
    // what the second clause reaches.
    expect(facets("I don't want a big clinic, a woman GP in a small practice please"))
      .toEqual(facets("a woman GP in a small practice please"));
  });

  it("the negation still binds its own object, with no comma in the way", () => {
    // O40/O81's whole point, untouched: a refusal before the ask it refuses still refuses it.
    expect(facets("I don't want telehealth")).not.toContain("pref:telehealth-first");
    expect(facets("I am not looking for bulk billing")).not.toContain("pref:bulk-billing");
  });

  it("O81's consume-once still spends the trigger on the nearest ask, comma or not", () => {
    // The founding consume-once case: the refusal takes the woman-GP ask and the bulk-billing
    // ask behind it survives. That behaviour predates this unit and must be identical.
    const heard = facets("I don't want a woman GP, bulk billing matters more");
    expect(heard).not.toContain("pref:woman-gp");
    expect(heard).toContain("pref:bulk-billing");
  });

  it("manner stays exempt, and a comma does not change that", () => {
    expect(facets("I don't want to feel rushed")).toContain("manner:unhurried");
    expect(facets("I don't want to feel rushed, and I want bulk billing")).toContain("manner:unhurried");
  });

  /**
   * A COMMA IS NOT A BOUNDARY FOR MATCHING A CUE. `splitWords` carries the written reason —
   * "alternatives, not just medication" is one clause, and the clarifier appends its answers
   * after a comma (`${request}, ${answer}`), so a comma that stopped cue matching would break
   * the product's own reorder path. This unit changed neither token stream; these are the
   * cases that would fail if somebody later "simplified" it into splitWords.
   */
  it("cues still read straight across a comma", () => {
    expect(facets("alternatives, not just medication")).toContain("care:non-medication");
    // The clarifier's own append shape: request, then the answer it added in the reader's words.
    expect(facets("I think I might have ADHD, I would prefer a woman GP")).toContain("pref:woman-gp");
    expect(facets("coaching and habits first, tablets later if ever")).toContain("care:non-medication");
  });
});

describe("§O106 a cue claims the words it matched, not the words it straddled", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("frees an intervening word for the facet that actually matches it", () => {
    // The founding case: attuned's "take seriously" spans "trauma" without matching it.
    const heard = facets("a gentle GP who takes trauma seriously and bulk bills");
    expect(heard).toContain("manner:attuned");
    expect(heard).toContain("care:trauma-informed");
    expect(heard).toContain("pref:bulk-billing");
  });

  /**
   * THE PART THAT COULD HAVE BROKEN, AND THE REASON THIS IS SAFE.
   *
   * Specificity ordering exists so a general term cannot claim a sentence whose specific term
   * says something different — in the "not just medication" case, close to the opposite. That
   * still holds under position-claiming, because the specific cue MATCHES the general cue's
   * token: "not just medication" claims [not, medication], so the bare "medication" cue finds
   * its own token already taken. Only words nobody matched are freed.
   */
  it("specificity still wins where the specific cue matches the general one's word", () => {
    const heard = facets("assess me for ADHD, not just the anxiety");
    expect(heard).toContain("care:anxiety");
    expect(heard).toContain("care:adhd-assessment");
    expect(facets("not just medication")).toContain("care:non-medication");
    // "treated for anxiety" is the specific reading, and it keeps its own word.
    expect(facets("I was treated for anxiety for years")).toContain("care:anxiety");
  });

  it("a token matched by one cue is still unavailable to another", () => {
    // Two cues cannot both claim the same word: that is what the claim set is for, and it is
    // unchanged. Whatever reads "telehealth" here, only one facet may.
    const heard = facets("telehealth please");
    expect(heard.filter((f) => f === "pref:telehealth-first")).toHaveLength(1);
  });

  it("the whole existing rule family reads exactly as it did", () => {
    // Spot-checks across the suppression rules, all of which run on spans and positions.
    expect(facets("not bulk billing, I am happy to pay for time")).not.toContain("pref:bulk-billing");
    expect(facets("I don't want to feel rushed")).toContain("manner:unhurried");
    expect(facets("help me make sense of thirty years, if that makes sense")).toContain("manner:sense_making");
    expect(facets("this is for my teenager")).toContain("care:child-adolescent-adhd");
  });
});

describe("§O107 substance-history hears the substances and the recovery register", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("knows more than the two legal substances", () => {
    for (const said of [
      "methamphetamine years ago, clean since",
      "opioids were a chapter of my life, closed now",
      "weekend cocaine use is part of my history and I will not lie about it",
      "I am on suboxone and need a GP who can work with that",
      "vaping weed for sleep most nights",
    ]) expect(facets(said)).toContain("care:substance-history");
  });

  it("hears the recovery register, which is how people raise this most carefully", () => {
    expect(facets("I am in recovery and need that respected")).toContain("care:substance-history");
    expect(facets("sober two years and proud of it, keep that in mind")).toContain("care:substance-history");
  });

  /**
   * "in recovery" IS THE PAIR, AND THAT IS THE WHOLE POINT.
   *
   * It is authored as two words that collapse to one token, so O45's rule demands the authored
   * pair in the raw stream. Bare "recovery" would have been simpler and fires on "recovery
   * time after surgery". Registered in O25's frozen collapse list with the same reasoning.
   */
  it("the collapsed pair refuses the sentence the bare word would have taken", () => {
    expect(facets("recovery time after surgery")).not.toContain("care:substance-history");
    expect(facets("I am in recovery and need that respected")).toContain("care:substance-history");
  });

  /** The refusals, pinned as the sentences that refused them (O103's method). */
  it("refuses the cues that fire on innocent sentences", () => {
    // "clean" would fire here — and the facet whose job is to meet somebody without raised
    // eyebrows is the last place to accept a cue that reads a bill of health as a drug history.
    expect(facets("a clean bill of health")).not.toContain("care:substance-history");
    // "drug use" would fire here.
    expect(facets("the drug I use works well")).not.toContain("care:substance-history");
    // "ice" — the Australian street term, the tempting one, the least safe of all.
    expect(facets("ice packs for the headaches")).not.toContain("care:substance-history");
  });

  it("G7 holds: this is a request about how a conversation is held, not a finding", () => {
    // The module header's own worked example. The label a surface may print says "held
    // safely" — a description of care — and never names a condition of the reader.
    const heard = readNeeds("I drink more than I should and want that handled without judgement");
    expect(heard.map((n) => facetKey(n.facet))).toContain("care:substance-history");
    expect(heard.find((n) => facetKey(n.facet) === "care:substance-history")!.label)
      .toBe("Substance history held safely");
  });
});

describe("§O108 telehealth hears video as a preposition, and refuses the register it cannot tell apart", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("hears the preposition forms and the appointment noun", () => {
    for (const said of [
      "can the assessment be done over video",
      "a female doctor for an ADHD assessment, by video if possible",
      "video reviews after work hours",
      "no more waiting rooms, video only from here",
      "phone appointments suit my shift work better",
      "shift work means I can only do phone appointments",
    ]) expect(facets(said)).toContain("pref:telehealth-first");
  });

  it("the collapsed pair refuses the sentence the bare word would have taken", () => {
    // "by video" / "over video" collapse to [video] and demand the authored pair (O45).
    expect(facets("I watched a video about ADHD")).not.toContain("pref:telehealth-first");
  });

  /**
   * THE REGISTER LEFT STANDING, AND WHY IT IS A MECHANISM AND NOT A CUE.
   *
   * Three corpus sentences ask for telehealth by refusing the alternative. The want is real,
   * but a cue read off the AVOIDED thing cannot tell the ask from its mirror image — each of
   * these was measured firing on a sentence meaning the opposite. Hearing them needs the
   * negation family pointed the other way: read the refusal, then invert it.
   */
  it("refuses cues that cannot tell the ask from its mirror image", () => {
    // (Deliberately without the word "telehealth" in it: the first draft of this pin said
    //  "…clinic visits to telehealth", which reaches through the plain "telehealth" cue and
    //  proved nothing about "clinic visits" at all.)
    expect(facets("I would prefer clinic visits, in person")).not.toContain("pref:telehealth-first");
    expect(facets("I hate phone calls, please do it in person")).not.toContain("pref:telehealth-first");
    // And the [wait, room] collision O84 already paid for, still refused.
    expect(facets("the waiting room makes my anxiety worse")).not.toContain("pref:telehealth-first");
  });

  it("the existing telehealth cues are untouched", () => {
    expect(facets("telehealth please")).toContain("pref:telehealth-first");
    expect(facets("can we do it over the phone")).toContain("pref:telehealth-first");
    // O94's run demand still refuses the phone-menu leak.
    expect(facets("the phone menu hung up on me twice")).not.toContain("pref:telehealth-first");
  });
});

describe("§O109 bulk-billing learns the words the ask is actually made in", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("hears the cost register, all six phrasings", () => {
    for (const said of [
      "no out of pocket costs please",
      "I cannot pay gap fees on my wage",
      "medicare only, I cannot pay extra",
      "does it cost anything out of pocket",
      "gap fees are why I stopped going",
      "how much does an ADHD assessment cost with a GP",
    ]) expect(facets(said)).toContain("pref:bulk-billing");
  });

  /**
   * THE MOST IMPORTANT REFUSAL IN THE DAY'S SWEEPS.
   *
   * "cannot pay" was the obvious cue for two of those sentences. It fires on "I cannot pay
   * ATTENTION for long" — an ADHD symptom sentence — and reading that as a request about
   * billing would be both wrong and exactly the class of wrong G7 exists to prevent. Both
   * sentences it was meant for are covered by "gap fees" and "medicare only" anyway, so the
   * recall cost of refusing it is zero.
   */
  it("refuses the cue that would have read a symptom sentence as a billing request", () => {
    expect(facets("I cannot pay attention for long")).not.toContain("pref:bulk-billing");
    // "free" would have fired here.
    expect(facets("free up my afternoons")).not.toContain("pref:bulk-billing");
  });

  it("the negated ask is the ask: wanting NO out-of-pocket cost is bulk billing", () => {
    // O104's lesson, met a second time — the bare cue reached nothing because O72 read the
    // adjacent "no" as a refusal of the facet, so the negator lives inside the cue.
    expect(facets("no out of pocket costs please")).toContain("pref:bulk-billing");
    // And a genuine refusal of the facet is still a refusal.
    expect(facets("not bulk billing, I am happy to pay for time")).not.toContain("pref:bulk-billing");
  });
});

describe("§O111 the finder does not say it could not read what it read perfectly", () => {
  /**
   * TWO SITUATIONS THAT WERE ONE VALUE.
   *
   * `matchQuality` routed both "nothing was read" and "something was read that nobody
   * answers" to `unmatched`, whose copy describes only the first. So a bulk-billing ask —
   * read perfectly — was told "We could not tell what you are looking for", directly above the
   * line naming bulk billing as the listing's gap. Two sentences on one screen, contradicting
   * each other, and the false one louder.
   */
  it("separates a request nobody answers from a request nobody could read", () => {
    expect(matchQuality("gap fees are why I stopped going, I need a GP who bulk bills")).toBe("unserved");
    expect(matchQuality("someone calm who can steady me")).toBe("unserved");
    // The genuine no-read case keeps the value and the sentence that were always true of it.
    expect(matchQuality("zzz qqq")).toBe("unmatched");
  });

  it("the two banners say different things, and neither claims the other's failure", () => {
    expect(MATCH_QUALITY_COPY.unserved).toContain("We understood what you asked for");
    expect(MATCH_QUALITY_COPY.unmatched).toContain("could not tell");
    // The unserved sentence must never claim a failure of comprehension: that is the whole bug.
    expect(MATCH_QUALITY_COPY.unserved.toLowerCase()).not.toContain("could not tell");
  });

  it("the banner and the gap line agree, on the query that exposed the disagreement", () => {
    const said = "gap fees are why I stopped going, I need a GP who bulk bills";
    expect(MATCH_QUALITY_COPY[matchQuality(said)]).toContain("Nobody listed today answers it");
    expect(unservedAsks(said)[0]).toContain("Bulk billing is not something any GP listed today declares");
  });

  it("nothing that branches on an earned order changes: unserved is not informed either", () => {
    // Every honesty branch in the UI asks `quality !== "informed"`, so the new value must sit
    // on the same side of that line as the one it split from.
    for (const said of ["gap fees are why I stopped going", "zzz qqq", "someone calm who can steady me"]) {
      expect(matchQuality(said)).not.toBe("informed");
    }
    // And a request the roster genuinely answers is still informed.
    expect(matchQuality("my dose wears off and needs titration reviewed")).toBe("informed");
  });
});

describe("§O112 attuned hears the wants and leaves the distress standing", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("hears the plain wants, each of which names the clinician's conduct", () => {
    for (const said of [
      "someone who talks to me like an adult, not a case file",
      "a doctor who does not roll their eyes",
      "appointments where I do not have to perform being fine",
      "I want to be believed the first time I say it",
      "phone first, bulk billed, and please actually listen",
    ]) expect(facets(said)).toContain("manner:attuned");
  });

  /**
   * THE NEGATOR LIVES INSIDE THE CUE, FOR THE FOURTH TIME.
   *
   * "does NOT roll their eyes" and "do NOT have to perform being fine" are the ask. O72 reads
   * a bare negator before a cue as a refusal of it, and care/preference facets are not exempt
   * the way manner is at the O40 layer — so the cue has to carry its own negator, as O49's
   * "not a script", O104's "not be pushed" and O109's "no out of pocket" all had to.
   */
  it("a want phrased as a negative is still a want", () => {
    expect(facets("a doctor who does not roll their eyes")).toContain("manner:attuned");
    expect(facets("appointments where I do not have to perform being fine")).toContain("manner:attuned");
  });

  it("the collapsed pair refuses what the bare word would have taken", () => {
    // "be believed" collapses to [believe]; bare, it fires here.
    expect(facets("it is hard to believe how long the wait is")).not.toContain("manner:attuned");
    // "case file" was refused: it fires on a neutral admin sentence, and "like an adult"
    // already carries the corpus sentence it was wanted for.
    expect(facets("my case file is at the other clinic")).not.toContain("manner:attuned");
  });

  /**
   * THE DISTRESS PHRASINGS STAY UNHEARD, AND THAT IS THE UNIT'S DECISION.
   *
   * O49 left three of this facet's aspirations standing because they read distress rather
   * than a want, and said authoring cues for them needs a founder-side judgment call. That
   * judgement is still owed. Cueing "I cry in the car after every appointment" would have the
   * matcher reading a person's state off a sentence typed into a finder, which is the G7 line
   * — the same call O104 made for trauma. Pinned so the silence is deliberate and visible,
   * not mistaken for a vocabulary gap somebody should quietly fill.
   */
  it("does not read distress as a preference", () => {
    expect(facets("I cry in the car after every appointment")).not.toContain("manner:attuned");
    expect(facets("I rehearse what to say and still leave unheard")).not.toContain("manner:attuned");
  });
});

describe("§O113 the three remaining manner facets learn the concrete phrasings", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("sense-making hears being walked through something, and being told straight", () => {
    for (const said of [
      "it would help if things were explained step by step",
      "walk me through every result line by line",
      "no sugar coating, just tell me straight",
      "why do the meds work, I want the mechanism",
      "explain the plan on paper so I can take it home",
      "help me understand my own brain",
    ]) expect(facets(said)).toContain("manner:sense_making");
  });

  it("motivating hears strengths language as people actually say it", () => {
    for (const said of [
      "build on what I already do well",
      "someone who sees what is right with me too",
      "point out what I am doing right for once",
      "I respond better to encouragement than to warnings",
    ]) expect(facets(said)).toContain("manner:motivating");
  });

  it("non-judgmental hears shame, lecturing and raised eyebrows", () => {
    for (const said of [
      "no shame about how I have coped",
      "an autistic-friendly GP who won't lecture me about my past",
      "I need my past drug use handled without the raised eyebrows",
    ]) expect(facets(said)).toContain("manner:non_judgmental");
  });

  /** Refused on measurement, pinned as the sentence that refused it. */
  it("refuses the cue that fires on ordinary cynicism", () => {
    // "know better" would have fired here — a flat statement of low expectations, not an ask.
    expect(facets("I know better than to expect much")).not.toContain("manner:non_judgmental");
    // And "step by step" must not fire on a step in a process.
    expect(facets("the next step is a referral")).not.toContain("manner:sense_making");
  });

  /**
   * ONE ASPIRATION STAYS, AND IT IS NOT A VOCABULARY GAP.
   *
   * "explain what ADHD actually is, properly" reaches collaborative and adhd-assessment but
   * not sense-making: the word "explain" belongs to another facet under FIRST_CLAIM, which is
   * the dedup that makes a phrase belong to exactly one facet (O7/F10). Adding a sense-making
   * cue for it would take the word from the facet that already owns it. Pinned so the miss
   * reads as the design decision it is.
   */
  it("a phrase another facet already owns is not a gap in this one", () => {
    const heard = facets("explain what ADHD actually is, properly");
    expect(heard).toContain("care:adhd-assessment");
    expect(heard).not.toContain("manner:sense_making");
  });
});

describe("§O114 woman-GP learns the words people use; emotional-regulation hears only the want", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("hears the ask in the words Australians actually use", () => {
    for (const said of [
      "a lady doctor if at all possible",
      "a lady GP would make this easier",
      "I would feel safer with a woman",
      "women doctors only please, after what happened",
    ]) expect(facets(said)).toContain("pref:woman-gp");
  });

  it("refuses the two that measured badly, and says which sentence refused them", () => {
    // "not a man" would have fired here — a real English idiom about somebody being terse.
    expect(facets("my GP is not a man of many words")).not.toContain("pref:woman-gp");
    // "a she not a he" collapses to the single token [not]; nothing safe can be built on it,
    // and one sentence does not earn the raw-run mechanism (the O84 bar).
    expect(facets("someone who is not a man, please")).not.toContain("pref:woman-gp");
  });

  it("emotional-regulation hears the help-with framing", () => {
    for (const said of [
      "help with the anger that comes out of nowhere",
      "I want help with the rage before it costs me my marriage",
      "I want the emotional side taken as seriously as the focus side",
    ]) expect(facets(said)).toContain("care:emotional-regulation");
  });

  /**
   * THE BARE EMOTION WORDS DO NOT REACH, AND THAT IS THE POINT OF THE UNIT.
   *
   * This module's header names the exact trap: a prior probe closed a "recall gap" by adding
   * "never finish anything" — DSM inattention text — to a care facet, reading the person's
   * impairment rather than their preference. "anger" and "rage" would do the same here, so
   * every cue that shipped requires the HELP-WITH framing or names the emotional side as a
   * thing to be taken seriously. The state descriptions stay unheard on purpose; they are the
   * third facet to split this way and they go to the founder question with the others.
   */
  it("does not read a description of the reader's own state", () => {
    for (const said of [
      "rejection hits me like a truck",
      "my temper goes from zero to a hundred in seconds",
      "my moods flip fast and I say things I regret",
    ]) expect(facets(said)).not.toContain("care:emotional-regulation");
  });
});

describe("§O116 the comparative reaches, and four facets learn their registers", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  /**
   * THE STEMMER ENTRY, AND WHY IT IS A TABLE AND NOT A RULE.
   *
   * `stem("longer")` was "longer", so `pref:longer-appointment` — the facet whose label IS "A
   * longer first appointment" — could not hear its own adjective, and O65's widening could not
   * have found it because every cue that sweep added says "long". Bridged in O50's INFLECTIONS
   * table as named entries. A general -er rule is what this corpus cannot have: it turns
   * "water" into "wat" and "other" into "oth", both of which appear in real requests.
   */
  it("hears the comparative and the superlative", () => {
    expect(facets("can I ask for a longer appointment when I book")).toContain("pref:longer-appointment");
    expect(facets("please book me a long appointment for the first visit")).toContain("pref:longer-appointment");
  });

  it("does not strip -er off words that are not comparatives", () => {
    // The non-vacuity pin for the refusal above: a general rule would wreck these, and both
    // are sentences a reader could plausibly type.
    expect(stem("water")).toBe("water");
    expect(stem("other")).toBe("other");
    expect(stem("her")).toBe("her");
  });

  /**
   * THE COLLISION THE STEMMER ENTRY EXPOSED, resolved deliberately.
   *
   * "longer appointment" was cued by BOTH manner:unhurried and pref:longer-appointment. While
   * "longer" and "long" were different tokens the two cues never met; once they were the same
   * token they collided, and FIRST_CLAIM allows a phrase exactly one owner. The facet whose
   * LABEL is the phrase owns it — and the corpus had said so in advance, carrying
   * pref:longer-appointment as the aspiration on both affected entries.
   */
  /**
   * AND THE TWO READERS ARE ALLOWED TO DIFFER, WHICH IS THE PART THAT NEEDED SAYING.
   *
   * The onboarding interview reads `EI_QUALITIES` cue lists DIRECTLY to propose facets from a
   * doctor's own words (W221/O22). A GP who says "I book longer appointments" IS describing an
   * unhurried manner, so the phrase must stay in that list — while a PATIENT typing the same
   * words is stating a preference. `PREFERENCE_OWNED_PHRASES` in needs.ts is that seam, and
   * the first draft of this unit got it wrong by deleting the phrase outright, which broke
   * three onboarding tests. Pinned from both sides so the next edit has to choose deliberately.
   */
  it("the clinician-side reader keeps the phrase the patient-side reader gives away", () => {
    expect(EI_QUALITIES.unhurried.cues).toContain("longer appointment");
    expect(readNeeds("a longer appointment booked from the start").map((n) => facetKey(n.facet)))
      .not.toContain("manner:unhurried");
  });

  it("the phrase belongs to the facet named after it", () => {
    expect(facets("a longer appointment booked from the start")).toContain("pref:longer-appointment");
    // Unhurried keeps every cue that is actually about not being rushed.
    expect(facets("I do not want to feel rushed")).toContain("manner:unhurried");
    expect(facets("the good doctors never make you watch the clock")).toContain("manner:unhurried");
    expect(facets("give me the full appointment, not the doorway version")).toContain("manner:unhurried");
  });

  it("titration hears how a dose review is actually asked for", () => {
    for (const said of [
      "my script needs adjusting",
      "the generic brand hits different and nobody will discuss it",
      "the afternoon rebound is worse than the mornings ever were",
      "not looking for therapy, medication management is what I need",
    ]) expect(facets(said)).toContain("care:titration");
  });

  it("shared care hears continuity language", () => {
    for (const said of [
      "hand the prescribing back to a GP near home",
      "my script keeps bouncing between pharmacies, I need someone who can manage that",
      "no assessment needed, that part is done, I need the scripts managed",
      "just moved to Sydney and I need a new GP to continue my ADHD prescriptions",
    ]) expect(facets(said)).toContain("care:shared-care");
  });

  it("O65's deliberate refusal still stands", () => {
    // "more than fifteen minutes" strips to [fifteen, minute], which is also how distance talk
    // reads. O65 refused it on precision and this unit does not quietly reverse that.
    expect(facets("the clinic is fifteen minutes from the station")).not.toContain("pref:longer-appointment");
  });
});

describe("§O120 'my own' names the speaker as the patient", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("an adult asking for their own assessment is not read as a child's", () => {
    const heard = facets("after my son was diagnosed I recognised myself and now I want my own assessment");
    expect(heard).toContain("care:adhd-assessment");
    expect(heard).not.toContain("care:child-adolescent-adhd");
  });

  /**
   * THE CASE THAT DECIDED THE RULE'S SHAPE.
   *
   * The obvious rule — any self-reference vetoes the child facet — breaks the parent who wants
   * both, and the corpus holds exactly ONE entry carrying both kinds of reference, so it cannot
   * tell me such a rule is safe. It can only tell me it is untested. "my own" is the narrowest
   * construction that says "this one is mine", and it is measurable: four uses in the corpus,
   * every one claiming the thing for the speaker.
   */
  it("the parent who wants both keeps the facet they are asking for", () => {
    expect(facets("my daughter and I both need assessments")).toContain("care:child-adolescent-adhd");
    expect(facets("my son needs an assessment and I want one myself")).toContain("care:child-adolescent-adhd");
  });

  it("O77's exemption is untouched: on-behalf IS this facet's register", () => {
    expect(facets("this is for my teenager")).toContain("care:child-adolescent-adhd");
    expect(facets("my daughter is twelve and school keeps calling")).toContain("care:child-adolescent-adhd");
    expect(facets("a woman GP for my daughter's assessment, bulk billed if possible")).toContain("care:child-adolescent-adhd");
    expect(facets("looking for someone who sees kids")).toContain("care:child-adolescent-adhd");
  });

  it("guarded against the construction that points the other way", () => {
    // "my own son" claims the SON, not the speaker — the veto must not fire on it.
    expect(selfClaimedPatient(tokeniseKeepingStopwords("I want my own son assessed"))).toBe(false);
    expect(selfClaimedPatient(tokeniseKeepingStopwords("I want my own assessment"))).toBe(true);
  });

  it("leaves every other 'my own' sentence exactly as it was", () => {
    // The construction appears three other times in the corpus and none involves a relative.
    expect(facets("help me understand my own brain")).toContain("manner:sense_making");
    expect(facets("I want a say in my own treatment plan")).toContain("manner:collaborative");
  });
});

describe("§O122 three facets learn their registers, and one refusal comes from a G7 pin", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("collaborative hears somebody asking to be decided WITH", () => {
    for (const said of [
      "someone who works alongside me as a partner",
      "ask me what I think before deciding",
      "run the options past me first",
    ]) expect(facets(said)).toContain("manner:collaborative");
  });

  it("structured hears the concrete routine that IS this facet", () => {
    // O119 removed "properly" from here for firing on any sentence containing the adverb.
    // These name the documented baseline and the schedule, which is what the label describes.
    expect(facets("bloods and blood pressure done before any script")).toContain("manner:structured");
    expect(facets("I want the follow up booked before I leave each time")).toContain("manner:structured");
    // And O119's refusal is not quietly reversed while working in the same facet.
    expect(facets("I want to get assessed properly, start to finish")).not.toContain("manner:structured");
  });

  /**
   * THE POSSESSIVE, bridged in the stemmer rather than by a cue.
   *
   * Apostrophes are stripped before stemming, so "my son's paediatrician" arrived as
   * [my, sons, …] and the cue "my son" never met it — a facet whose entire register is a parent
   * talking about their child, deaf to the commonest way a parent refers to them.
   */
  it("a possessive reaches the facet the plain form already did", () => {
    expect(facets("my son's paediatrician says a GP can manage this now")).toContain("care:child-adolescent-adhd");
    expect(facets("my daughter's school keeps calling")).toContain("care:child-adolescent-adhd");
    expect(stem("sons")).toBe("son");
    expect(stem("daughters")).toBe("daughter");
  });

  /**
   * THE REFUSAL THE CORPUS MADE FOR ME, and it is a better reason than any measurement.
   *
   * "our son", "our daughter", "our boy", "our girl" were written and immediately broke a G7
   * `never` pin: "our daughter cries over homework every single night" is pinned as reaching
   * NOTHING, because it is a parent describing their child's distress rather than asking for
   * care. A bare family reference cannot tell that from "we need answers for our boy" — the
   * difference is the ASK, and the cue only sees the relationship. The plural forms are not
   * added and the sentence that wanted them stays standing, rather than a G7 boundary being
   * moved to fit a cue.
   */
  it("a parent describing distress is not a parent asking for care", () => {
    expect(facets("our daughter cries over homework every single night")).toEqual([]);
    expect(facets("year seven has been a disaster, we need answers for our boy"))
      .not.toContain("care:child-adolescent-adhd");
  });

  it("an age is not a relationship", () => {
    // "year old" would have fired here — an adult stating their age, ranked against paediatric
    // GPs, which is the harm O120 fixed from the other direction.
    expect(facets("I am forty years old and finally asking")).not.toContain("care:child-adolescent-adhd");
  });
});

/**
 * §O124: the pair O119 had to give up, taken back without giving up what O119 bought.
 *
 * O119 removed bare "panic" from `care:anxiety` because it fired on "a doctor who won't panic
 * about my drinking" — a figurative line about the DOCTOR, not somebody asking for help with
 * anxiety. That was right, and it left two real asks unheard. The fix is a second content
 * token rather than the word back.
 */
describe("§O124 clinic anxiety is heard, and the line about the doctor still is not", () => {
  const facets = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

  it("hears the two phrasings people actually use", () => {
    expect(facets("panic in the waiting room every time")).toContain("care:anxiety");
    expect(facets("white coat panic is real for me")).toContain("care:anxiety");
  });

  /** O119's exact false positive, kept in the suite so the reason survives the fix. */
  it("still refuses the figurative line that made bare panic wrong", () => {
    expect(facets("a doctor who won't panic about my drinking")).not.toContain("care:anxiety");
  });

  it("and the order-sensitivity is real, not incidental", () => {
    // "panic in the waiting" is [panic, wait]; this sentence has them the other way round.
    expect(facets("I had to wait and then panic set in about the cost")).not.toContain("care:anxiety");
    expect(facets("the waiting room was full")).toEqual([]);
  });
});
