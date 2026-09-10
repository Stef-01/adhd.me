"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Sparkle, HandTap, ArrowCounterClockwise } from "@phosphor-icons/react";

const DISCOVERIES = [
  { title: "Attention", detail: "Attention can shift with interest, context and the task. Difficulty directing it is different from having none.", glyph: "◎" },
  { title: "Working memory", detail: "Keeping a step visible can reduce how much needs to be held in mind at once.", glyph: "▤" },
  { title: "Getting started", detail: "A next action can be smaller than a whole task: open the document, then write its title.", glyph: "↗" },
];
const CARE = [
  { title: "Find a name", detail: "Read the declared information. A listing can show what the clinician has said they offer.", glyph: "01" },
  { title: "Ask the practice", detail: "Check fees, availability and appointment length before deciding to book.", glyph: "02" },
  { title: "Have a conversation", detail: "Ask what the assessment involves, what to bring and what happens afterwards.", glyph: "03" },
];
const QUESTIONS = ["What is the full fee?", "Is there a rebate or gap?", "How long is the appointment?", "Can follow-ups be by telehealth?"];

export function LearningActivity({ topic, step }: { topic: string; step: number }) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [ordered, setOrdered] = useState<number[]>([]);
  const [feedback, setFeedback] = useState("");
  const enter = reduced ? { opacity: 1 } : { opacity: 0, y: 12, scale: .98 };
  const press = reduced ? undefined : { scale: .97 };
  if (topic === "everyday" && step > 0) {
    const tasks = ["Open the document", "Write a rough title", "Add one bullet"];
    return <aside className="activity activity-sequence" aria-label="Build a first step">
      <div className="activity-heading"><span className="activity-label"><HandTap size={17} /> TRY IT OUT</span><span>{ordered.length} / 3 placed</span></div>
      <h3>Put these in a helpful order.</h3><p>Put this example into a helpful order. Choose the next small action.</p>
      <div className="sequence-track">{tasks.map((_, i) => <motion.div key={i} layout className={ordered[i] !== undefined ? "sequence-slot is-filled" : "sequence-slot"}><span>{i + 1}</span>{ordered[i] !== undefined ? tasks[ordered[i]!] : "Next small action"}</motion.div>)}</div>
      <div className="sequence-options">{[2, 0, 1].map(i => <motion.button key={i} whileTap={press} disabled={ordered.includes(i)} onClick={() => {
        if (i === ordered.length) { setOrdered([...ordered, i]); setFeedback(i === 2 ? "A whole task became three visible actions. You built a starting point." : "That gives the next action somewhere to begin."); }
        else setFeedback("Try the action that gives the others a place to happen.");
      }}>{tasks[i]}<ArrowRight size={17} /></motion.button>)}</div>
      <p className="activity-feedback" role="status">{feedback}</p>
      {ordered.length === 3 && <button className="activity-reset" onClick={() => { setOrdered([]); setFeedback(""); }}><ArrowCounterClockwise size={16} /> Try again</button>}
    </aside>;
  }
  if (topic === "cost") return <aside className="activity activity-checklist" aria-label="Collect questions for a practice">
    <div className="activity-heading"><span className="activity-label"><Sparkle size={17} /> QUESTION KIT</span><span>{revealed.length} / {QUESTIONS.length} collected</span></div>
    <h3>Know what to ask.</h3><p>Collect the questions you would include in this example conversation.</p>
    <div className="question-kit">{QUESTIONS.map((q, i) => <motion.button key={q} whileTap={press} aria-pressed={revealed.includes(i)} onClick={() => setRevealed(revealed.includes(i) ? revealed.filter(n => n !== i) : [...revealed, i])}><span className="kit-check">{revealed.includes(i) ? <Check size={18} weight="bold" /> : "+"}</span>{q}</motion.button>)}</div>
    <p role="status" className="activity-feedback">{revealed.length === QUESTIONS.length ? "Your example question kit is ready. Clear answers make the next decision easier to understand." : "Selections stay in this activity only."}</p>
  </aside>;
  if (topic === "changed") return <aside className="activity activity-timeline" aria-label="Explore how the route changes">
    <h3>Who holds the next step?</h3>
    <div className="timeline-switch" role="group" aria-label="Choose a route">{["Several handoffs", "One continuing conversation"].map((label, i) => <button key={label} aria-pressed={(selected ?? 0) === i} onClick={() => setSelected(i)}>{label}</button>)}</div>
    <div className="timeline-stations">{((selected ?? 0) === 0 ? ["First appointment", "Referral", "Another appointment", "Review"] : ["First appointment", "Assessment conversation", "Plan and review"]).map((label, i) => <motion.div key={`${selected}-${label}`} initial={enter} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: reduced ? 0 : i * .06 }}><span>{i + 1}</span><strong>{label}</strong></motion.div>)}</div>
    <p className="activity-feedback" role="status">{selected === 1 ? "An illustration of continuity. What an individual GP can offer depends on their training, authorisation and practice." : "An illustration of handoffs. The module explains how routes differ; it is not a promise of a particular pathway."}</p>
  </aside>;
  if (topic !== "adhd" && topic !== "finding") return null;
  const cards = topic === "adhd" ? DISCOVERIES : CARE;
  return <aside className={`activity ${topic === "adhd" ? "activity-discovery" : "activity-route"}`} aria-label={topic === "adhd" ? "Explore three ideas" : "Explore the care conversation"}>
    <div className="activity-heading"><span className="activity-label"><HandTap size={17} /> {topic === "adhd" ? "TURN AN IDEA OVER" : "FOLLOW THE CONVERSATION"}</span><span>{revealed.length} / 3 explored</span></div>
    <h3>{topic === "adhd" ? "A different way to look at it." : "A name is just the beginning."}</h3>
    <div className="discovery-grid">{cards.map((card, i) => <motion.button key={card.title} whileHover={reduced ? undefined : { y: -5, rotate: i === 1 ? 1 : -1 }} whileTap={press} aria-pressed={selected === i} onClick={() => { setSelected(i); setRevealed([...new Set([...revealed, i])]); }}><motion.span className="discovery-glyph" animate={{ rotate: selected === i && !reduced ? 8 : 0 }}>{revealed.includes(i) ? <Check size={30} /> : card.glyph}</motion.span><strong>{card.title}</strong><span>{selected === i ? "Exploring" : "Reveal idea"} <ArrowRight size={16} /></span></motion.button>)}</div>
    <AnimatePresence mode="wait" initial={false}>{selected !== null && <motion.p key={selected} initial={enter} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="activity-feedback" role="status">{cards[selected]?.detail}</motion.p>}</AnimatePresence>
    {revealed.length === 3 && <motion.p initial={enter} animate={{ opacity: 1, y: 0, scale: 1 }} className="discovery-earned"><Sparkle size={19} weight="fill" /> Three ideas explored. Take the one that sticks.</motion.p>}
  </aside>;
}
