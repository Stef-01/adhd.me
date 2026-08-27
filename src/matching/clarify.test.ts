import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { clarifiers, PREF_PROMPTS } from "./clarify";
import { clinicians, matchQuality, rankClinicians } from "@/demo/clinicians";
import { facetKey, readNeeds } from "./needs";

describe("W225 a question only earns its place if the answer changes the order", () => {
  /** THE PROPERTY THE WHOLE FILE EXISTS FOR. Anything else is data collection from somebody who
      came here to find a GP. */
  it.each(clarifiers("I think I might have ADHD", clinicians).map((c) => [c.prompt, c.answer]))(
    "answering %s actually reorders the roster",
    (_prompt, answer) => {
      const before = "I think I might have ADHD";
      const after = `${before}, ${answer}`;
      expect(matchQuality(before)).toBe("tied");
      expect(matchQuality(after)).toBe("informed");
    },
  );

  it("offers something for the commonest query in the product", () => {
    expect(clarifiers("I think I might have ADHD", clinicians).length).toBeGreaterThan(0);
  });

  it("offers something when nothing at all was understood", () => {
    expect(readNeeds("help")).toEqual([]);
    expect(clarifiers("help", clinicians).length).toBeGreaterThan(0);
  });

  it("never asks about something the reader already said", () => {
    const query = "I want a longer first appointment and my dose needs titration";
    const asked = new Set(readNeeds(query).map((need) => need.label));
    for (const clarifier of eachOf(clarifiers(query, clinicians), "the clarifiers this query earns")) {
      // The facet is not one already reached, so the question cannot be a repeat.
      expect(readNeeds(clarifier.answer).every((need) => !asked.has(need.label))).toBe(true);
    }
  });

  /**
   * A facet everybody declares cannot separate anybody, however interesting it sounds, and a facet
   * nobody declares cannot either. Both would be questions asked for their own sake.
   */
  it("never asks about a facet the whole roster shares or none of it does", () => {
    for (const clarifier of clarifiers("help", clinicians)) {
      expect(clarifier.heldBy).toBeGreaterThan(0);
      expect(clarifier.heldBy).toBeLessThan(clinicians.length);
    }
  });

  it("asks nothing when there is nobody to choose between", () => {
    expect(clarifiers("help", clinicians.slice(0, 1))).toEqual([]);
    expect(clarifiers("help", [])).toEqual([]);
  });

  it("is deterministic", () => {
    expect(clarifiers("help", clinicians)).toEqual(clarifiers("help", clinicians));
  });
});

describe("W225 the answer is the reader's sentence, not a facet name", () => {
  /**
   * Everything re-enters through `readNeeds`, so the finder can still say "you said this" about a
   * signal it prompted. An answer that reached nothing would be a question that did nothing.
   */
  it.each(clarifiers("help", clinicians).map((c) => [c.prompt, c.answer]))(
    "the answer to %s reads back into the vocabulary",
    (_prompt, answer) => {
      expect(readNeeds(answer).length).toBeGreaterThan(0);
    },
  );

  it("changes who is first, not merely the scores", () => {
    const base = "I think I might have ADHD";
    const orders = clarifiers(base, clinicians).map(
      (clarifier) => rankClinicians(`${base}, ${clarifier.answer}`)[0]!.id,
    );
    // At least two different clinicians come first across the offered questions, or the questions
    // are not actually discriminating between them.
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});

describe("O5 preference clarifiers (F7)", () => {
  /**
   * THE DEFECT THIS PINS. `clarifiers()` built its candidates from care ∪ manner, so the
   * questions with the highest roster variance — woman GP, telehealth, bulk billing — were
   * excluded by construction, against the module's own stated principle.
   */
  it("asks about a preference the roster splits on", () => {
    // Only Dr Saxena takes the first appointment by phone, so the question can reorder.
    const keys = clarifiers("hello", clinicians, 20).map((c) => c.facetKey);
    expect(keys).toContain("pref:telehealth-first");
  });

  it("never asks about a preference nobody on the roster holds", () => {
    // The property, on a roster where it bites: among the two Beecroft GPs no woman is
    // listed, so the question would set up a disappointment that roster cannot answer.
    const beecroft = clinicians.filter((c) => c.suburb === "Beecroft");
    expect(clarifiers("hello", beecroft, 20).map((c) => c.facetKey)).not.toContain("pref:woman-gp");
    // And the flip side since O34: Dr Anusha Saxena splits the full roster on it, so the
    // most-stated preference in real directory search is finally askable here.
    expect(clarifiers("hello", clinicians, 20).map((c) => c.facetKey)).toContain("pref:woman-gp");
  });

  it("every preference answer re-reads to the facet its question is about", () => {
    for (const [key, copy] of Object.entries(PREF_PROMPTS)) {
      const reached = readNeeds(copy.answer).map((need) => facetKey(need.facet));
      expect(reached, `${copy.answer} does not reach ${key}`).toContain(key);
    }
  });

  it("does not ask what the reader already said", () => {
    const keys = clarifiers("I want the first appointment by phone", clinicians, 20).map((c) => c.facetKey);
    expect(keys).not.toContain("pref:telehealth-first");
  });
});
