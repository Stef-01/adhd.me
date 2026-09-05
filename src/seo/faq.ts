// The questions people arrive with, and the answers — as data, because three surfaces need them.
//
// They lived inside `app/faq/page.tsx` until the AI-search pass. The page rendered them, the
// `FAQPage` JSON-LD was generated from the same list (so the markup could not publish an answer
// the reader was not shown), and that was enough while the only consumer was a browser. It stopped
// being enough when `/llms-full.txt` needed the same answers: a second copy typed into a text file
// is exactly the drift the JSON-LD was written to avoid, one file further out.
//
// WHY THE ANSWERS ARE SHAPED THE WAY THEY ARE. An answer engine extracts passages, not pages, so
// each answer has to survive being lifted away from every other answer on the page. That means:
// the direct answer first (never a wind-up), one idea per answer, and no pronoun that refers back
// to a previous question. `answerWords()` and the test beside it keep them inside the 40–60 word
// band that extracts cleanly — long enough to be worth quoting, short enough to be quoted whole.
//
// AND THE BOUNDARIES ARE PART OF THE CONTENT, NOT A DISCLAIMER BOLTED ON. A model summarising a
// health-adjacent product will fill a silence with the average of every product it has seen — a
// clinic, a booking platform, a ratings directory. The answers say what this is not, in the same
// breath as what it is, because that sentence is the one worth citing.

export interface FaqEntry {
  /** Phrased the way somebody would ask it — the heading a query is matched against. */
  readonly q: string;
  /** Self-contained: true and complete with no other answer beside it. */
  readonly a: string;
}

export const FAQS: readonly FaqEntry[] = [
  /*
    O215: BACK TO ONE INTERFACE, AND THE ANSWER GOES BACK WITH IT.

    The history is worth keeping because it is the same mistake twice. O204 rewrote this answer
    from "A finder" to "Two ways to find a GP" because O192 had given the product a second
    interface and this page had gone five units without mentioning it — which mattered more than a
    stale sentence, since the FAQPage JSON-LD is generated from this same list and published the
    out-of-date answer to search engines as structured data.

    The two interfaces now live on separate deployments, so on THIS one the network is the product
    that is not there, and "two ways" would be the same defect pointing the other way.
  */
  {
    q: "What is ADHD.ME?",
    a: "ADHD.ME is a finder for GPs who do ADHD assessment in Australia. You describe what you are looking for in your own words, and it orders the listed GPs around those words, showing the reason each one appears. It is not a clinic, and it does not give medical advice.",
  },
  {
    q: "Is ADHD.ME a medical service?",
    a: "No. ADHD.ME is a finder, not a medical service. Nothing you type is interpreted as a fact about you — it is read only as a preference about the care you want. Whether an assessment is right for you is a conversation with a GP, not with a website.",
  },
  {
    q: "Do I need a referral to see a GP for ADHD?",
    a: "No. In Australia you can book any GP directly for an ADHD assessment, with no referral. If a GP later involves a psychiatrist or paediatrician, they arrange that referral with you. ADHD.ME does not issue referrals and is not part of that arrangement.",
  },
  {
    q: "What does ADHD.ME cost?",
    a: "ADHD.ME is free to use, with no account and no fee to search. The appointment itself is billed by the practice you book with, the same as any GP visit, and each listing shows what that clinician says about their own billing. No GP pays to be listed.",
  },
  {
    /*
      THE ANSWER SEPARATES THE TWO ROSTERS ON PURPOSE, and that is the AI-search reason rather
      than a legal one. The listed clinicians are real people consulting in Sydney; the example
      profiles are invented, labelled on every surface that renders them, and several of them sit
      on the Gold Coast because the gazetteer's flagship regional demo is there. A reader holds
      those apart because the screen labels them. A model reading this page flat does not, and the
      merge it would make — "ADHD.ME lists GPs in Sydney and on the Gold Coast" — is a claim about
      real availability that only invented profiles support. So the answer states both facts and
      the difference between them, which is also the honest thing to tell a person.
    */
    q: "Where in Australia does ADHD.ME operate?",
    a: "The real listed doctors consult in Sydney. The example profiles shown alongside them are invented, labelled as examples, and reach the Gold Coast because that region's map is the demo. Entering any other suburb still gives honest distance context rather than implying a listing nearby.",
  },
  /*
    O204 widened this answer to cover both interfaces, because "only by matching what you asked
    for" was FALSE of the network. With the network on its own deployment the narrow answer is
    true again. The qualifier that survives both versions is the one that matters: when your words
    do not separate the list, the page says so rather than dressing the order up.
  */
  {
    q: "How is the order of GPs decided?",
    a: "The order comes only from matching what you asked for against what each clinician declares about their own work. When your words do not separate the list, the page says the order means nothing rather than dressing it up. No GP can pay to rank higher, and there are no ratings or reviews.",
  },
  {
    q: "What happens to what I type or say into ADHD.ME?",
    a: "It is matched on your own device and used to order the list, and that is all. If you use the microphone, your browser's own speech service converts the audio — ADHD.ME never records or receives it. The privacy page states what is kept and what is not.",
  },
  {
    q: "How do I book an appointment through ADHD.ME?",
    a: "Booking happens with the practice, not on ADHD.ME. Each listing hands you to that practice's own booking page or phone number, and you make the appointment there. ADHD.ME never holds an appointment book and is not told whether you booked.",
  },
];

/** Words in an answer — the unit an answer engine extracts, so the unit worth measuring. */
export function answerWords(entry: FaqEntry): number {
  return entry.a.trim().split(/\s+/).length;
}

/**
 * The band a passage is extracted at whole.
 *
 * Below it an answer is a fragment a model has to pad from somewhere else; above it the model
 * quotes half and the half it drops is usually the qualifier. Not a style rule — a fact about how
 * the passage is lifted.
 */
export const ANSWER_WORDS = { min: 40, max: 60 } as const;
