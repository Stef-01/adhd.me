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
// stated ONCE beneath the table instead of per cell, because "not something they declare"
// eight times is a drumbeat, and the reader needs the fact once.

import { ArrowLeft, CheckCircle, Minus } from "@phosphor-icons/react";
import { type Clinician } from "@/demo/clinicians";
import { ClinicianPortrait, MotionScreen, Wordmark } from "./shared";

/** One ask, and whether each of the two GPs answers it. */
export type CompareRow = { label: string; left: boolean; right: boolean };

/**
 * The three things a comparison can tell somebody, in the order they are useful.
 *
 * Differences first: they are the only rows that can decide anything. Then what both answer,
 * which is why the two were shown together. Then what neither does — the listing gap the
 * finder already says out loud on the results screen, said here about these two.
 */
const GROUPS: ReadonlyArray<{
  key: "differ" | "both" | "neither";
  heading: string;
  note: string | null;
  holds: (row: CompareRow) => boolean;
}> = [
  {
    key: "differ",
    heading: "Where they differ",
    note: null,
    holds: (row) => row.left !== row.right,
  },
  {
    key: "both",
    heading: "Both",
    note: null,
    holds: (row) => row.left && row.right,
  },
  {
    key: "neither",
    heading: "Neither",
    note: "That is a gap in our listing, not in what you asked for.",
    holds: (row) => !row.left && !row.right,
  },
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
  onBack,
  onOpenRight,
}: {
  left: Clinician;
  right: Clinician;
  rows: readonly CompareRow[];
  onBack: () => void;
  onOpenRight: () => void;
}) {
  return (
    <MotionScreen key="compare" className="compare-screen">
      <header className="minimal-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to results">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" />
      </header>

      <div className="compare-content">
        <p className="eyebrow">Side by side</p>
        <h1>What each of them answers</h1>

        {/* The heads sit in the SAME grid as every row below, so each name is directly above
            the column of verdicts it owns. They were a separate two-column strip first, which
            put one name over the ask column and left the reader joining a fact across two
            regions — the thing the layout law names outright. */}
        <div className="compare-heads">
          <p className="compare-heads-label">What you asked for</p>
          <div className="compare-head">
            <span className="compare-portrait">
              <ClinicianPortrait clinician={left} variant="thumb" />
            </span>
            <strong>{left.shortName}</strong>
            {/* O217: a column belonging to an invented profile says so in its own head. */}
            {left.synthetic && <small className="compare-example">Example profile</small>}
          </div>
          <div className="compare-head">
            <span className="compare-portrait">
              <ClinicianPortrait clinician={right} variant="thumb" />
            </span>
            {/* The other GP's name is a way to their profile, not just a column label: somebody
                who reads this table and prefers the right-hand column should not have to go
                back two screens to act on it. */}
            <button type="button" className="compare-open" onClick={onOpenRight}>
              {right.shortName}
            </button>
            {right.synthetic && <small className="compare-example">Example profile</small>}
          </div>
        </div>

        {GROUPS.map((group) => {
          const inGroup = rows.filter(group.holds);
          if (inGroup.length === 0) return null;
          return (
            <section className="compare-group" key={group.key}>
              <h2>{group.heading}</h2>
              <ul>
                {inGroup.map((row) => (
                  <li key={row.label}>
                    <span className="compare-ask">{row.label}</span>
                    <Cell answered={row.left} who={left.shortName} ask={row.label} />
                    <Cell answered={row.right} who={right.shortName} ask={row.label} />
                  </li>
                ))}
              </ul>
              {group.note && <p className="compare-note">{group.note}</p>}
            </section>
          );
        })}

        {/* W193's posture, once, for the whole table. */}
        <p className="compare-basis">
          Both columns are what each GP declares about their own practice, not a check ADHD.ME
          performed. This is not a ranking of one against the other.
        </p>
      </div>
    </MotionScreen>
  );
}
