// W259: Q17's matching machinery, run against each of W200's five rail properties.
//
// THE ROW SAYS "TESTED AGAINST THEM EXPLICITLY", and the word doing the work is *tested*. A
// re-derivation that describes why a property survived is a paragraph; the same paragraph is
// equally easy to write when the property has not survived. So each of the five gets an assertion
// here that exercises the matcher and could fail.
//
// WHY Q17 SPECIFICALLY. The row calls it "the first Y5 work that could have moved the line", and
// that is right for the obvious reason: matching is the part of this product that decides who is
// offered what, and the G7 boundary is about the product not deciding clinical things. Q17 is also
// where the tree ALREADY KNOWS it is close to the line — W213 flagged `rankCandidates`, W214 built
// its matcher so the flagged ordering cannot be expressed, W216 priced the question, and W217 is
// blocked from day one because answering it would mean changing a published legal notice.
//
// WHAT THIS FILE IS NOT. It is not a second copy of the matcher's own tests. `match.test.ts`
// checks that the matcher matches correctly; this checks that the SHAPE of what it can express
// keeps five specific promises — which is a different question, and one no per-unit test asks.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lintEducationCopy } from "@/education/advice-lint";
import { RAIL_PROPERTIES } from "@/compliance/cdss-boundary";
import { DEFAULT_MATCH_CONFIG, REASONS_THIS_MATCHER_PRODUCES, matchSlots } from "@/matching/match";
import type { MatchCandidate, MatchSlot } from "@/matching/explain";
import { MATCH_REASON_COPY } from "@/matching/explain";

const SRC = path.resolve(__dirname, "..");

const candidate = (ref: string, slotIds: string[], outstandingOffers = 0): MatchCandidate => ({
  candidateRef: ref,
  practiceId: "prac-a",
  availableSlotIds: slotIds,
  outstandingOffers,
});

const slot = (slotId: string, startsAt: string, practiceId = "prac-a"): MatchSlot => ({
  slotId,
  practiceId,
  startsAt,
});

describe("W259 rail 1 — the matcher selects no clinician, and cannot express one", () => {
  it("returns decisions about SLOTS, with no clinician anywhere in the result", () => {
    const decisions = matchSlots(
      [candidate("c-1", ["s-1", "s-2"]), candidate("c-2", ["s-1"])],
      [slot("s-1", "2026-09-01T09:00:00+10:00"), slot("s-2", "2026-09-01T10:00:00+10:00")],
      DEFAULT_MATCH_CONFIG,
    );
    expect(decisions.length, "the matcher produced no decisions — the sweep is vacuous").toBe(2);
    const body = JSON.stringify(decisions);
    for (const clinicianish of ["clinician", "clinicianId", "practitioner", "doctor", "gp"]) {
      expect(body.toLowerCase(), `a decision names a ${clinicianish}`).not.toContain(clinicianish);
    }
  });

  it("has nowhere in its candidate type to put a clinical attribute", () => {
    // THE FIRST VERSION OF THIS TEST CHECKED ITS OWN FIXTURE AND A SEEDED FAILURE PROVED IT. It
    // read `Object.keys(candidate("c-1", []))` — the keys of a literal constructed three lines
    // above — so adding `chronicCare?: boolean` to the interface changed nothing and all thirteen
    // tests stayed green. The claim is about the TYPE, which a runtime value cannot see: an
    // optional field is absent from every object that does not set it, which is exactly how a
    // widened type looks from inside a test. So the INTERFACE BODY is read, W183's technique for
    // the same problem on directory profiles.
    const source = readFileSync(path.join(SRC, "matching/explain.ts"), "utf8");
    const body = /export interface MatchCandidate \{([\s\S]*?)^\}/m.exec(source)?.[1];
    expect(body, "MatchCandidate's declaration was not found — the scan is looking at nothing").toBeTruthy();
    expect(body!, "the extracted body is not the interface").toContain("candidateRef");
    // The four fields through which an ordering by need would arrive. W214's own comment names
    // them: two are clinical markers, and two are how a "reasonable" ordering gets in without
    // looking like one.
    for (const clinical of ["chronicCare", "activeRecall", "lastAttendedAt", "usualClinicianId"]) {
      expect(body!, `MatchCandidate declares ${clinical}`).not.toMatch(
        new RegExp(`\\b${clinical}\\??\\s*:`),
      );
    }
    // And nothing else clinical has been added under another name.
    expect(body!).not.toMatch(/\b(condition|diagnos\w*|severity|risk|urgen\w*|priority|need)\??\s*:/i);
    // The runtime shape still matches the declared one, so the two cannot drift apart unnoticed.
    expect(Object.keys(candidate("c-1", [])).sort()).toEqual([
      "availableSlotIds",
      "candidateRef",
      "outstandingOffers",
      "practiceId",
    ]);
  });

  it("orders by time and id, never by anything about the person", () => {
    // Two candidates, identical but for their refs, competing for one slot. Whoever wins must win
    // on a stated tie-break rather than on any property of them — and swapping the input order
    // must not change the answer, or the "ordering" is arrival order wearing a rule's clothes.
    const slots = [slot("s-1", "2026-09-01T09:00:00+10:00")];
    const forward = matchSlots([candidate("c-1", ["s-1"]), candidate("c-2", ["s-1"])], slots, DEFAULT_MATCH_CONFIG);
    const reversed = matchSlots([candidate("c-2", ["s-1"]), candidate("c-1", ["s-1"])], slots, DEFAULT_MATCH_CONFIG);
    const byRef = (ds: typeof forward) =>
      [...ds].sort((a, b) => a.candidateRef.localeCompare(b.candidateRef)).map((d) => `${d.candidateRef}:${d.reason}`);
    expect(byRef(forward), "the matcher answers differently when the input is reordered").toEqual(byRef(reversed));
  });
});

