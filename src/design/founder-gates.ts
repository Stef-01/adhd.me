// AR36: the founder gate register — the aesthetic and working-truth questions that are PRODUCT
// decisions, named, priced, and mechanically kept out of the loop's hands.
//
// WHY A REGISTER. These questions were real and SCATTERED: two acceptances in a sweep file, a
// boolean in a page module, two flag records, a review date, a priced backlog in a document.
// Scattered means decidable-by-drift — any one of them could be resolved by an ordinary edit
// that nobody recognises as a product decision. This register names each question once, and
// `founder-gates.test.ts` asserts per gate that the OPEN STATE still exists at its source. An
// edit that closes a question without updating this register fails the build with a message
// saying exactly what happened: the question appears to have been decided, and the founder's
// decision must be recorded here in the same commit. The loop may close a gate's plumbing —
// never the question.
//
// WHAT DOES NOT BELONG HERE. Plan §4's operational gates (no real patient data, no live SMS,
// no production credentials, G1/G5) live in the plan and `src/interop/credentials.ts`; this
// register is the AESTHETIC and WORKING-TRUTH set the AR lane surfaced. AR18 (dark-theme
// parity) was checked and deliberately excluded: it is a plan-listed [P] engineering unit, not
// an open product question.

export interface FounderGate {
  id: string;
  /** The decision, phrased as the question only the founder can answer. */
  question: string;
  /** What answering costs — in units, in review, or in regulatory exposure. */
  price: string;
  /** Where the open state lives in the tree. The liveness test reads this location. */
  openAt: string;
}

/**
 * Decisions the founder has actually made, with the date and the words they made them in.
 *
 * The register's whole point is that the loop may not answer a gate's question. The converse duty
 * is this list: when the founder DOES answer one, the answer gets written down where the question
 * was, rather than disappearing into a diff. A gate that leaves `FOUNDER_GATES` without landing
 * here has been closed by somebody who was not entitled to close it.
 */
export interface FounderDecision {
  id: string;
  question: string;
  /** What the founder decided, and — where they said it — in their own words. */
  decision: string;
  /** ISO date the founder made the call. */
  decidedAt: string;
  /** What changed in the tree as a result. */
  effect: string;
}

export const FOUNDER_DECISIONS: readonly FounderDecision[] = [
  {
    id: "synthetic-roster-tickbox",
    question:
      "May invented example GP profiles return to the finder after the persona purge made the roster real-people-only — and if so, where do they render, does the sibling network repo take them, and how many? (docs/SYNTHETIC-ROSTER-PLAN.md gates G-SYN-1/2/3.)",
    decision:
      "Yes — in the live finder, behind a visible opt-in tickbox, this deployment only. The founder's words (2026-09-01): “Yes and have a tikbox that will allow the synthetic profiles to follow. This finder system of the adhdme repo is not public so it’s ok it’s just for testing.” Read as: G-SYN-1 the finder itself, gated by a reader-visible checkbox rather than a route or env flag; G-SYN-2 finder repo only — the network tree does not take the personas; G-SYN-3 answered later the same day, overriding the plan's recommended eight: “Let’s put in 20 synthetic profiles”. Because the tickbox is an explicit opt-in to example data, synthetic entries rank NATURALLY among real ones while it is on — an artificial real-first order would defeat the testing purpose the founder named. AMENDED 2026-09-01 (same day, with the harmony review): “have the toggle by default have the synthetic drs and hide it away to be toggled at the voice entry section” — the examples ship ON, and the switch folds into the welcome screen's testing options as the way OFF.",
    decidedAt: "2026-09-01",
    effect:
      "src/demo/synthetic-roster.ts holds twenty invented personas (synthetic: true, image null, booking via synthetic-none, no disclosed interests); the switch lives folded on the welcome screen (O226), default ON for this testing deployment, and every surface that can show a persona labels it 'Example profile'. The plan's non-negotiables survive the decision: the `clinicians` export, ROSTER_SIZE and every count stay real-only, no booking route exists for a persona, no face is generated, and the copy passes the same patient linter as real entries — 'not public' loosened WHERE they render, not what invented copy may claim.",
  },
  {
    id: "network-gallery-ahpra-hold",
    question:
      "Does the browsable network gallery at /network ship indexed, or stay noindex pending an Ahpra advertising review of the profile copy (gate G6)?",
    decision:
      "Ships indexed. The founder lifted the review hold directly: “remove all Ahpra review, we have experts that will do this, do not apply your limited thinking.” The advertising review is theirs to commission and is out of this loop's hands — which is the point of the gate, in both directions.",
    decidedAt: "2026-08-26",
    effect:
      "app/network/page.tsx no longer sets robots:index:false. Unchanged by the decision: /network still renders only fields /finder already served publicly, every clinician sentence is still that clinician's own declaration from the roster, and the W23 rendered honesty sweep still runs over the page — the founder lifted a review hold, not the copy law.",
  },
  {
    id: "mission-copy-authored-by-founder",
    question:
      "Who writes the mission statement on /mission, and who reviews the wording it uses — the loop, or the founder and the reviewers they have engaged?",
    decision:
      "The founder writes it and their reviewers review it. The mission was given as the brief for the page: \u201cthe mission of this site is to find the best drs in each state and document their cultural and personal qualities to best connect them with patients, helping patients feel more connected and comfortable\u201d. When the loop raised the wording against the copy rules, the founder restated the 2026-08-26 ruling in plain terms \u2014 the advertising review belongs to the experts they have engaged, and the loop is to stay out of that phase. So the sentence ships as they wrote it.",
    decidedAt: "2026-08-27",
    effect:
      "MISSION_COPY.statement carries the founder's sentence verbatim and `FOUNDER_AUTHORED` keeps it separable, so `src/network/mission.test.ts` can lint every OTHER sentence on the page with nothing behind it. The two findings the sentence produces (`no-superlatives` and `no-benefit-claims`, both on the word `best`) are entered in ACCEPTED_FINDINGS against /mission with a review date, so the rendered sweep reports them to the reviewer who owns the call instead of blocking the page or rewording it. Unchanged: every other sentence on /mission is the loop's own and is held to the full patient rule set with no acceptance, and the acceptance is keyed to this one path and this one match, so the word stays refused everywhere else.",
  },
];

