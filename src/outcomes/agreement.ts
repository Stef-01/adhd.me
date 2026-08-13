// W172: did the specialist agree with what the pathway said?
//
// A pathway evaluation (W120) is bookkeeping about a record: these criteria were met, these were
// not, these could not be determined. Whether that bookkeeping tracks what a clinician would
// actually conclude is a question only a clinician can answer, and this module is how the answer
// gets collected and reported.
//
// THE SAMPLE CANNOT BE CHOSEN TO FLATTER, AND SEEDING ALONE DOES NOT ACHIEVE THAT. A seeded
// sample is reproducible, which is necessary and not sufficient: if the seed is a free parameter
// at report time, somebody can try a hundred seeds and keep the one with the best agreement rate.
// Reproducibility would then be a property of the flattering sample rather than a defence against
// choosing it.
//
// So the seed is DERIVED, not supplied. It is a hash of the period being reviewed and a
// fingerprint of the population in it. Re-rolling the sample requires changing the period — which
// the report states — or changing the population — which changes the fingerprint the report also
// states. There is no `seed` argument, and a test asserts the export list has no way to pass one.
//
// A DISAGREEMENT IS NOT AN ERROR, and this is the part that matters most.
//
//   It is tempting to treat the pathway as ground truth and a disagreeing specialist as a
//   deviation to be counted. That inverts the entire product: the specialist is the clinical
//   authority and the pathway is a written summary of criteria. A disagreement means the pathway
//   may be too broad, or too narrow, or that the record it read was incomplete, or that the
//   clinician applied judgement no criteria can encode — four different findings with four
//   different fixes, none of which is "the clinician got it wrong".
//
//   So the vocabulary of disagreement has no member meaning error, and a test asserts it. What
//   the report does with a disagreement is show it, in full, next to the agreements.
//
// W170's rule carries over unchanged: a case nobody has reviewed yet is `not_reviewed`, which is
// neither agreement nor disagreement. Folding unreviewed cases into "agreed" would make an
// unstarted audit look like a perfect one.

import { createHash } from "node:crypto";
import { mulberry32 } from "@/synthetic/rng";

export type AgreementAnswer =
  /** The reviewer read the case and the verdict, and concurred. */
  | "agreed"
  /** The reviewer would have concluded otherwise. A finding about the PATHWAY or the record. */
  | "disagreed"
  /** Nobody has answered. Not agreement — see the module note. */
  | "not_reviewed";

/**
 * Why the reviewer would have concluded otherwise.
 *
 * Four bases, four different fixes. Note what is absent: nothing meaning "wrong", "error",
 * "incorrect" or "failure", because the pathway is not the ground truth a clinician deviates
 * from — it is a summary of criteria that a clinician is the authority on.
 */
export type DisagreementBasis =
  /** The pathway read the record faithfully; the record did not hold everything known. */
  | "record_incomplete"
  /** The criteria admit cases the reviewer would not have included. */
  | "criteria_too_broad"
  /** The criteria exclude cases the reviewer would have included. */
  | "criteria_too_narrow"
  /** The reviewer applied clinical judgement no written criterion could express. */
  | "judgement_not_encodable";

export const DISAGREEMENT_BASES: readonly DisagreementBasis[] = [
  "record_incomplete",
  "criteria_too_broad",
  "criteria_too_narrow",
  "judgement_not_encodable",
];