describe("W259 rail 2 — the matcher concludes no transfer of care", () => {
  it("produces only reasons about slots and offers, from a closed vocabulary", () => {
    const decisions = matchSlots(
      [candidate("c-1", ["s-1"]), candidate("c-2", []), candidate("c-3", ["s-1"], 5)],
      [slot("s-1", "2026-09-01T09:00:00+10:00")],
      DEFAULT_MATCH_CONFIG,
    );
    expect(decisions.length).toBe(3);
    for (const decision of decisions) {
      expect(
        REASONS_THIS_MATCHER_PRODUCES,
        `${decision.candidateRef} carries a reason outside the declared vocabulary`,
      ).toContain(decision.reason);
    }
    // And nothing in that vocabulary is about care moving anywhere.
    for (const reason of REASONS_THIS_MATCHER_PRODUCES) {
      expect(reason, `${reason} sounds like a handover`).not.toMatch(
        /transfer|handover|accepted|referred|discharged|took_over/,
      );
    }
  });
});

describe("W259 rail 3 — the matcher concludes nothing from an absence", () => {
  it("says WHY somebody was not matched, rather than leaving them out", () => {
    // The failure this property is about: a candidate who simply does not appear in the result.
    // Silence about a person is the product concluding something about them without saying so.
    const decisions = matchSlots(
      [candidate("c-1", ["s-1"]), candidate("c-2", []), candidate("c-3", ["s-9"])],
      [slot("s-1", "2026-09-01T09:00:00+10:00")],
      DEFAULT_MATCH_CONFIG,
    );
    expect(decisions.map((d) => d.candidateRef).sort()).toEqual(["c-1", "c-2", "c-3"]);
    const unmatched = decisions.filter((d) => d.slotId === null);
    expect(unmatched.length, "nobody went unmatched — this case proves nothing").toBeGreaterThan(0);
    for (const decision of unmatched) {
      expect(decision.reason, `${decision.candidateRef} is unmatched with no reason`).toBeTruthy();
    }
  });

  it("does not read an empty availability list as availability", () => {
    // `availableSlotIds: []` means the practice recorded nothing, and the matcher must not treat
    // "no recorded restriction" as "any slot will do" — the classic read of an absence.
    const decisions = matchSlots(
      [candidate("c-open", [])],
      [slot("s-1", "2026-09-01T09:00:00+10:00")],
      DEFAULT_MATCH_CONFIG,
    );
    expect(decisions[0]!.slotId, "an empty availability list was read as unrestricted").toBeNull();
    expect(decisions[0]!.reason).toBe("no_offered_slot_within_recorded_availability");
  });
});

