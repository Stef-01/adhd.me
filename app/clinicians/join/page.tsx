import type { Metadata } from "next";
import { PublicHeader } from "../../public-header";

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
    "For GPs who carry ADHD care. Email us and a person will reply.",
};

export default function JoinPage() {
  return (
    <main className="join-page">
      {/* O189: the page joins the site. The founder's verdict on the shipped version — no logo,
          no clear navigation, a back-link that read as plain text — and the fix is the pattern
          /approach already carries: a sticky header with the serif wordmark linking home and one
          clearly-pressable nav link. Rebuilt in this page's own palette because the story tokens
          are deliberately .story-scoped (see globals.css's note on separate contrast budgets). */}
      <PublicHeader rightHref="/clinicians" rightLabel="For clinicians" />
      <div className="join-wrap">
        <header className="join-header">
          <p className="eyebrow">Join the directory</p>
          <h1>Be findable by the people already looking.</h1>
          <p className="join-lead">
            One email — who you are and where you practise — and a person replies. No forms.
          </p>
        </header>
        <section className="join-email" aria-labelledby="join-start">
          {/* The funnel phrase, end to end: /clinicians' final stage says it, and this is where
              it lands. */}
          <h2 id="join-start" className="join-email-heading">Start your journey today.</h2>
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