export const FOUNDER_GATES: readonly FounderGate[] = [
  {
    id: "finder-public-posture",
    question:
      "Is the finder public — may `/` (the finder itself since O230), `/examples` and `/demo` be indexed, announced in the sitemap and allowed by robots.txt, while this deployment is for testing and the roster defaults to invented example profiles?",
    price:
      "D-FINDER-PUBLIC (docs/ONE-YEAR-BUILD-PLAN.md §6): B1 answered, the advertising review of every name and sentence on the profile surfaces that the founder's own reviewers run, and a posture on the examples toggle a stranger cannot mistake. Then U65 empties the crawler register in one commit — the header, the meta tag, the sitemap and robots.txt all follow it — and this entry moves to FOUNDER_DECISIONS. Until then the founder's own words hold (2026-09-01: “This finder system of the adhdme repo is not public so it’s ok it’s just for testing”), and every place a crawler is told is held to the register in both directions, so one door cannot open by accident.",
    openAt: "src/security/robots.ts",
  },
  {
    id: "prescriber-on-profile",
    question:
      "May a clinician's own profile text say 'prescriber' where a patient reads it, given it is her declaration and W23 reads the word as a clinical claim?",
    price:
      "A wording ruling: keep the acceptance (declaration wins), or ask the clinician to reword (the linter wins). Either way one sentence in the O163 register records it; no code beyond the acceptance moves.",
    openAt: "e2e/profile-sweep.spec.ts",
  },
  {
    id: "mental-health-on-profile",
    question:
      "May a profile list 'mental health' among a GP's own clinical interests on a patient surface, where the condition-targeting rule would otherwise refuse it?",
    price:
      "The same ruling class as prescriber, and O163 called it the closest to the rule's actual intent — naming a condition TO a patient versus a directory stating what a GP does. One acceptance kept or one interest reworded. O192 RAISED THE STAKES WITHOUT ANSWERING IT: /network now serves the same declared interest in the server HTML of a statically-generated, indexable page, where /finder only ever served it in client state after a query. The ruling is unchanged in kind and now costs a second acceptance (`/network` in ACCEPTED_FINDINGS) as well as the profile-sweep one, so a decision either way now deletes two entries rather than one.",
    openAt: "e2e/profile-sweep.spec.ts",
  },
  {
    id: "team-page-public",
    question: "Does the team page go public (TEAM_PAGE_PUBLIC), naming the founders on a patient-reachable route?",
    price:
      "Flipping the boolean is free; the real price is the disclosure itself plus the mechanical cascade AR37 pre-wired: the /about working-truth proof goes red and must be replaced with team content, and the new screen owes a qa/ capture and a DESIGN-QA entry.",
    openAt: "app/about/team.ts",
  },
  {
    id: "brand-names-a-condition",
    question:
      "Does ADHD.ME stand as the brand, given the name itself puts a condition in every title and URL — condition-targeting by construction that no copy linter can reach?",
    price:
      "An Ahpra advertising review of the NAME, separate from any page copy — the risk position the tree inherited from a rename rather than took deliberately. Recorded in PRODUCT_FLAGS and at the head of src/compliance/landing.ts.",
    openAt: "src/compliance/public-surfaces.ts",
  },
  {
    id: "clinicians-page-clinical-content",
    question:
      "Should ADHD.ME publish clinical guidance to GPs at all — /clinicians ships differential diagnosis and titration content while W56 has held the register chain for less?",
    price:
      "A consistency ruling the Y2 and Q13 dossiers each filed and no one has made: either the page's content class is fine (and W56's hold should say why it is different) or it is not (and the page loses its clinical sections). Both defensible; not simultaneously.",
    openAt: "src/compliance/public-surfaces.ts",
  },
  {
    id: "console-honesty-wording-review",
    question:
      "At review, do 'Best Practice' (the vendor name in the G1 gate text) and 'specialist' (the pathways governance role) remain the right words on staff screens?",
    price:
      "A re-read of two argued acceptances against whatever the product looks like then — the register carries the arguments; the review either re-dates or rewords.",
    openAt: "src/compliance/console-honesty.ts",
  },
  {
    id: "taste-enforcement-spend",
    question:
      "Which of the dossier's priced enforcement gaps get built, and in what order — is the recommended spend (honesty-pair probe first) the product's priority?",
    price:
      "Roughly one loop unit per gap, per AR-DOSSIER §3's table; the decision is prioritisation, not feasibility. Un-decided, the loop builds none of them on its own.",
    openAt: "docs/AR-DOSSIER.md",
  },
  {
    id: "judgment-rules-stay-human",
    question:
      "Is it acceptable indefinitely that layout.one-idea, layout.shared-row and motion.carries-meaning are enforced only by review discipline — or is a proxy detector wanted despite the dossier's Goodhart warning?",
    price:
      "Accepting the status quo costs a standing review habit; buying a proxy costs a unit AND the risk the proxy becomes the rule. The dossier recommends the former; the choice is the founder's.",
    openAt: "docs/AR-DOSSIER.md",
  },
];
