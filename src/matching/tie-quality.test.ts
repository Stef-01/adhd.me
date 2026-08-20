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
 *  403/223/63/117 at O123 (six sentences joined the run from facets that already read their
 *  register — the unit found most of the founder-question backlog was never blocked at all.
 *  Separation 55.4%→55.3%, flat: these are DISCLOSURE sentences on facets one or two GPs
 *  declare, so hearing them adds reach without adding separation, which is the honest shape
 *  for this kind of gain rather than a disappointment);
 *  397/220/62/115 at O122 (three unblocked facets: six sentences joined the run and ALL SIX
 *  separate, which is the shape of a sweep on facets the roster genuinely differs on.
 *  Separation 54.5%→55.4%, recovering part of what O119's precision audit correctly gave
 *  up — and worth reading beside it: the two units together took away reach that was not
 *  earned and added reach that is, which is what the number should do);
 *  391/213/63/115 at O120 (the subject check: ONE sentence stops separating, and it is the
 *  right one — an adult asking for their own assessment no longer reaches the paediatric
 *  facet, so the roster no longer splits on a facet that reader never asked for. A
 *  separation bought by ranking somebody against the wrong doctors was never worth
 *  having, and the KPI going down is the correct record of removing it);
 *  391/214/63/114 at O119 (the PRECISION audit: the first unit in this history to move every
 *  number the wrong way on purpose. Four sentences left the run and separation fell
 *  56.9%→54.6% — the largest single drop recorded — because three cues that were
 *  manufacturing reach were removed: "properly" on structured, bare "panic" on anxiety,
 *  bare "overwhelmed" on emotional-regulation. Every point of that fall was reach the
 *  lexicon had not earned. A KPI that could only be improved by adding cues would reward
 *  exactly the behaviour this unit exists to correct);
 *  392/223/61/108 at O116 (four mid-sized facets plus the comparative the stemmer never
 *  bridged: twelve sentences joined the run, nine separating, and the UNSEPARATED count
 *  fell again, 109→108. Separation 56.3%→56.9% — the highest it has been. Two of the
 *  twelve are a sanctioned reclassification rather than a promotion, which is why the
 *  facet floors around them are written out rather than left as net numbers);
 *  380/214/57/109 at O114 (woman-GP's vocabulary and emotional-regulation's want half: six
 *  sentences joined, four of them SEPARATING — the woman-GP ones, because the roster can
 *  actually answer that ask. Those four are the clearest case all day of a synonym list
 *  costing real ordering: the readers were always separable and the lexicon simply could
 *  not hear them. Separation 56.1%→56.3%);
 *  374/210/57/107 at O113 (the three remaining manner facets swept together: TWELVE
 *  sentences joined the run, the largest single move in the corpus's history — eight
 *  separate, one partial, three unseparated, which is roughly the shape of the roster
 *  itself and the first sweep big enough to show it. Separation 55.8%→56.1%);
 *  362/202/56/104 at O112 (attuned's plain wants: four sentences joined the run and all four
 *  land PARTIAL — the first time a sweep has moved that column, and it is the honest
 *  shape for this facet: some listed GPs declare attuned and some do not, so the ask
 *  separates the top band without ordering it outright. Separation rate is flat at
 *  55.8% because a partial tie is neither a win nor a loss, which is exactly what a
 *  three-outcome KPI exists to be able to say);
 *  358/202/52/104 at O109 (bulk-billing's cost register: five sentences joined the run and
 *  ALL FIVE land unseparated, so separation FELL, 57.2%→56.4%. Recorded rather than
 *  smoothed, because the cause is a fact about the roster and not about the reader: NO
 *  GP on this roster declares bulk billing — two say mixed billing, one says billing is
 *  set by the practice — so a cost ask ties everybody at zero by construction. Hearing
 *  it is still the right outcome: the alternative was five readers silently unheard.
 *  A KPI that only moved when the news was good would not be one);
 *  353/202/52/99 at O108 (telehealth's preposition and appointment-noun registers: four
 *  more sentences joined the run — two of the six promoted were already in it on their
 *  other facets — and THE UNSEPARATED COUNT FELL for the first time in the day's sweeps,
 *  100→99. A request that was tied gained the telehealth facet, which this roster
 *  disagrees on, and separated. That is the mechanism by which hearing better can
 *  eventually order better, and it had not been observed until this unit — the other
 *  sweeps only ever added already-separable requests to the run);
 *  349/197/52/100 at O107 (substance-history's two deaf registers: seven sentences joined
 *  the run and ALL SEVEN separate — the roster disagrees about substance history, so
 *  hearing the ask orders the list, which is the second time in a day the KPI has shown
 *  a facet's reach and its usefulness moving together. Separation 55.6%→56.4%);
 *  342/190/52/100 at O105 (the comma-scoped negation: two sentences whose stated want the
 *  reader had been having DELETED rejoin the run, one of them separating. The smallest
 *  movement of the day and the one that fixed the worst defect — the KPI counts heard
 *  requests, and a want that was silently removed had simply never been counted);
 *  341/189/52/100 at O104 (the trauma pace-and-consent register: two more sentences joined
 *  the run and BOTH land unseparated, which is the honest outcome and worth reading as
 *  one — the roster answers trauma-informed uniformly, so hearing the ask is the
 *  reader's whole win here and ordering it is not available at three GPs. A KPI that
 *  only ever moves in the flattering direction would not be measuring anything);
 *  339/189/52/98 at O103 (the loudest-gap sweep: the non-medication facet's SEQUENCE and
 *  ALTERNATIVE registers were cued, promoting eight standing aspirations into the run —
 *  and ALL EIGHT SEPARATE, which is the outcome this KPI exists to notice. Separation
 *  54.7%→55.8%; the unseparated 98 is untouched, because those are requests the whole
 *  roster answers equally and no amount of hearing fixes that — they are the
 *  clarifier's queue, and on a three-GP roster they largely cannot move);
 *  331/181/52/98 at O94 (the run demand: the phone-menu pin left the run, the promoted
 *  room aspiration and the kept-recall phone pin joined);
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
const PINNED = { total: 403, separated: 223, partialTie: 63, unseparated: 117 };

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
