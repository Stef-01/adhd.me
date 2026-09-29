// When the model reader is worth its wait. Measured on the 360 dev requests the P4 run read
// (2026-09-28, qa/matching/rca.md R13): for a request of ten words or fewer in which the lexicon
// already heard something, the model's top three is the lexicon's 93% of the time and no better
// graded (NDCG@3 0.981 against 0.980); for the rest, longer or unheard, it is much better (0.918
// against 0.808). So at level 1 the finder reads only the rest: most searches list at once, with
// nothing sent and nothing spent, and the model still reads the requests where it helps.

const SHORT_WORDS = 10;

/** True when the model should read these words: more than ten of them, or nothing the lexicon heard. */
export function worthReading(request: string, lexiconHeard: number): boolean {
  const words = request.trim().split(/\s+/).filter(Boolean).length;
  return words > SHORT_WORDS || lexiconHeard === 0;
}
