"use client";

// The care plan, on the hub (docs/adhd-life/CARE-PLAN-PRD.md §7, §8, §14).
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
// THE SHEET IS A LIST OF FIVE THINGS, each a row that opens onto one question. A GP writing a plan
// needs the same five facts every time — how long, what for, who is already involved, who to
// refer to, and what the plan allows once written — and the person needs to have thought about the
// first four before the visit rather than in it. So the sheet asks each one as a tap: a yes or a
// not yet, a few chips, a row to keep or drop. A row answered gets a filled tick and its answer
// beside the name; a row not yet answered gets a hollow one and nothing. No instruction, no
// progress bar, no "3 of 5 done": the ticks are the state and the list is the order.
//
// THE TEAM STEP MARKS THE EXCEPTION, NOT THE RULE. Every row is something to spend the plan on, so
// saying "On a plan" on each of them is three words apiece to state the default. Only the row a
// plan CANNOT pay for is marked, which is fewer words and a louder mark. It is never dropped:
// MAP-CONNECTIONS measured `adhd-coach` as the map's answer for 13 of 17 subdomains with no real
// provider, and a coach is the one kind a plan can never cover, so hiding it would make this
// screen silently disagree with /support. It cannot be kept, because a plan cannot pay for it.
//
// NOTHING HERE SAYS MONEY, and nothing here says a person is eligible. See `src/model/care-plan.ts`.

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Minus, Plus } from "@phosphor-icons/react";
import {
  CLAIMABLE,
  done,
  GOALS_MAX,
  hasPlan,
  lapses,
  PLAN_MAX,
  remaining,
  spent,
  STEP_LABELS,
  STEPS,
  teamFor,
  type CarePlan,
  type Step,
} from "@/model/care-plan";
import { ASPECT_LABELS, ASPECTS, type Aspect } from "@/model/matrix";
import { saveCarePlan, savePlanDetails, type ModelRecord, type PlanDetails } from "@/model/store";
import { profession, PROFESSIONS, type Profession } from "@/support/professions";
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

type View = "list" | Step;

const labels = (kinds: readonly Profession[]) => kinds.map((k) => profession(k).label).join(", ");

/** What a row says beside its name once answered: the answer, in the words the app already uses. */
function stateOf(plan: CarePlan, step: Step): React.ReactNode {
  if (!done(plan, step)) return step === "services" ? "Not yet" : null;
  switch (step) {
    case "services":
      return (
        <>
          <Dots plan={plan} />
          <span className="plan-left">{remaining(plan)} left</span>
        </>
      );
    case "duration":
      return plan.sixMonths ? "Yes" : "Not yet";
    case "goals":
      return plan.goals!.length ? plan.goals!.map((a) => ASPECT_LABELS[a]).join(", ") : "None";
    case "providers":
      return plan.providers!.length ? labels(plan.providers!) : "None";
    case "team":
      return plan.team!.length ? labels(plan.team!) : "None";
  }
}

/**
 * The sheet: five rows, each one thing a GP will ask, and one way onward. The list is under 25
 * words answered; each step stays under the screen ceiling on its own, because the shell behind
 * an open sheet is inert and the instrument measures the sheet alone.
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
  const [view, setView] = useState<View>("list");
  const body = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // A step replaces the row that opened it, which unmounts the focused control. The first control
  // of the new view takes focus so a keyboard or screen-reader user is not dropped on the body
  // outside the trap. Not on first mount: the sheet itself handles that.
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    body.current?.querySelector<HTMLElement>("button, input, [tabindex]")?.focus({ preventScroll: true });
  }, [view]);

  const close = () => { setView("list"); onClose(); };
  const save = (step: Step, patch: Partial<PlanDetails>) => {
    onRefresh(savePlanDetails(storage, patch));
    track("CARE_PLAN_SAVED", { step });
    setView("list");
  };

  return (
    <Sheet open={open} title={view === "list" ? "Care plan" : STEP_LABELS[view]} onClose={close} openedBy={openedBy}>
      <div ref={body} className="plan-sheet" data-view={view}>
        {view === "list" && (
          <>
            <ul className="plan-steps">
              {STEPS.map((step) => {
                const answered = done(plan, step);
                return (
                  <li key={step}>
                    <button type="button" className="plan-step" data-step={step} data-done={answered ? "true" : undefined} onClick={() => setView(step)}>
                      <i className="plan-tick" aria-hidden="true" />
                      <span className="plan-step-name">{STEP_LABELS[step]}</span>
                      <span className={step === "services" && answered ? "plan-step-state plan-state" : "plan-step-state"}>{stateOf(plan, step)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="map-foot is-onward plan-foot">
              {/* Not a link to `?share=1`: the hub does not read that, so it would have reloaded
                  the screen and dropped the person back where they started. The share sheet is
                  already on this page — this closes one sheet and opens the other. */}
              <button type="button" className="plan-share" onClick={onShare}>
                Take this to my GP <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </button>
            </p>
          </>
        )}

        {view === "services" && (
          <PlanNumbers
            plan={plan}
            onSave={(allows, used) => {
              onRefresh(saveCarePlan(storage, allows, used));
              track("CARE_PLAN_SAVED", { step: "services" });
              setView("list");
            }}
          />
        )}

        {view === "duration" && (
          <div className="plan-step-view">
            <p className="plan-ask">Has it been six months or more?</p>
            <p className="plan-choices">
              {([["Yes", true], ["Not yet", false]] as const).map(([word, value]) => (
                <button key={word} type="button" className="plan-choice" aria-pressed={plan.sixMonths === value} onClick={() => save("duration", { sixMonths: value })}>
                  {word}
                </button>
              ))}
            </p>
          </div>
        )}

        {view === "goals" && (
          <Chips<Aspect>
            ask="What to change first. Up to three."
            options={ASPECTS}
            label={(a) => ASPECT_LABELS[a]}
            max={GOALS_MAX}
            initial={plan.goals ?? []}
            note={{ label: "In your words", initial: plan.goalNote }}
            onSave={(goals, goalNote) => save("goals", { goals, goalNote })}
          />
        )}

        {view === "providers" && (
          <Chips<Profession>
            ask="Anyone you already see?"
            options={PROFESSIONS.filter((id) => id !== "gp")}
            label={(k) => profession(k).label}
            initial={plan.providers ?? []}
            note={{ label: "Names, if you like", initial: plan.providerNote }}
            onSave={(providers, providerNote) => save("providers", { providers, providerNote })}
          />
        )}

        {view === "team" && <Team record={record} onSave={(team) => save("team", { team })} />}
      </div>
    </Sheet>
  );
}

