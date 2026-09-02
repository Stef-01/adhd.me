// AR24: three kinds of zero — W246's device, generalised as far as one careful reading reaches.
//
// W246 made the interop console refuse to render a zero without the sentence saying which kind
// of zero it is: "nothing was attempted" and "everything succeeded" are the same character with
// opposite meanings. AR24's row asks for that distinction on every route. Measured at claim
// time: 30 `length === 0` empty branches across 19 files — more than one firing can CLASSIFY
// with care — so this register holds the zeros read and classified now, under the distinctness
// law, and UNCLASSIFIED_EMPTY_BRANCHES pins everything else as named debt that moves only by
// classification (the AR17 ratchet, applied to empty states).
//
// THE THREE KINDS, as the row names them:
//   no-data     — nothing has ever been here (nothing attempted, nothing recorded);
//   no-results  — the system ran and produced nothing for THIS question;
//   broken      — the state the reader reached is a fault, not an emptiness.
//
// THE DISTINCTNESS LAW: no sentence may serve two kinds. A reader who meets the same words on
// a never-attempted lane and a failed lookup has been handed W246's ambiguity back.

export type ZeroKind = "no-data" | "no-results" | "broken";

export type ZeroState = {
  /** The file whose empty BRANCH this classifies (coverage counts by this). */
  readonly file: string;
  readonly kind: ZeroKind;
  /** The exact rendered sentence — asserted present in `sentenceFile ?? file`'s source. */
  readonly sentence: string;
  /** Where the sentence literal lives, when that is not the branch's file (education's COPY). */
  readonly sentenceFile?: string;
  /** Why this zero is the kind it is. */
  readonly why: string;
};

/**
 * A `length === 0` branch whose zero arm renders NOTHING a reader meets — a section simply
 * absent, a caption suppressed. Not an empty state, and manufacturing a sentence for it would
 * be paperwork; but it must be DECLARED, or the coverage law below could not tell an absent
 * section from an unclassified zero.
 */
export type NotAZeroState = {
  readonly file: string;
  readonly reason: string;
};

