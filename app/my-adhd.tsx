"use client";

// My ADHD (PRD §26): the person's own picture, in words — the biggest friction, what seems to
// contribute by layer, the pattern, what helps, the current goal, and what is worth exploring —
// plus insight cards (§33), strategy history (§32) and the one control that deletes everything.
// No graphs, no score; every line traces to something the person said.

import Link from "next/link";
import { Explain } from "./explain";
import { useState } from "react";
import { ArrowRight, Check, Sparkle, Trash } from "@phosphor-icons/react";
import { INTERACTIVE_MODULES } from "@/learn/interactive";
import { LAYER_LABELS, SUBDOMAINS } from "@/model/layers";
import { deriveNeeds } from "@/model/needs";
import { isComplete } from "@/model/onboarding";
import { recommend, summarise } from "@/model/recommend";
import { clearModel, hasSignals, recordInsight, type InsightVerdict } from "@/model/store";
import { clearProgress } from "@/learn/progress";
import { clearCursor } from "@/learn/cursor";
import { LifeHeader, WhyThis } from "./life-shell";
import { useModel } from "./use-model";
import { SurveyOffer } from "./survey-offer";
import { NWIA_LABELS, nwiaBalance } from "@/wellness/nwia";

const VERDICT_LABEL: Record<InsightVerdict, string> = { yes: "That’s me", partly: "Partly", no: "Not really" };

