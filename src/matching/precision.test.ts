// O119: the precision counterpart to the reach ratchet.
//
// The corpus has always gated RECALL — per-facet heard counts with floors, so hearing less
// fails the build. Precision was gated only by `never` pins, and a `never` pin exists exactly
// where an author thought of the collision. This asserts the other direction: no corpus entry
// may hear a facet it declares in NO direction. When a new cue starts firing on a sentence
// nobody considered, this is what says so.
//
// Found on its first run: 32 of 508 entries were hearing an undeclared facet, and three cues
// were manufacturing reach — "properly" on structured (it fired on every sentence containing
// the adverb), bare "panic" on anxiety (it read "a doctor who won't panic about my drinking"),
// bare "overwhelmed" on emotional-regulation (it read a person describing their own state).
// All three are gone. The rest are now declared, five of them as known false positives.

import { describe, expect, it } from "vitest";
import { REACH_CORPUS } from "@/matching/corpus";
import { facetKey, readNeeds } from "@/matching/needs";

type Entry = {
  text: string;
  reaches?: readonly string[];
  aspires?: readonly string[];
  never?: readonly string[];
};

function undeclaredReaches(): Array<{ text: string; extra: string[] }> {
  const out: Array<{ text: string; extra: string[] }> = [];
  for (const entry of REACH_CORPUS as ReadonlyArray<Entry>) {
    const declared = new Set([...(entry.reaches ?? []), ...(entry.aspires ?? []), ...(entry.never ?? [])]);
    const heard = new Set(readNeeds(entry.text).map((need) => facetKey(need.facet)));
    const extra = [...heard].filter((key) => !declared.has(key));
    if (extra.length > 0) out.push({ text: entry.text, extra });
  }
  return out;
}

describe("O119 the corpus declares everything it hears", () => {
  /**
   * THE GATE. A cue that starts firing somewhere nobody looked now fails the build, and the
   * failure names the sentence — which is the whole difference between this and reading the
   * diff. Resolving one means deciding what the reach IS: a real reach gets declared, a false
   * one gets the cue fixed or pinned as today's truth with a retag demand.
   */
  it("no entry hears a facet it declares in no direction", () => {
    const undeclared = undeclaredReaches();
    expect(
      undeclared.map((row) => `"${row.text}" also hears ${row.extra.join(", ")}`),
    ).toEqual([]);
  });

  /**
   * Non-vacuity: the probe must actually be able to see an undeclared reach. A sentence that
   * plainly reaches a facet, checked against an empty declaration, has to be caught — otherwise
   * a green result above would mean nothing.
   */
  it("would catch one: the check is not vacuous", () => {
    const heard = readNeeds("I need an ADHD assessment").map((need) => facetKey(need.facet));
    expect(heard.length).toBeGreaterThan(0);
    const declared = new Set<string>();
    expect(heard.filter((key) => !declared.has(key)).length).toBeGreaterThan(0);
  });

  /**
   * THE CLASS THE AUDIT NAMED, and the reason it is one finding rather than five.
   *
   * Every cue in the lexicon is written as though the CLINICIAN is the subject: "explains
   * things", "believes me", "my son". Five corpus sentences put somebody else there — the
   * patient doing the explaining, the family doing the disbelieving, a son who is the reason
   * for an adult's own assessment — and the cue fires anyway. They are pinned as today's truth
   * with retag demands; the fix is a subject check, which is a mechanism unit and not a cue.
   */
  it("the subject-blind false positives are still exactly the five that were named", () => {
    const cases: Array<[string, string]> = [
      ["a longer first appointment so I can actually explain", "manner:collaborative"],
      ["book a double slot, I have twenty years to explain", "manner:collaborative"],
      ["my family does not believe in ADHD and I need help navigating that", "manner:attuned"],
      ["after my son was diagnosed I recognised myself and now I want my own assessment", "care:child-adolescent-adhd"],
      ["bring me into every decision about my own brain", "manner:sense_making"],
    ];
    for (const [text, facet] of cases) {
      expect(readNeeds(text).map((need) => facetKey(need.facet)), text).toContain(facet);
    }
  });
});
