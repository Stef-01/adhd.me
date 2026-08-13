// W197: what happens to a cell that is too small to disclose.
//
// W196 declared the floors and refused to let a caller pass one in. This applies them, and the
// unit is two decisions rather than one arithmetic operation.
//
// SUPPRESSED, NOT ROUNDED. Rounding is the intuitive move and every version of it is wrong here.
// Rounding 3 up to 5 publishes a false figure, which a commissioner may act on. Rounding down to
// 0 publishes a different false figure and one that reads as "this practice does nothing".
// Rounding to a band — "<5" — is honest but is still a NUMBER in a column, and a reader adds
// columns. The only safe operation on a cell below the floor is that no value leaves at all.
//
// AND THE SUPPRESSION IS STATED, NOT LEFT AS A GAP. W145's rule: named, not omitted. A blank cell
// and a suppressed cell look identical and mean opposite things — one says the practice was not
// measured, the other says it was measured and the answer is being withheld to protect the people
// in it. A reader who cannot tell them apart will assume the first, because it is the reading
// that needs no explanation.
//
// THE FINDING THIS UNIT IS REALLY FOR: TWO FIGURES THAT EACH CLEAR THE FLOOR CAN DISCLOSE A CELL
// THAT DOES NOT.
//
// `referrals_with_recorded_completion` counts a SUBSET of `referrals_written`. Publish 40 and 38
// and both clear a floor of 5 comfortably — and the reader now knows that exactly two referrals
// have no recorded completion. A per-figure check cannot see this, because neither figure is
// small. The small cell is the difference, and it never appears in the report at all.
//
// W196 anticipated the shape of it in its own floor rationale — two related kinds must share a
// floor "or the pair can be differenced to recover a suppressed cell" — and this is that
// argument reaching its conclusion: a shared floor is necessary and not sufficient.
//
// So nesting is declared as data, and when a difference falls below the floor the SUBSET figure
// is withheld. The subset rather than the whole, because publishing the whole while withholding
// the part tells a reader only that the part is somewhere between 0 and the whole, whereas doing
// it the other way round bounds the whole from below by the part and hides less.
//
// A FIRST DRAFT OF THIS MODULE HAD A DIFFERENT SECOND RULE, AND IT WAS UNREACHABLE. It suppressed
// any figure whose BASIS fell below the floor, reasoning that "0, computed over 2 records" names
// a group of two. The reasoning is right and the rule can never fire: W196 refuses a value
// exceeding its basis, so a basis below the floor forces the value below it too, and the first
// rule has already withheld the whole figure — basis included. The concern was real and was
// already closed; the rule was decoration. It is recorded here because a rule that cannot fire
// looks exactly like a rule that works.
//
// WHAT IS NOT CLAIMED, STATED RATHER THAN LEFT TO BE ASSUMED. This handles the channels visible
// inside one report: the value, and the basis it was computed over. It does NOT defend against
// differencing across SEVERAL reports — a commissioner holding this quarter's and last quarter's
// can subtract, and no per-report rule can see that. That is a real residual risk, it belongs to
// whoever decides the publication cadence, and W203's recipient allowlist is where it would be
// addressed. Pretending this module closed it would be worse than naming it.

import { type Figure, type FigureKind } from "./model";

export type SuppressionReason =
  /** The figure itself describes fewer people than the floor allows. */
  | "value_below_floor"
  /**
   * This figure counts a subset of another, and the DIFFERENCE between them is below the floor.
   * Both numbers are large; the group they bracket is not. The leak is never in the number you
   * were looking at.
   */
  | "complement_below_floor";

export interface Suppression {
  kind: FigureKind;
  floor: number;
  reason: SuppressionReason;
  /** What the reader is told. Never a value, never a band, never a blank. */
  statement: string;
}

declare const W197_SUPPRESSED: unique symbol;

