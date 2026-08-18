import type { Metadata } from "next";
import Link from "next/link";
import { ClinicianJoinForm } from "./join-form";
import { MixHero } from "./mix-hero";

export const metadata: Metadata = {
  alternates: { canonical: "/clinicians/join" },
  title: "Join the directory",
  description:
    "For GPs who have completed the NSW training to carry ADHD care. Apply to be listed in the ADHD.ME directory.",
};

export default function JoinPage() {
  return (
    <main className="join-page">
      <div className="join-wrap">
        <header className="join-header">
          <Link href="/clinicians" className="join-back">For clinicians</Link>
          <p className="eyebrow">Join the directory</p>
          {/* O24: the payoff before the form. The application used to open with its own cost
              (five minutes of questions); it now opens with the one idea that makes finishing
              worth it — the GP setting their own case mix — stated as a sentence they complete
              themselves. */}
          <MixHero />
          <h1>Be findable by the people already looking.</h1>
          <p className="join-lead">
            For GPs who have completed the NSW training. Five minutes, and a person reads every
            application.
          </p>
        </header>

        <div id="join-form">
          <ClinicianJoinForm />
        </div>
      </div>
    </main>
  );
}
