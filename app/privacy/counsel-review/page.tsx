// O41: the counsel review, visible on the site. The privacy policy and terms both carry a
// "Draft — not yet in force" banner, and this page says why in the product's own register:
// what is being reviewed, the questions put to counsel (translated into patient-safe words —
// the raw pack is linked for anyone who wants the untranslated document), and what has to
// happen for the banners to come down. Same transparency move as /privacy/automated-decisions:
// if the product asks people to trust a process, the process is shown.

import Link from "next/link";
import { PublicHeader } from "../../public-header";
import { Breadcrumbs } from "../../breadcrumbs";
import { SiteFooter } from "../../site-footer";

export const metadata = {
  alternates: { canonical: "/privacy/counsel-review" },
  title: "The legal check",
  description: "Why the privacy policy and terms are marked draft, what an independent lawyer is checking, and what has to happen for that banner to come down.",
};

export default function CounselReviewPage() {
  return (
    <>
    <PublicHeader />
    <main className="mx-auto max-w-xl px-6 py-16">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Privacy", href: "/privacy" }, { label: "Legal check", href: "/privacy/counsel-review" }]} />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">The legal check</h1>
      <div className="prose prose-stone mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-lg font-medium text-stone-900">Why the drafts are marked draft</h2>
          <p className="mt-2 text-sm leading-6">
            The <Link href="/privacy" className="underline">privacy policy</Link> and{" "}
            <Link href="/terms" className="underline">terms of use</Link> both carry a
            &ldquo;Draft — not yet in force&rdquo; banner. That is deliberate: both documents
            were written by us, checked line-by-line against what the software actually does,
            and are now with an independent Australian privacy lawyer to be checked. The banners
            come down when that check says they should, and this page will record the date.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">What we have asked to be checked</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
            <li>
              That our central claim holds up in law the way it holds up in code: what you type
              or say into the finder is processed in your browser and never collected by us.
            </li>
            <li>Which legal entity should be named in both documents, and its obligations now versus at a first practice partnership.</li>
            <li>Whether the consent pop-out and the interest form say enough, at the right moment, about what is collected and why.</li>
            <li>How the rules about information leaving Australia apply to our hosting, to your browser&apos;s own speech service, and to the Healthengine handoff.</li>
            <li>Whether the interest list needs a fixed maximum time we keep details, rather than &ldquo;while the program is being developed&rdquo;.</li>
            <li>That our commitment about handling a data breach is worded strongly enough.</li>
            <li>Whether anything more is needed for parents using the finder about a child.</li>
            <li>The terms&apos; consumer-law wording, and the clauses about where our responsibility ends and Healthengine&apos;s or a practice&apos;s begins.</li>
          </ul>
          <p className="mt-3 text-sm leading-6">
            The full briefing pack — including the register that ties each claim in the policy
            to the code that makes it true — is public in our repository:{" "}
            <a
              className="underline"
              href="https://github.com/Stef-01/ADHD/blob/main/docs/PRIVACY-COUNSEL-BRIEF.md"
              rel="noreferrer"
              target="_blank"
            >
              the counsel briefing pack
            </a>
            . It is our working document, not legal advice.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">What happens next</h2>
          <p className="mt-2 text-sm leading-6">
            The lawyer returns a marked-up version of both documents and answers to those
            questions. The changes are made, the banners come down on their word — not before —
            and the date and the changes are recorded on each document. Questions in the
            meantime go to{" "}
            <a className="underline" href="mailto:stefan.thottunkal@gmail.com">
              stefan.thottunkal@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
    </>
  );
}
