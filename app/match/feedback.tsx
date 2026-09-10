"use client";

// Phase M (ADR 0007): the patient half of the mutual feedback. Three questions on a 1 to 5
// scale, optional words, one match at a time. What is recorded feeds the GP's aggregate and the
// learning loop; nothing here is published as a rating of anybody.

import Link from "next/link";
import { AppSettings } from "../app-settings";
import { useEffect, useState } from "react";
import type { Rating } from "@/lib/matching/types";
import type { PatientView } from "@/lib/matching/views";
import { fetchPatient, readPatientId, type HeldView } from "./session";

const QUESTIONS: ReadonlyArray<{ key: "fit" | "communication" | "clinicalAppropriateness"; label: string; low: string; high: string }> = [
  { key: "fit", label: "Did you feel understood?", low: "Not at all", high: "Completely" },
  { key: "communication", label: "How was the communication?", low: "Hard going", high: "Easy" },
  { key: "clinicalAppropriateness", label: "Was this the right kind of GP for what you needed?", low: "Wrong fit", high: "Right fit" },
];

function Scale({ id, value, onChange, low, high }: { id: string; value: Rating | null; onChange: (r: Rating) => void; low: string; high: string }) {
  return (
    <div>
      <div className="match-scale" role="group" aria-labelledby={id}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(n)} aria-label={`${n} of 5`}>
            {n}
          </button>
        ))}
      </div>
      <p className="match-scale-ends">
        <span>{low}</span>
        <span>{high}</span>
      </p>
    </div>
  );
}

export function MatchFeedback() {
  const [view, setView] = useState<HeldView | null | "none">(null);
  const [matchId, setMatchId] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, Rating | null>>({ fit: null, communication: null, clinicalAppropriateness: null });
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    const id = readPatientId();
    if (!id) {
      setView("none");
      return;
    }
    let cancelled = false;
    fetchPatient(id).then((v) => {
      if (cancelled) return;
      setView(v ?? "none");
      const first = v?.matches.find((m) => m.status === "accepted" || m.status === "completed");
      if (first) setMatchId(first.id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (view === null) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <p className="match-lede" role="status">
          Reading your matches.
        </p>
      </main>
    );
  }

  const eligible = view === "none" ? [] : view.matches.filter((m) => m.status === "accepted" || m.status === "completed");

  if (view === "none" || eligible.length === 0) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <header className="life-head">
        <AppSettings />
          <span className="life-eyebrow">After the appointment</span>
          <h1 tabIndex={-1}>Nothing to tell us about yet</h1>
          <p className="match-lede">This form opens once a GP has accepted your request.</p>
        </header>
        <div className="match-actions">
          <Link className="is-primary" href="/match/results">
            Your matches
          </Link>
        </div>
      </main>
    );
  }

  const ready = matchId !== "" && Object.values(answers).every((a) => a !== null) && state !== "sending";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (view === "none" || !view) return;
    setState("sending");
    const response = await fetch("/api/match/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, patientId: view.id, ...answers, text }),
    });
    setState(response.ok ? "sent" : "failed");
  }

  if (state === "sent") {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <header className="life-head">
        <AppSettings />
          <span className="life-eyebrow">After the appointment</span>
          <h1 tabIndex={-1}>Thank you</h1>
          <p className="match-lede" data-testid="feedback-sent">
            Recorded against this match. It is used to improve who gets matched with whom, and it is never shown as a score of anybody.
          </p>
        </header>
        <div className="match-actions">
          <Link href="/match/results">Your matches</Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
      <header className="life-head">
        <AppSettings />
        <span className="life-eyebrow">After the appointment</span>
        <h1 tabIndex={-1}>How did it go?</h1>
        <p className="match-lede">Three questions about the fit, not the outcome. The GP answers two of their own from their side.</p>
      </header>

      <form className="match-form" onSubmit={submit}>
        {eligible.length > 1 && (
          <label className="match-field">
            <span>Which appointment</span>
            <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
              {eligible.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.gp.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {QUESTIONS.map((q) => (
          <div key={q.key} className="match-field">
            <span id={`q-${q.key}`}>{q.label}</span>
            <Scale id={`q-${q.key}`} value={answers[q.key] ?? null} onChange={(r) => setAnswers((a) => ({ ...a, [q.key]: r }))} low={q.low} high={q.high} />
          </div>
        ))}
        <label className="match-field">
          <span>Anything else, in your words</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Optional." />
        </label>
        {state === "failed" && (
          <p className="match-error" role="alert">
            That could not be saved. Try again.
          </p>
        )}
        <div className="match-actions">
          <button type="submit" className="is-primary" disabled={!ready}>
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
