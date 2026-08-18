import { describe, expect, it } from "vitest";
import { proposeDeclarations, reachGaps } from "./expertise";

describe("O22 the interview transcript is read by the patient's own reader", () => {
  it("proposes care and manner declarations from rich free speech, with the cue that reached each", () => {
    const transcript =
      "I never rush the first appointment, people can be honest with me about drinking, " +
      "and a lot of my week is dose titration and follow-up.";
    const proposals = proposeDeclarations(transcript);
    const labels = proposals.map((p) => p.label);
    expect(labels).toContain("Titration and dose review");
    expect(labels).toContain("Substance history held safely");
    expect(labels).toContain("Unhurried first appointment");
    for (const proposal of proposals) {
      expect(proposal.heard.length).toBeGreaterThan(0);
      expect(proposal.toConfirm).toContain(proposal.heard);
    }
  });

  it("proposes a language from the offered list, never English", () => {
    const proposals = proposeDeclarations("I consult in Hindi, and my English is fluent obviously");
    const languages = proposals.filter((p) => p.facet.kind === "language");
    expect(languages.map((p) => p.label)).toContain("Hindi-speaking");
    expect(languages.map((p) => p.label)).not.toContain("English-speaking");
  });

  it("proposes nothing from talk that names no facet", () => {
    expect(proposeDeclarations("I trained in Sydney and enjoy hiking on weekends")).toEqual([]);
  });

  it("surfaces the sentences the patient lexicon cannot hear, and only those", () => {
    // The reach-gap feed: what a clinician said that a patient's reader hears nothing in. The
    // titration sentence reaches, so it is not a gap; the second sentence is unreadable and is
    // returned for a person to triage (here it is biography, correctly dropped in review —
    // the feed's job is only to make the unheard visible).
    //
    // Writing this test surfaced a W223-class false positive worth its corpus seat: "my rooms
    // are above the pharmacy" reaches manner:culturally_attuned through the cue "in the room
    // with me" (stem-subsequence looseness). Logged in the year plan's Q1 reach-corpus item.
    const transcript = "A lot of my week is dose titration. I trained in Sydney and enjoy hiking on weekends.";
    const gaps = reachGaps(transcript);
    expect(gaps).toEqual(["I trained in Sydney and enjoy hiking on weekends."]);
  });

  it("is a proposal pipeline, not a declaration pipeline: every item carries a confirm question", () => {
    const proposals = proposeDeclarations("dose titration reviews, and I want people to feel heard without being judged");
    expect(proposals.length).toBeGreaterThan(0);
    for (const proposal of proposals) expect(proposal.toConfirm).toMatch(/\?$/);
  });
});
