import type { Metadata } from "next";
import { seoMetadata } from "@/seo/pages";
import { Breadcrumbs } from "../../breadcrumbs";
import { PublicHeader } from "../../public-header";
import { SiteFooter } from "../../site-footer";

// O188 (founder-directed): the application form is retired — "we want things to be simple" —
// and joining is an email. The eight-section form (O181/O185), the mix hero (O24/O26) and the
// server action went together, deliberately: the hero's whole existence was the wire carrying
// its percent INTO the application (O26's own words), and a "Set my mix" control feeding
// nothing would be a control that claims and does nothing — the exact shape the claim-earned
// law forbids. The application STORE and the staff-gated console read stay: retiring a surface
// is not deleting the record system it fed, and applications arriving by email still land
// there when a person enters them.
import { JOIN_EMAIL } from "./email";

export const metadata: Metadata = seoMetadata("/clinicians/join");

export default function JoinPage() {
  return (
    <>
    <main id="main-content" className="join-page">
      {/* O189: the page joins the site. The founder's verdict on the shipped version — no logo,
          no clear navigation, a back-link that read as plain text, and the fix is the pattern
          /approach already carries: a sticky header with the serif wordmark linking home and one
          clearly-pressable nav link. Rebuilt in this page's own palette because the story tokens
          are deliberately .story-scoped (see globals.css's note on separate contrast budgets). */}
      <PublicHeader rightHref="/clinicians" rightLabel="For GPs" />
      <div className="join-wrap">
        {/* O241: same rule as the privacy cluster — a route two segments deep states its place,
            on the page and in the BreadcrumbList the same component emits. */}
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "For GPs", href: "/clinicians" }, { label: "Join", href: "/clinicians/join" }]} />
        <header className="join-header">
          <h1>Be findable by the people already looking.</h1>
          <p className="join-lead">One email, and a person replies. No forms.</p>
        </header>
        <section className="join-email" aria-labelledby="join-start">
          <h2 id="join-start" className="join-email-heading">Write to us.</h2>
          <a className="join-email-cta" href={`mailto:${JOIN_EMAIL}?subject=Joining%20the%20directory`}>
            {JOIN_EMAIL}
          </a>
          <p className="join-email-note">Your name, your practice, what your week looks like.</p>
        </section>
      </div>
    </main>

      {/*
        O207: THIS PAGE HAD NO FOOTER AT ALL, not a different one, zero `<footer>` elements. O189
        found eight public surfaces with no wordmark and gave every one of them `PublicHeader`, and
        `e2e/public-nav.spec.ts` made the top permanent. Nobody asked the same question about the
        foot of the page, so the same class of defect survived at the other end: a reader reached
        the bottom and the site simply stopped. On this page, the one the founder said "feels
        disconnected from the site", that left about 350px of dead space and no way onward at all.
      */}
      <SiteFooter />
    </>
  );
}
