"use client";

// O26: the wire the O24 hero was missing.
//
// The hero sold the mix ("Set my mix") and the form never asked for it — the percent a GP
// dialled in was discarded the moment they scrolled. This component is the single owner of
// that number: the hero edits it, the form submits it. One extra rule carries the honesty:
// the value only becomes part of the application once the GP has actually touched the
// control, because the hero opens at 30% and a default nobody set is not a declaration.

import Link from "next/link";
import { useState } from "react";
import { ClinicianJoinForm } from "./join-form";
import { MixHero } from "./mix-hero";

export function JoinExperience() {
  const [percent, setPercent] = useState(30);
  const [touched, setTouched] = useState(false);

  return (
    <div className="join-wrap">
      <header className="join-header">
        <Link href="/clinicians" className="join-back">For clinicians</Link>
        <p className="eyebrow">Join the directory</p>
        {/* O24: the payoff before the form. The application used to open with its own cost
            (five minutes of questions); it now opens with the one idea that makes finishing
            worth it — the GP setting their own case mix — stated as a sentence they complete
            themselves. */}
        <MixHero
          percent={percent}
          onSetPercent={(value) => {
            setPercent(value);
            setTouched(true);
          }}
        />
        <h1>Be findable by the people already looking.</h1>
        <p className="join-lead">
          For GPs who have completed the NSW training. Five minutes, and a person reads every
          application.
        </p>
      </header>

      <div id="join-form">
        <ClinicianJoinForm desiredMixPercent={touched ? percent : undefined} />
      </div>
    </div>
  );
}
