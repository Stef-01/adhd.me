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
 *  History: 151/97/12/42 at O62 (baseline); 196/122/15/59 at O64 (tranche three fed the thin
 *  facets, rate 64%→62% — the metric finding work, not the ranking worsening); 200/126/15/59
 *  at O65 (the longer-appointment cues promoted four aspiring sentences into the run, and
 *  every one of them separates — an ask one GP's unhurried declaration answers); 229/145/18/66
 *  at O68 (tranche four's 29 new reaching requests split 19 separated / 3 partial / 7
 *  unseparated — compounds separate more often than single asks, because two asks rarely
 *  land on the same declaration set); 228/145/18/65 at O72 (the bare-not rule retagged the
 *  known false positive out of the reaching register — one unseparated request was never
 *  really a request for what it scored on); 274/170/23/81 at O75 (tranche five's 46 new
 *  reaching requests split 25 separated / 5 partial / 16 unseparated — the question-form
 *  and on-behalf registers behave like the single asks they wrap, and the full-roster-tie
 *  share holds near 30%, which remains the clarifier's standing work queue); 275/171/23/81
 *  at O76 (the hedge rule retagged O75's filler pin out of the run and added two boundary
 *  pins, one of which — the woman-doctor ask with a trailing hedge — separates); 276/173/22/81
 *  at O77 (the on-behalf rule: the retagged booking sentence stays in the run on its honest
 *  structured reach and now separates where the false culturally_attuned reach had it
 *  partially tied, and the new presence pin separates — a precision fix moving the KPI is
 *  the KPI working); 327/204/28/95 at O87 (tranche six took the corpus to the ~500 target:
 *  41 new reaching requests split 24 separated / 6 partial / 11 unseparated, holding the
 *  separation rate at ~62%); 286/180/22/84 at O84 (the support-person pins joined the run, both
 *  separating); 284/178/22/84 at O83 (reported refusal: the promoted aspiration and
 *  the rule's two earned reaching pins joined the run, all three separating — titration
 *  and telehealth asks that one declaration answers); earlier 279/175/22/82 at O78 (the audit's per-occurrence suppression fix: the
 *  standing 405 entries were BEHAVIOUR-IDENTICAL under it — zero pin movement — and the
 *  three new clause-two-ask pins joined the run, two separating); 281/175/22/84 at O81
 *  (consume-once negation promoted the audit's two waiting aspirations into the run; both
 *  land unseparated — the recovered asks are facets the whole roster answers, so hearing
 *  them was the reader's win and ordering them is now the clarifier's queue, correctly);
 *  330/181/51/98 at O92 (the deprivation determiner: the shortage sentence left the run
 *  and the two declining pins joined, one separating);
 *  329/180/51/98 at O91 (the bare-without rule: the retagged independence ask left the
 *  run, and its four boundary pins joined — the double-negative wants separate, the
 *  assessment-without-reliving ask lands unseparated on a facet everybody declares);
 *  327/179/52/96 at O88 (Dr Anusha's supplied bio declared Hindi, Urdu and her first two
 *  manner facets: Urdu asks that separated one Saxena now band both above Dr Yadav (partial
 *  ties, honestly said), Hindi asks that separated two-of-three now tie the whole roster,
 *  and culturally_attuned asks tie the two declarers. The rate fell 62%→55% because a REAL
 *  declaration made more requests genuinely answerable by more of the roster — the KPI
 *  measuring the roster converging, not the ranking worsening; the clarifier's queue grew by
 *  exactly the asks her declarations joined). */
const PINNED = { total: 330, separated: 181, partialTie: 51, unseparated: 98 };

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
