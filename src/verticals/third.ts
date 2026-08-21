// W250: the third vertical. Also nameless, and for a reason the row states outright.
//
// "[REORIENTED 2026-08-14: was 'Respiratory vertical assembly' — now FOUNDER: VERTICAL UNDECIDED.]
// … the machinery half is domain-neutral and builds against a synthetic placeholder vertical,
// exactly as W157/W158 did — only the vertical's NAME is undecided, and the unit was always
// 'machinery only'. A builder claiming this must not name a condition. Respiratory was inherited
// from the PMOS tree and is not an ADHD.ME care area."
//
// That is this file's whole brief, and unlike W248 there is no contradiction to untangle: the
// reorientation reached this row, said what it was doing, and left the instruction behind.
//
// WHAT A THIRD VERTICAL IS ACTUALLY WORTH, since after W248 it costs one declaration. Two verticals
// prove a factory can be called twice. The third is a THIRD CALLER for the fixes W250 makes to the
// completeness report — the reconciliation of "who must act" and the removal of a protected title
// from a founder-facing document — and those are properties of the machinery, so a bundle that
// differs again in shape is what stops them being true of one arrangement of members.
//
// Its membership is deliberately the sparsest of the three: a single pathway, one interval, no
// content and no education items. That exercises the case the other two do not — a vertical whose
// `coverage.kindsAssessed` is a strict subset, where the report must say nothing about the kinds
// this bundle does not contain rather than reporting them as zero.

import { declareVertical } from "./declare";

export const THIRD_MEMBERS = [
  {
    kind: "pathway" as const,
    ref: "vert3-pathway-1",
    waitsOn:
      "G5 — clinical content sign-off. W119's chain, in order: a reviewer, then a signatory who is not the reviewer.",
  },
  {
    kind: "interval" as const,
    ref: "vert3-interval-1",
    waitsOn: "G5 — the values ruling on cadence. Nobody can act until it lands (W56).",
  },
];

export const THIRD_VERTICAL = declareVertical({
  verticalId: "vert-undecided-3",
  name: "Third care area (undecided)",
  members: THIRD_MEMBERS,
});
