import type { Metadata } from "next";
import Link from "next/link";

// O188 (founder-directed): the application form is retired — "we want things to be simple" —
// and joining is an email. The eight-section form (O181/O185), the mix hero (O24/O26) and the
// server action went together, deliberately: the hero's whole existence was the wire carrying
// its percent INTO the application (O26's own words), and a "Set my mix" control feeding
// nothing would be a control that claims and does nothing — the exact shape the claim-earned
// law forbids. The application STORE and the staff-gated console read stay: retiring a surface
// is not deleting the record system it fed, and applications arriving by email still land
// there when a person enters them.
import { JOIN_EMAIL } from "./email";

export const metadata: Metadata = {
  alternates: { canonical: "/clinicians/join" },
  title: "Join the directory",
  description:
    "For GPs who have completed the NSW training to carry ADHD care. Email us and a person will reply.",
};

export default function JoinPage() {
  return (
    <main className="join-page">
      <div className="join-wrap">
        <header className="join-header">
          <Link href="/clinicians" className="join-back">For clinicians</Link>
          <p className="eyebrow">Join the directory</p>
          <h1>Be findable by the people already looking.</h1>
          <p className="join-lead">
            For GPs who have completed the NSW training. One email — who you are and where you
            practise — and a person replies. No forms.
          </p>
        </header>
        <section className="join-email" aria-label="How to join">
          <a className="join-email-cta" href={`mailto:${JOIN_EMAIL}?subject=Joining%20the%20directory`}>
            {JOIN_EMAIL}
          </a>
          <p className="join-email-note">
            Tell us your name, your practice and what your week actually looks like. Everything
            else — registration details included — we sort out together afterwards.
          </p>
        </section>
      </div>
    </main>
  );
}
