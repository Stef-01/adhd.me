// The finder's copy table (docs/matching/LLM-MATCHING-PLAN.md §15): each string with its cap in
// words. finder-copy.test.ts counts them. It holds the "What we heard" row and the line that stands
// in its place while the read runs; a chip's own words are its facet's short label, from the
// vocabulary (`shortLabel` in src/matching/needs.ts).

export const FINDER_COPY = {
  /** The row's name. A screen reader says it; the screen shows only the chips. */
  heardRow: { text: "What we heard", cap: 3 },
  /** At most this many chips, each at most `cap` words. */
  heardChip: { max: 4, cap: 2 },
  /** A heard chip's name: what tapping it does. */
  removeHeard: { text: (label: string) => `Remove ${label}`, cap: 3 },
  /** A removed chip's name: tapping it brings the facet back. */
  putBackHeard: { text: (label: string) => `Put back ${label}`, cap: 4 },
  /** Working (§15): where the chips will be, while the read runs. */
  reading: { text: "Reading what you asked", cap: 4 },
  /** Under it after `afterMs`. The finder stops waiting at 12 seconds and lists on its own read. */
  readingLate: { text: "A few more seconds", cap: 6, afterMs: 6000 },
  /** The voice finder's own words; everything else is the orb, and the question being said. */
  voice: {
    /** The one line when a call cannot start, and the way out beside it. */
    failed: {
      mic: { text: "The microphone is blocked.", cap: 4 },
      busy: { text: "Voice is busy now.", cap: 4 },
      unavailable: { text: "Voice isn’t available now.", cap: 4 },
    },
    typeInstead: { text: "Type instead", cap: 2 },
    urgent: { text: "Urgent help", cap: 2 },
    /** The stop button's name for a screen reader; the screen shows its glyph. */
    end: { text: "End voice", cap: 2 },
  },
} as const;
