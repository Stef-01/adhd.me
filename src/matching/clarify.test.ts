import { describe, expect, it } from "vitest";
import { clarifiers } from "./clarify";
import { clinicians, matchQuality, rankClinicians } from "@/demo/clinicians";
import { readNeeds } from "./needs";

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
    for (const clarifier of clarifiers(query, clinicians)) {
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