export const ZERO_STATES: readonly ZeroState[] = [
  {
    file: "src/console/interop.ts",
    kind: "no-data",
    sentence: "Zero because nothing was attempted. This is not a count of successful exchanges.",
    why: "W246's original: every count is zero because no exchange exists, and the sentence travels with the number as a required field.",
  },
  {
    file: "src/console/interop.ts",
    kind: "no-results",
    sentence: "Zero, though other exchanges have been attempted. Nothing of this kind has been sent, which is not the same as nothing having been tried at all.",
    why: "W246's second kind: the lane is live, THIS thing produced nothing — the reader's next question differs, so the sentence must.",
  },
  {
    file: "app/console/outreach/page.tsx",
    kind: "no-results",
    sentence: "Nothing would go out today, so there is no message to show.",
    why: "The plan RAN over real (synthetic-phase) referrals and selected nobody — a result of zero, not an absence of the system.",
  },
  {
    file: "app/console/outreach/page.tsx",
    kind: "no-results",
    sentence: "No invitations would go out today.",
    why: "Same computation as the sample sentence above, rendered at the table — the plan ran and chose nobody.",
  },
  {
    file: "app/console/matching/page.tsx",
    kind: "no-results",
    sentence: "Nothing. The finder says so rather than presenting an order.",
    why: "The ranking ran on the typed request and refused to present an uninformed order — an honest empty result, not missing data.",
  },
  {
    file: "app/console/matching/page.tsx",
    kind: "no-data",
    sentence: "Nothing the patient lexicon can reach yet.",
    why: "No lexicon entry exists to reach — the container is empty, nothing was computed and returned empty.",
  },
  {
    file: "app/console/capability/page.tsx",
    kind: "no-data",
    sentence: "No capability records yet.",
    why: "The store holds nothing; 'yet' says the absence is a starting state, not a search that found nothing.",
  },
  {
    file: "app/not-found.tsx",
    kind: "broken",
    sentence: "That page does not exist.",
    why: "The one shipped broken-state page: the reader's path failed, and the copy says so with a way out — never an emptiness dressed as content.",
  },
  // ── AR25: the ceiling, burned to nothing — every remaining branch read and classified ──────
  {
    file: "app/console/allocation/page.tsx",
    kind: "no-results",
    sentence: "Nobody was filtered out of this run.",
    why: "The allocation run RAN and its exclusion rails excluded nobody — a result about this run, not an absence of the system.",
  },
  {
    file: "app/console/applications/page.tsx",
    kind: "no-data",
    sentence: "No applications yet.",
    why: "The store holds nothing; no application has arrived. 'Yet' marks a starting state.",
  },
  {
    file: "app/console/capability/page.tsx",
    kind: "no-data",
    sentence: "Nothing recorded yet.",
    why: "The signed-in clinician's own capability list before anything has been recorded — a starting state, sibling of the panel's entry below.",
  },
  {
    file: "app/console/case-mix/page.tsx",
    kind: "no-data",
    sentence: "No registers are available yet.",
    why: "No register exists to build a case mix over. The same sentence legitimately renders on /console/registers for the same reason — one fact, two doors.",
  },
  {
    file: "app/console/complaints/page.tsx",
    kind: "no-results",
    sentence: "No complaint is open right now.",
    why: "The OPEN filter of a tracked set is empty right now — complaints as a system exist; none are currently open. AR26 strengthened the words to carry the kind (was: 'None open.').",
  },
  {
    file: "app/console/complaints/page.tsx",
    kind: "no-data",
    sentence: "No complaint has been resolved yet.",
    why: "No complaint has ever been resolved — 'yet' marks the starting state. AR26 strengthened the words to carry the kind (was: 'None yet.').",
  },
  {
    file: "app/console/credentials/page.tsx",
    kind: "no-data",
    sentence: "The practice does not hold any credentials for you yet. Credentialing starts with\n            the practice, because they hold the documents to check.",
    why: "Nothing recorded for this clinician, and the copy says whose move it is — a model kind-carrying zero.",
  },
  {
    file: "app/console/education/page.tsx",
    kind: "no-data",
    sentenceFile: "src/education/console-copy.ts",
    sentence: "There is no material in the library. ADHD.ME ships with none of its own: every item has to trace back to content that cleared sign-off, and nothing has cleared it. That is the state of the product rather than a page that failed to load.",
    why: "W127's rule executed: the library is empty because nothing cleared sign-off, and the copy names the gate rather than rendering a blank list.",
  },
  {
    file: "app/console/education/page.tsx",
    kind: "no-results",
    sentenceFile: "src/education/console-copy.ts",
    sentence: "ADHD.ME does not shorten this list. Every item about a register this practice runs is above, in full. A list that quietly dropped its weaker entries would be making a judgement on your behalf and hiding that it had made one.",
    why: "The withheld-check RAN and withheld nothing — a positive zero about this pass, rendered so the reader knows the check exists.",
  },
  {
    file: "app/console/education/page.tsx",
    kind: "no-data",
    sentenceFile: "src/education/console-copy.ts",
    sentence: "No teaching triggers ship with ADHD.ME. Deciding that something written on a record is a moment to put material in front of a clinician is a clinical judgement about that condition, and nobody has made it. The library above does not depend on that — it is offered in full either way.",
    why: "None exist by G5 posture — the zero names the clinical judgement nobody has made.",
  },
  {
    file: "app/console/education/page.tsx",
    kind: "no-data",
    sentenceFile: "src/education/console-copy.ts",
    sentence: "No entries. ADHD.ME draws no conclusion from that.",
    why: "The CPD trail is empty and the copy refuses the inference an empty trail invites.",
  },
  {
    file: "app/console/interest/page.tsx",
    kind: "no-data",
    sentence: "No registrations yet.",
    why: "The interest register before anyone has signed up — a starting state.",
  },
  {
    file: "app/console/interview/interview-screen.tsx",
    kind: "no-data",
    sentence: "Nothing yet. Proposals appear here as the doctor talks.",
    why: "The transcript has not produced a proposal yet — the copy says where they will come from.",
  },
  {
    file: "app/console/interview/interview-screen.tsx",
    kind: "no-results",
    sentence: "Nothing left. The conversation reached every facet.",
    why: "The gap sweep RAN and found no unreached facet — the best zero on the console: work finished, and the sentence says so.",
  },
  {
    file: "app/console/matching/page.tsx",
    kind: "no-results",
    sentence: "Every saved onboarding was fully heard. Nothing is waiting for lexicon review.",
    why: "The reach report ran over every saved onboarding and none carries an unheard sentence — a completed-work zero.",
  },
  {
    file: "app/console/outcomes/page.tsx",
    kind: "no-results",
    sentence: "Every referral here has something recorded either way, so there is nothing",
    why: "The outstanding-asks pass ran and every referral already carries an outcome — the registered fragment is the sentence's first line because the JSX wraps it; the thought completes 'outstanding to write down' on the next source line.",
  },
  {
    file: "app/console/outcomes/page.tsx",
    kind: "no-data",
    sentence: "No event",
    why: "A per-row cell label: this referral has no recorded event yet. Row-scoped rather than page-scoped, but a reader meets it, so it is classified rather than waved off.",
  },
  {
    file: "app/console/pathways/page.tsx",
    kind: "no-data",
    sentence: "No pathway has been signed off yet.",
    why: "G5's gate, on screen — and the body copy states outright that this is the product's state, not a loading error: the exemplar this register's kinds are named after.",
  },
  {
    file: "app/console/privacy/page.tsx",
    kind: "no-data",
    sentence: "No deletion has been recorded yet — the retention policy has not removed anything.",
    why: "No deletion has ever been recorded, and the sentence now names the mechanism whose output the list is. AR26 strengthened it (was the register's weakest: one word, 'None.').",
  },
  {
    file: "app/console/referrals/page.tsx",
    kind: "no-data",
    sentence: "No other practice has referred a patient here.",
    why: "The received side before anything has ever arrived.",
  },
  {
    file: "app/console/referrals/page.tsx",
    kind: "no-data",
    sentence: "This practice has not referred anyone yet.",
    why: "The sent side before anything has ever been sent.",
  },
  {
    file: "app/console/registers/page.tsx",
    kind: "no-data",
    sentence: "No registers are available yet.",
    why: "No register exists — the same fact and sentence as case-mix's door to it.",
  },
  {
    file: "app/console/usefulness/page.tsx",
    kind: "no-results",
    sentence: "No visits waiting for audit. New attended appointments appear here.",
    why: "The audit queue is empty right now and the copy says how it refills — a current-state zero over a live pipeline.",
  },
  {
    file: "app/console/verticals/page.tsx",
    kind: "no-data",
    sentence: "No vertical has been put together yet.",
    why: "Nothing assembled yet, with the body copy naming it as the product's state and doable work — pathways' sibling exemplar.",
  },
  {
    file: "app/finder-stages/results-stage.tsx",
    kind: "no-results",
    sentence: "No listed GP answers every filter you set.",
    why: "O234: the roster was ranked and the device's filters left nobody. The sentence names the filters as the cause because that is the one thing the person can change, and both ways out (clear, edit) stand under it.",
  },
  {
    file: "app/finder-stages/nearby-map.tsx",
    kind: "no-results",
    sentence: "Nobody on this list has rooms we can place near ",
    why: "O234: the list has rows but none has a consulting suburb the gazetteer can place near the person (telehealth-first, or rooms outside coverage) — the map ran and drew no stop, and the caption says so rather than showing an empty ring.",
  },
];

/** Branches whose zero arm renders nothing a reader meets — declared, so coverage can count them. */
export const NOT_A_ZERO_STATES: readonly NotAZeroState[] = [
  {
    file: "app/console/referrals/page.tsx",
    reason: "The leakage caption toggle: on zero it renders the empty string — the LIST above is the content, and a caption about nothing is correctly nothing.",
  },
  {
    file: "app/finder-stages/compare-stage.tsx",
    reason: "A comparison group with no members returns null — the section is simply absent from a screen that renders only the groups that exist; there is no empty state for a reader to meet.",
  },
];

/**
 * AR25 emptied AR24's unclassified ceiling: every `length === 0` branch is now classified,
 * either as a ZERO_STATES entry or as a declared NOT_A_ZERO_STATES absence. The coverage law
 * in zero-states.test.ts holds it there: a file's branch count may not exceed its
 * classifications, so a NEW branch anywhere fails until its author says which kind of zero it
 * renders — or declares, with a reason, that it renders none.
 */

/** Raw `length === 0` branch count in one source — the ratchet's measuring stick. */
export function emptyBranchCount(source: string): number {
  return (source.match(/length === 0/g) ?? []).length;
}
