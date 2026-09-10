"use client";

// L4 (PRD §24–§26, §70–§71, §103): one renderer over the block types. A module is data; this
// draws it one block a card — recognise → understand → try → personalise → leave with one action
// — and the last action plan is MAKE IT YOURS (§39): the choice becomes the strategy's personal
// configuration and the strategy joins the Toolkit as "trying". No article walls, no quiz, no
// "lesson complete"; every card is one thing and one button.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Pause, Play, Plus, SkipForward } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { completeModule, learningModule, startModule, STRATEGIES, type CharacterId, type LearningBlock, type LearningModule } from "@/lives";
import { track } from "@/model/events";
import { LifeBean } from "./bean";
import { useProfile } from "./profile-hook";

const FADE = { duration: 0.18, ease: "easeOut" } as const;

export function ModuleRenderer({ moduleId, onLeave }: { moduleId: string; onLeave: () => void }) {
  const reducedMotion = Boolean(useReducedMotion());
  const { profile, apply } = useProfile();
  const module = useMemo<LearningModule | null>(() => { try { return learningModule(moduleId); } catch { return null; } }, [moduleId]);
  const strategy = useMemo(() => STRATEGIES.find((s) => s.moduleId === moduleId), [moduleId]);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [config, setConfig] = useState<Record<string, string | readonly string[] | boolean>>({});
  const startedRef = useRef(false);
  useEffect(() => {
    if (!module || !strategy || !profile || startedRef.current) return;
    startedRef.current = true;
    apply((s) => startModule(s, module.id, strategy.id));
    track("MODULE_STARTED", { module: module.id, format: "lives" });
  }, [module, strategy, profile, apply]);
  const next = useCallback(() => setStep((s) => s + 1), []);
  if (!module || !strategy) return <p role="status">That module is not here. <Link href="/lives/learn">Back to Learn</Link></p>;
  const blocks = module.blocks;
  const block = blocks[step];
  const finish = (choice: string) => {
    const personal = { ...config, [blocks.findIndex((b) => b.type === "action_plan") >= 0 ? "plan" : "choice"]: choice };
    apply((s) => completeModule(s, module.id, strategy.id, personal));
    track("MODULE_COMPLETED", { module: module.id, format: "lives" });
    track("STRATEGY_ADDED_TO_TOOLKIT", { strategy: strategy.id });
    setDone(true);
  };

  return (
    <section className="lives-module play-run" aria-labelledby="lives-module-title" data-module={module.id}>
      <div className="play-top lives-top">
        <button type="button" className="play-x" aria-label="Leave the module" onClick={() => { if (!done) track("MODULE_ABANDONED", { module: module.id, step }); onLeave(); }}>✕</button>
        <div className="play-hut">
          <ol className="learn-dots play-dots" aria-hidden="true">
            {blocks.map((_, i) => <li key={i} className={i === step ? "is-current" : i < step ? "is-done" : ""} />)}
          </ol>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={done ? "done" : step} className="play-stage lives-stage" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }} transition={FADE}>
          {done ? (
            <div className="play-card is-title lives-card">
              <LifeBean who={strategy.characterIds[0] ?? "maya"} mood="pleased" size={140} className="play-hero-bean" />
              <h2 id="lives-module-title" className="play-title">Added to your Toolkit</h2>
              <p className="play-line">{strategy.title}, as you set it up. Worth trying this week.</p>
              <div className="next-actions">
                <Link className="play-tempt is-go" href="/lives/toolkit"><Check size={16} weight="bold" aria-hidden="true" /> Open the Toolkit</Link>
                <Link className="play-choice" href="/lives/play"><Play size={14} weight="fill" aria-hidden="true" /> Play again</Link>
              </div>
            </div>
          ) : block ? (
            <div className="play-card lives-card lives-block" data-block={block.type}>
              {step === 0 && <h2 id="lives-module-title" className="lives-module-name">{module.title}</h2>}
              {step !== 0 && <h2 id="lives-module-title" className="sr-only">{module.title}, step {step + 1} of {blocks.length}</h2>}
              <Block block={block} isLast={step === blocks.length - 1} onNext={next} onFinish={finish} onConfig={(k, v) => setConfig((c) => ({ ...c, [k]: v }))} reducedMotion={reducedMotion} />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Block({ block, isLast, onNext, onFinish, onConfig, reducedMotion }: { block: LearningBlock; isLast: boolean; onNext: () => void; onFinish: (choice: string) => void; onConfig: (key: string, value: string | readonly string[] | boolean) => void; reducedMotion: boolean }) {
  switch (block.type) {
    case "text": return <><p className="play-line lives-text">{block.body}</p><Next onNext={onNext} /></>;
    case "illustration": return <><LifeBean who={block.characterId} mood="thinking" size={150} className="play-hero-bean" /><p className="play-title lives-caption">{block.caption}</p><Next onNext={onNext} /></>;
    case "choice": return <ChoiceBlock prompt={block.prompt} options={block.options} onPick={(o) => { onConfig("choice", o); onNext(); }} />;
    case "reflection": return <ReflectionBlock prompt={block.prompt} onNext={onNext} />;
    case "interactive_practice": return <Practice activityId={block.activityId} instruction={block.instruction} onDone={onNext} />;
    case "timer": return <TimerBlock seconds={block.durationSeconds} label={block.label} allowSkip={block.allowSkip} onDone={onNext} reducedMotion={reducedMotion} />;
    case "audio": return <><p className="play-line">{`Audio is not in this build yet. The transcript is ${block.transcriptId}.`}</p><Next onNext={onNext} /></>;
    case "checklist": return <ChecklistBlock items={block.items} allowCustom={block.allowCustomItems} onDone={(chosen) => { onConfig("checklist", chosen); onNext(); }} />;
    case "scenario": return <ScenarioBlock characterId={block.characterId} prompt={block.prompt} choices={block.choices} onNext={onNext} />;
    case "action_plan": return <ActionPlan prompt={block.prompt} options={block.options} isLast={isLast} onPick={(o) => (isLast ? onFinish(o) : (onConfig("plan", o), onNext()))} />;
  }
}

function Next({ onNext, label = "Next" }: { onNext: () => void; label?: string }) {
  return <button type="button" className="play-tempt is-go" onClick={onNext} autoFocus>{label} <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>;
}

function ChoiceBlock({ prompt, options, onPick }: { prompt: string; options: readonly string[]; onPick: (o: string) => void }) {
  return (
    <>
      <h3 className="play-title">{prompt}</h3>
      <div className="lives-choices" role="group" aria-label="Choices">{options.map((o) => <button key={o} type="button" className="lives-choice" onClick={() => onPick(o)}>{o}</button>)}</div>
    </>
  );
}

/** A reflection stays on this device and reaches no event (§55 of the first PRD). */
function ReflectionBlock({ prompt, onNext }: { prompt: string; onNext: () => void }) {
  const [text, setText] = useState("");
  return (
    <>
      <h3 className="play-title">{prompt}</h3>
      <label className="reflect-field" style={{ width: "100%" }}>
        <span className="sr-only">Your reflection</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="In your own words, or leave it blank. It stays on this device." maxLength={2000} />
      </label>
      <Next onNext={onNext} label={text.trim() ? "Next" : "Skip"} />
    </>
  );
}

/** §74: a timer with pause and skip; no requirement to finish every second. */
function TimerBlock({ seconds, label, allowSkip, onDone, reducedMotion }: { seconds: number; label: string; allowSkip: boolean; onDone: () => void; reducedMotion: boolean }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => { if (left === 0 && running) { setRunning(false); onDone(); } }, [left, running, onDone]);
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
  return (
    <>
      <h3 className="play-title">{label}</h3>
      <p className="lives-timer t-digit" role="timer" aria-live="off">{mm}:{ss}</p>
      {!reducedMotion && running && <span className="lives-breath" aria-hidden="true" />}
      <div className="lives-choices" role="group" aria-label="Timer">
        <button type="button" className="lives-choice" onClick={() => setRunning((r) => !r)} aria-pressed={running}>{running ? <><Pause size={14} weight="fill" aria-hidden="true" /> Pause</> : <><Play size={14} weight="fill" aria-hidden="true" /> {left === seconds ? "Start" : "Resume"}</>}</button>
        {allowSkip && <button type="button" className="lives-choice" onClick={onDone}><SkipForward size={14} weight="fill" aria-hidden="true" /> Skip</button>}
      </div>
    </>
  );
}

/** §75: a checklist the person can add to. */
function ChecklistBlock({ items, allowCustom, onDone }: { items: readonly { id: string; label: string }[]; allowCustom: boolean; onDone: (chosen: string[]) => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const all = [...items, ...custom.map((c) => ({ id: `custom:${c}`, label: c }))];
  return (
    <>
      <h3 className="play-title">Which would you try?</h3>
      <ul className="lives-checklist" aria-label="Options">
        {all.map((i) => (
          <li key={i.id}>
            <label className="lives-check">
              <input type="checkbox" checked={chosen.includes(i.label)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, i.label] : c.filter((x) => x !== i.label)))} />
              <span>{i.label}</span>
            </label>
          </li>
        ))}
      </ul>
      {allowCustom && (
        <form className="lives-custom" onSubmit={(e) => { e.preventDefault(); const v = draft.trim().slice(0, 60); if (!v) return; setCustom((c) => [...c, v]); setChosen((c) => [...c, v]); setDraft(""); }}>
          <label className="sr-only" htmlFor="lives-custom-item">Add your own</label>
          <input id="lives-custom-item" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add your own" maxLength={60} />
          <button type="submit" className="lives-choice is-small" aria-label="Add"><Plus size={16} weight="bold" aria-hidden="true" /></button>
        </form>
      )}
      <Next onNext={() => onDone(chosen)} label={chosen.length ? "Next" : "Skip"} />
    </>
  );
}

