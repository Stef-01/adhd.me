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
  readonly file: string;
  readonly kind: ZeroKind;
  /** The exact rendered sentence — asserted present in the file's source. */
  readonly sentence: string;
  /** Why this zero is the kind it is. */
  readonly why: string;
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
];

/**
 * Every `length === 0` empty branch NOT yet read and classified above, per file — the ratchet.
 * Movement is by CLASSIFICATION (an entry lands in ZERO_STATES and the count here drops in the
 * same commit); growth fails naming the file. Measured 2026-08-25: 30 branches total across 19
 * files; the classified files' counted branches remain here because a file can hold both a
 * classified zero and an unread one — the counts below are raw branch counts per file.
 */
export const UNCLASSIFIED_EMPTY_BRANCHES: ReadonlyArray<{ readonly file: string; readonly branches: number }> = [
  { file: "app/console/allocation/page.tsx", branches: 1 },
  { file: "app/console/applications/page.tsx", branches: 1 },
  { file: "app/console/capability/page.tsx", branches: 2 },
  { file: "app/console/case-mix/page.tsx", branches: 1 },
  { file: "app/console/complaints/page.tsx", branches: 2 },
  { file: "app/console/credentials/page.tsx", branches: 1 },
  { file: "app/console/education/page.tsx", branches: 4 },
  { file: "app/console/interest/page.tsx", branches: 1 },
  { file: "app/console/interview/interview-screen.tsx", branches: 2 },
  { file: "app/console/matching/page.tsx", branches: 3 },
  { file: "app/console/outcomes/page.tsx", branches: 2 },
  { file: "app/console/outreach/page.tsx", branches: 1 },
  { file: "app/console/pathways/page.tsx", branches: 1 },
  { file: "app/console/privacy/page.tsx", branches: 1 },
  { file: "app/console/referrals/page.tsx", branches: 3 },
  { file: "app/console/registers/page.tsx", branches: 1 },
  { file: "app/console/usefulness/page.tsx", branches: 1 },
  { file: "app/console/verticals/page.tsx", branches: 1 },
  { file: "app/finder-stages/compare-stage.tsx", branches: 1 },
];

/** Raw `length === 0` branch count in one source — the ratchet's measuring stick. */
export function emptyBranchCount(source: string): number {
  return (source.match(/length === 0/g) ?? []).length;
}
