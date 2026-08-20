// W231 (O131): the false positives this tree has pinned, as data — and the two-case bar that
// decides when one of them has earned a mechanism.
//
// WHY THIS FILE EXISTS. "KNOWN FALSE POSITIVE" appears sixteen times in corpus.ts, every one of
// them prose. The O68 pattern that produced most of this year's matcher mechanisms works like
// this: a tranche finds a wrong reading, the reading is pinned as today's truth with a demand
// that a later unit retag it, and eventually a unit builds the rule that fixes it. The pattern
// has run seven times and works. What it cannot do is answer "has this family reached two yet?"
// — the O84 bar, which says ONE case does not earn a mechanism and two do — because the
// evidence for it lives in comments spread across a 2,000-line file.
//
// O128 hit this directly: it pinned two new false positives, and answering whether either had
// earned its fix meant a manual regex sweep of all 558 entries. Both had exactly one member.
// A bar that can only be applied by whoever remembers to apply it is a convention, not a bar.
//
// WHAT THE BAR IS FOR, since it reads like bureaucracy and is not. A mechanism built from one
// sentence is a mechanism shaped by one sentence: O84 refused a raw-run rule on a single case,
// O94 built it when a second case arrived and the two together showed the real shape, and O77's
// on-behalf rule — built from one register — is exactly the rule O128 later found an ordering
// it could not see. Waiting for the second case is how a rule ends up general enough to be
// right and narrow enough to be safe.

export type KnownFalsePositive = {
  /** The sentence, verbatim as it appears in the corpus. */
  text: string;
  /** The facet it wrongly reaches. */
  facet: string;
  /**
   * The CONSTRUCTION it belongs to, not the facet. Two entries share a family when one
   * mechanism would fix both — that is what makes the count mean something.
   */
  family: string;
  /** The unit that pinned it. */
  pinnedBy: string;
  /** The unit that fixed it, when one has. */
  fixedBy?: string;
  /**
   * Set when the reading has been examined and JUDGED ACCEPTABLE, rather than queued for a fix.
   *
   * THE BAR TAUGHT ME THIS FIELD. Without it the subject-blind family counts four open cases and
   * the build demands a mechanism — but O119 looked at those four and found the readings
   * harmless (a person who says "so I can actually explain" would not object to being matched
   * with a GP who explains), and O120 fixed the one that was NOT harmless within a day. They are
   * accepted, not waiting. Collapsing "we looked and it is fine" into "nobody has got to it yet"
   * is what makes a backlog look like a to-do list, and it would have made the bar cry wolf on
   * its first run.
   *
   * The string is the REASON, in the same posture as W53's dependency allowlist: an acceptance
   * with no rationale is indistinguishable from nobody having looked.
   */
  accepted?: string;
};

export const KNOWN_FALSE_POSITIVES: readonly KnownFalsePositive[] = [
  /**
   * The subject-blind family (O119, four remaining after O120 fixed the fifth).
   *
   * The reader's own words describe what THEY do or want, and a cue reads it as a request about
   * how the CLINICIAN should behave. They are pinned rather than fixed because the reading is
   * usually harmless — a person who says "so I can actually explain" would probably not object
   * to being matched with a GP who explains — and the one that was NOT harmless was fixed
   * within a day (O120: an adult's "my own assessment" ranking them against paediatric GPs).
   */
  {
    text: "a longer first appointment so I can actually explain",
    facet: "manner:collaborative",
    family: "subject-blind",
    pinnedBy: "O119",
    accepted:
      "O119 examined this family and judged the reading harmless: the sentence describes what the READER does or wants and the cue reads it as a request about the CLINICIAN, but a person who says this would not object to the match it produces. O120 fixed the one member that was not harmless — an adult's \"my own assessment\" ranking them against paediatric GPs — which is what makes this an examined acceptance rather than an untouched backlog.",
  },
  {
    text: "book a double slot, I have twenty years to explain",
    facet: "manner:collaborative",
    family: "subject-blind",
    pinnedBy: "O119",
    accepted:
      "O119 examined this family and judged the reading harmless: the sentence describes what the READER does or wants and the cue reads it as a request about the CLINICIAN, but a person who says this would not object to the match it produces. O120 fixed the one member that was not harmless — an adult's \"my own assessment\" ranking them against paediatric GPs — which is what makes this an examined acceptance rather than an untouched backlog.",
  },
  {
    text: "my family does not believe in ADHD and I need help navigating that",
    facet: "manner:attuned",
    family: "subject-blind",
    pinnedBy: "O119",
    accepted:
      "O119 examined this family and judged the reading harmless: the sentence describes what the READER does or wants and the cue reads it as a request about the CLINICIAN, but a person who says this would not object to the match it produces. O120 fixed the one member that was not harmless — an adult's \"my own assessment\" ranking them against paediatric GPs — which is what makes this an examined acceptance rather than an untouched backlog.",
  },
  {
    text: "bring me into every decision about my own brain",
    facet: "manner:sense_making",
    family: "subject-blind",
    pinnedBy: "O119",
    accepted:
      "O119 examined this family and judged the reading harmless: the sentence describes what the READER does or wants and the cue reads it as a request about the CLINICIAN, but a person who says this would not object to the match it produces. O120 fixed the one member that was not harmless — an adult's \"my own assessment\" ranking them against paediatric GPs — which is what makes this an examined acceptance rather than an untouched backlog.",
  },

  /** O128's two, each the only member of its family — which is why neither has a mechanism. */
  {
    text: "I would not say I am anxious, I would say I am exhausted",
    facet: "care:anxiety",
    family: "negated-saying-of-a-state",
    pinnedBy: "O128",
  },
  {
    text: "my mum booked this for me, she is the one who is worried",
    facet: "manner:culturally_attuned",
    family: "on-behalf-governor-after",
    pinnedBy: "O128",
  },
];

/** Entries still exhibiting their false positive. The list the bar is counted over. */
export function openFalsePositives(
  entries: readonly KnownFalsePositive[] = KNOWN_FALSE_POSITIVES,
): KnownFalsePositive[] {
  return entries.filter((e) => !e.fixedBy && !e.accepted);
}

/** Still true, still exhibited, and deliberately left that way — with the reason attached. */
export function acceptedFalsePositives(
  entries: readonly KnownFalsePositive[] = KNOWN_FALSE_POSITIVES,
): KnownFalsePositive[] {
  return entries.filter((e) => e.accepted && !e.fixedBy);
}

/**
 * Families that have reached the O84 bar: two open members, so a mechanism is now earned.
 *
 * Returning them rather than asserting here keeps the law in one place and the test in another,
 * which is what let O125's refusal register be read by something other than its own test.
 */
export function familiesAtTheBar(
  entries: readonly KnownFalsePositive[] = KNOWN_FALSE_POSITIVES,
): Array<{ family: string; members: string[] }> {
  const byFamily = new Map<string, string[]>();
  for (const entry of openFalsePositives(entries)) {
    byFamily.set(entry.family, [...(byFamily.get(entry.family) ?? []), entry.text]);
  }
  return [...byFamily.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([family, members]) => ({ family, members }));
}