/** §73: reflection, not moral scoring. Each choice gets its feedback; none is stamped CORRECT. */
function ScenarioBlock({ characterId, prompt, choices, onNext }: { characterId: CharacterId; prompt: string; choices: readonly { id: string; text: string; feedback: string }[]; onNext: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const chosen = choices.find((c) => c.id === picked);
  return (
    <>
      <LifeBean who={characterId} mood={picked ? "thinking" : "anxious"} size={96} />
      <h3 className="play-title">{prompt}</h3>
      <div className="lives-choices is-stack" role="group" aria-label="Responses">
        {choices.map((c) => <button key={c.id} type="button" className="lives-choice is-wide" aria-pressed={picked === c.id} onClick={() => setPicked(c.id)}>{c.text}</button>)}
      </div>
      {chosen && <p className="play-line lives-feedback" role="status">{chosen.feedback}</p>}
      {chosen && <Next onNext={onNext} />}
    </>
  );
}

/** §39 MAKE IT YOURS: the last action plan writes the personal configuration. */
function ActionPlan({ prompt, options, isLast, onPick }: { prompt: string; options: readonly string[]; isLast: boolean; onPick: (o: string) => void }) {
  return (
    <>
      {isLast && <p className="lives-kicker">Make it yours</p>}
      <h3 className="play-title">{prompt}</h3>
      <div className="lives-choices" role="group" aria-label="Your version">{options.map((o) => <button key={o} type="button" className="lives-choice" onClick={() => onPick(o)}>{o}</button>)}</div>
    </>
  );
}

/** §13, §26: the reusable practice activities. Unknown ids get the instruction and a button, never a crash. */
function Practice({ activityId, instruction, onDone }: { activityId: string; instruction: string; onDone: () => void }) {
  if (activityId === "meeting_anchor_simulation") return <MeetingAnchor instruction={instruction} onDone={onDone} />;
  return <><p className="play-line">{instruction}</p><Next onNext={onDone} label="Done" /></>;
}

/** §13: a fake meeting; a thought arrives; put it in LATER; come back to the current discussion. */
function MeetingAnchor({ instruction, onDone }: { instruction: string; onDone: () => void }) {
  const [parked, setParked] = useState<string[]>([]);
  const [returned, setReturned] = useState(false);
  const thoughts = ["BUY FLIGHTS", "THAT PODCAST", "IS THE OVEN ON"];
  const pending = thoughts.filter((t) => !parked.includes(t));
  const current = pending[0];
  return (
    <>
      <p className="lives-kicker">Try it</p>
      <p className="play-line">{instruction}</p>
      <div className="lives-meeting" role="group" aria-label="The meeting">
        <p className="lives-meeting-line">“So the third-quarter numbers are down, and what we need to decide today is, ”</p>
        {current && !returned && <button type="button" className="lives-thought" onClick={() => setParked((p) => [...p, current])}>{current} <span className="lives-thought-hint">→ LATER</span></button>}
        <div className="lives-later" aria-label="Later">
          <span className="play-note-title">Later</span>
          <ul>{parked.map((p) => <li key={p}><Check size={12} weight="bold" aria-hidden="true" /> {p}</li>)}</ul>
        </div>
        {!current && !returned && <button type="button" className="play-tempt is-go" onClick={() => setReturned(true)}>Current discussion</button>}
      </div>
      {returned && <><p className="play-line lives-feedback" role="status">Three thoughts parked, three returns. That is the whole move.</p><Next onNext={onDone} /></>}
    </>
  );
}