/**
 * A figure that has been through suppression and may be published.
 *
 * Branded with a symbol this module never exports, so a report cannot be built from raw figures.
 * Same device as W114's scope statement and W119's usable pathway, for the same reason: the check
 * cannot be skipped if the result of the check is the only thing downstream accepts.
 */
export interface PublishableFigure {
  readonly [W197_SUPPRESSED]: true;
  readonly kind: FigureKind;
  readonly value: number;
  readonly recordedFacts: number;
  readonly source: string;
  readonly fromIso: string;
  readonly toIso: string;
}

export interface SuppressedReport {
  published: readonly PublishableFigure[];
  /** Every withheld figure, named. The list is the point — an empty gap is the defect. */
  suppressed: readonly Suppression[];
  /** The report-level sentence, present whether or not anything was suppressed. */
  statement: string;
}

const REASON_COPY: Record<SuppressionReason, (kind: FigureKind, floor: number) => string> = {
  value_below_floor: (kind, floor) =>
    `${LABELS[kind]}: withheld. This figure describes fewer than ${floor} people, and publishing it could identify them. It was measured; it is not missing.`,
  // W205: DELIBERATELY UNQUANTIFIED, and this is a correction to W197's own copy.
  //
  // The first version said "the difference between them is fewer than N people". Beside the
  // PUBLISHED whole that sentence is a band: a reader holding 40 and the words "the difference
  // is under 5" knows the withheld subset lies in [36,40] and the hidden group in [0,4]. That is
  // precisely the `band` treatment `REFUSED_SUPPRESSION_TREATMENTS` refuses two screens further
  // down — the module contradicted itself, and the explanation was the leak.
  //
  // Without the quantity, a reader knows only that the subset is somewhere in [0, whole], which
  // is what "subset" already meant. The cost is that this statement cannot calibrate the way the
  // value_below_floor one does, and that is the right trade: there the floor is the reader's only
  // calibration and reveals nothing they could not infer; here it is the entire disclosure.
  complement_below_floor: (kind) =>
    `${LABELS[kind]}: withheld. It counts part of a larger figure in this report, and publishing both would identify a small group even though neither number is small on its own. It was measured; it is not missing. How much smaller it is, is the thing being protected, so this report does not say.`,
};

/**
 * Which figures count a subset of which others.
 *
 * Declared as data because the nesting is a fact about what the kinds MEAN, not something a
 * reader of the suppression code should have to infer from their names. A new kind that nests
 * inside an existing one has to be added here, and its absence is the failure mode: an
 * undeclared nesting is a differencing channel nobody is checking.
 */
export const NESTED_KINDS: readonly { whole: FigureKind; part: FigureKind }[] = [
  { whole: "referrals_written", part: "referrals_with_recorded_completion" },
  // W205: added. W196 defines a care gap as "a condition plus an overdue interval", so everybody
  // with a gap is on the register for that condition — the containment follows from the
  // definition rather than from a coincidence of the data. It was missing, and an undeclared
  // nesting is a differencing channel nobody is checking that looks exactly like no channel.
  // Neither figure is computed anywhere yet, which is why it went unnoticed and why declaring it
  // now costs nothing: the register is meant to be ahead of the callers.
  { whole: "register_membership", part: "care_gaps_detected" },
];

const LABELS: Record<FigureKind, string> = {
  referrals_written: "Referrals written",
  referrals_with_recorded_completion: "Referrals with a recorded completion",
  register_membership: "Register membership",
  care_gaps_detected: "Care gaps detected",
};

/**
 * Apply the floors.
 *
 * Takes validated `Figure`s — W196 already refused the ones with no basis, no period or a value
 * exceeding their records — and decides, per figure, whether anything may leave.
 *
 * There is no threshold argument and no options object that could grow one. The floor travels on
 * the figure, copied there from the register at construction, so this function cannot be asked to
 * apply a different one.
 */
