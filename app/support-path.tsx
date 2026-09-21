"use client";

// The support path (PRD §37): problem → what may help → what you can try → when another person
// helps → which professions and why → providers. A person never starts by choosing a profession;
// the profession is the last thing on the page, and "See providers" narrows the finder to it.
// The referral brief (§44) is built from the person's own record, editable, and copied only when
// they choose — nothing is shared by the app.

import Link from "next/link";
import { SkillRecommendation } from "./skill-recommendation";
import { useEffect, useState } from "react";
import { ArrowRight, CaretRight } from "@phosphor-icons/react";
import { deriveNeeds, type Need } from "@/model/needs";
import { adjustmentTrack, trackForSubdomain } from "@/model/adjustments";
import { escalationEligible, professionsFor, recommend } from "@/model/recommend";
import { track } from "@/model/events";
import { PROFESSION_ENTRIES, profession, type Profession } from "@/support/professions";
import { readFilters, writeFilters } from "@/finder/filters";
import { LifeHeader, WhyThis } from "./life-shell";
import { useModel } from "./use-model";


export function SupportPath() {
  const { record } = useModel();
  const needs = record ? deriveNeeds(record) : [];
  const need: Need | null = needs[0] ?? null;
  const rec = record ? recommend(record) : null;
  const professions = need ? professionsFor(need) : PROFESSION_ENTRIES.map((p) => p.id);
  const eligible = need && record ? escalationEligible(need, record) : false;
  const institution = need ? trackForSubdomain(need.subdomain) : null;

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
    <main id="main-content" className="me-screen life-screen map-screen app-page-with-tabs">
      <LifeHeader />
      <header className="life-head">
        <h1>{need ? "Who could help?" : "Which kind of help?"}</h1>
      </header>

      {record && !need && <ColdKinds seeProviders={seeProviders} />}

      {record && need && (
        <div className="support-now">
          {/* The problem, in the person's own terms and nothing else. The cost stays off this
              screen: a number about somebody is the one thing the map is built not to show, and
              a profession card does not need it to be the right card. */}
          <p className="map-stands-out">{need.label}.</p>

          <ul className="profession-list">
            {professions.slice(0, 3).map((id, i) => {
              const p = profession(id);
              return (
                <li key={id} className={`profession-card${i === 0 ? " is-first" : ""}`}>
                  <strong>{p.label}</strong>
                  <p>{p.inAWord}</p>
                  <Link className="learn-secondary" href="/" onClick={() => seeProviders(id)}>
                    See {p.plural} <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <SkillRecommendation />

          {institution && (
            <p className="map-foot">
              <Link href="/adjustments">
                {adjustmentTrack(institution).title} <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </Link>
            </p>
          )}

          {/* The referral brief used to be five textareas at the bottom of this screen, which a
              person had to fill in themselves. It is one tap on the map now, already written from
              what they told the app. */}
          {/* `.map-foot` on its own is the muted 13px row the map uses for its utility links
              (history, delete). This is not a utility link — it is the way off this screen, and it
              was rendering fainter and smaller than the "Why am I seeing this?" disclosure
              underneath it. `is-onward` gives it that disclosure's weight and no more. */}
          <p className="map-foot is-onward">
            <Link href="/my-adhd">Take this to my GP <ArrowRight size={14} weight="bold" aria-hidden="true" /></Link>
          </p>

          {rec && <WhyThis why={rec.why} rule={rec.explain.ruleTriggered} inputs={rec.explain.inputsUsed} version={rec.explain.ruleVersion} />}
        </div>
      )}
    </main>
  );
}

/** The first few, then the rest (the taste sheet's law): eleven kinds is a list, six is a choice. */
const COLD_FIRST = 6;

/**
 * WHAT A PERSON WHO HAS TOLD US NOTHING SEES (Charmaine Bernie, occupational therapist and
 * service-access researcher, 2026-09-11).
 *
 * This page is the one that says "start from the problem, not the profession", and the finder's
 * welcome links to it with exactly those words. Until now, a first-time reader who followed that
 * link was told "Nothing to walk from yet. Answer the ten questions and the path fills in." — a
 * questionnaire, in answer to "I do not know what I need". That is the identification problem she
 * named, served back to the person who has it: she tested searching for which professional could
 * help and found very little useful, and people spend years on the wrong waitlist because of it.
 *
 * So the cold page is the kinds of help themselves, each saying what it is for in three or four
 * words, each one opening the finder narrowed to it. The ten questions are still here and still
 * better — they produce the ranked version below, in order of fit for the person's own problem —
 * but they are now an offer rather than a toll.
 *
 * IT CLAIMS NO ORDER, because it has not earned one (the taste sheet's honesty gate). The ranked
 * version says "In order of fit for this problem"; this one says what each is for and nothing
 * about which is yours. The order is the register's own, declared in `src/support/professions.ts`.
 */
function ColdKinds({ seeProviders }: { seeProviders: (p: Profession) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? PROFESSION_ENTRIES : PROFESSION_ENTRIES.slice(0, COLD_FIRST);
  return (
    <section className="support-cold" aria-labelledby="support-cold-title">
      <h2 id="support-cold-title" className="sr-only">The kinds of help</h2>
      <ul className="cold-kinds">
        {shown.map((p) => (
          <li key={p.id}>
            <Link className="cold-kind" href="/" onClick={() => seeProviders(p.id)}>
              <span>
                <strong>{p.label}</strong>
                <span>{p.inAWord}</span>
              </span>
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      {!all && (
        <button type="button" className="learn-secondary cold-all" onClick={() => setAll(true)}>
          All {PROFESSION_ENTRIES.length} kinds
        </button>
      )}
      {/* Two questions, not ten. This line used to offer the onboarding, which is the toll the
          audit caught this page charging in the first place (docs/design/finder-ecosystem.md §3);
          /first-step answers the same "not sure" in two taps, and the ten questions are still
          offered on Today, in the tab bar and in the settings sheet. */}
      <p className="cold-start">
        <Link href="/first-step">Not sure? Two questions<CaretRight size={14} weight="bold" aria-hidden="true" /></Link>
      </p>
    </section>
  );
}
