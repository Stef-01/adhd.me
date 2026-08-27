// O192 round 2 (founder-directed): one GP, on their own page.
//
// WHY THIS IS A ROUTE AND NOT THE DIALOG IT REPLACED. The round-1 screenshot audit found the
// modal failing in three ways that all pointed the same direction. The sheet was taller than a
// laptop viewport, so a reader scrolled inside a scrim with the deck greyed out behind them. The
// `layoutId` flight ran the portrait from a large card to a 132px thumbnail, so choosing somebody
// made them SMALLER — the opposite of what engaging with a person should do. And no profile had a
// URL, which for a network whose job is introducing people is a missing feature rather than a
// missing nicety: you could not send a friend the doctor you had just read.
//
// THE ORDER OF THIS PAGE IS THE ARGUMENT. A reader deciding whether a stranger will understand
// them does not start with a qualification list. So: the portrait at a size that holds a face,
// then the one sentence they lead with, then what they say they see often, then their own longer
// account of how they work — and only then the credentials, the practical facts, the declared
// interest and the booking link. The audit found the warmest line in the entire dataset ("gives a
// good deal of his spare time to the long-suffering cause of the Parramatta Eels") buried in the
// second paragraph of a modal; it is now in the body copy of a page built to be read.
//
// Every string about a doctor is still theirs. The headings are ours and they say so.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  NETWORK_CLINICIANS,
  consultingSuburbs,
  neighbours,
  possessiveFor,
  subjectPronoun,
  verbFor,
} from "@/network/gallery";
import { ClinicianPortrait } from "../../finder-stages/shared";
import { InterfaceLaunch } from "../../interface-launch";
import { PublicHeader } from "../../public-header";
import { SiteFooter } from "../../site-footer";
import { nameNoBreak } from "../name";

/** Every GP is a static page — the roster is known at build time. */
export function generateStaticParams() {
  return NETWORK_CLINICIANS.map((clinician) => ({ clinician: clinician.id }));
}

function find(id: string) {
  return NETWORK_CLINICIANS.find((c) => c.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinician: string }>;
}): Promise<Metadata> {
  const { clinician: id } = await params;
  const clinician = find(id);
  if (!clinician) return { title: "Not found" };
  return {
    alternates: { canonical: `/network/${clinician.id}` },
    title: `${clinician.name} — the network`,
    // Their own line. A description we authored would be the one place on this page where we
    // characterised a named doctor, which is the thing `honesty.clinician-declaration` refuses.
    description: clinician.matchLine,
  };
}

