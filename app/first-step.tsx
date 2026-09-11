"use client";

// The two questions, before any list (src/support/pathway.ts holds the table and the reasoning).
//
// THIS SCREEN IS NOT A FORM AND MUST NEVER BECOME ONE. The audit this came from
// (docs/design/finder-ecosystem.md §3) found the page that says "start from the problem" answering
// "I do not know what I need" with a ten-question questionnaire, and calls that the identification
// problem served back to the person who has it. Two taps is the whole budget: one question on the
// screen at a time, no progress bar, no "step 2 of 2", and the answer arrives on the second tap.
//
// The answered question is REPLACED by the next one rather than folded away, because the one law
// is fewer words and a fold is words kept out of the count. Back undoes a tap.

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { track } from "@/model/events";
import { readFilters, writeFilters } from "@/finder/filters";
import { profession } from "@/support/professions";
import {
  CARE_FOR,
  CARE_STAGE,
  FOR_LABELS,
  STAGE_LABELS,
  pathwayFor,
  type CareFor,
  type CareStage,
} from "@/support/pathway";
import { LifeHeader } from "./life-shell";

export function FirstStep() {
  const [who, setWho] = useState<CareFor | null>(null);
  const [stage, setStage] = useState<CareStage | null>(null);
  const path = who && stage ? pathwayFor(who, stage) : null;

  const answer = (nextStage: CareStage) => {
    setStage(nextStage);
    if (who) track("PATHWAY_ANSWERED", { for: who, stage: nextStage });
  };

  // The same route into the finder the support path uses: the filter is written, the link opens
  // the list already narrowed. Nothing else about the two answers is kept.
  const seeProviders = () => {
    if (!path) return;
    try {
      const held = readFilters(window.localStorage);
      writeFilters(window.localStorage, { ...held, professions: [path.through] });
    } catch {
      // The finder still opens; it simply is not narrowed.
    }
    track("PROVIDER_CARD_VIEWED", { profession: path.through });
  };

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs">
      <LifeHeader />
      <header className="life-head">
        <h1>{path ? path.lead : who ? "Where are you up to?" : "Who is this for?"}</h1>
      </header>

      {!who && (
        <ul className="cold-kinds first-step-answers">
          {CARE_FOR.map((id) => (
            <li key={id}>
              <button type="button" className="cold-kind" onClick={() => setWho(id)}>
                <span><strong>{FOR_LABELS[id]}</strong></span>
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {who && !stage && (
        <ul className="cold-kinds first-step-answers">
          {CARE_STAGE.map((id) => (
            <li key={id}>
              <button type="button" className="cold-kind" onClick={() => answer(id)}>
                <span><strong>{STAGE_LABELS[id]}</strong></span>
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {path && (
        <section className="first-step-answer">
          <p>{path.firstStep}</p>
          {path.note && <p className="first-step-note">{path.note}</p>}
          <Link className="learn-secondary" href="/" onClick={seeProviders}>
            See {profession(path.through).plural} <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </section>
      )}

      {who && (
        <p className="cold-start">
          <button
            type="button"
            className="first-step-back"
            onClick={() => (stage ? setStage(null) : setWho(null))}
          >
            Back
          </button>
        </p>
      )}
    </main>
  );
}