/** One case put in front of a reviewer, and what came back. */
export interface ReviewedCase {
  caseId: string;
  pathwayId: string;
  versionHash: string;
  /** What W120 said. Carried so the report can show what was being agreed or disagreed WITH. */
  verdict: string;
  answer: AgreementAnswer;
  /** Present on `disagreed` only, and required there. */
  basis: DisagreementBasis | null;
  /** The reviewer's own words. Shown verbatim; this module never summarises them. */
  note: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface SamplePeriod {
  fromIso: string;
  toIso: string;
}

export interface Sample {
  period: SamplePeriod;
  /** The population this was drawn from, in the order the caller supplied. */
  populationSize: number;
  /**
   * A fingerprint of the population's identity, stated in the report.
   *
   * Changing which cases were eligible changes this, so a re-roll cannot hide as the same sample.
   */
  populationFingerprint: string;
  /** Derived from period + fingerprint. Stated so anybody can redraw the sample and compare. */
  seed: number;
  caseIds: string[];
}

function fingerprint(caseIds: readonly string[]): string {
  // Sorted, so the fingerprint identifies the SET rather than the order a query happened to
  // return it in — two callers with the same eligible cases must get the same sample.
  return createHash("sha256").update([...caseIds].sort().join("\n"), "utf8").digest("hex").slice(0, 16);
}

function seedFrom(period: SamplePeriod, print: string): number {
  const digest = createHash("sha256")
    .update(`${period.fromIso}|${period.toIso}|${print}`, "utf8")
    .digest();
  return digest.readUInt32BE(0);
}

/**
 * Draw the cases to put in front of a reviewer.
 *
 * There is no `seed` parameter and no way to add one without changing this signature in a diff
 * somebody reads. Sampling without replacement, so a small population is reviewed in full rather
 * than the same case being drawn twice and counted twice.
 */
export function sampleForReview(
  eligibleCaseIds: readonly string[],
  period: SamplePeriod,
  size: number,
): Sample {
  const print = fingerprint(eligibleCaseIds);
  const seed = seedFrom(period, print);
  const rng = mulberry32(seed);

  // Sorted first: the draw must not depend on the order the caller's store returned rows, which
  // is the order-dependence class this tree has now found nine times.
  const pool = [...eligibleCaseIds].sort();
  const drawn: string[] = [];
  const wanted = Math.min(size, pool.length);
  while (drawn.length < wanted) {
    const index = Math.floor(rng() * pool.length);
    const [taken] = pool.splice(index, 1);
    if (taken !== undefined) drawn.push(taken);
  }

  return {
    period,
    populationSize: eligibleCaseIds.length,
    populationFingerprint: print,
    seed,
    caseIds: drawn.sort(),
  };
}

export interface AgreementReport {
  sample: Sample;
  /** Every disagreement, in full. Never truncated — see `renderAgreementReport`. */
  disagreed: ReviewedCase[];
  agreed: ReviewedCase[];
  notReviewed: ReviewedCase[];
  /**
   * Sampled cases with NO review record at all — nobody has opened them.
   *
   * W181: distinct from `notReviewed`, where a reviewer looked and answered "not reviewed".
   * Both are absences, and collapsing them would lose which kind. Held as ids because there is
   * no record to hold.
   */
  noRecord: string[];
  /** Counts, alongside the rate rather than replaced by it. */
  counts: { agreed: number; disagreed: number; notReviewed: number; noRecord: number; total: number };
  basis: string;
}

export function buildAgreementReport(sample: Sample, cases: readonly ReviewedCase[]): AgreementReport {
  const found = new Map(cases.map((c) => [c.caseId, c]));
  const inSample = sample.caseIds
    .map((id) => found.get(id))
    .filter((c): c is ReviewedCase => c !== undefined);

  // W181: SAMPLED CASES WITH NO RECORD ARE COUNTED, NOT DROPPED. They used to be filtered away
  // silently, which shrank the denominator to "cases someone happened to file" — so a sample of
  // ten with two reviews reported on two, and the document said "All 2 sampled case(s) have been
  // reviewed" on the same page as "Sampled 10". That is the survivorship reading this module
  // exists to refuse, arriving through the back door: the reassuring number was computed over
  // exactly the cases that could not contradict it.
  const noRecord = sample.caseIds.filter((id) => !found.has(id));

  const by = (answer: AgreementAnswer) => inSample.filter((c) => c.answer === answer);
  const disagreed = by("disagreed");
  const agreed = by("agreed");
  const notReviewed = by("not_reviewed");

  return {
    sample,
    disagreed,
    agreed,
    notReviewed,
    noRecord,
    counts: {
      agreed: agreed.length,
      disagreed: disagreed.length,
      notReviewed: notReviewed.length,
      noRecord: noRecord.length,
      // The SAMPLE size, not the number of records found. The denominator is what was asked
      // about; anything else lets the total shrink toward whatever happens to have been filed.
      total: sample.caseIds.length,
    },
    basis: basisFor(sample.caseIds.length, notReviewed.length, noRecord.length),
  };
}

/**
 * The sentence stating what the numbers rest on.
 *
 * The two absences are named separately because they ask different people for different things:
 * an unopened case needs a reviewer assigned, a reviewed-but-unanswerable one is a finding about
 * the case. Saying "not reviewed" for both would send the reader after the wrong one.
 */
function basisFor(total: number, notReviewed: number, noRecord: number): string {
  if (notReviewed === 0 && noRecord === 0) {
    return `All ${total} sampled case(s) have been reviewed.`;
  }
  const parts: string[] = [];
  if (noRecord > 0) parts.push(`${noRecord} have no review recorded against them at all`);
  if (notReviewed > 0) parts.push(`${notReviewed} were opened and could not be answered`);
  return (
    `Of ${total} sampled case(s), ${parts.join(" and ")}. They are counted separately: an ` +
    "unreviewed case is not an agreement, and an audit that has not happened should not read " +
    "as one that went well."
  );
}

const BASIS_COPY: Record<DisagreementBasis, string> = {
  record_incomplete:
    "The pathway read the record faithfully, and the record did not hold everything that was known about this patient.",
  criteria_too_broad: "The written criteria admit cases the reviewer would not have included.",
  criteria_too_narrow: "The written criteria exclude cases the reviewer would have included.",
  judgement_not_encodable:
    "The reviewer applied clinical judgement that no written criterion could express. This is expected and is not a defect in either direction.",
};

/**
 * The report as one document.
 *
 * DISAGREEMENTS ARE RENDERED FIRST AND IN FULL, with the same per-case detail as agreements and
 * no cap. A report that led with an agreement rate and listed the disagreements underneath would
 * be technically complete and read as reassurance; the ordering is the prominence.
 */
export function renderAgreementReport(report: AgreementReport): string {
  const caseLines = (cases: readonly ReviewedCase[]) =>
    cases.flatMap((c) => [
      `- **${c.caseId}** — ${c.pathwayId} @ ${c.versionHash.slice(0, 12)}`,
      `  - Pathway said: ${c.verdict}`,
      ...(c.basis ? [`  - Basis: ${BASIS_COPY[c.basis]}`] : []),
      ...(c.note ? [`  - Reviewer: ${c.note}`] : []),
      `  - Reviewed by ${c.reviewedBy ?? "nobody yet"}${c.reviewedAt ? ` on ${c.reviewedAt}` : ""}`,
    ]);

  return [
    `# Specialist agreement — ${report.sample.period.fromIso} to ${report.sample.period.toIso}`,
    ``,
    `Sampled ${report.sample.caseIds.length} of ${report.sample.populationSize} eligible case(s).`,
    `Population fingerprint \`${report.sample.populationFingerprint}\`, seed ${report.sample.seed}.`,
    `The seed is derived from the period and the population, not chosen — redraw it and compare.`,
    ``,
    `## Where the reviewer would have concluded otherwise (${report.counts.disagreed})`,
    ``,
    ...(report.counts.disagreed === 0
      ? ["None in this sample."]
      : [
          `A disagreement is not an error. It says the criteria, or the record they read, did not`,
          `capture what a clinician would conclude — which is a finding about the pathway.`,
          ``,
          ...caseLines(report.disagreed),
        ]),
    ``,
    `## Where the reviewer concurred (${report.counts.agreed})`,
    ``,
    ...(report.counts.agreed === 0 ? ["None in this sample."] : caseLines(report.agreed)),
    ``,
    `## Not yet reviewed (${report.counts.notReviewed})`,
    ``,
    report.basis,
    ``,
  ].join("\n");
}

export const AGREEMENT_ANSWER_COPY: Record<AgreementAnswer, string> = {
  agreed: "The reviewer read the case and the verdict and concurred.",
  disagreed:
    "The reviewer would have concluded otherwise. That is a finding about the written criteria or about the record they read — not a mistake by the clinician and not a mistake by the reviewer.",
  not_reviewed:
    "Nobody has answered yet. This is not agreement, and counting it as one would make an audit that has not happened look like one that went well.",
};
