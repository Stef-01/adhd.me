// O30 verify gate: the live interview's pure logic — parsing, the scripted read-back,
// and the fold from spoken answers into the reviewable background.

import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  confirmedBackground,
  gapFacets,
  MATCHABLE_VOCABULARY,
  parseTranscriptText,
  readBackQuestionFor,
} from "./capture";
import { INTERVIEW } from "./interview";
import { readTranscript } from "./transcript";
import { saveBackground } from "./background-store";

const store = () => path.join(mkdtempSync(path.join(tmpdir(), "iv-")), "backgrounds.jsonl");

describe("parsing the typed transcript", () => {
  it("attributes prefixed lines to the interviewer and everything else to the clinician", () => {
    const turns = parseTranscriptText(
      "i: How does a first appointment go?\nI book a longer first appointment.\nInterviewer: And titration?\nTitration is mine.",
    );
    expect(turns.map((turn) => turn.speaker)).toEqual([
      "interviewer",
      "clinician",
      "interviewer",
      "clinician",
    ]);
    expect(turns[0]!.text).toBe("How does a first appointment go?");
    expect(turns[3]!.text).toBe("Titration is mine.");
  });

  it("drops blank lines and whitespace-only turns", () => {
    expect(parseTranscriptText("\n\n  \n i:  \n")).toEqual([]);
  });

  /**
   * The convention has to fail toward a VISIBLE mistake: a forgotten prefix mislabels the
   * interviewer's question as clinician speech, which shows up immediately as a wrong proposal —
   * rather than silently discarding the doctor's words, which nobody would notice.
   */
  it("treats an unprefixed line as the clinician, never as noise", () => {
    const turns = parseTranscriptText("Do you see children for this?");
    expect(turns).toEqual([{ speaker: "clinician", text: "Do you see children for this?" }]);
  });
});

describe("the read-back question is the interview's own", () => {
  it("returns the structured interview's ask for every care and manner facet", () => {
    for (const question of INTERVIEW) {
      if (question.target.kind !== "care" && question.target.kind !== "manner") continue;
      expect(readBackQuestionFor(question.id)).toBe(question.ask);
    }
  });

  it("names the drift out loud rather than throwing mid-interview", () => {
    expect(readBackQuestionFor("care:not-a-facet")).toMatch(/drifted/i);
  });
});

describe("the gap sweep is the rest of the checklist", () => {
  it("covers the whole matchable vocabulary when nothing has been said", () => {
    const empty = readTranscript([]);
    expect(gapFacets(empty).map((f) => f.key)).toEqual(MATCHABLE_VOCABULARY.map((f) => f.key));
  });

  it("shrinks by exactly the facets the transcript reaches, never below the vocabulary's rest", () => {
    const read = readTranscript([
      { speaker: "clinician", text: "Titration is mine, I do not hand that back." },
    ]);
    const gaps = gapFacets(read).map((f) => f.key);
    expect(gaps).not.toContain("care:titration");
    expect(gaps.length + read.proposed.length).toBe(MATCHABLE_VOCABULARY.length);
  });

  it("every gap facet has a scripted question — the checklist can never ask a blank", () => {
    for (const facet of MATCHABLE_VOCABULARY) {
      expect(readBackQuestionFor(facet.key), facet.key).not.toMatch(/drifted/i);
    }
  });
});

describe("folding spoken answers into the background", () => {
  const read = readTranscript([
    { speaker: "clinician", text: "Titration is mine, I do not hand that back." },
    { speaker: "clinician", text: "I book a longer first appointment for these." },
  ]);

  it("proposes from the fixture before any answer exists", () => {
    // Guard the fixture itself: if the reader stops hearing these sentences the tests below
    // would pass vacuously.
    expect(read.proposed.length).toBeGreaterThanOrEqual(2);
    const keys = read.proposed.map((p) => (p.kind === "care" ? `care:${p.area}` : `manner:${p.trait}`));
    expect(keys).toContain("care:titration");
  });

  it("often and sometimes accept — keeping the distinction — and not-me rejects", () => {
    const keys = read.proposed.map((p) => (p.kind === "care" ? `care:${p.area}` : `manner:${p.trait}`));
    const [first, second] = keys as [string, string];
    const background = confirmedBackground(
      "dr-t",
      "Dr T",
      read,
      { [first]: "sometimes", [second]: "not-me" },
      "Stefan",
    );
    const byKey = new Map(background.facets.map((facet) => [facet.key, facet]));
    expect(byKey.get(first)).toMatchObject({ status: "accepted", frequency: "sometimes", decidedBy: "Stefan" });
    expect(byKey.get(second)).toMatchObject({ status: "rejected", frequency: "not-me", decidedBy: "Stefan" });
  });

  it("an unanswered proposal stays proposed with nobody named", () => {
    const background = confirmedBackground("dr-t", "Dr T", read, {}, "Stefan");
    for (const facet of background.facets) {
      expect(facet.status).toBe("proposed");
      expect(facet.decidedBy).toBeUndefined();
      expect(facet.frequency).toBeUndefined();
    }
    // Which is exactly what the W226 writer's rule needs: with no answers recorded, a save can
    // never trip "accepted with nobody named" — the only path to accepted runs through an answer.
    expect(() => saveBackground(background, "Stefan", { filePath: store() })).not.toThrow();
  });

  it("the spoken answer round-trips through the store", () => {
    const keys = read.proposed.map((p) => (p.kind === "care" ? `care:${p.area}` : `manner:${p.trait}`));
    const background = confirmedBackground("dr-t", "Dr T", read, { [keys[0]!]: "often" }, "Stefan");
    const saved = saveBackground(background, "Stefan", { filePath: store() });
    expect(saved.facets.find((facet) => facet.key === keys[0])!.frequency).toBe("often");
  });

  it("an answered gap question lands as a facet with no quote — asked, not heard", () => {
    const gapKey = gapFacets(read)[0]!.key;
    const background = confirmedBackground("dr-t", "Dr T", read, { [gapKey]: "often" }, "Stefan");
    const facet = background.facets.find((f) => f.key === gapKey)!;
    expect(facet).toMatchObject({ status: "accepted", frequency: "often", decidedBy: "Stefan" });
    expect(facet.quote).toBeUndefined();
    expect(facet.cue).toBeUndefined();
    const saved = saveBackground(background, "Stefan", { filePath: store() });
    expect(saved.facets.find((f) => f.key === gapKey)!.frequency).toBe("often");
  });

  it("an unanswered gap question appears nowhere in the record", () => {
    // A question never asked must not be stored as a facet nobody decided — absence is the
    // honest state, and it also keeps the saved row the size of the interview, not the
    // vocabulary.
    const background = confirmedBackground("dr-t", "Dr T", read, {}, "Stefan");
    const proposedKeys = read.proposed.map((p) => (p.kind === "care" ? `care:${p.area}` : `manner:${p.trait}`));
    expect(background.facets.map((f) => f.key).sort()).toEqual([...proposedKeys].sort());
  });

  it("a frequency outside the three states is dropped by the writer, never defaulted", () => {
    const background = confirmedBackground("dr-t", "Dr T", read, {}, "Stefan");
    background.facets[0]!.frequency = "always" as never;
    const saved = saveBackground(background, "Stefan", { filePath: store() });
    expect("frequency" in saved.facets[0]!).toBe(false);
  });
});
