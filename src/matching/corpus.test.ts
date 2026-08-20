// W231 (O47) verify gate: the standing corpus IS the CI gate the year plan asked for.

import { describe, expect, it } from "vitest";
import { EI_QUALITY_KEYS } from "@/demo/emotional-fit";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { corpusReachByFacet, REACH_CORPUS, REACH_FLOORS } from "./corpus";
import { facetKey, readNeeds } from "./needs";

const read = (text: string) => readNeeds(text).map((n) => facetKey(n.facet));

describe("the corpus is well-formed", () => {
  const VALID_KEYS = new Set<string>([
    ...CARE_AREA_LABELS.map((a) => `care:${a.id}`),
    ...EI_QUALITY_KEYS.map((t) => `manner:${t}`),
    "pref:woman-gp", "pref:telehealth-first", "pref:longer-appointment", "pref:bulk-billing",
  ]);

  it("every entry expects something, and every key names a real facet", () => {
    for (const entry of REACH_CORPUS) {
      const keys = [...(entry.reaches ?? []), ...(entry.never ?? []), ...(entry.aspires ?? [])];
      expect(keys.length, `"${entry.text}" pins nothing`).toBeGreaterThan(0);
      for (const key of keys) expect(VALID_KEYS.has(key), `"${entry.text}" names unknown facet ${key}`).toBe(true);
    }
  });

  it("no text appears twice, because a duplicate averages away a regression", () => {
    const texts = REACH_CORPUS.map((entry) => entry.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("hard pins: every `reaches` holds, every `never` holds", () => {
  it.each(REACH_CORPUS.filter((entry) => entry.reaches?.length).map((entry) => [entry.text, entry] as const))(
    "reaches: %s",
    (_text, entry) => {
      const got = read(entry.text);
      for (const facet of entry.reaches!) expect(got, entry.text).toContain(facet);
    },
  );

  it.each(REACH_CORPUS.filter((entry) => entry.never?.length).map((entry) => [entry.text, entry] as const))(
    "never reaches: %s",
    (_text, entry) => {
      const got = read(entry.text);
      for (const facet of entry.never!) expect(got, entry.text).not.toContain(facet);
    },
  );
});

describe("the per-facet gate (the year plan's CI ratchet)", () => {
  const tally = new Map(corpusReachByFacet(read).map((row) => [row.facet, row]));

  it("every facet's heard count meets its measured floor — any drop fails the build", () => {
    for (const [facet, floor] of Object.entries(REACH_FLOORS)) {
      const row = tally.get(facet);
      expect(row, `${facet} has a floor but no corpus entries`).toBeDefined();
      expect(row!.heard, `${facet}: heard ${row!.heard} of ${row!.asked}, floor ${floor}`).toBeGreaterThanOrEqual(floor);
    }
  });

  it("every measured facet has a floor, so a new facet cannot ship ungated", () => {
    for (const [facet] of tally) {
      expect(REACH_FLOORS[facet], `${facet} is in the corpus but has no floor`).toBeDefined();
    }
  });

  /**
   * The promotion loop, made mechanical: an `aspires` facet that the lexicon can now hear must
   * be promoted to `reaches` (and the floor raised) IN THE SAME COMMIT as the improvement.
   * Failing here is the corpus doing its job — the message names the exact edit to make.
   */
  it("an aspiration that is now heard demands promotion, not silence", () => {
    const met: string[] = [];
    for (const entry of REACH_CORPUS) {
      const got = new Set(read(entry.text));
      for (const facet of entry.aspires ?? []) {
        if (got.has(facet)) met.push(`"${entry.text}" now reaches ${facet} — promote it to \`reaches\` and raise the floor`);
      }
    }
    expect(met).toEqual([]);
  });
});

/**
 * O123: the founder's G7 question, scoped from the corpus rather than from prose.
 *
 * Year plan 1b was written about five trauma sentences, and then unit after unit deferred to
 * it in passing until twenty-four aspirations across seven facets sat behind it — while most
 * of them turned out never to have been blocked, because the facets they belong to already
 * read exactly that register by settled design. A paragraph cannot notice that happening.
 * These do.
 */
describe("O123 the founder question knows its own size", () => {
  const awaiting = REACH_CORPUS.filter((entry) => entry.awaitingFounder);

  it("is exactly the sentences that name an experience or a self-state", () => {
    // Pinned as a list, not a count: a new one must be added deliberately, with its kind.
    expect(awaiting.map((e) => e.text).sort()).toEqual([
      "I cry in the car after every appointment",
      "I dissociate when doctors rush me",
      "I rehearse what to say and still leave unheard",
      "an abusive relationship left me jumpy in clinics",
      "childhood was rough and it comes up in appointments",
      "crying at work over nothing and I want it taken seriously",
      "my moods flip fast and I say things I regret",
      "my temper goes from zero to a hundred in seconds",
      "rejection hits me like a truck",
      "there is family violence in my past and it affects appointments",
      "what happened to me before makes doctors hard to trust",
    ]);
    for (const entry of awaiting) {
      expect(["experience", "self-state"]).toContain(entry.awaitingFounder);
    }
  });

  it("never marks an entry that is already heard, which would be a decision taken quietly", () => {
    // The whole point is that these are UNheard pending a human call. If a cue starts reaching
    // one, that is the founder's question being answered by a cue author instead of a founder.
    for (const entry of awaiting) {
      expect(entry.aspires ?? [], `${entry.text} is marked awaiting but aspires to nothing`).not.toHaveLength(0);
    }
  });
});
