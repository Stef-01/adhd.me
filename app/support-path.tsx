"use client";

// The support path (PRD §37): problem → what may help → what you can try → when another person
// helps → which professions and why → providers. A person never starts by choosing a profession;
// the profession is the last thing on the page, and "See providers" narrows the finder to it.
// The referral brief (§44) is built from the person's own record, editable, and copied only when
// they choose — nothing is shared by the app.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy } from "@phosphor-icons/react";
import { INTERACTIVE_MODULES } from "@/learn/interactive";
import { LAYER_LABELS } from "@/model/layers";
import { deriveNeeds, type Need } from "@/model/needs";
import { adjustmentTrack, trackForSubdomain } from "@/model/adjustments";
import { escalationEligible, professionsFor, recommend } from "@/model/recommend";
import { track } from "@/model/events";
import { PROFESSION_ENTRIES, profession, type Profession } from "@/support/professions";
import { readFilters, writeFilters } from "@/finder/filters";
import { LifeHeader, WhyThis } from "./life-shell";
import { useModel } from "./use-model";
import { SurveyOffer } from "./survey-offer";
import { offerSurvey } from "@/model/offer";

export function SupportPath() {
  const { record } = useModel();
  const needs = record ? deriveNeeds(record) : [];
  const need: Need | null = needs[0] ?? null;
  const rec = record ? recommend(record) : null;
  const professions = need ? professionsFor(need) : PROFESSION_ENTRIES.map((p) => p.id);
  const eligible = need && record ? escalationEligible(need, record) : false;
  const institution = need ? trackForSubdomain(need.subdomain) : null;
  const teaching = need ? INTERACTIVE_MODULES.filter((m) => m.targets.includes(need.subdomain)) : [];
  const strategies = teaching.flatMap((m) => m.steps.filter((s) => s.kind === "strategy").flatMap((s) => (s.kind === "strategy" ? s.strategies : [])));
  const tried = new Set((record?.experiments ?? []).map((e) => e.strategyId));

  useEffect(() => { if (need) track("SUPPORT_RECOMMENDATION_SHOWN", { need: need.subdomain, eligible }); }, [need, eligible]);

  const seeProviders = (p: Profession) => {
    try {
      const held = readFilters(window.localStorage);
      writeFilters(window.localStorage, { ...held, professions: [p] });
    } catch {
      // The finder still opens; it simply is not narrowed.
    }
    track("PROVIDER_CARD_VIEWED", { profession: p });
  };

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs">
      <LifeHeader />
      <header className="life-head">
        <span className="life-eyebrow">Support</span>
        <h1>{need ? "From the problem to the person." : "Start from the problem, not the profession."}</h1>
      </header>

      {record && !need && (
        <section className="life-empty" aria-labelledby="support-empty">
          <h2 id="support-empty">Nothing to walk from yet.</h2>
          <p>Answer the ten questions, or a module’s, and the path fills in.</p>
          <div className="life-actions" style={{ justifyContent: "center" }}>
            <Link className="learn-primary" href="/start">Start <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
            <Link className="learn-secondary" href="/">Search the finder</Link>
          </div>
        </section>
      )}

      {record && need && (
        <ol className="support-steps">
          <li className="support-step">
            <h2>The problem</h2>
            <p>{need.label}. {need.functionalCost ? `You put the cost at ${need.functionalCost} out of 10.` : ""} {need.userPriority === "yes" ? "You want it easier." : ""}</p>
            {need.contributors.length > 0 && (
              <p>{need.contributors.map((c) => `${LAYER_LABELS[c.layer]}: ${c.note.toLowerCase()}`).join(" · ")}</p>
            )}
          </li>
          <li className="support-step">
            <h2>What may help</h2>
            <p>{teaching[0]?.steps.find((s) => s.kind === "explain")?.body ?? "Understanding the pattern first, then changing the conditions around it."}</p>
          </li>
          <li className="support-step">
            <h2>What you can try yourself</h2>
            {strategies.length === 0 ? <p>The modules on this problem carry the strategies.</p> : (
              <ul className="life-list">
                {strategies.slice(0, 4).map((s) => (
                  <li key={s.id}>{tried.has(s.id) ? <Check size={16} weight="bold" aria-hidden="true" /> : <ArrowRight size={16} weight="bold" aria-hidden="true" />}<span>{s.title}{tried.has(s.id) ? " — on your list" : ""}</span></li>
                ))}
              </ul>
            )}
            {teaching[0] && <p><Link href={`/approach?module=${teaching[0].id}`}>Open “{teaching[0].title}”</Link></p>}
          </li>
          {offerSurvey(record) && (
            <li className="support-step">
              <h2>Sharpen the picture</h2>
              <p>Optional. A topic survey says which part of the problem is the friction before anybody is suggested.</p>
              <SurveyOffer record={record} compact />
            </li>
          )}
          <li className="support-step">
            <h2>When another person helps</h2>
            <p>
              {eligible
                ? "You have tried what is here and it has not been enough. That is the point at which a person who does this for a living is worth it — not before."
                : "When the cost stays high after two or three honest attempts, or when you would simply rather work on it with somebody. Nothing here requires that yet."}
            </p>
            {need.contributors.some((c) => c.layer === "people") && <p>Some of what you described involves the people around you — sharing a module with them is one kind of help that costs nothing.</p>}
          </li>
          {institution && (
            <li className="support-step">
              <h2>Adjustments on paper</h2>
              <p>{institution === "university" ? "This is the kind of problem a university's accessibility service exists for, and most students are never told it does." : "Most of what helps with this is a way of working a manager can agree to, and some of it can be made formal."} What is commonly available, who grants it, and what to bring.</p>
              <p><Link href="/adjustments">{adjustmentTrack(institution).title} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></p>
            </li>
          )}
          <li className="support-step">
            <h2>Which professions could help</h2>
            <p>In order of fit for this problem. Each card says why.</p>
            <ul className="profession-list">
              {professions.map((id, i) => {
                const p = profession(id);
                return (
                  <li key={id} className={`profession-card${i === 0 ? " is-first" : ""}`}>
                    <strong>{p.label}</strong>
                    <p>{p.typicallyFor}</p>
                    <p><em>Why this one:</em> {p.whenToExplore}</p>
                    <Link className="learn-secondary" href="/" onClick={() => seeProviders(id)}>See {p.plural} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
                  </li>
                );
              })}
            </ul>
            {rec && <WhyThis why={rec.why} rule={rec.explain.ruleTriggered} inputs={rec.explain.inputsUsed} version={rec.explain.ruleVersion} />}
          </li>
          <li className="support-step">
            <h2>Before you book: a brief</h2>
            <p>Built from what you have said. Edit it, keep it, or copy it to take with you. The app shares nothing.</p>
            <ReferralBrief need={need} tried={[...tried]} />
          </li>
        </ol>
      )}
    </main>
  );
}

