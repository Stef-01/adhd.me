"use client";

// The interactive module player (PRD §12): one step at a time through a module's stages, each
// answer written to the personal model the moment it is given, and one primary action at the end.
//
// The player owns nothing the module data does not say. Which step follows which is the `steps`
// array; what a step asks is its own record; what the person answers goes to `src/model/store.ts`
// under the module's id. A reflection is checked for safety as it is saved, and a hit replaces the
// module with the safety screen (`safety-screen.tsx`) — no progress, no next action, until the
// person chooses to continue.
//
// Every entrance has a static equal under reduced motion; the simulations use buttons, never
// timers, so a screen reader and a keyboard walk them the same way a thumb does.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHARACTER_BIOS, type InteractiveModule, type Step, type Strategy } from "@/learn/interactive";
import { deviceLearningStorage } from "@/learn/cursor";
import { ENOUGH_FOR_NOW, mayAskOptional } from "@/model/fatigue";
import { track } from "@/model/events";
import { acceptExperiment, acknowledgeSafety, activeSafety, markModuleComplete, readModel, recordAnswer, recordInsight, recordReflection, recordResonance, type Frequency, type InsightVerdict, type ModelRecord, type Priority } from "@/model/store";
import { CharacterMark, CharacterScene } from "./characters";
import { SafetyScreen } from "./safety-screen";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;
const POP = { type: "spring", stiffness: 520, damping: 28 } as const;

const FREQUENCIES: ReadonlyArray<{ id: Frequency; label: string }> = [
  { id: "often", label: "Often" },
  { id: "sometimes", label: "Sometimes" },
  { id: "rarely", label: "Rarely" },
  { id: "unsure", label: "Unsure" },
];
const PRIORITIES: ReadonlyArray<{ id: Priority; label: string }> = [
  { id: "yes", label: "Yes" },
  { id: "maybe", label: "Maybe" },
  { id: "no", label: "No" },
];
const VERDICTS: ReadonlyArray<{ id: InsightVerdict; label: string }> = [
  { id: "yes", label: "That’s me" },
  { id: "partly", label: "Partly" },
  { id: "no", label: "Not really" },
];

