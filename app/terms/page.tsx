// O39: terms of use — DRAFT, same posture as the privacy policy (W33): factual, plain
// English, every claim true of the code, reviewed by counsel before it is in force. The
// register is the tree's own: formulations that have already passed the patient copy sweep
// ("shows you GPs who say they do that work", "nothing you type is interpreted as a fact
// about you", "no GP can pay to rank higher") are reused rather than re-invented, because a
// terms page is the easiest place for a compliant product to acquire a non-compliant
// sentence. The Australian Consumer Law section deliberately preserves the non-excludable
// guarantees — a demo that tried to contract out of the ACL would be wrong twice.

import Link from "next/link";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { RESPONSIBILITY_STATEMENT } from "@/compliance/party-to-care";
import { PublicHeader } from "../public-header";

export const metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of use (draft)",
  description: "What ADHD.ME is and is not, what you agree to by using it, and where responsibility sits — stated as a draft while the product is a demo.",
};

export default function TermsPage() {
  return (
    <>
    <PublicHeader />
    <main className="mx-auto max-w-xl px-6 py-16">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Terms", href: "/terms" }]} />
      <p className="mb-2 mt-6 inline-block rounded bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900">
        Draft — not yet in force
      </p>
      <p className="mb-6 text-sm text-stone-500">
        Why it is a draft, and what is being checked:{" "}
        <Link href="/privacy/counsel-review" className="underline">the legal check</Link>.
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Terms of use</h1>
      <div className="prose prose-stone mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-lg font-medium text-stone-900">The short version</h2>
          <p className="mt-2 text-sm leading-6">
            ADHD.ME is a finder: it shows you GPs who say they do the work you describe, with
            the reason each one is shown. It is not a medical service, it does not give medical
            advice, and using it creates no relationship between you and any doctor — that
            begins when you book and attend an appointment. By using the site you accept these
            terms and the{" "}
            <Link href="/privacy" className="underline">privacy policy</Link>.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">What the service is, and is not</h2>
          <p className="mt-2 text-sm leading-6">
            The finder matches the words you type against what each listed clinician declares
            about their own work, and shows the result with its reasons. Nothing you type is
            interpreted as a fact about you — it is read only as a preference about the care
            you want. Whether any appointment, assessment or care is right for you is a
            conversation with a doctor, not with a website.
          </p>
          <p className="mt-2 text-sm leading-6">
            The service is not for emergencies. If you or someone else is in immediate danger,
            call 000. If you want to talk to someone about how you are feeling, at any hour,
            Lifeline is 13 11 14.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Who is responsible for your care</h2>
          {/* W138: the canonical statement, rendered not paraphrased — same constant as the
              privacy policy, so the two pages cannot drift apart. */}
          <p className="mt-2 text-sm leading-6" data-testid="responsibility-statement">
            {RESPONSIBILITY_STATEMENT}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">How the order of GPs is decided</h2>
          <p className="mt-2 text-sm leading-6">
            Only by matching what you asked for against what each clinician declares. When your
            words do not separate the list, the page says the order means nothing rather than
            dressing it up. No GP can pay to rank higher, and listing a clinician is not an
            endorsement or a statement about quality.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Clinician information</h2>
          <p className="mt-2 text-sm leading-6">
            Everything shown about a clinician is their own declaration or their practice&apos;s
            published information. If you believe something shown is wrong, tell us and we will
            check it with the clinician and correct it; a clinician can ask at any time for
            their listing to be corrected or removed.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Bookings and Healthengine</h2>
          <p className="mt-2 text-sm leading-6">
            Booking happens on Healthengine, under Healthengine&apos;s own terms and privacy
            policy. Your appointment — its time, fees and everything about it — is between you
            and the practice. ADHD.ME is not a party to the booking, does not see it, and does
            not set or receive any part of any fee.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Using the site fairly</h2>
          <p className="mt-2 text-sm leading-6">
            Use the site lawfully and as a person looking for care, or a clinician engaging
            with their own listing. Do not misrepresent who you are on the interest or
            application forms, attempt to interfere with the service, or harvest its content by
            automated bulk access.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Content and ownership</h2>
          <p className="mt-2 text-sm leading-6">
            The site&apos;s text, design and software are ours or licensed to us. What a
            clinician declares about their own work remains theirs, shown here with their
            consent, and a person&apos;s words in the finder are theirs and never stored — see
            the privacy policy.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">The service while it is a demo</h2>
          <p className="mt-2 text-sm leading-6">
            The product is under active development: features change, listings are few, and the
            service may be unavailable at times without notice. We work to keep everything
            shown accurate to what clinicians have declared, and we say so plainly when
            something is a demonstration or an illustration.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Australian Consumer Law</h2>
          <p className="mt-2 text-sm leading-6">
            Nothing in these terms takes away any right or remedy you have under the
            Australian Consumer Law or any other law that cannot be excluded. To the extent
            the law allows, our responsibility for a failure of the service is limited to
            resupplying it, and we are not responsible for the acts of the third parties named
            here — Healthengine, or the practice you book with — whose services are governed
            by their own terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Governing law, changes and contact</h2>
          <p className="mt-2 text-sm leading-6">
            These terms are governed by the law of New South Wales, Australia. If they change,
            the date and the change will be stated here — while they are marked draft, they are
            not yet in force. Questions go to{" "}
            <a className="underline" href="mailto:stefan.thottunkal@gmail.com">
              stefan.thottunkal@gmail.com
            </a>
            . If any part of these terms cannot be enforced, the rest still applies.
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
    </>
  );
}
