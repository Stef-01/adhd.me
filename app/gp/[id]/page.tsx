// Phase M (ADR 0007): a GP's profile from the matching model. Everything on it is either the
// GP's own declaration, labelled as declared, or a fact somebody checked, labelled with the date.
// The one aggregate is a count of people who said they felt understood, with a floor of five;
// there is no score, no star and no review, because a patient's opinion of a health service is
// a testimonial whatever it is called (src/directory/profile.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gpById } from "@/lib/matching/store";
import { AGE_GROUP_LABELS, COMORBIDITY_LABELS, MANNER_LABELS, PACE_LABELS, PHILOSOPHY_LABELS, declaredCopy } from "@/lib/matching/labels";
import type { Comorbidity } from "@/lib/matching/types";
import { gpPublicView } from "@/lib/matching/views";
import { ROBOTS_META } from "@/security/robots";
import { Badges, Portrait } from "../../match/gp-bits";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const gp = gpById(id);
  return {
    title: gp ? gp.name : "GP profile",
    robots: ROBOTS_META,
    alternates: { canonical: `/gp/${id}` },
    description: gp ? `${gp.name}, ${gp.practice}: how they work, what they declare, and whether they are taking new matches.` : undefined,
  };
}

export default async function GPProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gp = gpById(id);
  if (!gp) notFound();
  const view = gpPublicView(gp);
  const manner = view.communicationStyle.map((m) => MANNER_LABELS[m as keyof typeof MANNER_LABELS] ?? m);

  return (
    <div className="platform-shell">
      <main id="main-content" className="me-screen life-screen match-screen">
        <header className="match-profile-head">
          <Portrait gp={view} />
          <div>
            <span className="life-eyebrow">GP profile</span>
            <h1 tabIndex={-1}>{view.name}</h1>
            <p>
              {view.practice}, {view.suburb}
            </p>
          </div>
        </header>

        <Badges gp={view} brief />


        {view.feltUnderstood && (
          <p className="match-status" data-testid="felt-understood">
            {view.feltUnderstood}
          </p>
        )}

        <section className="match-section" aria-labelledby="how-heading">
          <h2 id="how-heading">How they work</h2>
          <div className="match-bio">
            {(() => {
              // The first sentence is the profile's own line; everything after it opens on request.
              const sentences = view.bio.split(/(?<=[.!?])\s+(?=[A-Z])/);
              const first = sentences[0] ?? "";
              const rest = [sentences.slice(1).join(" ")].filter((s) => s.trim().length > 0);
              return (
                <>
                  {first && <p>{first}</p>}
                  {(rest.length > 0 || view.prescribingPhilosophyText) && (
                    <details className="match-more">
                      <summary>More about how they work</summary>
                      {rest.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {view.prescribingPhilosophyText && <p>{view.prescribingPhilosophyText}</p>}
                    </details>
                  )}
                </>
              );
            })()}
          </div>
          {manner.length > 0 && (
            <ul className="match-badges" aria-label="Ways of working, declared">
              {manner.map((m) => (
                <li key={m} className="match-badge">
                  {m}
                </li>
              ))}
            </ul>
          )}
          {view.videoIntroUrl && (
            <p>
              <a href={view.videoIntroUrl} target="_blank" rel="noreferrer">
                Short video introduction
              </a>
            </p>
          )}
        </section>

        <section className="match-section" aria-labelledby="who-heading">
          <h2 id="who-heading">Who they see</h2>
          <ul className="match-facts">
            <li>
              <span>Age groups</span>
              <span>{view.ageGroups.map((g) => AGE_GROUP_LABELS[g]).join(", ")}</span>
            </li>
            <li>
              <span>Alongside ADHD</span>
              <span>{view.caseloadMix.length > 0 ? view.caseloadMix.map((c) => COMORBIDITY_LABELS[c as Comorbidity] ?? c).join(", ") : "Not declared"}</span>
            </li>
            <li>
              <span>Medication</span>
              <span>{view.credentials.prescribingPhilosophy ? PHILOSOPHY_LABELS[view.credentials.prescribingPhilosophy] : "Not declared"}</span>
            </li>
            <li>
              <span>Dose changes</span>
              <span>{view.credentials.titrationPace ? PACE_LABELS[view.credentials.titrationPace] : "Not declared"}</span>
            </li>
            <li>
              <span>First appointment</span>
              <span>{view.appointmentLength}</span>
            </li>
            <li>
              <span>Telehealth</span>
              <span>{view.telehealthAvailable ? "Yes, including the first appointment" : "Not declared"}</span>
            </li>
            {view.languages.length > 0 && (
              <li>
                <span>Languages beside English</span>
                <span>{view.languages.join(", ")}</span>
              </li>
            )}
          </ul>
        </section>

        <section className="match-section" aria-labelledby="cred-heading">
          <h2 id="cred-heading">Credentials, as declared and as checked</h2>
          <ul className="match-facts">
            <li>
              <span>Checked</span>
              <span>{view.verification.status === "verified" && view.verification.verifiedOn ? `Yes, on ${view.verification.verifiedOn}` : view.verification.status === "rejected" ? "Not accepted" : "Not yet"}</span>
            </li>
            <li>
              <span>AADPA training</span>
              <span>{declaredCopy(view.credentials.aadpaTrained, "Declared", "Declared no")}</span>
            </li>
            <li>
              <span>RACGP Specific Interests member</span>
              <span>{declaredCopy(view.credentials.racgpSpecificInterestsMember, "Declared", "Declared no")}</span>
            </li>
            <li>
              <span>NSW ADHD training</span>
              <span>{declaredCopy(view.credentials.stateAdhdTrained, "Declared", "Declared no")}</span>
            </li>
            <li>
              <span>Years with ADHD</span>
              <span>{view.credentials.yearsTreatingAdhd === null ? "Not declared" : `${view.credentials.yearsTreatingAdhd}, declared`}</span>
            </li>
          </ul>
        </section>

        <div className="match-actions">
          <Link className="is-primary" href="/match">
            Get matched
          </Link>
          <Link href="/">Search the finder</Link>
        </div>
      </main>
    </div>
  );
}
