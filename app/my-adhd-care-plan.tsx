"use client";

// The care plan, on the hub (docs/adhd-life/CARE-PLAN-PRD.md §7, §8).
//
// TWO WORDS ON THE HUB. "Care plan", and a row of dots. The hub measured 51 words lived in and 56
// with a step proposed, against a ceiling of 60, and `BUDGET.card` is 8 — so the card was designed
// to that number rather than apologising for it. The PRD drafted "3 of 5 left" (six words); the dot
// row IS the denominator, so "of 5" said what five dots say; and then "3 left" put the
// step-proposed hub on exactly 60, with no headroom for any future word anywhere on that screen.
// So the count is the button's accessible name, losslessly, and the sheet says it in words the
// moment somebody taps. Measured: 53 lived in, 58 with a step proposed.
//
// A DOT, NOT A BAR. A filled dot is a service used, a hollow one is a service left — the radar's
// own `.map-node[data-learning]`, the hollow knot it draws for a thing not yet placed. A service
// not yet spent is the same idea, so the tab has one vocabulary for "not yet" rather than two.
// (Solid outline rather than the radar's dashed one: a dash around a 9px circle is a speckle.) A
// filling bar would say finish me, and this feature must not — §9 refuses the completion mechanic,
// and two of the bars fixed in this tree read as time up.
//
// THE SHEET MARKS THE EXCEPTION, NOT THE RULE. Every row is something to spend the plan on, so
// saying "On a plan" on each of them is three words apiece to state the default. Only the row a
// plan CANNOT pay for is marked, which is fewer words and a louder mark. It is never dropped:
// MAP-CONNECTIONS measured `adhd-coach` as the map's answer for 13 of 17 subdomains with no real
// provider, and a coach is the one kind a plan can never cover, so hiding it would make this
// screen silently disagree with /support.
//
// NOTHING HERE SAYS MONEY, and nothing here says a person is eligible. See `src/model/care-plan.ts`.

import { useRef, useState } from "react";
import { ArrowRight, Minus, Plus } from "@phosphor-icons/react";
import {
  hasPlan,
  lapses,
  PLAN_MAX,
  remaining,
  spent,
  suggestFor,
  type CarePlan,
} from "@/model/care-plan";
import { saveCarePlan, type ModelRecord } from "@/model/store";
import { profession } from "@/support/professions";
import { track } from "@/model/events";
import { Sheet } from "./sheet";

/** The dot row. Decorative: the count is on the card's accessible name and in the sheet's words. */
function Dots({ plan }: { plan: CarePlan }) {
  const dots = spent(plan);
  return (
    <span className="plan-dots" aria-hidden="true">
      {dots.map((used, i) => (
        <i key={i} className="plan-dot" data-used={used ? "true" : undefined} />
      ))}
    </span>
  );
}

/**
 * The hub's card: a name and a row of dots. TWO WORDS with a plan, five without.
 *
 * The count is not written here. The hub measures 56 words in its step-proposed state against a
 * ceiling of 60, so "3 left" would have put that screen on exactly 60 with no headroom for any
 * future word anywhere on it — and for a sighted reader those two words say what three hollow dots
 * among five already say. So the number lives in the button's accessible name, losslessly, and the
 * sheet says it in words the moment somebody taps. The empty state keeps its five words, because
 * there is nothing for dots to say when there is no plan.
 */
export function CarePlanCard({ record, onOpen }: { record: ModelRecord; onOpen: () => void }) {
  const plan = record.carePlan;
  const has = hasPlan(plan);
  const left = remaining(plan);
  return (
    <button
      type="button"
      className="plan-card"
      onClick={onOpen}
      data-empty={has ? undefined : "true"}
      aria-label={has ? `Care plan: ${left} of ${plan.allows} services left` : "Care plan: ask your GP"}
    >
      {/* NOT aria-hidden, even though the button's own aria-label makes these words redundant to a
          screen reader. The text-budget instrument skips any `[aria-hidden='true']` subtree, so
          hiding them would have taken two words a sighted person reads straight out of the gate —
          the first build of this card measured the hub at 51 and 56, exactly as if the card were
          not there. A word on screen is a word in the budget. */}
      <span className="plan-card-name">Care plan</span>
      <span className="plan-card-state">
        {has ? <Dots plan={plan} /> : <span className="plan-left">Ask your GP</span>}
      </span>
    </button>
  );
}

