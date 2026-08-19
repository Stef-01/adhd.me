// W234 (O62) verify gate: the tie-quality KPI, pinned in both directions.
//
// THE NUMBERS BELOW ARE MEASURED, NOT ASPIRED. 2026-08-19, roster of three real GPs, over
// the W231 corpus's 151 reaching sentences: 97 separated, 12 partial ties, 42 with the whole
// roster tied at the top. That 42 is the clarifier's work queue — requests the reader heard
// but the roster's declarations could not order. The pin is REACH_FLOORS-shaped: a fall in
// `separated` (or a rise in `unseparated`) fails loudly, and an IMPROVEMENT also fails until
// the pin is moved — a KPI that can drift upward silently is one nobody notices regressing
// a week later, because the baseline nobody re-read has quietly become fiction.
import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { corpusRun, tieOutcome, tieQualityReport } from "./tie-quality";

/** Move these ONLY with a measured run in the commit that moves them.
 *  Moved by O64 (corpus tranche three grew the run 151→196): the new sentences split 25
 *  separated / 3 partial / 17 unseparated, landing the rate at 62% — the corpus deliberately
 *  fed the THIN facets, which are exactly the asks a three-GP roster often cannot separate
 *  on, so the KPI dipping from 64% is the metric working, not the ranking worsening. */
const PINNED = { total: 196, separated: 122, partialTie: 15, unseparated: 59 };

describe("W234 the tie-quality KPI over the corpus run", () => {
  const report = tieQualityReport();

  it("holds the measured baseline exactly, in both directions", () => {
    expect(report).toEqual({
      ...PINNED,
      separationRate: Math.round((PINNED.separated / PINNED.total) * 1000) / 1000,
    });
  });

  it("partitions the run: every measured sentence lands in exactly one outcome", () => {
    expect(report.separated + report.partialTie + report.unseparated).toBe(report.total);
    expect(report.total).toBe(corpusRun().length);
    // Non-vacuous: the run is the corpus's reaching register, which the reach ratchet keeps
    // growing — an empty run here would mean the wiring broke, not that ties vanished.
    expect(report.total).toBeGreaterThan(100);
  });

  it("classifies the boundary cases the definition promises", () => {
    // A request naming something exactly one GP declares separates; an unreadable request
    // leaves the whole roster tied at score zero — the honest unordered list, counted as
    // unseparated here only when the reader HEARD the request (corpusRun excludes unheard).
    expect(tieOutcome("my dose wears off and needs titration reviewed")).toBe("separated");
    expect(tieOutcome("zzz qqq")).toBe("unseparated");
    expect(clinicians.length).toBe(3);
  });

  it("survives roster growth without redefinition: outcomes are relative to roster size", () => {
    // On a bigger roster a full tie is still "unseparated" and anything between 1 and all is
    // a partial tie — the plan's size->3 concern re-emerges naturally instead of via a magic
    // number that would need editing the day the roster grows.
    const doubled = [
      ...clinicians,
      ...clinicians.map((c) => ({ ...c, id: `${c.id}-b`, founderInterest: undefined })),
    ];
    expect(tieOutcome("zzz qqq", doubled)).toBe("unseparated");
    expect(["separated", "partialTie"]).toContain(
      tieOutcome("my dose wears off and needs titration reviewed", doubled),
    );
  });
});
