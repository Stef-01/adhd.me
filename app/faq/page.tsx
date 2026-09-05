// Launch item 7: the questions people actually arrive with, answered in the same register as
// the rest of the site — administrative facts, never clinical advice. The FAQPage structured
// data is generated from the SAME list the page renders, so the markup cannot say something
// the reader was not shown.
//
// The list itself now lives in `src/seo/faq.ts`, because a third surface needs it: `/llms-full.txt`
// serves the same answers to an answer engine. The rule that made the JSON-LD read from the page's
// own list is the rule that moved it — one list, or the copies drift.
import type { Metadata } from "next";
import { FAQS } from "@/seo/faq";
import { seoMetadata } from "@/seo/pages";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { PublicHeader } from "../public-header";

export const metadata: Metadata = seoMetadata("/faq");


export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <>
    <PublicHeader />
    <main id="main-content" className="prose-screen">
      <div className="prose-wrap">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Questions", href: "/faq" }]} />
        <h1>Questions</h1>
        {FAQS.map((f) => (
          <section key={f.q} className="faq-item">
            <h2>{f.q}</h2>
            <p>{f.a}</p>
          </section>
        ))}
      </div>
      <SiteFooter />
    </main>
    </>
  );
}
