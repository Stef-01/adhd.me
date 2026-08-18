import { describe, expect, it } from "vitest";
import { clinicians, evidenceScore, matchQuality, unservedAsks } from "@/demo/clinicians";
import { readNeeds } from "./needs";

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
      // Validated on evidenceScore — the SAME score matchQuality grades on, language included — so
      // an order earned only on a spoken language is not mis-read here as unearned.
      const scores = clinicians.map((clinician) => evidenceScore(clinician, query));

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
