// Launch item 7: the questions people actually arrive with, answered in the same register as
// the rest of the site — administrative facts, never clinical advice. The FAQPage structured
// data is generated from the SAME list the page renders, so the markup cannot say something
// the reader was not shown.
import type { Metadata } from "next";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { PublicHeader } from "../public-header";

export const metadata: Metadata = {
  alternates: { canonical: "/faq" },
  title: "Questions",
  description:
    "What ADHD.ME is, what it costs, where it operates, and how the order of GPs is decided — answered plainly.",
};

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  /*
    O204: THIS ANSWERED "A finder" UNTIL O192 GAVE THE PRODUCT A SECOND INTERFACE, and the word
    "network" appeared nowhere on this page for five units afterwards. Two things made that worse
    than a stale sentence: `/network`'s own header sends its readers here (O192 chose /faq as the
    network's top-right door), and the FAQPage JSON-LD below is generated from this same list, so
    the out-of-date answer was published to search engines as structured data rather than only
    rendered as prose. O197 sharpened it again by parking the finder for a separate domain: on the
    network's own domain, "A finder" would describe a product that is not there.
  */
  {
    q: "What is ADHD.ME?",
    a: "Two ways to find a GP. The network lists the doctors who are part of it and lets you read what each one says about how they work. The finder asks you to describe what you are looking for and orders the same list around it. Same doctors either way. It is not a clinic, and it does not give medical advice.",
  },
  /*
    The founder's own differentiation question, which is the one a reader arriving at either URL
    actually has — and the reason the two got separate URLs rather than a toggle (see
    `app/interface-launch.tsx`). Answered in the same terms that control is built on: a place you
    arrive at, versus a tool you start.
  */
  {
    q: "What is the difference between the network and the finder?",
    a: "The network is a place: you arrive, you read the doctors who are listed, and you leave when you have read enough. The finder is a tool: you tell it what you are looking for and it orders the same doctors around your answer. Nobody is added or removed by the choice — it is the same people, read two ways.",
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
    O204: THIS SAID "only by matching what you asked for", WHICH IS FALSE OF THE NETWORK. There is
    no order there beyond the roster's, and nothing is matched — so a reader who had browsed the
    network was told their experience had been ranked when it had not. On the page the compliance
    register calls the likeliest in the product to be quoted back to somebody.
  */
  {
    q: "How is the order of GPs decided?",
    a: "It depends which of the two you are using. The network is not ordered — it lists everyone, and reading them is the point. The finder orders the list only by matching what you asked for against what each clinician declares about their own work; when your words do not separate the list, the page says the order means nothing rather than dressing it up. No GP can pay to rank higher, on either.",
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
