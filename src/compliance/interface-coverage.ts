// O208: how each public surface relates to the product's two interfaces.
//
// WHY THIS EXISTS, AS A COUNT RATHER THAN AN OPINION. Three consecutive units fixed the SAME defect:
// `/examples` (O203), `/faq` (O204) and `/privacy` (O205) each described the product as it was
// before O192 added a second interface. `/faq` answered "What is ADHD.ME?" with "A finder" five
// units after that stopped being true, and the stale answer was in its FAQPage JSON-LD as well, so
// it reached search engines as structured data. `/privacy` scoped every privacy claim to the finder
// while the network — statically generated, nothing to type — went undescribed, which is the same
// defect that page's own header records fixing once before, one interface earlier.
//
// Each was found by a person reading a page, fixed as a one-off, and left NO CHECK BEHIND. O199,
// O200 and O207 each turned their finding into a census; these three did not. This module is that
// asymmetry paid off.
//
// AND THE TRIGGER IS ALREADY PLANNED. O197 parked the finder on `finder/standalone-deployment` for a
// separate domain at the founder's instruction. On the day that lands, every surface describing "the
// product" needs revisiting — and this register is the list, with the reasoning attached.
//
// ── WHAT THIS IS NOT ──────────────────────────────────────────────────────────────────────────
//
// NOT A COPY-QUALITY DETECTOR, and the distinction is load-bearing. The mechanical half — does the
// rendered text name each interface — is a weak proxy: a page could satisfy it by saying "network"
// once, meaninglessly. `docs/AR-DOSSIER.md` warns in its own words that a proxy can become the rule,
// and that warning applies here in full.
//
// So the REGISTER carries the weight. Its value is that every public surface's relationship to the
// two interfaces is a recorded decision with a reason, checked against the route list in both
// directions, so a new page forces the decision instead of inheriting one. The word check is a
// backstop for the one failure that actually happened three times: a page that names one interface
// and has never heard of the other. It does not replace reading the page, and a green run here is
// not evidence that any surface describes the product well.

/** What a public surface has to say about the product's interfaces. */
export type InterfaceStance =
  /** Describes the product as a whole, so it must account for both interfaces. */
  | "describes-both"
  /** IS one of the interfaces, or is that interface's own landing page. */
  | "is-one"
  /** About something else entirely — a funnel, a presenter view, a single mechanism. */
  | "describes-neither"
  /** Names one interface and not the other, and somebody has decided to leave it that way. */
  | "declared-debt";

export interface SurfaceStance {
  path: string;
  stance: InterfaceStance;
  /** Why this stance, in a sentence somebody can disagree with. */
  why: string;
  /** `declared-debt` only: who owns the decision and when it was raised. */
  owner?: string;
}

