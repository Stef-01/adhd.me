import { describe, it } from "vitest";
import { clinicians, rankClinicians, getPersonalizedMatch } from "./clinicians";
import { preferredQualities, emotionalFitScore } from "./emotional-fit";

// THROWAWAY DIAGNOSTIC — printing, not asserting. Delete after reading.
describe("algorithm diagnostic", () => {
  const queries = [
    "I think I might have ADHD and I would like an assessment",
    "I want a calm GP who won't rush me and speaks Hindi",
    "I drink too much and don't want to be judged for it",
    "I need a thorough structured assessment with the heart checked first",
    "my dose wears off in the afternoon and needs a review",
    "I was treated for anxiety for years and think it was wrong",
    "I don't want telehealth, I want to see someone in person",   // negation
    "I want someone who is not judgemental about my drinking",     // 'not judgemental' vs cue
    "I'd like a malcolm-style calm approach",                      // substring trap: 'calm' in 'malcolm'? no — but 'calm' present
    "least of my worries is being put at ease",                    // 'at ease' substring
    "my son is a teenager struggling at school",                   // child care area, roster has none
    "asdfghjkl qwerty nonsense words",                             // no signal
  ];

  it("prints rankings, scores and signals", () => {
    for (const q of queries) {
      const ranked = rankClinicians(q);
      const top = ranked[0]!;
      const m = getPersonalizedMatch(top, q);
      const wanted = preferredQualities(q);
      // eslint-disable-next-line no-console
      console.log(
        `\nQ: "${q}"\n` +
        `  order: ${ranked.map((c) => c.shortName).join(" > ")}\n` +
        `  EI wanted: [${wanted.join(", ")}]\n` +
        clinicians.map((c) => `  ${c.shortName} EIscore=${emotionalFitScore(q, c.emotionalIntelligence)}`).join("\n") + "\n" +
        `  top signals: [${(m.signals as string[]).join(" | ")}]\n` +
        `  reason: ${m.reason}`,
      );
    }
  });
});