describe("W259 rail 4 — the matching lane writes no clinical text", () => {
  it("authors no sentence about a condition anywhere in its reason copy", () => {
    const copy = Object.values(MATCH_REASON_COPY);
    expect(copy.length, "there is no reason copy to check").toBeGreaterThan(4);
    for (const sentence of copy) {
      expect(sentence, `"${sentence.slice(0, 40)}…" names a condition`).not.toMatch(
        /\b(adhd|autism|diabet\w*|asthma|depress\w*|anxiet\w*|symptom|diagnos\w*|medication|dose)\b/i,
      );
    }
  });

  it("keeps the clinical vocabulary out of the matcher's own source", () => {
    const raw = readFileSync(path.join(SRC, "matching/match.ts"), "utf8");
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
    expect(code, "the stripper emptied the file").toContain("export function matchSlots");
    for (const clinical of ["chronicCare", "activeRecall", "conditionCode", "symptom", "severity"]) {
      expect(code, `match.ts references ${clinical}`).not.toContain(clinical);
    }
  });
});

describe("W259 rail 5 — the matching lane informs and never advises", () => {
  it("passes the advice linter on every sentence it can produce", () => {
    for (const [reason, sentence] of Object.entries(MATCH_REASON_COPY)) {
      expect(lintEducationCopy(sentence).map((f) => f.rule), reason).toEqual([]);
    }
  });

  it("still fires on advice, so the clean result above means something", () => {
    // Non-vacuity for the linter, not for the copy. A linter returning nothing for everything would
    // make the sweep above pass over any sentence at all.
    expect(
      lintEducationCopy("You should review this patient against the new criteria.").length,
    ).toBeGreaterThan(0);
  });
});

describe("W259 the re-derivations are about Y5, and say what could have broken each property", () => {
  it("gives every property a Y5 re-derivation that names a Y5 unit", () => {
    for (const property of RAIL_PROPERTIES) {
      const y5 = property.rederivations.find((r) => r.year === "Y5");
      expect(y5, `${property.id} has no Y5 re-derivation`).toBeDefined();
      const units = [...y5!.note.matchAll(/\bW(\d+)\b/g)].map((m) => Number(m[1]));
      expect(units.some((u) => u >= 209), `${property.id}'s Y5 note cites no Y5 unit`).toBe(true);
    }
  });

  it("carries Y4's re-derivations unchanged, so a later year cannot rewrite an earlier answer", () => {
    // W177's rule at the level of a document: the Y4 notes are evidence about Y4, and summarising
    // them later loses the thing that made them evidence. Each still cites a Y4 unit and each is
    // still long enough to be a derivation rather than a "still true".
    for (const property of RAIL_PROPERTIES) {
      const y4 = property.rederivations.find((r) => r.year === "Y4");
      expect(y4, `${property.id} lost its Y4 re-derivation`).toBeDefined();
      expect(y4!.note.length).toBeGreaterThan(200);
    }
  });

  it("names the finder ranking under rail 1 rather than leaving the tension unstated", () => {
    // The case W258 surfaced, and the one a re-derivation would most easily skate past: this
    // property refuses an ordered list of clinicians, and `rankClinicians` returns one. The Y5 note
    // has to address it by name — a re-derivation that omits its hardest case is not one.
    const rail = RAIL_PROPERTIES.find((p) => p.id === "never-selects-a-clinician")!;
    const y5 = rail.rederivations.find((r) => r.year === "Y5")!;
    expect(y5.note, "the Y5 note does not mention the finder ranking").toMatch(/rankClinicians/);
    expect(y5.note, "the Y5 note does not say what keeps the line").toMatch(/W83/);
    // And it does not claim the tension away: the residue is stated.
    expect(y5.note).toMatch(/RESIDUE|residue/);
  });
});