export const INTERFACE_STANCES: readonly SurfaceStance[] = [
  {
    path: "/",
    stance: "declared-debt",
    why: "The front door names the finder once and the network never. Raised with the founder on 2026-08-27 and deferred deliberately: this is the story landing, and rewriting its argument is a bigger unit than a legal notice being completed — it is a scope call about what the product's first sentence should say now that there are two ways in, not a defect the loop should fix on its own initiative.",
    owner: "founder — raised 2026-08-27, undecided",
  },
  {
    path: "/approach",
    stance: "declared-debt",
    why: "The landing page's argument at length, and it inherits the landing page's problem: two mentions of the finder, none of the network. Same owner and same reasoning as `/` — the two pages carry one argument between them and should be answered together rather than one being quietly brought forward.",
    owner: "founder — raised 2026-08-27, undecided",
  },
  {
    path: "/faq",
    stance: "describes-both",
    why: "Answers 'What is ADHD.ME?' — the most load-bearing description in the product, and the one the compliance register calls the likeliest to be quoted back to somebody. Its FAQPage JSON-LD is generated from the same list, so a stale answer here reaches search engines as structured data (O204).",
  },
  {
    path: "/privacy",
    stance: "describes-both",
    why: "A privacy notice must describe what the whole product does with information, and the two interfaces differ in exactly the way a reader cares about: the finder processes what you type in your browser, the network is static pages with nothing to type (O205).",
  },
  {
    path: "/privacy/counsel-review",
    stance: "describes-both",
    why: "Explains what an independent lawyer has been asked to check across the product, so it names what there is to check. If a surface is added and not mentioned here, the review's stated scope is narrower than the product.",
  },
  {
    path: "/terms",
    stance: "describes-both",
    why: "Terms of use govern the whole service; a term that names only one way of using it leaves the other ungoverned.",
  },
  {
    path: "/examples",
    stance: "describes-both",
    why: "Worked examples are the page that claims to show 'what the product actually does', which makes describing only part of the product the specific failure it is most exposed to (O203).",
  },
  {
    path: "/thanks",
    stance: "describes-both",
    why: "The page after the interest form points a reader at what they can use while they wait, so the set it points at should be the set that exists.",
  },
  {
    path: "/network",
    stance: "is-one",
    why: "It IS the network. It names the finder once, as the bridge O192 put there deliberately, and owes no account of it beyond that.",
  },
  {
    path: "/network/[clinician]",
    stance: "is-one",
    why: "One GP's own page inside the network. It describes a person, not the product, and adding a product description beside a named doctor is the last thing this surface should carry.",
  },
  {
    path: "/mission",
    stance: "is-one",
    why: "The network's own landing page (O197), founder-directed. Naming the finder here would be the duplication O198 removed from the deck: the mission page's one idea is why the network exists, and the finder has its own door from /network.",
  },
  {
    path: "/finder",
    stance: "is-one",
    why: "It IS the finder — a tool, not a document about the product. Its way to the network is the launch control, which is a control rather than prose.",
  },
  {
    path: "/practices",
    stance: "describes-neither",
    why: "The B2B landing, addressed to practice owners about the practice-side product — unused appointment capacity, measurement, the console. Neither patient interface is what it is selling, and naming them would be padding rather than completeness.",
  },
  {
    path: "/clinicians",
    stance: "describes-neither",
    why: "A walkthrough addressed to GPs about becoming findable and about their own pathway. It carries a 'Patient view' exit rather than a description of the patient product.",
  },
  {
    path: "/clinicians/join",
    stance: "describes-neither",
    why: "The founder-directed GP funnel: one promise and one email address. Its job is to get a doctor to write to a person, and a description of the patient interfaces would compete with that.",
  },
  {
    path: "/demo",
    stance: "describes-neither",
    why: "The presenter view, driven by somebody standing in a room. It navigates BETWEEN the interfaces via the demo map rather than describing them, and is not linked from any patient surface.",
  },
  {
    path: "/privacy/automated-decisions",
    stance: "describes-neither",
    why: "An ADM transparency notice about what is decided and by what, not about the product's shape. O205 put the network's 'decides nothing' statement in the main privacy notice's scope line, which is where a reader meets that question first.",
  },
  {
    path: "/about",
    stance: "describes-neither",
    why: "The team page, founder-gated shut since O155 (`TEAM_PAGE_PUBLIC` is false, so the route calls notFound()). It is about people rather than interfaces, and the entry is kept because the page is one word from returning.",
  },
  {
    path: "/book/[token]",
    stance: "describes-neither",
    why: "Reached by invitation, mid-task, about one appointment. A reader here has already been matched; describing the ways in would be describing a journey they have finished.",
  },
];

/** Surfaces that owe an account of both interfaces. */
export function mustNameBoth(): string[] {
  return INTERFACE_STANCES.filter((s) => s.stance === "describes-both").map((s) => s.path);
}

/** Surfaces knowingly left naming one interface, and the person who owns the decision. */
export function declaredDebt(): SurfaceStance[] {
  return INTERFACE_STANCES.filter((s) => s.stance === "declared-debt");
}
