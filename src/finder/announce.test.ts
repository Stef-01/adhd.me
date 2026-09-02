// U9: the finder's announcement script, held to the patient rule set and to its own shape.
//
// The script is data so a sweep can read it; this is the sweep. Every line — with the sample
// substitutions `finderAnnouncementSentences` fills in — goes under the strictest audience,
// plus the party-to-care rule, because a live region is copy nobody sees on the screen and so
// nobody proofreads it after the fact.

import { describe, expect, it } from "vitest";
import { sweepSurface } from "@/compliance/public-surfaces";
import { lintPartyToCare } from "@/compliance/party-to-care";
import { eachOf } from "@/quality/non-vacuous";
import {
  FINDER_ANNOUNCEMENTS,
  bookingAnnouncement,
  compareAnnouncement,
  finderAnnouncementSentences,
  listeningAgainIn,
  profileAnnouncement,
  resultsAnnouncement,
  typeAnnouncement,
} from "./announce";

describe("U9 the announcement script answers to the patient rules", () => {
  it("passes every line under the full patient rule set and the party-to-care rule", () => {
    for (const line of eachOf(finderAnnouncementSentences(), "the finder's announcement lines")) {
      expect(sweepSurface("(finder live region)", "patient", line.text), line.key).toEqual([]);
      expect(lintPartyToCare(line.text), line.key).toEqual([]);
    }
  });

  it("reaches every constant of the script, not a copy of it", () => {
    const keys = new Set(finderAnnouncementSentences().map((line) => line.key));
    for (const key of eachOf(Object.keys(FINDER_ANNOUNCEMENTS), "the script's constants")) {
      expect(keys.has(key), key).toBe(true);
    }
  });

  it("would catch a claim planted in a line", () => {
    expect(sweepSurface("(finder live region)", "patient", "7 matches who treat ADHD.").length).toBeGreaterThan(0);
    expect(lintPartyToCare("We assess your request.").length).toBeGreaterThan(0);
  });
});

describe("U9 each line says the one fact the heading does not", () => {
  it("counts matches, names the place, and prefixes a refine", () => {
    expect(resultsAnnouncement({ count: 0, suburb: null, reranked: false })).toBe("No matches.");
    expect(resultsAnnouncement({ count: 1, suburb: null, reranked: false })).toBe("1 match.");
    expect(resultsAnnouncement({ count: 7, suburb: "Footscray", reranked: false })).toBe("7 matches near Footscray.");
    expect(resultsAnnouncement({ count: 7, suburb: "Footscray", reranked: true })).toBe("Re-ranked: 7 matches near Footscray.");
    expect(resultsAnnouncement({ count: 0, suburb: "Footscray", reranked: true })).toBe("Re-ranked: No matches.");
  });

  it("tells the typing screen apart from the microphone stopping, and reads the screen's own message after it", () => {
    expect(typeAnnouncement({ micStopped: false, speechMessage: null })).toBe("Type what you are looking for.");
    expect(typeAnnouncement({ micStopped: true, speechMessage: null })).toBe("Listening stopped.");
    expect(typeAnnouncement({ micStopped: true, speechMessage: "Microphone access was refused." })).toBe(
      "Listening stopped. Microphone access was refused.",
    );
    // A message without a stop still reads as a stop: the only way the screen carries one is
    // that the microphone did not carry on.
    expect(typeAnnouncement({ micStopped: false, speechMessage: "Microphone access was refused." })).toBe(
      "Listening stopped. Microphone access was refused.",
    );
  });

  it("names the person on the profile, both on the comparison, and the language on a restart", () => {
    expect(profileAnnouncement("Dr Anusha Saxena")).toBe("Profile: Dr Anusha Saxena.");
    expect(compareAnnouncement("Dr Anusha Saxena", "Dr Tom Reilly")).toBe("Comparing Dr Anusha Saxena and Dr Tom Reilly.");
    expect(bookingAnnouncement("Dr Saxena")).toBe("Booking Dr Saxena.");
    expect(listeningAgainIn("Vietnamese")).toBe("Listening again in Vietnamese.");
  });

  it("keeps every line to one short sentence or two", () => {
    for (const line of eachOf(finderAnnouncementSentences(), "the finder's announcement lines")) {
      expect(line.text.length, line.key).toBeLessThan(120);
      // A prefix ("Profile:", "Comparing") is finished by the name that follows; a whole line
      // ends in a full stop so a screen reader pauses before the heading.
      const prefix = /:$/.test(line.text) || !line.text.includes(" ");
      expect(prefix || line.text.endsWith("."), line.key).toBe(true);
    }
  });
});
