"use client";

// My ADHD: one picture of a person, and three things they can do from it.
//
// WHAT THIS REPLACED, AND WHY. This screen used to be fourteen stacked cards — Today, the biggest
// friction, contributors, balance, what helps, the manual, adjustments, medication, the goal, a
// survey offer, other needs, insight cards, strategy history and a delete button. Measured with
// the tree's own instrument on a record about three weeks old it came to 336 words and 8,014px at
// 390px wide, roughly nine and a half screenfuls. The budget never caught it because the budget
// walked this route with an EMPTY record, which is the one state a returning person never sees.
// `scripts/text-budget-lib.mjs` now carries the lived-in states; this file is what they measure.
//
// THE SHAPE IS THE FOUNDER'S (Calm Clarity, 2026-09-19): the radar, then what stands out, then at
// most three things currently in focus, then what is working, then exactly one next step. Nothing
// else. Everything that used to be a card is now either inside an axis (tap it) or one word in the
// footer row, and the delete control has moved to the settings sheet where a person looks for it.
//
// NO EYEBROWS. The comp labels each block ("What stands out", "Current focus", "Working for you").
// This tree's own law forbids them — `{#layout.calm}`, after a tester with ADHD said the text was
// jumping everywhere — and dropping them costs nothing a reader needs: the sentence says what
// stands out, the sage chip says it is working, and the one pill says it is the thing to do.

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { recommend } from "@/model/recommend";
import { interactiveModule } from "@/learn/interactive";
import { axes, currentFocus, leadAxis, standsOut, type Aspect } from "@/model/matrix";
import { isComplete } from "@/model/onboarding";
import { activeSafety } from "@/model/store";
import { LifeHeader } from "./life-shell";
import { MyAdhdRadar } from "./my-adhd-radar";
import { MyAdhdSheet } from "./my-adhd-sheet";
import { ShareSheet } from "./my-adhd-share";
import { SafetyScreen } from "./safety-screen";
import { acknowledgeSafety } from "@/model/store";
import { useModel } from "./use-model";

/**
 * O253: two contributor chips, not three.
 *
 * The action card grew the line that says what the step actually IS — the founder read "Try
 * this: one capture place." and it meant nothing to him — and the screen went to 62 words
 * against a ceiling of 60. Something had to go, and the law is delete rather than hide.
 *
 * The third chip is the one to delete, for two reasons that are both about this screen rather
 * than about chips. The contributors are ordered, so the third is the weakest signal by
 * construction. And they are not lost: the axis sheet lists every contributor for the axis they
 * belong to, one tap away, which is the screen built to hold them. What could not move is the
 * step: a next action nobody can read is not a next action.
 */
const MAX_FOCUS = 2;
const MAX_STRENGTHS = 1;

