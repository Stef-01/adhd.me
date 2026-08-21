// W248: the second vertical, which names no condition — because nobody has picked one.
//
// THIS FILE IS DELIBERATELY NOT CALLED `womens-health.ts`, AND THE LEDGER ROW THAT ASKED FOR ONE
// IS THE REASON. W248's row is titled "Women's health vertical assembly". The plan's provenance
// banner says this tree is a fork "reoriented from PMOS and perinatal women's health to ADHD
// assessment" — so that title is not a care area awaiting a decision, it is the PREVIOUS PRODUCT,
// left in a row the 2026-08-14 reorientation pass did not reach. Building it would build the
// domain the tree was reoriented away from.
//
// AND THE LEDGER ALREADY CONTRADICTS ITSELF ABOUT IT. W186's row, arguing why it cannot take
// `autism-adhd` for itself, says: "W248/W249 already hold autism and taking it here would leave
// this unit doing nothing." The reorientation reasoned about these rows as autism, wrote that
// reasoning into a neighbouring row, and never edited the rows themselves. Which of the two is
// right decides what this vertical is, and neither the loop nor this file gets to say: plan §4 and
// the banner both put picking ADHD.ME's second care area with the founder, and W186 was left
// blocked rather than reassigned for exactly that reason. It is recorded as an outstanding founder
// item and flagged rather than quietly answered in either direction.
//
// W250'S ROW ALREADY WROTE THE INSTRUCTION FOR THIS SITUATION, for the third vertical: "the
// machinery half is domain-neutral and builds against a synthetic placeholder vertical, exactly as
// W157/W158 did — only the vertical's NAME is undecided, and the unit was always 'machinery only'.
// A builder claiming this must not name a condition." That is this unit, unchanged.
//
// WHAT A NAMELESS VERTICAL IS ACTUALLY FOR, since "placeholder" undersells it. The question W248
// exists to answer is whether the vertical machinery generalises beyond the one bundle it was
// written against — and a condition name contributes NOTHING to that answer. A vertical is a spec,
// a membership and a set of gates; W157 never reads the name for any purpose except carrying it
// into a report. So the second vertical tests exactly what a named one would, and tests it without
// this file having an opinion about clinical scope it is not entitled to hold.
//
// ITS MEMBERSHIP DIFFERS FROM DERMATOLOGY'S ON PURPOSE. A second bundle with the same shape as the
// first would pass every assertion here while proving only that the machinery works twice on one
// shape. This one has a different count, a different mix of kinds, and — the case dermatology does
// not have — TWO MEMBERS OF A KIND WAITING ON DIFFERENT ACTS, which is what makes W158's
// decomposition-by-owner do work rather than restate a member list.

import { declareVertical } from "./declare";

/**
 * The membership, in gate terms only.
 *
 * The refs are opaque and numbered rather than descriptive, and that is the same decision W191
 * made: a ref is a POINTER, and a descriptive ref ("…-menopause-pathway") would smuggle the
 * clinical scope back in through an identifier — the content G5 gates, spelled in a filename
 * instead of a sentence. Numbered refs say what this file is entitled to say: that the bundle
 * would contain a pathway, not what the pathway is about.
 */
export const UNDECIDED_MEMBERS = [
  {
    kind: "pathway" as const,
    ref: "vert2-pathway-1",
    waitsOn:
      "G5 — clinical content sign-off. W119's chain, in order: a reviewer, then a signatory who is not the reviewer.",
  },
  {
    kind: "content" as const,
    ref: "vert2-content-1",
    waitsOn: "G5 — the founder signature on reviewed material (W69's ApprovedContent brand).",
  },
  {
    kind: "content" as const,
    ref: "vert2-content-2",
    waitsOn:
      "An author, then G5. This member has not been drafted at all, so the founder signature is the second act rather than the only one — the distinction W158's report exists to surface.",
  },
  {
    kind: "education_item" as const,
    ref: "vert2-education-1",
    waitsOn: "An author. No founder gate applies to material that makes no clinical claim (W151).",
  },
  {
    kind: "education_item" as const,
    ref: "vert2-education-2",
    waitsOn: "An author. No founder gate applies to material that makes no clinical claim (W151).",
  },
  {
    kind: "interval" as const,
    ref: "vert2-interval-1",
    waitsOn: "G5 — the values ruling on cadence. Nobody can act until it lands (W56).",
  },
];

/**
 * The vertical, through the same door dermatology goes through.
 *
 * There is no second assembly path here and no functions of its own: that is the unit's claim, and
 * a test asserts it by comparing the two verticals' behaviour rather than by reading this comment.
 */
export const UNDECIDED_VERTICAL = declareVertical({
  verticalId: "vert-undecided-2",
  name: "Second care area (undecided)",
  members: UNDECIDED_MEMBERS,
});

/**
 * Why this vertical cannot be named, in the words a founder needs to act on it.
 *
 * Held as a value rather than left in a comment so the outstanding decision travels with the code
 * that is waiting on it — the same reason W239 holds its open question as an export instead of a
 * paragraph in a document nobody re-reads.
 */
export const UNDECIDED_NAME_QUESTION =
  "This vertical has no care area. W248's ledger row titles it with the domain this tree was reoriented away from, and W186's row states that W248 and W249 hold autism — two answers, recorded in two places, neither of them here. Picking ADHD.ME's second care area is a company decision under plan §4, so the machinery ships against a vertical with no name and the decision stays visible instead of being settled by whichever row a builder happened to read.";
