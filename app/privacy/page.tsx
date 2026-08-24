// W33: privacy policy — DRAFT. Factual, reviewed by counsel before any pilot. No clinical
// claims, no patient-facing marketing (compliance law #6).
//
// O35 RESTRUCTURE, and the reasoning is the policy's own audit. The draft led with the B2B
// practice-software story (PMS data, availability invitations) — a product that is NOT YET
// RUNNING — while the product people actually use today, the public finder, appeared nowhere.
// That inverted the reader's risk: the strongest privacy fact this product has (what you type
// about your health is processed in your browser and never reaches our servers) was unstated,
// and processing that does not happen yet was described in the present tense. The policy now
// opens with the live product, states the complete list of what is collected today, moves the
// practice-connection material into an explicitly not-yet-in-force section, and adds the
// sections a health-adjacent Australian policy cannot be without: anonymity, children,
// a direct deletion route for people who are not anyone's patient, breach notification
// (Notifiable Data Breaches scheme), and where responsibility passes at the Healthengine
// handoff. Every claim below is checked against the code that makes it true.

import Link from "next/link";
import { GA_ID } from "../analytics";
import { RESPONSIBILITY_STATEMENT } from "@/compliance/party-to-care";
import { PublicHeader } from "../public-header";

export const metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy policy (draft)",
  description: "What ADHD.ME holds, what it never holds, and the choices you keep — stated as a draft while the product is a demo.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
    <PublicHeader />
    <main id="main-content" className="mx-auto max-w-xl px-6 py-16">
      <p className="mb-2 inline-block rounded bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900">
        Draft — not yet in force
      </p>
      <p className="mb-6 text-sm text-stone-500">
        Why it is a draft, and what is being checked:{" "}
        <Link href="/privacy/counsel-review" className="underline">the legal check</Link>.
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
      <div className="prose prose-stone mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-lg font-medium text-stone-900">The short version</h2>
          <p className="mt-2 text-sm leading-6">
            What you type or say into the finder is processed in your own browser and never
            reaches us. The only information we hold is what you deliberately hand over — a
            name and email if you join the community list, or contact preferences if a practice
            invites you. Everything below is the detail of those two sentences.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">The finder, and what you type into it</h2>
          <p className="mt-2 text-sm leading-6">
            The whole finder runs in your browser. The words you type about what you are looking
            for are matched against the clinicians&apos; declared information on your own device:
            they are not sent to ADHD.ME, not stored anywhere, and are gone when you close the
            tab. You can use every part of the finder without telling us who you are.
          </p>
          <p className="mt-2 text-sm leading-6">
            If you type a suburb, that word is looked up on your device too — the site never asks
            your browser for your location. If you use the microphone, your browser&apos;s own
            speech service (Apple&apos;s or Google&apos;s, depending on your browser) converts
            the audio to text, which may happen on that vendor&apos;s servers overseas;
            ADHD.ME never records or receives the audio, and the same in-browser rule applies
            to the text that comes back.
          </p>
          <p className="mt-2 text-sm leading-6">
            Some people use the finder for a child or teenager in their care. The same rule
            covers that completely: nothing typed about a child leaves the browser either. The
            community interest form is for adults.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">What we collect today — the complete list</h2>
          <p className="mt-2 text-sm leading-6">
            For the community interest list: the name, email address and interest options a
            person chooses, with their consent. We use these details only to contact them about
            community sessions and early product testing, and for nothing else. The form does
            not ask for clinical records or a description of symptoms.
          </p>
          <p className="mt-3 text-sm leading-6">
            If a practice invites you to book through a personal link, the contact choices you
            set on that page — whether we may text you and during which hours — are kept, so
            they can be honoured. That is the whole of it: no accounts, no profiles, and nothing
            collected from the finder itself.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">When practices connect — not yet in force</h2>
          <p className="mt-2 text-sm leading-6">
            ADHD.ME is building software that will offer available appointment times to a
            practice&apos;s existing patients, on the practice&apos;s instructions. When that
            runs, the practice will remain the custodian of its patient records, and ADHD.ME
            will process only contact details, appointment history and consent flags supplied by
            the practice&apos;s systems — to determine eligibility for invitations, to send
            them, and to measure whether they led to attended appointments. It will not process
            clinical notes, diagnoses or test results, and will never use patient information
            for advertising. None of this happens today: no practice is connected and no real
            patient data is processed.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Access, correction and deletion</h2>
          <p className="mt-2 text-sm leading-6">
            If you are on the community interest list, email us and we will show you what we
            hold, correct it, or delete it — you do not need to be anyone&apos;s patient to ask.
            The same goes for contact preferences set through a booking link.
          </p>
          <p className="mt-3 text-sm leading-6">
            When practice data flows exist, patients will additionally be able to ask through
            their practice. Deletion removes identifiable records and leaves a hashed deletion
            record as proof, and a suppression entry ensures a deleted patient is never
            contacted again, even after a later data refresh.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Retention</h2>
          <p className="mt-2 text-sm leading-6">
            Community interest details are kept while the program is being developed or until
            the person asks for them to be removed, whichever comes first. Practice-supplied
            records, when they exist, will be retained per practice-configured windows and
            pruned automatically when they age out. Opt-out and deletion records are kept —
            they are the evidence that a request was honoured.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Who is responsible for your care</h2>
          {/* W138: rendered from the canonical statement, never paraphrased — a claim restated
              in four places is four claims, and they drift. */}
          <p className="mt-2 text-sm leading-6" data-testid="responsibility-statement">
            {RESPONSIBILITY_STATEMENT}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Automated decision-making</h2>
          <p className="mt-2 text-sm leading-6">
            Two things are automated. The finder orders clinicians using nothing but the words
            of your current request and what each clinician has declared — no history, no
            profile of you. And when appointment invitations run, automation will decide which
            patients are offered available times. Our{" "}
            <Link href="/privacy/automated-decisions" className="underline">
              automated-decisions statement
            </Link>{" "}
            describes what is automated, what never is, and the human controls in force.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">How information is held</h2>
          <p className="mt-2 text-sm leading-6">
            The service runs on Vercel&apos;s hosting platform, and information it holds may be
            stored on infrastructure in the United States. Access is limited to the owners,
            transport is encrypted, and no production credentials live in the codebase — the
            product&apos;s own build gates enforce that.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">If something goes wrong</h2>
          <p className="mt-2 text-sm leading-6">
            If we suspect information we hold has been lost or accessed without authority, we
            will assess it promptly, tell the people affected what happened and what we are
            doing about it, and notify the Office of the Australian Information Commissioner
            where the Notifiable Data Breaches scheme requires it.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Cookies and local storage</h2>
          <p className="mt-2 text-sm leading-6">
            The site sets no advertising cookies. One value is kept in your browser&apos;s own
            storage: a record that you have seen and agreed to this policy, which never leaves
            your device.
          </p>
          <p className="mt-2 text-sm leading-6">
            The hosting platform (Vercel) counts page visits without cookies: visits are
            grouped by a short-lived hash that is discarded within 24 hours, and no profile of
            you is built or kept. When you follow a booking link to Healthengine, we count that
            the link was used — not who used it — and from the moment their page opens,
            Healthengine&apos;s own privacy policy governs what you enter there.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Complaints</h2>
          <p className="mt-2 text-sm leading-6">
            If you think we have mishandled your information, contact us first and we will
            respond within two business days. If you are not satisfied with the outcome, you can
            complain to the Office of the Australian Information Commissioner (oaic.gov.au).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Contact and changes</h2>
          <p className="mt-2 text-sm leading-6">
            Questions about this policy go to{" "}
            <a className="underline" href="mailto:stefan.thottunkal@gmail.com">
              stefan.thottunkal@gmail.com
            </a>
            . If the policy changes, the date and the change will be stated here — while it is
            marked draft, it is not yet in force and no real patient data is processed.
          </p>
        </section>
        {/* Rendered ONLY when measurement is actually switched on (the same environment switch
            that loads the script), so this notice can never describe tracking that is not
            running, or stay silent about tracking that is. */}
        {GA_ID && (
          <section>
            <h2 className="text-lg font-medium text-stone-900">Site measurement</h2>
            <p className="mt-2 text-sm leading-6">
              This site uses Google Analytics 4 to count page visits. Advertising signals are
              switched off, Google discards the connecting IP address on receipt, and nothing you
              type or say into the finder is sent to it.
            </p>
          </section>
        )}
      </div>
    </main>
    </>
  );
}
