// O192 (founder-directed): `/network` — the browse-first half of the product.
//
// A SEPARATE URL IS THE POINT, not an implementation detail. The founder's instruction was that
// the finder "has a different URL, this will help differentiate the two experiences": a reader can
// send somebody the network without sending them a search box, and the two experiences stop being
// two modes of one screen that a visitor has to discover.
//
// ROUND 2 REPLACED A MODAL WITH ROUTES, and the reason came out of the first screenshot audit
// rather than a preference. The deck opened each doctor in a dialog, which produced three faults
// at once: the sheet was taller than a laptop viewport so it scrolled INSIDE a scrim, the shared-
// element flight ran the portrait from large to small so engaging with a person made them less
// present, and no profile had a URL — you could not send anybody a doctor. Giving each clinician a
// real page fixes all three and adds the thing a network that introduces people actually needs:
// every GP is shareable on their own.
//
// The deck is therefore a SERVER component again — it holds no state now that opening a profile is
// a navigation. The only client code left on this route is the launch control, which needs the
// pathname.
//
// INDEXED, BY FOUNDER DECISION 2026-08-26. An earlier draft shipped `robots: index:false` behind
// founder gate G6 (Ahpra advertising review of profile copy). The founder removed that hold in the
// same session — "remove all Ahpra review, we have experts that will do this" — which is the
// gate's owner answering the gate's question. Recorded in `src/design/founder-gates.ts`
// (`FOUNDER_DECISIONS`) rather than only in this comment. What did not change: every sentence
// about a doctor is still their own declaration out of the roster, and the rendered honesty sweep
// still runs over these pages.

import type { Metadata } from "next";
import Link from "next/link";
import { NETWORK_CLINICIANS, NETWORK_COPY, consultingSuburbs } from "@/network/gallery";
import { ClinicianPortrait } from "../finder-stages/shared";
import { InterfaceLaunch } from "../interface-launch";
import { PublicHeader } from "../public-header";
import { SiteFooter } from "../site-footer";
import { nameNoBreak } from "./name";

export const metadata: Metadata = {
  alternates: { canonical: "/network" },
  title: "The network",
  description:
    "The GPs in the ADHD.ME network, in their own words — what each one says about how they work, the languages they speak and where they consult.",
};

export default function NetworkPage() {
  return (
    <>
      {/*
        The header does NOT repeat the finder here. The launch control in the bottom-right corner
        is this page's route to `/finder`, and a second link to the same place in the top-right
        would spend the page's two most valuable corners on one destination. So the header offers
        the door the network does not: the questions a reader has before they read anybody.
      */}
      <PublicHeader rightHref="/faq" rightLabel="Questions" />

      <main id="main-content" className="network">
        <header className="network-hero">
          <p className="network-eyebrow">{NETWORK_COPY.eyebrow}</p>
          <h1 className="network-heading">{NETWORK_COPY.heading}</h1>
          <p className="network-declaration">{NETWORK_COPY.declarationNote}</p>
        </header>

        {NETWORK_CLINICIANS.length === 0 ? (
          <p className="network-empty">{NETWORK_COPY.galleryEmpty}</p>
        ) : (
          <ul className="network-deck">
            {NETWORK_CLINICIANS.map((clinician) => (
              <li key={clinician.id} className="network-card">
                <Link href={`/network/${clinician.id}`} className="network-card-open">
                  <span className="network-card-portrait">
                    <ClinicianPortrait clinician={clinician} variant="fill" />
                  </span>

                  <span className="network-card-body">
                    <strong className="network-card-name">{nameNoBreak(clinician.name)}</strong>
                    <span className="network-card-where">
                      {consultingSuburbs(clinician).join(" & ")}
                    </span>
                    {/* Their line, not ours — the one sentence each doctor leads with. */}
                    <span className="network-card-line">{clinician.matchLine}</span>

                    {/*
                      ROUND 2: the signals moved onto the card. The audit found the concrete,
                      humanising facts — what someone actually says they see often — sitting two
                      clicks away behind credentials, while the card carried a generic "Read more".
                      These are the lines a reader recognises themselves in, so they come first.
                    */}
                    <span className="network-card-signals">
                      {clinician.fitSignals.slice(0, 3).map((signal) => (
                        <span key={signal} className="network-card-signal">
                          {signal}
                        </span>
                      ))}
                    </span>

                    <span className="network-card-langs">
                      Speaks {clinician.languages.join(", ")}
                    </span>

                    {/*
                      ROUND 5: the FULL name, not `shortName`. Both GPs on this roster are Saxena,
                      so the roster disambiguates hers ("Dr Anusha Saxena") and leaves his as the
                      bare surname ("Dr Saxena") — correct in a result row read one at a time, and
                      side by side on a deck it quietly makes him the default Saxena and her the
                      qualified one. Two people presented as equals get the same form of address.
                    */}
                    <span className="network-card-more">
                      Read what {nameNoBreak(clinician.name)} says
                      <span aria-hidden="true"> →</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="network-purpose">
          <h2 className="network-purpose-heading">{NETWORK_COPY.purposeHeading}</h2>
          <p className="network-purpose-body">{NETWORK_COPY.purposeBody}</p>
        </section>
      </main>

      <SiteFooter />
      <InterfaceLaunch />
    </>
  );
}
