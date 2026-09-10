"use client";

// Phase M (ADR 0007): the intake. One box for what the person wants to say, in their own words,
// typed or spoken (the finder's speech session, same disclosure), three declared facts the
// matcher needs (where, for whom, how), and a button. The narrative is posted once and lands in
// the store; the browser keeps only the opaque id that comes back.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Microphone, Stop } from "@phosphor-icons/react";
import { coveredSuburbs } from "@/geo/suburbs";
import { AGE_GROUPS, type AgeGroup, type BillingPreference, type ConsultStyle } from "@/lib/matching/types";
import { AGE_GROUP_LABELS, BILLING_LABELS, CONSULT_STYLE_LABELS } from "@/lib/matching/labels";
import { NARRATIVE_MAX, NARRATIVE_MIN, type PatientView } from "@/lib/matching/views";
import { SPEECH_DISCLOSURE, speechUnavailable, startSpeech, type SpeechSession } from "@/voice/speech";
import { Explain } from "../explain";
import { writePatientId, writeView } from "./session";

const ERROR_COPY: Record<string, string> = {
  narrative: `Say a little more: between ${NARRATIVE_MIN} and ${NARRATIVE_MAX} characters.`,
  suburb: "Say which suburb you are in.",
  rate_limited: "Too many requests in a minute. Wait a moment and try again.",
  failed: "That could not be sent. Try again.",
};

export function MatchIntake() {
  const router = useRouter();
  const [narrative, setNarrative] = useState("");
  const [suburb, setSuburb] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adults");
  const [consultStyle, setConsultStyle] = useState<ConsultStyle>("either");
  const [billing, setBilling] = useState<BillingPreference>("either");
  const [listening, setListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const session = useRef<SpeechSession | null>(null);
  const typedBefore = useRef("");

  useEffect(() => {
    setMicAvailable(!speechUnavailable());
    return () => session.current?.cancel();
  }, []);

  function toggleMic() {
    if (listening) {
      session.current?.stop();
      return;
    }
    typedBefore.current = narrative.trim();
    const started = startSpeech({
      onPartial: (text) => setNarrative([typedBefore.current, text].filter(Boolean).join(" ")),
      onFinal: (text) => {
        session.current = null;
        setListening(false);
        if (text) setNarrative([typedBefore.current, text].filter(Boolean).join(" "));
      },
      onError: () => {
        session.current = null;
        setListening(false);
      },
    });
    if (!started) return;
    session.current = started;
    setListening(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/match/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative, suburb, ageGroup, consultStyle, billing, name: "" }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(ERROR_COPY[body.error ?? "failed"] ?? ERROR_COPY.failed!);
        return;
      }
      const view = (await response.json()) as PatientView;
      writePatientId(view.id);
      writeView(view);
      router.push("/match/results");
    } catch {
      setError(ERROR_COPY.failed!);
    } finally {
      setSending(false);
    }
  }

  const ready = narrative.trim().length >= NARRATIVE_MIN && suburb.trim().length > 0 && !sending;

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
      <header className="life-head">
        <span className="life-eyebrow">Find a GP</span>
        <h1 tabIndex={-1}>What are you looking for?</h1>
        <Explain className="match-lede">
          Say it the way you would to a friend: what is going on, what you want from a GP, what would put you off. Three GPs come back with a reason each, and each of them sees your request and answers from their side.
        </Explain>
      </header>

      <form className="match-form" onSubmit={submit}>
        <label className="match-field">
          <span>In your own words</span>
          <textarea
            id="match-narrative"
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            maxLength={NARRATIVE_MAX}
            placeholder="e.g. I think I have had ADHD my whole life. I want an adult assessment with someone who will not rush me. I have anxiety too, and telehealth would be easier."
            required
          />
          <small>No names or Medicare numbers.</small>
          <Explain as="small">Anything that cannot wait for an appointment is a call to your usual GP or emergency services, not this box.</Explain>
        </label>

        <div className="match-row">
          <button type="button" className="match-mic" aria-pressed={listening} onClick={toggleMic} disabled={!micAvailable}>
            {listening ? <Stop size={18} weight="fill" aria-hidden="true" /> : <Microphone size={18} weight="bold" aria-hidden="true" />}
            {listening ? "Tap when you have finished" : micAvailable ? "Say it instead" : "Microphone not available here"}
          </button>
        </div>
        <details className="match-disclosure">
          <summary>How the microphone works</summary>
          <p>{SPEECH_DISCLOSURE}</p>
        </details>

        <label className="match-field">
          <span>Suburb</span>
          <input id="match-suburb" type="text" list="match-suburbs" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Epping" required />
          <datalist id="match-suburbs">
            {coveredSuburbs().map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Explain as="small">Used for distance only. A suburb we do not hold yet is scored at the midpoint, not against you.</Explain>
        </label>

        <div className="match-row">
          <label className="match-field">
            <span>This is for</span>
            <select id="match-age-group" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {AGE_GROUP_LABELS[g]}
                </option>
              ))}
            </select>
          </label>
          <label className="match-field">
            <span>Appointments</span>
            <select id="match-consult-style" value={consultStyle} onChange={(e) => setConsultStyle(e.target.value as ConsultStyle)}>
              {(["either", "telehealth", "in-person"] as const).map((s) => (
                <option key={s} value={s}>
                  {CONSULT_STYLE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="match-field">
            <span>Billing</span>
            <select id="match-billing" value={billing} onChange={(e) => setBilling(e.target.value as BillingPreference)}>
              {(["either", "bulk-billing", "medicare-gap", "private"] as const).map((b) => (
                <option key={b} value={b}>
                  {BILLING_LABELS[b]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="match-error" role="alert">
            {error}
          </p>
        )}

        <div className="match-actions">
          <button type="submit" className="is-primary" disabled={!ready}>
            {sending ? "Matching" : "Find my three"}
          </button>
        </div>
      </form>
    </main>
  );
}
