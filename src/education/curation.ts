// W145: curation over generation.
//
// The engine SELECTS from content that already cleared sign-off. It never writes clinical text,
// and the unit's gate is an export-list test — sufficient for the same reason W120's was: the
// only way to smuggle generation in is to add an entry point for it, and that has a name.
//
// The harder half is the one docs/EDUCATION-BOUNDARY-W144.md argued a unit before this one, and
// it is not "never generate". It is:
//
//   THE ENGINE MAY ORDER, AND MUST NOT WITHHOLD. Showing three items ranked by relevance leaves
//   the clinician the judgement about which matters. Showing one, because the software judged
//   the others less relevant FOR THIS PATIENT, has made a clinical judgement and hidden the
//   evidence that it did — a GP cannot disagree with a list they were never shown. Suppression
//   is a stronger act than selection, which is why the boundary document put the line there
//   rather than at generation.
//
// So `curate` returns a PERMUTATION of everything in scope. There is no `limit`, no `top`, no
// threshold, and no field on the result that could hold what was dropped. A test asserts the
// output is the same multiset as the input, which is the structural form of "must not withhold":
// the function cannot lose an item without failing.
//
// The distinction that makes that workable:
//
//   SCOPING ON A PRACTICE-LEVEL FACT IS NOT WITHHOLDING. A practice that does not run a register
//   has no use for material about it, and excluding it is a statement about the PRACTICE.
//
//   SCOPING ON A PATIENT-LEVEL FACT WOULD BE. Recorded facts are allowed to affect ORDER and
//   nothing else, and `curate` has no parameter that could make them affect membership.

/**
 * An item the engine may show.
 *
 * `sourceRef` points at the signed-off content this came from. W152 makes an item with no source
 * unrenderable by type; until then this module refuses one at the door, so the weaker guarantee
 * exists from the first unit rather than from the last.
 */
export interface EducationItem {
  itemId: string;
  /** The register/condition this material is about. */
  conditionCode: string;
  title: string;
  /** Traceable to signed-off content. W152 turns this into a type-level guarantee. */
  sourceRef: string;
  /** Fact codes this material speaks to. Used for ORDER only — never for membership. */
  relevantFactCodes: readonly string[];
}

export interface CurationContext {
  /** Registers this practice actually runs. A practice-level fact, so scoping on it is fine. */
  practiceConditionCodes: readonly string[];
  /**
   * The patient's recorded facts (W120). Allowed to affect ORDER and nothing else — there is no
   * parameter here that could make them affect which items appear.
   */
  recordedFactCodes: readonly string[];
}

export interface RankedItem {
  item: EducationItem;
  /** How many of the patient's recorded facts this material speaks to. */
  matchingFactCount: number;
  /** Shown to the reader AS a ranking, so it reads as an ordering rather than as an answer. */
  position: number;
}

export interface CurationResult {
  /**
   * Every in-scope item, ordered. This is a permutation of the input — see the module note.
   *
   * There is deliberately no sibling field for items that were dropped, because there are none.
   */
  ordered: RankedItem[];
  /** In-scope items considered. Always equal to `ordered.length`, asserted by a test. */
  consideredCount: number;
  /** Items excluded because the practice does not run that register. Named, not hidden. */
  outOfScope: Array<{ itemId: string; conditionCode: string }>;
  /** Plain-English statement of how the order was arrived at. */
  orderingBasis: string;
}

export type CurationRejection = "item_missing_source" | "item_missing_condition" | "item_missing_id";

/** Refused at the door: an item with no traceable source is not showable material. */
export function rejectionsFor(item: EducationItem): CurationRejection[] {
  const errors: CurationRejection[] = [];
  if (item.itemId.trim() === "") errors.push("item_missing_id");
  if (item.conditionCode.trim() === "") errors.push("item_missing_condition");
  if (item.sourceRef.trim() === "") errors.push("item_missing_source");
  return errors;
}

/**
 * Order the material a practice's registers make relevant.
 *
 * Takes items and returns them ordered. It does not take a count, a threshold or a cutoff, and
 * no overload adds one — that absence is the unit.
 */
export function curate(
  items: readonly EducationItem[],
  context: CurationContext,
): CurationResult {
  const inScope: EducationItem[] = [];
  const outOfScope: Array<{ itemId: string; conditionCode: string }> = [];
  const runs = new Set(context.practiceConditionCodes);
  const facts = new Set(context.recordedFactCodes);

  for (const item of items) {
    if (rejectionsFor(item).length > 0) continue; // refused at the door, and counted nowhere
    if (runs.has(item.conditionCode)) inScope.push(item);
    else outOfScope.push({ itemId: item.itemId, conditionCode: item.conditionCode });
  }

  const ordered = inScope
    .map((item) => ({
      item,
      matchingFactCount: item.relevantFactCodes.filter((code) => facts.has(code)).length,
    }))
    // Most matching facts first; ties by item id so the order is fixed rather than incidental.
    .sort((a, b) => b.matchingFactCount - a.matchingFactCount || a.item.itemId.localeCompare(b.item.itemId))
    .map((ranked, index) => ({ ...ranked, position: index + 1 }));

  // W151: the basis has to describe the order that was actually used. A library view has no
  // patient in it, and telling a reader the list reflects "this patient's recorded facts" when
  // none were supplied is a false account of a real ordering — the sort key fell back to item id.
  const basis =
    facts.size === 0
      ? "Ordered by item id, because no recorded facts were supplied to order against."
      : "Ordered by how many of this patient's recorded facts each item speaks to, then by item id.";

  return {
    ordered,
    consideredCount: inScope.length,
    outOfScope,
    orderingBasis: `${basis} Everything relevant to this practice's registers is listed — nothing has been held back, and the order is a suggestion about where to start rather than a judgement about what matters.`,
  };
}

/**
 * The engine's own account of what it did, for a reader who wants to check it.
 *
 * Names the out-of-scope items rather than omitting them: "we have material you are not seeing
 * because you do not run that register" is a different statement from silence, and only one of
 * them lets a practice notice it should run the register.
 */
export function describeCuration(result: CurationResult): string[] {
  const lines = [
    `${result.consideredCount} item(s) relevant to this practice's registers, all shown.`,
    result.orderingBasis,
  ];
  if (result.outOfScope.length > 0) {
    const registers = [...new Set(result.outOfScope.map((o) => o.conditionCode))].sort();
    lines.push(
      `${result.outOfScope.length} further item(s) exist for registers this practice does not run: ${registers.join(", ")}.`,
    );
  }
  return lines;
}

export const CURATION_REJECTION_COPY: Record<CurationRejection, string> = {
  item_missing_id: "The item has no identifier.",
  item_missing_condition: "The item does not say which register it is about.",
  item_missing_source:
    "The item has no traceable source. Material that cannot be traced back to signed-off content is not showable, whatever it says.",
};
