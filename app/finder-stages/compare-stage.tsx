"use client";

// O102 (explaining the fit, Q3): two clinicians' evidence, side by side.
//
// The results screen's founding note says a person choosing a GP is COMPARING — and then
// every screen after it showed exactly one clinician. This is that screen.
//
// WHAT IT MAY AND MAY NOT SAY. The rows are the asks the reader actually made, and the cells
// are whether each GP's declarations answer them — read from `matchEvidence`, the same
// evidence the ranking scored, so this table cannot disagree with the order it explains.
// There is no score, no total and no winner: the list already has an order, and a compare
// screen that re-asserted it would be arguing rather than explaining. W193's posture is
// stated ONCE beneath the table, in one short line.

import { ArrowLeft, CheckCircle, Minus } from "@phosphor-icons/react";
import { type Clinician } from "@/demo/clinicians";
import { compareAnnouncement } from "@/finder/announce";
import { ClinicianPortrait, MotionScreen, StatusLine, Wordmark } from "./shared";

/** One ask, and whether each of the two GPs answers it. */
export type CompareRow = { label: string; left: boolean; right: boolean };

/**
 * The rows in the order they are useful: differences first, the only rows that can decide
 * anything; then what both answer, which is why the two were shown together; then what neither
 * does. One table and no group labels: each row's two verdicts say which kind it is.
 */
const ORDER: ReadonlyArray<(row: CompareRow) => boolean> = [
  (row) => row.left !== row.right,
  (row) => row.left && row.right,
  (row) => !row.left && !row.right,
];

function Cell({ answered, who, ask }: { answered: boolean; who: string; ask: string }) {
  return (
    <span className={answered ? "compare-cell is-listed" : "compare-cell"}>
      {/* The mark is decorative: the state is in the words beside it, so a screen reader and
          a person who cannot separate the two colours get the same sentence. */}
      {answered
        ? <CheckCircle size={15} weight="fill" aria-hidden="true" />
        : <Minus size={15} weight="regular" aria-hidden="true" />}
      <span className="sr-only">{`${who}: ${answered ? "declares" : "does not declare"} ${ask.toLowerCase()}`}</span>
      <span aria-hidden="true">{answered ? "Declared" : "Not declared"}</span>
    </span>
  );
}

export function CompareStage({
  left,
  right,
  rows,
  focusOnArrival,
  onBack,
  onOpenRight,
}: {
  left: Clinician;
  right: Clinician;
  rows: readonly CompareRow[];
  focusOnArrival: boolean;
  onBack: () => void;
  onOpenRight: () => void;
}) {
  return (
    <MotionScreen key="compare" className="compare-screen" focusOnArrival={focusOnArrival}>
      <StatusLine line={compareAnnouncement(left.name, right.name)} />
      <header className="minimal-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to results">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" />
      </header>

      <div className="compare-content">
        {/* O232: "Side by side" named the two-column layout the reader is already looking at. */}
        <h1 tabIndex={-1}>What each of them answers</h1>

        {/* The heads sit in the SAME grid as every row below, so each name is directly above
            the column of verdicts it owns. They were a separate two-column strip first, which
            put one name over the ask column and left the reader joining a fact across two
            regions, the thing the layout law names outright. */}
        <div className="compare-heads">
          <span aria-hidden="true" />
          <div className="compare-head">
            <span className="compare-portrait">
              <ClinicianPortrait clinician={left} variant="thumb" />
            </span>
            <strong>{left.shortName}</strong>
          </div>
          <div className="compare-head">
            <span className="compare-portrait">
              <ClinicianPortrait clinician={right} variant="thumb" />
            </span>
            {/* The other GP's name is a way to their profile, not just a column label: somebody
                who reads this table and prefers the right-hand column should not have to go
                back two screens to act on it. */}
            <button
              type="button"
              className="compare-open"
              // The visible name is the whole control, which leaves a screen reader hearing a
              // person's name and a role and no idea what pressing it does. The label says.
              aria-label={`Open ${right.shortName}'s profile`}
              onClick={onOpenRight}
            >
              {right.shortName}
            </button>
          </div>
        </div>

        {/* The heads above are a table head only while a table follows them. When these two
            answered every ask the same way there is nothing to decide between, and saying so
            is more use than a reader scanning three groups to work it out themselves. */}
        {rows.length > 0 && !rows.some((row) => row.left !== row.right) && (
          <p className="compare-same">
            These two answer everything you asked for the same way.
          </p>
        )}

        {rows.length > 0 && (
          <ul className="compare-rows">
            {ORDER.flatMap((holds) => rows.filter(holds)).map((row) => (
              <li key={row.label}>
                <span className="compare-ask">{row.label}</span>
                <Cell answered={row.left} who={left.shortName} ask={row.label} />
                <Cell answered={row.right} who={right.shortName} ask={row.label} />
              </li>
            ))}
          </ul>
        )}

        {/* W193's posture, once, for the whole table. */}
        <p className="compare-basis">What each declares, not a ranking.</p>
      </div>
    </MotionScreen>
  );
}