export default async function ClinicianPage({
  params,
}: {
  params: Promise<{ clinician: string }>;
}) {
  const { clinician: id } = await params;
  const clinician = find(id);
  if (!clinician) notFound();

  const around = neighbours(clinician.id);
  const suburbs = consultingSuburbs(clinician);

  return (
    <>
      <PublicHeader rightHref="/faq" rightLabel="Questions" />

      <main id="main-content" className="gp">
        <nav className="gp-back" aria-label="Breadcrumb">
          <Link href="/network">
            <span aria-hidden="true">&larr;&nbsp;</span>The network
          </Link>
          {around && (
            <span className="gp-position">
              {around.position} of {around.of}
            </span>
          )}
        </nav>

        {/* The portrait leads and it is LARGE. Round 1 shrank it; a face is why somebody clicked. */}
        <header className="gp-head">
          <div className="gp-portrait">
            <ClinicianPortrait clinician={clinician} variant="fill" />
          </div>

          <div className="gp-identity">
            <h1 className="gp-name">{nameNoBreak(clinician.name)}</h1>
            <p className="gp-pronouns">{clinician.pronouns}</p>
            <p className="gp-where">
              {clinician.practice}
              <span className="gp-where-sep"> · </span>
              {suburbs.join(" & ")}
            </p>
          </div>
        </header>

        {/*
          ROUND 5 MOVED THIS OUT OF THE HEADER, and the reason is round 3's inversion in a
          different dimension. Beside a 300px portrait inside a 720px page, their sentence had a
          348px measure — about four words a line — while the bio two sections below ran the full
          680px. The most important sentence on the page was the narrowest text on it. Across the
          measure it is what `type.serif-display` asks a statement to be, and it is the first
          thing a reader meets after learning whose page this is.
        */}
        <p className="gp-line">{clinician.matchLine}</p>

        {/*
          O201: THE HEADING DESCRIBED A FIELD IT DOES NOT RENDER, AND IT SAID SO TO A PATIENT.
          It read "What {name} says {they} {see} often" over `clinician.experience` — which is career
          history and qualifications: "Medical degree, Australian National University", "Diploma of
          Child Health", "Fellow of the Royal Australian College of General Practitioners". A reader
          deciding whether this GP handles their situation was being told a CV was her caseload.

          What she says she sees often is `fitSignals`, and the deck card already renders it
          correctly. Two other surfaces label THIS field correctly too: `/finder`'s profile calls it
          "Credentials and experience", and `src/directory/render.ts` holds the tree's canonical
          heading for the other concept — "Areas this clinician sees often" — shipped with an
          attribution and an explicit denial that those areas are qualifications. This page was the
          only one in the tree pairing that heading with this field.

          RELABELLED RATHER THAN REWIRED, and the reason is a founder gate. Rendering `fitSignals`
          under a sees-often heading would owe the reader `SCOPE_FRAMING`'s attribution and denial,
          and that constant lives in `src/directory/` — which this surface deliberately does not
          import, because minting directory copy is G6 and `gallery.test.ts` enforces the absence on
          the import lines. A properly-framed sees-often section here is real follow-on work and it
          is the founder's to authorise.

          Only OUR sentence changed. Every string in the list is still hers.
        */}
        <section className="gp-section">
          <h2 className="gp-label">Credentials and experience</h2>
          <ul className="gp-signals">
            {clinician.experience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="gp-section gp-words">
          {/* Round 7: "In HIS words" on a page about one man. See `possessiveFor`. */}
          <h2 className="gp-label">In {possessiveFor(clinician)} words</h2>
          <p className="gp-summary">{clinician.summary}</p>
          <p className="gp-about">{clinician.about}</p>
        </section>

        <section className="gp-section">
          <h2 className="gp-label">The practical things</h2>
          <dl className="gp-facts">
            <div>
              <dt>Languages</dt>
              <dd>{clinician.languages.join(", ")}</dd>
            </div>
            <div>
              <dt>Appointments</dt>
              <dd>{clinician.appointmentLength}</dd>
            </div>
            <div>
              {/*
                ROUND 7: their pronoun here too. Round 3 fixed the section heading and left this
                label and the one below saying "they" about a he/him doctor — the same wrongness,
                smaller type, same page.
              */}
              <dt>
                How {subjectPronoun(clinician)} {verbFor(clinician, "consult")}
              </dt>
              <dd>{clinician.reach}</dd>
            </div>
            <div>
              <dt>Step-free access</dt>
              <dd>{clinician.wheelchairAccessible ? "Yes" : "Not at this practice"}</dd>
            </div>
            <div>
              <dt>Qualifications</dt>
              <dd>{clinician.title}</dd>
            </div>
            <div>
              <dt>Taking new patients</dt>
              <dd>
                {clinician.acceptingNewPatients
                  ? `Yes, as at the date ${subjectPronoun(clinician)} told us`
                  : "Not right now"}
              </dd>
            </div>
          </dl>
        </section>

        {clinician.disclosedInterest && (
          /* W193: above the booking link, never a footnote — the reader deciding is who it is for. */
          <aside className="gp-disclosure">
            <p className="gp-disclosure-label">
              {clinician.disclosedInterestLabel ?? "Declared interest"}
            </p>
            <p>{clinician.disclosedInterest}</p>
          </aside>
        )}

        <a
          className="gp-book"
          href={clinician.booking.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="gp-book-label">See {clinician.shortName}&rsquo;s available times</span>
          <span className="gp-book-note">
            {clinician.booking.via === "healthengine"
              ? "Booking happens on Healthengine, not here."
              : "Booking happens on the practice’s own page, not here."}
          </span>
        </a>

        {around && around.of > 1 && (
          <nav className="gp-slide" aria-label="Other GPs in the network">
            {/*
              One control while both directions lead to the same person — with two GPs a
              back-and-forward pair is one choice offered twice. Above two, direction means
              something and both appear.
            */}
            {around.previous.id === around.next.id ? (
              <Link className="gp-slide-link gp-slide-only" href={`/network/${around.next.id}`}>
                <span className="gp-slide-face" aria-hidden="true">
                  <ClinicianPortrait clinician={around.next} variant="fill" />
                </span>
                <span className="gp-slide-text">
                  <span className="gp-slide-hint">Also in the network</span>
                  <span className="gp-slide-name">
                    {nameNoBreak(around.next.name)}
                    <span aria-hidden="true"> →</span>
                  </span>
                  {/* Their line, so moving on is a choice rather than a page turn. */}
                  <span className="gp-slide-line">{around.next.matchLine}</span>
                </span>
              </Link>
            ) : (
              <>
                <Link className="gp-slide-link" href={`/network/${around.previous.id}`}>
                  <span className="gp-slide-hint">Previous</span>
                  <span className="gp-slide-name">
                    <span aria-hidden="true">&larr;&nbsp;</span>
                    {nameNoBreak(around.previous.name)}
                  </span>
                </Link>
                <Link className="gp-slide-link gp-slide-next" href={`/network/${around.next.id}`}>
                  <span className="gp-slide-hint">Next</span>
                  <span className="gp-slide-name">
                    {nameNoBreak(around.next.name)}
                    <span aria-hidden="true"> →</span>
                  </span>
                </Link>
              </>
            )}
          </nav>
        )}
      </main>

      <SiteFooter />
      <InterfaceLaunch />
    </>
  );
}
