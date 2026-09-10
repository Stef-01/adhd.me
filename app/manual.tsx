"use client";


// My Manual (PRD §27): three sections the person writes about themselves. Yours to edit; nothing
// here is written for you. Suggestions come from what this device already holds and become text
// only when tapped. Device-local; nothing leaves the browser; the analytics event carries the
// section name and nothing else.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Plus } from "@phosphor-icons/react";
import { deviceLearningStorage } from "@/learn/cursor";
import { manualSuggestions, manualText, MANUAL_SECTIONS, withLine } from "@/model/manual";
import { readModel, saveManual, type ManualSection, type ModelRecord } from "@/model/store";
import { track } from "@/model/events";

export function MyManual() {
  const [record, setRecord] = useState<ModelRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const timers = useRef<Partial<Record<ManualSection, number>>>({});
  useEffect(() => { setRecord(readModel(deviceLearningStorage)); }, []);
  const suggestions = useMemo(() => (record ? manualSuggestions(record) : null), [record]);
  if (!record || !suggestions) return <p role="status">Loading…</p>;

  const save = (section: ManualSection, text: string) => {
    setRecord((r) => (r ? { ...r, manual: { ...r.manual, [section]: text } } : r));
    window.clearTimeout(timers.current[section]);
    timers.current[section] = window.setTimeout(() => { setRecord(saveManual(deviceLearningStorage, section, text)); track("MANUAL_EDITED", { section }); }, 400);
  };
  const add = (section: ManualSection, line: string) => { setRecord(saveManual(deviceLearningStorage, section, withLine(record.manual[section], line))); track("MANUAL_EDITED", { section, suggestion: true }); };
  const copy = async () => {
    const text = manualText(record);
    try { await navigator.clipboard.writeText(text); setCopied(true); track("MANUAL_COPIED", { sections: MANUAL_SECTIONS.filter((s) => record.manual[s.id].trim()).length }); window.setTimeout(() => setCopied(false), 2000); } catch { /* The text is on screen; copying by hand still works. */ }
  };
  const written = MANUAL_SECTIONS.some((s) => record.manual[s.id].trim());

  return (
    <div className="me-screen learn-screen manual-screen">
      <header className="life-head">
        <span className="life-eyebrow">My Manual</span>
        <h1 className="life-title">How I work, in my own words.</h1>
        <p className="life-lede">Yours to write and change.</p>
      </header>

      {MANUAL_SECTIONS.map((s) => (
        <section key={s.id} className="life-card manual-section" aria-labelledby={`manual-${s.id}`}>
          <h2 id={`manual-${s.id}`}>{s.title}</h2>
          <textarea className="manual-text" id={`manual-text-${s.id}`} aria-label={s.title} rows={4} value={record.manual[s.id]} placeholder={s.placeholder} onChange={(e) => save(s.id, e.target.value)} />
          {suggestions[s.id].length > 0 && (
            <div className="manual-suggest" role="group" aria-label={`Suggestions for ${s.title.toLowerCase()}`}>
              <span className="manual-suggest-label">From what you have told the app</span>
              <ul className="manual-chips">
                {suggestions[s.id].map((line) => (
                  <li key={line}><button type="button" className="manual-chip" onClick={() => add(s.id, line)}><Plus size={14} weight="bold" aria-hidden="true" /> {line}</button></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      <section className="life-card" aria-labelledby="manual-share">
        <h2 id="manual-share">Share it, if you want to</h2>
        <div className="life-actions">
          <button type="button" className="learn-primary" onClick={copy} disabled={!written}>{copied ? <><Check size={17} weight="bold" aria-hidden="true" /> Copied</> : <><Copy size={17} weight="bold" aria-hidden="true" /> Copy as text</>}</button>
          <Link className="learn-secondary" href="/my-adhd">Back to My ADHD <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