export function suppressReport(figures: readonly Figure[]): SuppressedReport {
  const published: PublishableFigure[] = [];
  const suppressed: Suppression[] = [];

  const byKind = new Map(figures.map((f) => [f.kind, f]));

  for (const figure of figures) {
    const reason = reasonFor(figure, byKind);
    if (reason) {
      suppressed.push({
        kind: figure.kind,
        floor: figure.floor,
        reason,
        statement: REASON_COPY[reason](figure.kind, figure.floor),
      });
      continue;
    }
    published.push({
      kind: figure.kind,
      value: figure.value,
      recordedFacts: figure.basis.recordedFacts,
      source: figure.basis.source,
      fromIso: figure.basis.fromIso,
      toIso: figure.basis.toIso,
    } as unknown as PublishableFigure);
  }

  // Sorted so two runs over the same figures produce the same document. The order-dependence
  // class this tree keeps finding does not get to arrive in a disclosure.
  suppressed.sort((a, b) => a.kind.localeCompare(b.kind));
  published.sort((a, b) => a.kind.localeCompare(b.kind));

  return { published, suppressed, statement: statementFor(suppressed) };
}

/**
 * Why this figure cannot be published, or null.
 *
 * Its own size first, then what it discloses in combination. The second check is the one that
 * matters: a figure can be large, its floor comfortably cleared, and still be the half of a pair
 * that brackets two people.
 */
function reasonFor(figure: Figure, byKind: Map<FigureKind, Figure>): SuppressionReason | null {
  if (figure.value < figure.floor) return "value_below_floor";

  for (const { whole, part } of NESTED_KINDS) {
    if (figure.kind !== part) continue;
    const outer = byKind.get(whole);
    // Only a published whole creates the channel. If the whole is itself withheld there is
    // nothing to difference against, and withholding the part as well would hide a lawful figure.
    if (!outer || outer.value < outer.floor) continue;
    if (outer.value - figure.value < figure.floor) return "complement_below_floor";
  }
  return null;
}

/**
 * The report-level sentence.
 *
 * Present on every report, including one with nothing suppressed — the absence of the sentence
 * would itself be information, and a reader who only ever sees it on some reports learns to read
 * its presence as "something was hidden here". W120's rule about silence, applied to a caveat.
 */
function statementFor(suppressed: readonly Suppression[]): string {
  if (suppressed.length === 0) {
    return "No figure in this report was withheld. Every figure it could produce for this period is present.";
  }
  return (
    `${suppressed.length} figure(s) in this report were withheld because they describe groups too ` +
    "small to publish without identifying people. Each is named below with the reason. A withheld " +
    "figure was measured — it is not missing data, and it is not a zero."
  );
}

/**
 * Values that may never appear in a published report, whatever the arithmetic.
 *
 * Data rather than prose so the test that scans a rendered report reads the same list a human
 * does. Every one of these is a way of publishing a small cell while appearing not to.
 */
export const REFUSED_SUPPRESSION_TREATMENTS: Readonly<Record<string, string>> = {
  round_up: "Rounding 3 up to 5 publishes a false figure a commissioner may act on. The cell is not protected by being wrong in a helpful direction.",
  round_down_to_zero: "Rounding down publishes a different false figure, and one that reads as 'this practice does nothing' — the most damaging available misreading.",
  band: "'<5' is honest and is still a number in a column. Readers add columns, and a band subtracts as cleanly as a value.",
  blank_cell: "A blank is indistinguishable from 'not measured', which is the reading a reader will pick because it needs no explanation. W145: named, not omitted.",
  asterisk_only: "A symbol with no sentence is a blank cell that looks deliberate. The reader still has to guess what it means.",
};

/** The document. Structured first, rendered from it — W20's pattern. */
export function renderSuppressedReport(report: SuppressedReport): string[] {
  return [
    report.statement,
    ...report.published.map(
      (figure) =>
        `${LABELS[figure.kind]}: ${figure.value}, counted over ${figure.recordedFacts} recorded fact(s) from ${figure.source} for ${figure.fromIso} to ${figure.toIso}.`,
    ),
    ...report.suppressed.map((entry) => entry.statement),
  ];
}