/**
 * The sheet: what is left, who the person's own map says to spend it on, when it resets, and one
 * way onward. Under 40 words with four rows.
 */
export function CarePlanSheet({
  open,
  record,
  onClose,
  onRefresh,
  onShare,
  storage,
  openedBy,
}: {
  open: boolean;
  record: ModelRecord;
  onClose: () => void;
  onRefresh: (next?: ModelRecord) => void;
  /** Hands the person to the GP summary, which is the surface that already exists for this. */
  onShare: () => void;
  storage: Parameters<typeof saveCarePlan>[0];
  openedBy?: React.RefObject<HTMLElement | null>;
}) {
  const plan = record.carePlan;
  const [editing, setEditing] = useState(false);
  const has = hasPlan(plan);
  const left = remaining(plan);
  const rows = has ? suggestFor(record, plan) : [];

  return (
    <Sheet open={open} title="Care plan" onClose={onClose} openedBy={openedBy}>
      <div className="plan-sheet">
        {editing || !has ? (
          <PlanNumbers
            plan={plan}
            onSave={(allows, used) => {
              onRefresh(saveCarePlan(storage, allows, used));
              track("CARE_PLAN_SAVED", {});
              setEditing(false);
            }}
          />
        ) : (
          <>
            <p className="plan-state">
              <Dots plan={plan} />
              <span className="plan-left">{left} left</span>
            </p>

            {rows.length > 0 && (
              <ul className="plan-rows">
                {rows.map((r) => (
                  <li key={r.kind} className="plan-row" data-covered={r.covered ? "true" : undefined}>
                    <span className="plan-row-kind">{profession(r.kind).label}</span>
                    <span className="plan-row-why">{r.because}</span>
                    {/* Only the exception is marked. The rest of the sheet is the rule. */}
                    {!r.covered && <span className="plan-row-mark">Not covered</span>}
                  </li>
                ))}
              </ul>
            )}

            <p className="map-foot is-onward plan-foot">
              <button type="button" className="plan-edit" onClick={() => setEditing(true)}>
                Resets {new Intl.DateTimeFormat("en-AU", { month: "long" }).format(new Date(lapses(plan), 0, 1))}
              </button>
              {/* Not a link to `?share=1`: the hub does not read that, so it would have reloaded
                  the screen and dropped the person back where they started. The share sheet is
                  already on this page — this closes one sheet and opens the other. */}
              <button type="button" className="plan-share" onClick={onShare}>
                Take this to my GP <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </button>
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}

/**
 * The person's own numbers. Two steppers and a save — no free text and no dates, because the only
 * things this app needs are what the plan allows and what has gone.
 */
function PlanNumbers({ plan, onSave }: { plan: CarePlan; onSave: (allows: number, used: number) => void }) {
  const [allows, setAllows] = useState(plan.allows || 5);
  const [used, setUsed] = useState(plan.used);
  const first = useRef<HTMLButtonElement>(null);
  return (
    <div className="plan-numbers">
      <Stepper label="My plan allows" value={allows} onChange={setAllows} firstRef={first} />
      <Stepper label="Used so far" value={used} onChange={setUsed} max={allows} />
      <button type="button" className="learn-primary plan-save" onClick={() => onSave(allows, used)}>
        Save
      </button>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  max = PLAN_MAX,
  firstRef,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  firstRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const set = (n: number) => onChange(Math.max(0, Math.min(n, Math.min(max, PLAN_MAX))));
  return (
    <p className="plan-stepper">
      <span className="plan-stepper-label" id={`plan-${label.replace(/\W+/g, "-").toLowerCase()}`}>
        {label}
      </span>
      <span className="plan-stepper-controls">
        <button ref={firstRef} type="button" onClick={() => set(value - 1)} aria-label={`${label}: one fewer`} disabled={value <= 0}>
          <Minus size={16} weight="bold" aria-hidden="true" />
        </button>
        <output
          role="spinbutton"
          tabIndex={0}
          aria-labelledby={`plan-${label.replace(/\W+/g, "-").toLowerCase()}`}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={Math.min(max, PLAN_MAX)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); set(value + 1); }
            if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); set(value - 1); }
          }}
        >
          {value}
        </output>
        <button type="button" onClick={() => set(value + 1)} aria-label={`${label}: one more`} disabled={value >= Math.min(max, PLAN_MAX)}>
          <Plus size={16} weight="bold" aria-hidden="true" />
        </button>
      </span>
    </p>
  );
}
