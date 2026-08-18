import { describe, expect, it } from "vitest";
import { readTranscript, type TranscriptTurn } from "./transcript";

const clinician = (text: string): TranscriptTurn => ({ speaker: "clinician", text });
const interviewer = (text: string): TranscriptTurn => ({ speaker: "interviewer", text });

describe("W221 what it proposes", () => {
  it("proposes a facet with the clinician's own sentence attached", () => {
    const { proposed } = readTranscript([
      clinician("I always book a longer first appointment because you cannot do this in fifteen minutes."),
    ]);
    const unhurried = proposed.find((p) => p.kind === "manner" && p.trait === "unhurried");
    expect(unhurried).toBeDefined();
    expect(unhurried!.quote).toContain("longer first appointment");
  });

  it("proposes each facet once however often it is mentioned", () => {
    const { proposed } = readTranscript([
      clinician("I do titration myself."),
      clinician("Titration and dose follow-up, yes, all of it."),
    ]);
    expect(proposed.filter((p) => p.kind === "care" && p.area === "titration")).toHaveLength(1);
  });

  it("returns proposals, never a profile", () => {
    const result = readTranscript([clinician("I do assessments.")]);
    // The shape is the control: there is no field here a publisher could read as a finished
    // profile, so no code path can mistake one for the other.
    expect(Object.keys(result).sort()).toEqual(["ignoredInterviewerTurns", "proposed", "unread"]);
  });
});

describe("W221 the two ways this could do real harm", () => {
  /**
   * THE WORST OUTPUT THIS PIPELINE COULD PRODUCE. A GP asked "do you see children?" very often
   * answers "no, I don't see children" — and the keyword is right there. Proposing on presence
   * alone would attribute the exact opposite of what they said, with their own sentence attached
   * as evidence, looking entirely credible.
   */
  it.each([
    ["no, I don't see children for this, I refer them on", "child-adolescent-adhd"],
    ["I never do titration myself, the psychiatrist keeps that", "titration"],
    ["that's not something I do, I don't handle trauma work", "trauma-informed"],
    ["I rarely see autism presentations", "autism-adhd"],
  ])("does not propose from a denial: %s", (text, area) => {
    const { proposed } = readTranscript([clinician(text)]);
    expect(proposed.some((p) => p.kind === "care" && p.area === area)).toBe(false);
  });

  it("still proposes the same area when it is actually claimed", () => {
    const { proposed } = readTranscript([clinician("I see children for this regularly.")]);
    expect(proposed.some((p) => p.kind === "care" && p.area === "child-adolescent-adhd")).toBe(true);
  });

  /**
   * THE SECOND WAY. The interviewer says every facet out loud by asking about it — the question
   * "do you do the baseline physical screening?" contains the whole cue. A reader that scanned the
   * whole transcript would propose the entire vocabulary for every clinician and attribute it to
   * them. Speaker attribution is the control, not metadata.
   */
  it("reads nothing from the interviewer, who names every facet by asking", () => {
    const { proposed, ignoredInterviewerTurns } = readTranscript([
      interviewer("Do you do titration, the baseline physical screening, and do you see children?"),
      interviewer("And are you unhurried, do you book longer first appointments?"),
    ]);
    expect(proposed).toEqual([]);
    expect(ignoredInterviewerTurns).toBe(2);
  });

  it("reads the answer even when the question named the facet", () => {
    const { proposed } = readTranscript([
      interviewer("Do you do titration yourself?"),
      clinician("Yes, titration and follow-up are mine."),
    ]);
    expect(proposed.some((p) => p.kind === "care" && p.area === "titration")).toBe(true);
  });
});

describe("W221 what it does with what it cannot hear", () => {
  /**
   * The most useful output for anybody improving the vocabulary: thirty minutes of a GP describing
   * their practice, and the sentences the closed vocabulary could not hear. That is the lexicon's
   * to-do list, written by the people it is about.
   */
  it("keeps the sentences it could not read", () => {
    const { unread, proposed } = readTranscript([
      clinician("I run a walking group for my patients on Thursdays."),
      clinician("I do titration."),
    ]);
    expect(unread).toEqual(["I run a walking group for my patients on Thursdays."]);
    expect(proposed.length).toBeGreaterThan(0);
  });

  it("is empty and calm on an empty transcript", () => {
    expect(readTranscript([])).toEqual({ proposed: [], unread: [], ignoredInterviewerTurns: 0 });
  });

  it("ignores blank clinician turns rather than logging them as unread", () => {
    expect(readTranscript([clinician("   ")]).unread).toEqual([]);
  });

  it("is deterministic over a long transcript", () => {
    const turns = [
      interviewer("Tell me how you work."),
      clinician("I book a longer first appointment and I do not rush the history."),
      clinician("I do the cardiovascular baseline before any stimulant."),
      clinician("I don't see children."),
      clinician("Family usually comes into the room, which I think matters."),
    ];
    expect(readTranscript(turns)).toEqual(readTranscript(turns));
  });
});
