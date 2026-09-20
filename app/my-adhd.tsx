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

const MAX_FOCUS = 3;
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
                <section className="map-step" aria-labelledby="map-step-title">
                  <h2 id="map-step-title">{rec.heading}</h2>
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

/** The one control under the one next step. A module, a strategy, or the way to a person. */
function NextStepAction({ rec }: { rec: NonNullable<ReturnType<typeof recommend>> }) {
  const href =
    rec.action === "LEARN" && rec.moduleId
      ? `/approach?module=${rec.moduleId}`
      : rec.action === "EXPLORE_PROVIDER"
        ? "/support"
        : rec.action === "TRY_STRATEGY" && rec.moduleId
          ? `/approach?module=${rec.moduleId}`
          : "/approach";
  const label = rec.action === "EXPLORE_PROVIDER" ? "See who helps" : "Open";
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