export function InteractiveView({
  module,
  step,
  direction,
  hydrated,
  onStep,
  onFinish,
  onOpenModule,
  bar,
}: {
  module: InteractiveModule;
  step: number;
  direction: 1 | -1;
  hydrated: boolean;
  onStep: (next: number) => void;
  onFinish: () => void;
  onOpenModule: (id: string) => void;
  bar: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const [record, setRecord] = useState<ModelRecord | null>(null);
  /** Per-visit answers that gate Next: which option was picked on a choice, which sides were tapped, etc. */
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [reflection, setReflection] = useState("");
  const [askedThisSession, setAsked] = useState(0);
  const [safety, setSafety] = useState<ReturnType<typeof activeSafety>>(null);
  const current: Step | undefined = module.steps[step];
  const last = step === module.steps.length - 1;

  useEffect(() => {
    const r = readModel(deviceLearningStorage);
    setRecord(r);
    setSafety(activeSafety(r));
    track("MODULE_STARTED", { module: module.id });
  }, [module.id]);

  useEffect(() => {
    if (current) track("MODULE_STEP_COMPLETED", { module: module.id, step, kind: current.kind });
  }, [module.id, step, current]);

  const refresh = (r: ModelRecord) => setRecord(r);

  const answerFor = (questionId: string): string | string[] | undefined => record?.answers[`${module.id}.${questionId}`];

  /** Whether Next may be pressed on this step. Recognition needs a frequency; a choice needs a pick; the rest are free. */
  const canAdvance = useMemo(() => {
    if (!current) return false;
    switch (current.kind) {
      case "choice": return picked[step] !== undefined;
      case "resonance": return Boolean(record?.resonance[module.id]?.frequency);
      case "perspective": return picked[step] !== undefined;
      case "simulation": return picked[step] === "done";
      default: return true;
    }
  }, [current, picked, step, record, module.id]);

  const next = () => {
    if (!current) return;
    if (current.kind === "reflect" && reflection.trim()) {
      const { record: r, safety: hit } = recordReflection(deviceLearningStorage, module.id, reflection);
      refresh(r);
      setReflection("");
      if (hit) {
        track("SAFETY_TRIGGERED", { module: module.id, rule: hit });
        setSafety(activeSafety(r));
        return;
      }
    }
    if (last) {
      const r = markModuleComplete(deviceLearningStorage, module.id);
      refresh(r);
      track("MODULE_COMPLETED", { module: module.id });
      onFinish();
      return;
    }
    onStep(step + 1);
  };

  if (safety) {
    return (
      <SafetyScreen
        ruleId={safety.ruleId}
        onAcknowledge={() => {
          const r = acknowledgeSafety(deviceLearningStorage);
          refresh(r);
          setSafety(null);
        }}
      />
    );
  }

  return (
    <section className={`learn-module learn-interactive is-route`} aria-labelledby="learn-module-title" data-hydrated={hydrated ? "true" : undefined} data-step-kind={current?.kind}>
      {bar}
      <div className="learn-cards">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={step}
            className="learn-lesson is-current"
            initial={hydrated && !reducedMotion ? { opacity: 0, x: 28 * direction } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -16 * direction, transition: { duration: 0.12 } }}
            transition={{ ...SPRING, opacity: { duration: 0.2 } }}
          >
            {current && renderStep(current)}
          </motion.article>
        </AnimatePresence>
      </div>
      <div className="learn-controls">
        <motion.button type="button" className="learn-secondary" onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0} whileTap={reducedMotion || step === 0 ? undefined : { scale: 0.97 }}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Back
        </motion.button>
        {current?.kind === "next" ? null : (
          <motion.button type="button" className="learn-primary" disabled={!canAdvance} onClick={next} whileTap={reducedMotion || !canAdvance ? undefined : { scale: 0.97 }}>
            {current?.kind === "reflect" && !reflection.trim() ? "Skip" : "Next"}
            <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </motion.button>
        )}
      </div>
    </section>
  );

  function heading(text: string, className = "learn-card-heading") {
    return <StepHeading key={`${step}-${text}`} className={className}>{text}</StepHeading>;
  }

  function renderStep(s: Step): React.ReactNode {
    switch (s.kind) {
      case "scene":
        return <>
          <div className="learning-lesson-art"><CharacterScene who={s.who} mood={s.mood} prop={s.prop} /></div>
          <p className="learn-card-eyebrow">{s.eyebrow ?? CHARACTER_BIOS[s.who].name}</p>
          {heading(s.heading)}
          <p className="learn-card-body">{s.body}</p>
          <p className="learn-card-foot">{CHARACTER_BIOS[s.who].name} — {CHARACTER_BIOS[s.who].who}</p>
        </>;
      case "choice": {
        const chosen = picked[step];
        const response = s.options.find((o) => o.id === chosen)?.response;
        return <>
          <div className="learning-lesson-art"><CharacterScene who={s.who} mood={chosen ? "thinking" : s.mood} prop={s.prop} /></div>
          <p className="learn-card-eyebrow">What do you think?</p>
          {heading(s.heading)}
          {s.body && <p className="learn-card-body">{s.body}</p>}
          <ul className="learn-options" aria-label="Choices">
            {s.options.map((o) => (
              <li key={o.id}>
                <motion.button
                  type="button"
                  className={`learn-option${chosen === o.id ? " is-right" : chosen ? " is-dim" : ""}`}
                  aria-pressed={chosen === o.id}
                  onClick={() => { setPicked((p) => ({ ...p, [step]: o.id })); track("MODULE_BRANCH_SELECTED", { module: module.id, step, option: o.id }); }}
                  whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                  transition={POP}
                >
                  <span className="learn-option-mark" aria-hidden="true">{chosen === o.id && <Check size={16} weight="bold" />}</span>
                  {o.label}
                </motion.button>
              </li>
            ))}
          </ul>
          <AnimatePresence initial={false}>
            {response && (
              <motion.p key={chosen} className="learn-reveal" role="status" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, opacity: { duration: 0.2 } }}>
                {response}
              </motion.p>
            )}
          </AnimatePresence>
        </>;
      }
      case "resonance": {
        const res = record?.resonance[module.id];
        return <>
          <p className="learn-card-eyebrow">Recognition</p>
          {heading(s.heading)}
          <p className="learn-card-body">Three quick answers. They stay on this device, and they are what makes the rest of the app about you.</p>
          <fieldset className="resonance-group">
            <legend>How often?</legend>
            <div className="resonance-row" role="group" aria-label="How often">
              {FREQUENCIES.map((f) => (
                <button key={f.id} type="button" className="learn-chip" aria-pressed={res?.frequency === f.id} onClick={() => { refresh(recordResonance(deviceLearningStorage, module.id, { frequency: f.id })); track("MODULE_RESONANCE_RECORDED", { module: module.id, field: "frequency", value: f.id }); }}>{f.label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="resonance-group">
            <legend>How much does this cause problems?</legend>
            <label className="resonance-scale">
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={res?.cost ?? 5}
                aria-valuetext={`${res?.cost ?? 5} out of 10`}
                onChange={(e) => refresh(recordResonance(deviceLearningStorage, module.id, { cost: Number(e.target.value) }))}
              />
              <output className="t-digit" aria-live="polite">{res?.cost ?? 5}</output>
              <span className="resonance-scale-ends" aria-hidden="true"><span>Not at all</span><span>Constantly</span></span>
            </label>
          </fieldset>
          <fieldset className="resonance-group">
            <legend>Would you like this to become easier?</legend>
            <div className="resonance-row" role="group" aria-label="Would you like this to become easier">
              {PRIORITIES.map((p) => (
                <button key={p.id} type="button" className="learn-chip" aria-pressed={res?.priority === p.id} onClick={() => refresh(recordResonance(deviceLearningStorage, module.id, { priority: p.id }))}>{p.label}</button>
              ))}
            </div>
          </fieldset>
        </>;
      }
      case "explain":
        return <>
          {s.who && <div className="learning-lesson-art"><CharacterScene who={s.who} mood={s.mood ?? "thinking"} prop={s.prop ?? "none"} /></div>}
          <p className="learn-card-eyebrow">{s.eyebrow}</p>
          {heading(s.heading)}
          <p className="learn-card-body">{s.body}</p>
          {s.detail && <ul className="learn-card-detail">{s.detail.map((line) => <li key={line}>{line}</li>)}</ul>}
        </>;
      case "personalise": {
        const allowed = record ? mayAskOptional(record, askedThisSession) : true;
        if (!allowed) {
          return <>
            <p className="learn-card-eyebrow">Personalisation</p>
            {heading(ENOUGH_FOR_NOW)}
            <p className="learn-card-body">You have answered a lot today. These questions will still be here another time, and nothing about the module depends on them.</p>
          </>;
        }
        return <>
          <p className="learn-card-eyebrow">Make it yours</p>
          {heading("A couple of questions about you.")}
          <p className="learn-card-body">Optional, and each one sharpens what the app suggests. Skip any you like.</p>
          {s.questions.map((q) => {
            const value = answerFor(q.id);
            const chosen = new Set(Array.isArray(value) ? value : value ? [value] : []);
            return (
              <fieldset key={q.id} className="resonance-group">
                <legend>{q.prompt}</legend>
                <div className="resonance-row" role="group" aria-label={q.prompt}>
                  {q.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="learn-chip"
                      aria-pressed={chosen.has(o.id)}
                      onClick={() => {
                        const nextValue = q.multi
                          ? (chosen.has(o.id) ? [...chosen].filter((x) => x !== o.id) : [...chosen, o.id])
                          : o.id;
                        refresh(recordAnswer(deviceLearningStorage, module.id, q.id, nextValue));
                        setAsked((n) => n + 1);
                        track("SURVEY_QUESTION_ANSWERED", { module: module.id, question: q.id });
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </>;
      }
      case "strategy":
        return <>
          <p className="learn-card-eyebrow">Something to try</p>
          {heading(s.heading)}
          <p className="learn-card-body">{s.body}</p>
          <ul className="strategy-list" aria-label="Strategies">
            {s.strategies.map((strategy) => <StrategyCard key={strategy.id} strategy={strategy} moduleId={module.id} record={record} onAccept={refresh} />)}
          </ul>
        </>;
      case "reflect":
        return <>
          <p className="learn-card-eyebrow">Optional</p>
          {heading(s.prompts[0] ?? "A moment to reflect.")}
          {s.prompts.slice(1).map((p) => <p key={p} className="learn-card-body">{p}</p>)}
          <div className="resonance-row" role="group" aria-label="Suggestions">
            {s.suggestions.map((sug) => (
              <button key={sug} type="button" className="learn-chip" onClick={() => setReflection((t) => (t ? `${t} ${sug}` : sug))}>{sug}</button>
            ))}
          </div>
          <label className="reflect-field">
            <span className="sr-only">Your reflection</span>
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="In your own words, or leave it blank." maxLength={2000} />
          </label>
          <p className="learn-card-foot">Stays on this device. Never sent anywhere, never used in a URL or an analytics event.</p>
        </>;
      case "insight": {
        const verdict = record?.insights[s.id];
        const byAnswer = s.byAnswer ? answerFor(s.byAnswer.question) : undefined;
        const first = Array.isArray(byAnswer) ? byAnswer[0] : byAnswer;
        const tail = first && s.byAnswer ? s.byAnswer.map[first] : undefined;
        return <>
          <p className="learn-card-eyebrow"><Sparkle size={12} weight="fill" aria-hidden="true" /> Insight</p>
          {heading(s.heading)}
          <p className="learn-card-body">{s.body}{tail ? ` ${tail}` : ""}</p>
          <p className="learn-card-body">Does that fit?</p>
          <div className="resonance-row" role="group" aria-label="Does that fit">
            {VERDICTS.map((v) => (
              <button key={v.id} type="button" className="learn-chip" aria-pressed={verdict === v.id} onClick={() => { refresh(recordInsight(deviceLearningStorage, s.id, v.id)); track(v.id === "no" ? "INSIGHT_REJECTED" : "INSIGHT_CONFIRMED", { insight: s.id }); }}>{v.label}</button>
            ))}
          </div>
          <p className="learn-card-foot">Only what you confirm becomes part of your picture. “Not really” is remembered so it is never assumed.</p>
        </>;
      }
      case "next":
        return <>
          <p className="learn-card-eyebrow">Next</p>
          {heading(s.heading)}
          <p className="learn-card-body">{s.body}</p>
          <div className="next-actions">
            {s.action === "learn" && s.moduleId ? (
              <button type="button" className="learn-primary" onClick={() => { markModuleComplete(deviceLearningStorage, module.id); track("MODULE_COMPLETED", { module: module.id }); onOpenModule(s.moduleId!); }}>
                Go there now <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </button>
            ) : s.action === "support" ? (
              <Link className="learn-primary" href="/support" onClick={() => { markModuleComplete(deviceLearningStorage, module.id); track("MODULE_COMPLETED", { module: module.id }); }}>
                Explore support <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </Link>
            ) : (
              <button type="button" className="learn-primary" onClick={next}>
                <Check size={17} weight="bold" aria-hidden="true" /> Finish
              </button>
            )}
            {s.action !== "try" && (
              <button type="button" className="learn-secondary" onClick={next}>Finish for now</button>
            )}
          </div>
        </>;
      case "perspective": {
        const open = picked[step];
        return <>
          <p className="learn-card-eyebrow">Two sides</p>
          {heading(s.heading)}
          <p className="learn-card-body">{s.body}</p>
          <div className="perspective-pair" role="group" aria-label="Perspectives">
            {s.sides.map((side) => (
              <button key={side.who} type="button" className="perspective-card" aria-pressed={open === side.who} onClick={() => setPicked((p) => ({ ...p, [step]: side.who }))}>
                <CharacterMark who={side.who} mood={side.mood} />
                <span>{side.label}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {open && (
              <motion.blockquote key={open} className="perspective-thought" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.1 } }} transition={{ ...SPRING, opacity: { duration: 0.2 } }}>
                <strong>{s.sides.find((x) => x.who === open)?.label}</strong>
                <p>{s.sides.find((x) => x.who === open)?.thought}</p>
              </motion.blockquote>
            )}
          </AnimatePresence>
          {open && <p className="learn-reveal" role="status">{s.teaching}</p>}
        </>;
      }
      case "simulation":
        return <Simulation sim={s.sim} onDone={() => setPicked((p) => ({ ...p, [step]: "done" }))} done={picked[step] === "done"} heading={heading} />;
    }
  }
}

function StepHeading({ children, className }: { children: React.ReactNode; className: string }) {
  const [el, setEl] = useState<HTMLHeadingElement | null>(null);
  useEffect(() => {
    el?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [el]);
  return <h2 ref={setEl} tabIndex={-1} className={className}>{children}</h2>;
}

function StrategyCard({ strategy, moduleId, record, onAccept }: { strategy: Strategy; moduleId: string; record: ModelRecord | null; onAccept: (r: ModelRecord) => void }) {
  const accepted = record?.experiments.some((e) => e.strategyId === strategy.id);
  const outcome = record?.experiments.find((e) => e.strategyId === strategy.id)?.outcome;
  return (
    <li className="strategy-card">
      <strong>{strategy.title}</strong>
      <ol>{strategy.steps.map((line) => <li key={line}>{line}</li>)}</ol>
      {accepted ? (
        <p className="strategy-accepted" role="status"><Check size={14} weight="bold" aria-hidden="true" /> {outcome ? "Tried — thank you for saying how it went." : "On your list. The app will ask how it went."}</p>
      ) : (
        <button type="button" className="learn-secondary" onClick={() => { onAccept(acceptExperiment(deviceLearningStorage, moduleId, strategy.id)); track("EXPERIMENT_ACCEPTED", { module: moduleId, strategy: strategy.id }); }}>I’ll try this</button>
      )}
    </li>
  );
}

// ── Simulations (PRD §17) ─────────────────────────────────────────────────────────────────────

const WM_ITEMS = ["Milk", "The parcel", "Stamps", "Sam’s script"] as const;
const WM_DECOYS = ["Bread", "The dry cleaning"] as const;

function Simulation({ sim, onDone, done, heading }: { sim: "working-memory" | "interruption" | "ambiguity"; onDone: () => void; done: boolean; heading: (text: string) => React.ReactNode }) {
  const [phase, setPhase] = useState(0);
  const [recall, setRecall] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [taps, setTaps] = useState<number[]>([]);

  if (sim === "working-memory") {
    const options = ["Milk", "Bread", "The parcel", "Stamps", "The dry cleaning", "Sam’s script"];
    const right = recall.filter((r) => (WM_ITEMS as readonly string[]).includes(r)).length;
    const wrong = recall.filter((r) => (WM_DECOYS as readonly string[]).includes(r)).length;
    return <>
      <p className="learn-card-eyebrow">Try it yourself</p>
      {phase === 0 && <>
        {heading("Four things to remember.")}
        <ul className="sim-list">{WM_ITEMS.map((i) => <li key={i}>{i}</li>)}</ul>
        <p className="learn-card-body">Read them once. Then tap the button — you are walking out the door.</p>
        <button type="button" className="learn-secondary" onClick={() => setPhase(1)}>I have them</button>
      </>}
      {phase === 1 && <>
        {heading("Your phone buzzes.")}
        <div className="sim-notification" role="status"><strong>Group chat</strong><p>“Are you coming Saturday? Also did you see what happened with the lease?? Call me.”</p></div>
        <p className="learn-card-body">You reply. It takes a minute. Then you are at the shops.</p>
        <button type="button" className="learn-secondary" onClick={() => setPhase(2)}>Reply, then keep walking</button>
      </>}
      {phase === 2 && <>
        {heading("What was on the list?")}
        <div className="resonance-row" role="group" aria-label="What was on the list">
          {options.map((o) => (
            <button key={o} type="button" className="learn-chip" aria-pressed={recall.includes(o)} disabled={done} onClick={() => setRecall((r) => (r.includes(o) ? r.filter((x) => x !== o) : [...r, o]))}>{o}</button>
          ))}
        </div>
        {!done ? (
          <button type="button" className="learn-secondary" disabled={recall.length === 0} onClick={onDone}>Check</button>
        ) : (
          <p className="learn-reveal" role="status">
            {right === 4 && wrong === 0 ? "All four, and no extras — the table held this time. Under stress or after a short night, it often does not." : `${right} of the four came back${wrong ? `, and ${wrong} that were never there` : ""}. That gap is working memory being knocked, not carelessness.`}
          </p>
        )}
      </>}
    </>;
  }

  if (sim === "interruption") {
    const nextNumber = taps.length + 1;
    return <>
      <p className="learn-card-eyebrow">Try it yourself</p>
      {phase === 0 && <>
        {heading("Tap the numbers in order.")}
        <p className="learn-card-body">A simple task with a clear next step. Start at one.</p>
        <div className="sim-grid" role="group" aria-label="Numbers">
          {[3, 1, 5, 2, 6, 4].map((n) => (
            <button key={n} type="button" className="sim-cell" aria-pressed={taps.includes(n)} disabled={taps.includes(n)} onClick={() => {
              if (n !== nextNumber) return;
              const next = [...taps, n];
              setTaps(next);
              if (next.length === 3) setPhase(1);
            }}>{n}</button>
          ))}
        </div>
      </>}
      {phase === 1 && <>
        {heading("Quick one —")}
        <div className="sim-notification" role="status"><strong>Message</strong><p>“Can you check this for me? Two secs.”</p></div>
        <p className="learn-card-body">You check it. It takes two minutes and a little thought.</p>
        <button type="button" className="learn-secondary" onClick={() => setPhase(2)}>Done — back to the numbers</button>
      </>}
      {phase === 2 && <>
        {heading("Which number was next?")}
        <div className="resonance-row" role="group" aria-label="Which number was next">
          {[3, 4, 5, 6].map((n) => (
            <button key={n} type="button" className="learn-chip" aria-pressed={pick === String(n)} disabled={done} onClick={() => { setPick(String(n)); onDone(); }}>{n}</button>
          ))}
        </div>
        {done && (
          <p className="learn-reveal" role="status">
            {pick === "4" ? "Four — you kept the thread. Notice the small effort it took to find it again; that effort is the whole cost of switching, and it grows with the interruption." : "It was four. Losing the thread after a two-minute detour is the return cost — and it is why a breadcrumb works."}
          </p>
        )}
      </>}
    </>;
  }

  return <>
    <p className="learn-card-eyebrow">Try it yourself</p>
    {heading("Which is easier to begin?")}
    <div className="perspective-pair" role="group" aria-label="Two tasks">
      <button type="button" className="perspective-card sim-task" aria-pressed={pick === "improve"} disabled={done} onClick={() => { setPick("improve"); onDone(); }}><strong>Improve the presentation</strong><span>Due Thursday</span></button>
      <button type="button" className="perspective-card sim-task" aria-pressed={pick === "title"} disabled={done} onClick={() => { setPick("title"); onDone(); }}><strong>Write the title slide</strong><span>Due Thursday</span></button>
    </div>
    {done && (
      <p className="learn-reveal" role="status">
        {pick === "title"
          ? "Most people pick this one. It is not smaller work — it is a defined first action. That is the whole difference."
          : "Some people can begin the vague one. Most cannot, and it is not about capability: the second task has a first action built in, the first has to be designed before it can be started."}
      </p>
    )}
  </>;
}
