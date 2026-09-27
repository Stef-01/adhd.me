"use client";

import { Plus, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { type HeardChip } from "@/finder/heard";
import { FINDER_COPY } from "../finder-copy";

/** The row's place while the read runs: one line, and a second after six seconds, in the chips' height. */
export function ReadingLine() {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setLate(true), FINDER_COPY.readingLate.afterMs);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <p className="reading-line">
      <span>{FINDER_COPY.reading.text}</span>
      {late && <span>{FINDER_COPY.readingLate.text}</span>}
    </p>
  );
}

/**
 * What the request was read as asking for. A tap takes a facet out of the ranking and the list
 * re-ranks in place; the chip stays where it was, struck through, and a second tap puts it back.
 */
export function HeardRow({
  chips,
  removed,
  onToggle,
}: {
  chips: readonly HeardChip[];
  removed: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="heard-row" role="group" aria-label={FINDER_COPY.heardRow.text}>
      <ul className="heard-chips">
        {chips.map((chip) => {
          const out = removed.has(chip.key);
          return (
            <li key={chip.key}>
              <button
                type="button"
                className="heard-chip"
                data-removed={out ? "true" : undefined}
                aria-label={out ? FINDER_COPY.putBackHeard.text(chip.spoken) : FINDER_COPY.removeHeard.text(chip.spoken)}
                onClick={() => onToggle(chip.key)}
              >
                {chip.label}
                {out ? <Plus size={14} weight="bold" aria-hidden="true" /> : <X size={14} weight="bold" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
