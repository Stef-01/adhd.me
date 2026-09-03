// Launch item 7: the questions people actually arrive with, answered in the same register as
// the rest of the site — administrative facts, never clinical advice. The FAQPage structured
// data is generated from the SAME list the page renders, so the markup cannot say something
// the reader was not shown.
import type { Metadata } from "next";
import { seoMetadata } from "@/seo/pages";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { PublicHeader } from "../public-header";

export const metadata: Metadata = seoMetadata("/faq");

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  /*
    O215: BACK TO ONE INTERFACE, AND THE ANSWER GOES BACK WITH IT.
 
    The history is worth keeping because it is the same mistake twice. O204 rewrote this answer
    from "A finder" to "Two ways to find a GP" because O192 had given the product a second
    interface and this page had gone five units without mentioning it — which mattered more than a
    stale sentence, since the FAQPage JSON-LD below is generated from this same list and published
    the out-of-date answer to search engines as structured data.
 
    The two interfaces now live on separate deployments, so on THIS one the network is the product
    that is not there, and "two ways" would be the same defect pointing the other way. The
    differentiation question O204 added ("what is the difference between the network and the
    finder?") went with it: a reader here has no choice to make.
 
    NOTE FOR WHOEVER EDITS THIS ANSWER NEXT. `/faq`'s working-truth proof pins the opening
    sentence, and O213 exists because three units changed copy without moving the check that pinned
    it. The proof moved in the same commit as this rewrite. Keep doing that.
  */
  {
    q: "What is ADHD.ME?",
    a: "A finder. You describe what you are looking for in your own words, and it shows you listed Sydney GPs who say they do that work — with the reason each one is shown. It is not a clinic, and it does not give medical advice.",
  },
  {
    q: "Is ADHD.ME a medical service?",
    a: "No. Nothing you type is interpreted as a fact about you — it is read only as a preference about the care you want. Whether an assessment is right for you is a conversation with a GP, not with a website.",
  },
  {
    q: "Do I need a referral to see a GP?",
    a: "No. In Australia you can book any GP directly. If a GP later involves a psychiatrist or paediatrician, they arrange that referral with you.",
  },
  {
    q: "What does it cost?",
    a: "ADHD.ME is free to use. The appointment itself is billed by the practice you book with, the same as any GP visit — each listing shows what the clinician says about their billing.",
  },
  {
    q: "Where does it operate?",
    a: "The current listed doctors consult in Sydney. You can still enter another suburb to see honest distance context; the finder does not imply a local doctor is listed where none is.",
  },
  /*
    O204 widened this answer to cover both interfaces, because "only by matching what you asked for"
    was FALSE of the network — nothing is matched there and a reader who had browsed it was told
    their experience had been ranked when it had not. With the network on its own deployment the
    narrow answer is true again, and it is the accurate one here. The qualifier that survives both
    versions is the one that matters: when your words do not separate the list, the page says so
    rather than dressing the order up.
  */
  {
    q: "How is the order of GPs decided?",
    a: "The finder orders the list only by matching what you asked for against what each clinician declares about their own work; when your words do not separate the list, the page says the order means nothing rather than dressing it up. No GP can pay to rank higher.",
  },
  {
    q: "What happens to what I type or say?",
    a: "It is matched on your device and used to order the list, and that is all. If you use the microphone, your browser's speech service converts the audio — ADHD.ME never records or receives it. The privacy page says the rest.",
  },
  {
    q: "How do I book an appointment?",
    a: "Booking happens with the practice, not here — each listing hands you to the practice's own booking page or phone number. ADHD.ME never holds an appointment book.",
  },
];

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
