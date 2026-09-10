"use client";

// Medication experience (PRD §47): described, never advised on. Three fields the person fills in
// their own words, on this device, to take to whoever manages their medication. The page says
// nothing about doses, timing or whether to take it; that conversation is theirs to have with
// that person, and this note is what they bring to it.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "@phosphor-icons/react";
import { deviceLearningStorage } from "@/learn/cursor";
import { MEDICATION_FIELDS, medicationText } from "@/model/medication";
import { readModel, saveMedicationNote, type MedicationField, type ModelRecord } from "@/model/store";
import { track } from "@/model/events";

export function MedicationExperience() {
  const [record, setRecord] = useState<ModelRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const timers = useRef<Partial<Record<MedicationField, number>>>({});
  useEffect(() => { setRecord(readModel(deviceLearningStorage)); }, []);
  if (!record) return <p role="status">Loading…</p>;

  const save = (field: MedicationField, text: string) => {
    setRecord((r) => (r ? { ...r, medication: { ...r.medication, [field]: text } } : r));
    window.clearTimeout(timers.current[field]);
    timers.current[field] = window.setTimeout(() => { setRecord(saveMedicationNote(deviceLearningStorage, field, text)); track("MEDICATION_NOTE_EDITED", { field }); }, 400);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(medicationText(record)); setCopied(true); track("MEDICATION_NOTE_COPIED", { fields: MEDICATION_FIELDS.filter((f) => record.medication[f.id].trim()).length }); window.setTimeout(() => setCopied(false), 2000); } catch { /* The text is on screen. */ }
  };
  const written = MEDICATION_FIELDS.some((f) => record.medication[f.id].trim());

  return (
    <div className="me-screen learn-screen manual-screen">
      <header className="life-head">
        <h1 className="life-title">What it changes, what it leaves, in your words.</h1>
        <p className="life-lede">A note for whoever manages your medication.</p>
      </header>

      {MEDICATION_FIELDS.map((f) => (
        <section key={f.id} className="life-card manual-section" aria-labelledby={`med-${f.id}`}>
          <h2 id={`med-${f.id}`}>{f.title}</h2>
          <textarea className="manual-text" id={`med-text-${f.id}`} aria-label={f.title} rows={4} value={record.medication[f.id]} placeholder={f.placeholder} onChange={(e) => save(f.id, e.target.value)} />
        </section>
      ))}

      <section className="life-card" aria-labelledby="med-bring">
        <h2 id="med-bring">Bring it to the person who manages it</h2>
        <p>Copy as text.</p>
        <div className="life-actions">
          <button type="button" className="learn-primary" onClick={copy} disabled={!written}>{copied ? <><Check size={17} weight="bold" aria-hidden="true" /> Copied</> : <><Copy size={17} weight="bold" aria-hidden="true" /> Copy as text</>}</button>
          <Link className="learn-secondary" href="/my-adhd">Back to My ADHD <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
