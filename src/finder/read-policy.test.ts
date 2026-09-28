import { describe, expect, it } from "vitest";
import { worthReading } from "./read-policy";

describe("when the model reader is worth its wait", () => {
  it("skips a short request the lexicon already heard", () => {
    expect(worthReading("an ADHD assessment by telehealth", 2)).toBe(false);
    expect(worthReading("  a woman GP who bulk bills near Hornsby  ", 2)).toBe(false);
  });

  it("reads a short request the lexicon heard nothing in", () => {
    expect(worthReading("someone who gets it", 0)).toBe(true);
  });

  it("reads anything longer than ten words, heard or not", () => {
    expect(worthReading("I need someone to keep prescribing my ADHD medication by telehealth please", 2)).toBe(true);
  });
});
