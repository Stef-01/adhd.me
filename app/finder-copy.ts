// The finder's copy table (docs/matching/LLM-MATCHING-PLAN.md §15): each string with its cap in
// words. finder-copy.test.ts counts them. It holds the "What we heard" row; a chip's own words are
// its facet's short label, from the vocabulary (`shortLabel` in src/matching/needs.ts).

export const FINDER_COPY = {
  /** The row's name. A screen reader says it; the screen shows only the chips. */
  heardRow: { text: "What we heard", cap: 3 },
  /** At most this many chips, each at most `cap` words. */
  heardChip: { max: 4, cap: 2 },
  /** A heard chip's name: what tapping it does. */
  removeHeard: { text: (label: string) => `Remove ${label}`, cap: 3 },
  /** A removed chip's name: tapping it brings the facet back. */
  putBackHeard: { text: (label: string) => `Put back ${label}`, cap: 4 },
} as const;
