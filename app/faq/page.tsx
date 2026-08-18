// Launch item 7: the questions people actually arrive with, answered in the same register as
// the rest of the site — administrative facts, never clinical advice. The FAQPage structured
// data is generated from the SAME list the page renders, so the markup cannot say something
// the reader was not shown.
import type { Metadata } from "next";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";

export const metadata: Metadata = {
  title: "Questions",
  description:
    "What ADHD.ME is, what it costs, where it operates, and how the order of GPs is decided — answered plainly.",
};

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "What is ADHD.ME?",
    a: "A finder. You describe what you are looking for in your own words, and it shows you GPs in Beecroft and on the Gold Coast who say they do that work — with the reason each one is shown, printed next to them. It is not a clinic, and it does not give medical advice.",
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
    a: "Beecroft in Sydney's north-west, and the Gold Coast. If you name a suburb we do not cover yet, the finder says so rather than pretending.",
  },
  {
    q: "How is the order of GPs decided?",
    a: "Only by matching what you asked for against what each clinician declares about their own work. When your words do not separate the list, the page says the order means nothing rather than dressing it up. No GP can pay to rank higher.",
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
    <main className="prose-screen">
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
  );
}
