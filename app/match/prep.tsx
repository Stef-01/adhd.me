"use client";

// Phase M (ADR 0007): pre-appointment preparation. The checklist generated from what the person
// wrote, ticked here and saved against their request; the timeline template the required item
// points at; and what to expect at a first appointment, in plain words from the GP's own
// declarations.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { TIMELINE_TEMPLATE } from "@/lib/matching/checklist";
import type { PatientView } from "@/lib/matching/views";
import { fetchPatient, readPatientId } from "./session";

export function MatchPrep() {
  const [view, setView] = useState<PatientView | null | "none">(null);
  const [copied, setCopied] = useState<boolean | null>(null);

  useEffect(() => {
    const id = readPatientId();
    if (!id) {
      setView("none");
      return;
    }
    let cancelled = false;
    fetchPatient(id).then((v) => {
      if (!cancelled) setView(v ?? "none");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(itemId: string, done: boolean) {
    if (!view || view === "none" || !view.checklist) return;
    const optimistic = { ...view, checklist: { ...view.checklist, items: view.checklist.items.map((i) => (i.id === itemId ? { ...i, done } : i)) } };
    setView(optimistic);
    const response = await fetch("/api/match/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: view.id, itemId, done }),
    });
    if (!response.ok) setView(view);
  }

  if (view === null) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <p className="match-lede" role="status">
          Reading your checklist.
        </p>
      </main>
    );
  }

  if (view === "none" || !view.checklist) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <header className="life-head">
          <span className="life-eyebrow">Before the first appointment</span>
          <h1 tabIndex={-1}>Nothing to prepare yet</h1>
          <p className="match-lede">The checklist is written from your request. Start one first.</p>
        </header>
        <div className="match-actions">
          <Link className="is-primary" href="/match">
            Start a request
          </Link>
        </div>
      </main>
    );
  }

  const done = view.checklist.items.filter((i) => i.done).length;

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
      <header className="life-head">
        <span className="life-eyebrow">Before the first appointment</span>
        <h1 tabIndex={-1}>What to bring</h1>
        <p className="match-lede">
          Written from what you told us. {done} of {view.checklist.items.length} ready. Ticks are saved with your request, in this tab.
        </p>
      </header>

      <ul className="match-checklist" data-testid="match-checklist">
        {view.checklist.items.map((item) => (
          <li key={item.id} className={item.required ? "is-required" : ""}>
            <input id={`chk-${item.id}`} type="checkbox" checked={item.done} onChange={(e) => toggle(item.id, e.target.checked)} />
            <label htmlFor={`chk-${item.id}`}>
              <strong>{item.label}</strong>
              <p>{item.why}</p>
            </label>
          </li>
        ))}
      </ul>

      <section className="match-section" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">The symptom timeline, five headings</h2>
        <p className="match-lede">Write a few lines under each. Bring it on paper or on your phone.</p>
        <ol className="match-timeline">
          {TIMELINE_TEMPLATE.map((row) => (
            <li key={row.heading}>
              <strong>{row.heading}</strong>
              <span>{row.prompt}</span>
            </li>
          ))}
        </ol>
        <div className="match-card-actions">
          <button
            type="button"
            data-testid="copy-timeline"
            onClick={async () => {
              const text = TIMELINE_TEMPLATE.map((row) => `${row.heading}\n${row.prompt}\n\n`).join("");
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={16} weight="bold" aria-hidden="true" /> : <Copy size={16} weight="bold" aria-hidden="true" />}
            {copied ? "Copied" : "Copy the headings as text"}
          </button>
        </div>
        {copied === false && <p className="match-copy-note">Copying did not work here; the headings above can be typed out.</p>}
        {copied === true && <p className="match-copy-note">On your clipboard and nowhere else. Paste it into your notes and write under each heading.</p>}
      </section>

      {view.expectations && (
        <section className="match-section" aria-labelledby="expect-heading">
          <h2 id="expect-heading">What to expect with {view.expectations.gpName}</h2>
          <dl className="match-expect">
            {view.expectations.sections.map((s) => (
              <div key={s.title}>
                <dt>{s.title}</dt>
                <dd>{s.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="match-actions">
        <Link href="/match/results">Back to your matches</Link>
      </div>
    </main>
  );
}