function ReferralBrief({ need, tried }: { need: Need; tried: string[] }) {
  const { record } = useModel();
  const draft = useMemo(() => {
    const helped = need.strategies.filter((s) => s.outcome === "a-lot").map((s) => s.title);
    return {
      help: `${need.label}.`,
      noticed: need.contributors.map((c) => c.note).concat(need.context).join("\n"),
      tried: tried.map((id) => strategyTitle(id)).join("\n"),
      helped: helped.join("\n"),
      goal: record?.onboarding?.improveFirst ? need.label : "",
    };
  }, [need, tried, record]);
  const [fields, setFields] = useState(draft);
  const [copied, setCopied] = useState(false);
  useEffect(() => setFields(draft), [draft]);
  const sections: ReadonlyArray<readonly [string, string]> = [
    ["What I’d like help with", fields.help],
    ["What I’ve noticed", fields.noticed],
    ["What I’ve tried", fields.tried],
    ["What helped", fields.helped],
    ["My goal", fields.goal],
  ];
  const text = sections.filter(([, v]) => v.trim()).map(([k, v]) => `${k}\n${v}`).join("\n\n");
  return (
    <div className="brief">
      {([["help", "What I’d like help with"], ["noticed", "What I’ve noticed"], ["tried", "What I’ve tried"], ["helped", "What helped"], ["goal", "My goal"]] as const).map(([key, label]) => (
        <label key={key}>
          {label}
          <textarea value={fields[key]} rows={2} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} />
        </label>
      ))}
      <div className="life-actions">
        <button type="button" className="learn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } }}>
          <Copy size={16} weight="bold" aria-hidden="true" /> {copied ? "Copied" : "Copy the brief"}
        </button>
      </div>
      <p className="learn-card-foot">Nothing is sent to any provider. Copying puts it on your clipboard and nowhere else.</p>
    </div>
  );
}

function strategyTitle(id: string): string {
  for (const m of INTERACTIVE_MODULES) for (const s of m.steps) if (s.kind === "strategy") { const f = s.strategies.find((x) => x.id === id); if (f) return f.title; }
  return id;
}
