"use client";

// The survey offer card (PRD §20): rendered only when `offerSurvey` says so, with the reason.
// A button, never a redirect. Below it, the surveys a person may start by choice.

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { offerSurvey } from "@/model/offer";
import { availableSurveys } from "@/model/surveys";
import type { ModelRecord } from "@/model/store";

export function SurveyOffer({ record, compact = false }: { record: ModelRecord; compact?: boolean }) {
  const offer = offerSurvey(record);
  const available = availableSurveys(record);
  if (!offer && (compact || available.length === 0)) return null;
  return (
    <section className={offer ? "life-card is-lead" : "life-card"} aria-labelledby="survey-offer-title">
      <span className="life-eyebrow">{offer ? "A few more questions would help" : "Go deeper, if you want to"}</span>
      <h2 id="survey-offer-title">{offer ? `${offer.survey.title}, ${offer.survey.minutes} min` : "Topic surveys"}</h2>
      <p>{offer ? offer.why : "Eight to twelve questions on one part of life. Never required; each one sharpens what the app suggests."}</p>
      <div className="life-actions">
        {offer && <Link className="learn-primary" href={`/survey?id=${offer.survey.id}`}>Start the survey <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>}
        {available.filter((s) => s.id !== offer?.survey.id).slice(0, offer ? 2 : 5).map((s) => (
          <Link key={s.id} className="learn-secondary" href={`/survey?id=${s.id}`}>{s.title}</Link>
        ))}
      </div>
      {offer && <details className="life-why"><summary>Why am I seeing this?</summary><p>{offer.why}</p><p><code>rule survey.offer.{offer.rule}</code></p></details>}
    </section>
  );
}