export function MyAdhd() {
  const model = useModel();
  const { record, refresh, storage } = model;
  const [open, setOpen] = useState<Aspect | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLButtonElement | null>(null);

  const points = useMemo(() => axes(record), [record]);
  // What may be contributing, as the comp has it: at most three short phrases from the leading
  // need's own contributors. Repeating the axis names here would say nothing the radar has not.
  const focus = useMemo(() => {
    const lead = currentFocus(record, 1)[0];
    if (!lead) return [] as Array<{ note: string; aspect: Aspect }>;
    return lead.need.contributors
      .slice(0, MAX_FOCUS)
      .map((c) => ({ note: c.note, aspect: lead.aspect }));
  }, [record]);
  const line = useMemo(() => standsOut(record), [record]);
  const rec = useMemo(() => (record ? recommend(record) : null), [record]);
  const safety = record ? activeSafety(record) : null;
  const started = isComplete(record?.onboarding ?? null);

  // What is working, from the axes that name a strength. One, because two is a list and this
  // screen has one job.
  const strengths = useMemo(
    () => [...new Set(points.filter((p) => p.strength).map((p) => p.strength!))].slice(0, MAX_STRENGTHS),
    [points],
  );

  const openAxis = useCallback((aspect: Aspect) => setOpen(aspect), []);

  return (
    <main id="main-content" className="me-screen life-screen map-screen app-page-with-tabs">
      <LifeHeader />

      {record && safety ? (
        <SafetyScreen ruleId={safety.ruleId} onAcknowledge={() => refresh(acknowledgeSafety(storage))} />
      ) : (
        <>
          <header className="life-head map-head">
            <h1>My ADHD.</h1>
            {started && (
              <button ref={shareRef} type="button" className="map-share" onClick={() => setSharing(true)}>
                Share
              </button>
            )}
          </header>

          {!record && <p role="status" className="life-card">Reading what this device holds…</p>}

          {record && (
            <MyAdhdRadar points={points} onOpen={openAxis} openAspect={open} />
          )}

          {record && !started && (
            <section className="map-lead map-side">
              <p>Two minutes so this can be about you.</p>
              <Link className="learn-primary" href="/start">
                Start <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </Link>
            </section>
          )}

          {record && started && (
            <div className="map-side">
              {line && <p className="map-stands-out">{line}</p>}

              {focus.length > 0 && (
                <ul className="map-chips" aria-label="What is in focus">
                  {focus.map(({ note, aspect }) => (
                    <li key={note}>
                      <button type="button" className="map-chip" onClick={() => openAxis(aspect)}>
                        {note}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {strengths.length > 0 && (
                <ul className="map-chips is-strength" aria-label="What is working">
                  {strengths.map((s) => (
                    <li key={s}>
                      <span className="map-chip is-strength">
                        <Sparkle size={13} weight="fill" aria-hidden="true" /> {s}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {rec && (
                <section className="map-step" aria-labelledby="map-step-title" data-action={rec.action}>
                  <h2 id="map-step-title">{rec.heading}</h2>
                  {doLine(rec) && <p className="map-step-do">{doLine(rec)}</p>}
                  <NextStepAction rec={rec} />
                </section>
              )}
            </div>
          )}
        </>
      )}

      {record && (
        <MyAdhdSheet
          aspect={open}
          record={record}
          onClose={() => setOpen(null)}
          onRefresh={refresh}
          storage={storage}
        />
      )}
      {record && (
        <ShareSheet open={sharing} record={record} onClose={() => setSharing(false)} openedBy={shareRef} />
      )}
    </main>
  );
}

type Recommendation = NonNullable<ReturnType<typeof recommend>>;

/**
 * WHAT THE STEP ACTUALLY IS, IN ONE LINE (founder, 2026-09-20, reading his own screen: "my thing
 * said, try this, one capture place, when reading it, this meant nothing. It is so cryptic").
 *
 * He was right, and the cause was structural rather than a wording slip. `recommend()` returns a
 * heading, a body and a reason; Today renders all three; this card rendered the HEADING ALONE.
 * A strategy's heading is its title — "Try this: one capture place." — which is a NAME for a
 * thing you have not met yet, so on the one screen that never opened the module it named nothing.
 *
 * For a strategy the line is its own FIRST STEP, which is the concrete thing to do and is already
 * authored beside the strategy (`src/learn/interactive.ts`). For everything else it is the body
 * the recommendation already carries. Nothing new is written here; what existed is shown.
 */
function doLine(rec: Recommendation): string | null {
  /*
   * A QUESTION NEEDS NO INSTRUCTION UNDER IT. The pending-experiment card asks "Did 'One capture
   * place' help?", and the first draft of this put "Choose one place." beneath it — an
   * instruction answering a question nobody asked twice. That card was never the cryptic one:
   * a question about a strategy you accepted names the strategy in the asking.
   */
  if (rec.explain.ruleTriggered === "experiment.pending") return null;
  /*
   * ONLY WHERE THE HEADING IS A NAME. A recommendation that names a module has a NAME for a
   * heading — a module title, or "Try this: one capture place." — and a short body beside it.
   * The two that send you to a person instead have a whole sentence for a heading ("An
   * occupational therapist may be particularly useful for this.") and a paragraph for a body:
   * measured, that paragraph put this screen at 98 words against a ceiling of 60, and the gate
   * could not see it because the budget walks one record and that record is in a different
   * state. Those headings explain themselves; this line exists for the ones that do not.
   */
  if (!rec.moduleId) return null;
  const step = rec.strategy?.steps[0];
  /*
   * A module's own subtitle, without the duration. `recommend()` composes the body as
   * "<subtitle>. <n> min." because Today is where somebody decides to spend seven minutes; the
   * map is where they see what the thing IS. Dropping the two words is what keeps this screen
   * inside its ceiling with the new line on it — measured at 62 with them and 60 without — and
   * the duration is still on the module, on Today, and in the Learn list.
   */
  if (!step) return interactiveModule(rec.moduleId)?.subtitle ?? rec.body;
  /*
   * THE FIRST CLAUSE, NOT THE WHOLE STEP, and the budget is why the law allows it. A step may
   * carry its own examples — "Choose one place, a notes app, a card in your pocket, a whiteboard
   * by the door" is sixteen words, and putting all sixteen here took this screen from 53 to 73
   * against a ceiling of 60. The examples belong in the module, which is one tap away and which
   * this card now opens. The clause before them is the instruction, and it is the person's own
   * step rather than a summary written here: "Choose one place."
   */
  const clause = step.split(/,\s*/)[0]!.trim();
  return /[.!?]$/.test(clause) ? clause : `${clause}.`;
}

/**
 * The one control under the one next step, and WHERE IT GOES.
 *
 * The old version named three actions and sent the other four to `/approach`, the bare module
 * list — including `CHANGE_ENVIRONMENT` and `INVOLVE_SUPPORT_PERSON`, which are the same "try a
 * strategy" branch of `recommend()` seen through the need's dominant layer and which carry the
 * strategy's own `moduleId`. So the commonest strategy recommendations threw away the module
 * they were holding and dropped the reader on a list. That is the other half of the founder's
 * report above: the card was cryptic AND the way out of it led nowhere in particular.
 *
 * The rule is now the one Today already used: a recommendation that names a module opens that
 * module, a recommendation about a person goes to the people screen, and the label says which.
 */
function NextStepAction({ rec }: { rec: Recommendation }) {
  const person = rec.action === "EXPLORE_PROVIDER" || rec.action === "DISCUSS_WITH_EXISTING_CLINICIAN";
  const href = rec.action === "URGENT_ESCALATION"
    ? "/urgent"
    : person
      ? "/support"
      : rec.moduleId
        ? `/approach?module=${rec.moduleId}`
        : "/approach";
  const label = rec.action === "URGENT_ESCALATION"
    ? "Get help now"
    : rec.action === "EXPLORE_PROVIDER"
      ? "See who helps"
      : rec.action === "DISCUSS_WITH_EXISTING_CLINICIAN"
        ? "Prepare what to say"
        : rec.strategy
          ? "See it in the module"
          : "Open the module";
  return (
    <Link className="learn-primary" href={href}>
      {label} <ArrowRight size={17} weight="bold" aria-hidden="true" />
    </Link>
  );
}

/** The leading axis, for anything that needs one without rendering the whole hub. */
export function leadingAspect(record: Parameters<typeof axes>[0]): Aspect {
  return leadAxis(axes(record)).aspect;
}
