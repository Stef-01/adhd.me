import { describe, expect, it } from "vitest";
import { clinicians, matchQuality, needsFor, rankClinicians, scoreAgainst, unservedAsks } from "@/demo/clinicians";
import { facetKey, readNeeds, LEXICON_CUES } from "./needs";
import { stem, tokenise } from "./read";
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
        expect(quality === "tied" || quality === "unmatched").toBe(true);
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
    expect(unservedAsks("titration and a longer appointment")).toEqual([]);
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
    "an excuse", "at ease", "been heard", "believe me", "by phone", "diagnose me", "figure out",
    "get a word in", "get checked", "honest about", "hurry me",
    // O94: O25's removed phrase, home under the raw-RUN demand (RUN_DEMANDED in needs.ts)
    // — reviewed as run-only, so the [room] collapse can never fire on a bare pair again.
    "in the room with me",
    "involve me", "just lazy", "listened to",
    "make it up", "making it up", "my child", "my community", "my dad", "my daughter",
    "my family", "my father", "my kid", "my mother", "my mum", "my parents", "my son",
    "name it", "on a schedule", "on edge", "out the door", "over the phone", "really listen",
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
    expect(booking).toContain("manner:structured"); // the honest half stays
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