/** A few chips, an optional line in the person's own words, and Save. Saving nothing is an answer. */
function Chips<T extends string>({
  ask,
  options,
  label,
  max = Infinity,
  initial,
  note,
  onSave,
}: {
  ask: string;
  options: readonly T[];
  label: (v: T) => string;
  max?: number;
  initial: readonly T[];
  note: { label: string; initial: string };
  onSave: (picked: T[], text: string) => void;
}) {
  const [picked, setPicked] = useState<T[]>([...initial]);
  const [text, setText] = useState(note.initial);
  const toggle = (v: T) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : p.length < max ? [...p, v] : p));
  return (
    <div className="plan-step-view">
      <p className="plan-ask">{ask}</p>
      <p className="plan-chips">
        {options.map((v) => {
          const on = picked.includes(v);
          return (
            <button key={v} type="button" className="plan-chip" aria-pressed={on} disabled={!on && picked.length >= max} onClick={() => toggle(v)}>
              {label(v)}
            </button>
          );
        })}
      </p>
      <label className="plan-note">
        <span>{note.label}</span>
        <input type="text" value={text} maxLength={200} autoComplete="off" onChange={(e) => setText(e.target.value)} />
      </label>
      <button type="button" className="learn-primary plan-save" onClick={() => onSave(picked, text.trim())}>
        Save
      </button>
    </div>
  );
}

/**
 * The map's proposal, one row per kind, each a row to keep or drop. The person's earlier choice
 * is kept where they left it; before any choice, every covered row starts kept, because the map
 * proposed it. A map with nothing to propose yet gets the four claimable kinds as chips instead.
 */
function Team({ record, onSave }: { record: ModelRecord; onSave: (team: Profession[]) => void }) {
  const plan = record.carePlan;
  const rows = teamFor(record);
  const [kept, setKept] = useState<Profession[]>(() => plan.team ? [...plan.team] : rows.filter((r) => r.covered).map((r) => r.kind));
  const toggle = (k: Profession) => setKept((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  return (
    <div className="plan-step-view">
      {rows.length > 0 ? (
        <ul className="plan-rows">
          {rows.map((r) => (
            <li key={r.kind} className="plan-row" data-covered={r.covered ? "true" : undefined}>
              {r.covered ? (
                <button type="button" className="plan-toggle" aria-pressed={kept.includes(r.kind)} onClick={() => toggle(r.kind)}>
                  <i className="plan-tick" aria-hidden="true" />
                  <span className="plan-row-kind">{profession(r.kind).label}</span>
                  <span className="plan-row-why">{r.because}</span>
                </button>
              ) : (
                <>
                  <span className="plan-row-kind">{profession(r.kind).label}</span>
                  <span className="plan-row-why">{r.because}</span>
                  {/* Only the exception is marked. The rest of the step is the rule. */}
                  <span className="plan-row-mark">Not covered</span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="plan-chips">
          {CLAIMABLE.map((k) => (
            <button key={k} type="button" className="plan-chip" aria-pressed={kept.includes(k)} onClick={() => toggle(k)}>
              {profession(k).label}
            </button>
          ))}
        </p>
      )}
      <button type="button" className="learn-primary plan-save" onClick={() => onSave(kept)}>
        Save
      </button>
    </div>
  );
}

/**
 * The person's own numbers. Two steppers and a save — no free text and no dates, because the only
 * things this app needs are what the plan allows and what has gone.
 */
function PlanNumbers({ plan, onSave }: { plan: CarePlan; onSave: (allows: number, used: number) => void }) {
  const [allows, setAllows] = useState(plan.allows || 5);
  const [used, setUsed] = useState(plan.used);
  return (
    <div className="plan-numbers">
      <Stepper label="My plan allows" value={allows} onChange={setAllows} />
      <Stepper label="Used so far" value={used} onChange={setUsed} max={allows} />
      {hasPlan(plan) && (
        <p className="plan-resets">Resets {new Intl.DateTimeFormat("en-AU", { month: "long" }).format(new Date(lapses(plan), 0, 1))}</p>
      )}
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
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  const set = (n: number) => onChange(Math.max(0, Math.min(n, Math.min(max, PLAN_MAX))));
  return (
    <p className="plan-stepper">
      <span className="plan-stepper-label" id={`plan-${label.replace(/\W+/g, "-").toLowerCase()}`}>
        {label}
      </span>
      <span className="plan-stepper-controls">
        <button type="button" onClick={() => set(value - 1)} aria-label={`${label}: one fewer`} disabled={value <= 0}>
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