export function MyAdhd() {
  const { record, refresh, storage } = useModel();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const summary = record ? summarise(record) : null;
  const needs = record ? deriveNeeds(record) : [];
  const rec = record ? recommend(record) : null;
  const insights = record ? INTERACTIVE_MODULES.flatMap((m) => m.steps.filter((s) => s.kind === "insight").map((s) => (s.kind === "insight" ? { ...s, module: m } : null))).filter((x): x is NonNullable<typeof x> => Boolean(x) && Boolean(record.insights[x!.id])) : [];
  const experiments = record?.experiments ?? [];
  const byOutcome = (o: string) => experiments.filter((e) => (e.outcome ?? "pending") === o);

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs">
      <LifeHeader />
      <header className="life-head">
        <span className="life-eyebrow">My ADHD</span>
        <h1>My ADHD right now.</h1>
        <Explain>Built only from what you have said. Nothing here is a verdict, and all of it can be changed.</Explain>
      </header>

      {record && !hasSignals(record) && (
        <section className="life-empty" aria-labelledby="my-empty">
          <h2 id="my-empty">Nothing here yet — and that is honest.</h2>
          <p>Answer a module’s “Does this happen to you?”, or the ten questions.</p>
          <Explain>This page fills with your own words, and nothing else.</Explain>
          <div className="life-actions" style={{ justifyContent: "center" }}>
            <Link className="learn-primary" href={isComplete(record.onboarding) ? "/approach" : "/start"}>{isComplete(record.onboarding) ? "Explore a module" : "Start"} <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
          </div>
        </section>
      )}

      {record && summary?.need && (
        <>
          <section className="life-card is-lead" aria-labelledby="my-friction">
            <span className="life-eyebrow">Biggest friction</span>
            <h2 id="my-friction">{summary.need.label}.</h2>
            <p>
              {summary.need.confidence === "high" ? "Consistently, across what you have told the app." : summary.need.confidence === "medium" ? "From one module so far — more will sharpen it." : "From onboarding only; a module would make this surer."}
            </p>
            {summary.need.functionalCost > 0 && <p className="learn-card-foot">You put the cost at <span className="t-digit">{summary.need.functionalCost}</span> out of 10.</p>}
          </section>

          <section className="life-card" aria-labelledby="my-contributes">
            <h2 id="my-contributes">What seems to contribute</h2>
            {summary.contributors.length === 0 ? (
              <p>Not enough yet. The personalisation questions inside a module are where this fills in.</p>
            ) : (
              <ul className="life-list">
                {summary.contributors.map((c) => (
                  <li key={`${c.layer}:${c.note}`}><span className="layer-pill" data-layer={c.layer}>{c.label}</span> <span>{c.note}</span></li>
                ))}
              </ul>
            )}
            {summary.pattern && <p className="learn-card-foot"><strong>Pattern:</strong> {summary.pattern}.</p>}
            {/* The NWIA balance principle in one line: the nine dimensions affect each other, so say which your signals touch and which nothing has yet. */}
            {(() => {
              const balance = nwiaBalance([...new Set([...needs.map((n) => n.subdomain), ...needs.flatMap((n) => n.contributors.map((c) => c.subdomain))])], { goal: Boolean(record.onboarding?.improveFirst) });
              return (
                <p className="learn-card-foot" data-testid="nwia-balance">
                  <strong>Balance:</strong> your picture touches {balance.touched.map((d) => NWIA_LABELS[d].toLowerCase()).join(", ")}.
                  {balance.untouched.length > 0 && <> Nothing yet on {balance.untouched.map((d) => NWIA_LABELS[d].toLowerCase()).join(", ")} — which is not a gap, only unasked.</>}
                  {" "}<Link href="/approach/map">See the map</Link>
                </p>
              );
            })()}
          </section>

          <section className="life-card" aria-labelledby="my-helps">
            <h2 id="my-helps">What helps</h2>
            {summary.helps.length === 0 && summary.need.strengths.length === 0 ? (
              <p>Nothing recorded yet. Try one strategy and say how it went.</p>
            ) : (
              <ul className="life-list">
                {summary.helps.map((h) => <li key={h}><Check size={16} weight="bold" aria-hidden="true" /><span>{h}</span></li>)}
                {summary.need.strengths.map((s) => <li key={s}><Sparkle size={16} weight="fill" aria-hidden="true" /><span>{s}</span></li>)}
              </ul>
            )}
          </section>

          <section className="life-card" aria-labelledby="my-manual">
            <h2 id="my-manual">My Manual</h2>
            <p>{record.manual.updatedAt ? "How you work, in your own words. Edit it any time." : "What helps you, what makes things harder, how to work with you — written by you, never for you."}</p>
            <div className="life-actions"><Link className="learn-secondary" href="/manual">{record.manual.updatedAt ? "Open my manual" : "Start my manual"}</Link></div>
          </section>

          <section className="life-card" aria-labelledby="my-adjustments">
            <h2 id="my-adjustments">Adjustments on paper</h2>
            <p>What a university or a workplace can change around you, who grants it, and what to bring when you ask. Most of it exists; most people are never told.</p>
            <div className="life-actions"><Link className="learn-secondary" href="/adjustments">See what is commonly available</Link></div>
          </section>

          {record.onboarding?.medication === "yes" && (
            <section className="life-card" aria-labelledby="my-medication">
              <h2 id="my-medication">Medication</h2>
              <p>{record.medication.updatedAt ? "Your note on what it changes and what it leaves. Edit it before the next conversation." : "Describe what it seems to change, what it leaves untouched and anything unwanted — to take to whoever manages it."}</p>
              <div className="life-actions"><Link className="learn-secondary" href="/medication">{record.medication.updatedAt ? "Open the note" : "Start the note"}</Link></div>
            </section>
          )}

          <section className="life-card" aria-labelledby="my-goal">
            <h2 id="my-goal">Current goal</h2>
            <p>{summary.goal ?? "Not set yet."}</p>
            {summary.worthExploring && <p className="learn-card-foot"><strong>Worth exploring:</strong> {summary.worthExploring}.</p>}
            <div className="life-actions">
              <Link className="learn-secondary" href="/start">Update what matters</Link>
              <Link className="learn-secondary" href="/approach/map">See it on the map</Link>
            </div>
          </section>

          <SurveyOffer record={record} />

          {rec && (
            <section className="life-card" aria-labelledby="my-next">
              <span className="life-eyebrow">Next</span>
              <h2 id="my-next">{rec.heading}</h2>
              <p>{rec.body}</p>
              <div className="life-actions"><Link className="learn-primary" href="/today">Go to Today <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link></div>
              <WhyThis why={rec.why} rule={rec.explain.ruleTriggered} inputs={rec.explain.inputsUsed} version={rec.explain.ruleVersion} />
            </section>
          )}

          {needs.length > 1 && (
            <section className="life-card" aria-labelledby="my-others">
              <h2 id="my-others">Also in the picture</h2>
              <ul className="life-list">
                {needs.slice(1, 5).map((n) => <li key={n.id}><span className="layer-pill" data-layer={LAYER_OF[n.subdomain] ?? "brain"}>{LAYER_LABELS[LAYER_OF[n.subdomain] ?? "brain"]}</span><span>{n.label}{n.functionalCost ? ` · ${n.functionalCost}/10` : ""}</span></li>)}
              </ul>
            </section>
          )}
        </>
      )}

      {record && insights.length > 0 && (
        <section className="life-card" aria-labelledby="my-insights">
          <h2 id="my-insights">Insight cards</h2>
          <p>What the modules suggested, and what you said about each. Change any of them.</p>
          <div className="strategy-history">
            {insights.map((i) => (
              <div key={i.id} className="insight-card">
                <strong>{i.heading}</strong>
                <small>{i.module.title}</small>
                <div className="resonance-row" role="group" aria-label={`Does “${i.heading}” fit`}>
                  {(["yes", "partly", "no"] as const).map((v) => (
                    <button key={v} type="button" className="learn-chip" aria-pressed={record.insights[i.id] === v} onClick={() => refresh(recordInsight(storage, i.id, v))}>{VERDICT_LABEL[v]}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {record && experiments.length > 0 && (
        <section className="life-card" aria-labelledby="my-strategies">
          <h2 id="my-strategies">Strategy history</h2>
          <div className="strategy-history">
            {[["a-lot", "Things that help me"], ["a-little", "Helped a little"], ["no", "Not helpful so far"], ["didnt-try", "Didn’t get to it"], ["pending", "Still testing"]].map(([key, title]) => {
              const list = byOutcome(key!);
              if (list.length === 0) return null;
              return (
                <div key={key}>
                  <h3>{title}</h3>
                  <ul>{list.map((e) => <li key={e.strategyId}>{strategyTitle(e.strategyId)}</li>)}</ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {record && hasSignals(record) && (
        <section className="life-card" aria-labelledby="my-delete">
          <h2 id="my-delete">Your data</h2>
          <p>Everything on this page lives in this browser. Deleting it here deletes it everywhere, because there is nowhere else.</p>
          {!confirmDelete ? (
            <button type="button" className="learn-secondary" onClick={() => setConfirmDelete(true)}><Trash size={16} weight="bold" aria-hidden="true" /> Delete everything the app holds about me</button>
          ) : (
            <div className="life-actions">
              <button type="button" className="learn-primary" onClick={() => { clearModel(storage); clearProgress(storage); clearCursor(storage); setConfirmDelete(false); refresh(); }}>Yes, delete it all</button>
              <button type="button" className="learn-secondary" onClick={() => setConfirmDelete(false)}>Keep it</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const LAYER_OF: Record<string, "brain" | "body" | "environment" | "people"> = Object.fromEntries(SUBDOMAINS.map((s) => [s.id, s.layer]));

function strategyTitle(id: string): string {
  for (const m of INTERACTIVE_MODULES) for (const s of m.steps) if (s.kind === "strategy") { const f = s.strategies.find((x) => x.id === id); if (f) return f.title; }
  return id;
}
