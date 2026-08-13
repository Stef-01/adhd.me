// W152: an education item with no signed-off source is unrenderable BY TYPE.
//
// W145 refuses a sourceless item at the door and says in its own header that this unit turns
// that runtime check into a type-level guarantee. The upgrade matters because of what a
// sourceRef actually is: a string. A string is satisfied by "TODO", by a copy-pasted id that no
// longer exists, and by the id of content whose sign-off was withdrawn last week — and a runtime
// check that only asks "is this non-empty" waves all three through. On a surface whose whole
// claim is "everything here traces to reviewed clinical content", that is the failure that
// matters: not fabricated material, but material that LOOKS sourced.
//
// The design does not invent a third gate. It composes the two that exist:
//
//   * A source catalogue can only be built from `ApprovedContent` (W69) or `UsablePathway`
//     (W119) — both branded, both obtainable only through their own G5 sign-off. So an unsigned
//     source cannot be PUT IN the catalogue; the constructor's parameter type refuses it. There
//     is no `addSource(ref: string)`, and a test asserts the export list has no such thing.
//   * `RenderableItem` is branded in turn, and `renderable()` is its only source. W151's console
//     takes `RenderableItem`, so rendering an unsourced item is a compile error rather than a
//     policy someone remembered.
//
// One property falls out rather than being built, in the same way W119 inherited revocation
// from W118's content-hash identity: the catalogue is assembled from whatever is signed off AT
// CALL TIME, so content whose sign-off was withdrawn, or a pathway version withdrawn under W128,
// is simply not in it — and every item citing it stops being renderable that instant. Nothing
// has to notice and nothing has to be invalidated.

import type { EducationItem } from "./curation";
import type { ApprovedContent } from "@/registers/authoring";
import type { UsablePathway } from "@/pathways/approval";

export type SourceKind = "register_content" | "pathway_version";

/** A source that has cleared G5. Constructible only from an already-branded value. */
export interface SignedOffSource {
  /** What an item's `sourceRef` must match. */
  ref: string;
  kind: SourceKind;
  signedOffBy: string;
  signedOffAt: string;
}

/**
 * Sources from W69's register content.
 *
 * Takes `ApprovedContent`, not `ContentRecord`: the parameter type is the guarantee, because a
 * draft cannot be passed here at all.
 */
export function sourcesFromContent(approved: readonly ApprovedContent[]): SignedOffSource[] {
  return approved.map((a) => ({
    ref: a.record.id,
    kind: "register_content" as const,
    // Non-null by construction — `usableContent()` returns null unless both are set.
    signedOffBy: a.record.signedOffBy ?? "",
    signedOffAt: a.record.signedOffAt ?? "",
  }));
}

/** Sources from W119's signed-off pathway versions, keyed by W118's content hash. */
export function sourcesFromPathways(pathways: readonly UsablePathway[]): SignedOffSource[] {
  return pathways.map((p) => ({
    ref: p.version.versionHash,
    kind: "pathway_version" as const,
    signedOffBy: p.signedOffBy,
    signedOffAt: p.signedOffAt,
  }));
}

/**
 * An item whose source is signed off, right now.
 *
 * The brand cannot be produced by a literal, so `renderable()` is the only legitimate source.
 * W151's console and anything else that displays material takes THIS type.
 */
declare const W152_SOURCE_VERIFIED: unique symbol;

export interface RenderableItem {
  readonly [W152_SOURCE_VERIFIED]: true;
  item: EducationItem;
  source: SignedOffSource;
}

export type ProvenanceRefusal = "no_source_ref" | "source_not_signed_off";

export type ProvenanceResult =
  | { renderable: true; item: RenderableItem }
  | { renderable: false; reason: ProvenanceRefusal };

/** May this item be shown? */
export function renderable(
  item: EducationItem,
  sources: readonly SignedOffSource[],
): ProvenanceResult {
  const ref = item.sourceRef?.trim() ?? "";
  if (ref === "") return { renderable: false, reason: "no_source_ref" };

  const source = sources.find((s) => s.ref === ref);
  if (!source) {
    // Deliberately one reason, not two. "Unknown source" and "source withdrawn" would be a
    // distinction this function cannot honestly draw: a withdrawn source and one that never
    // existed are both simply absent from a catalogue built at call time, and inventing the
    // difference would mean guessing.
    return { renderable: false, reason: "source_not_signed_off" };
  }

  return { renderable: true, item: { item, source } as RenderableItem };
}

/** Only the items that may be shown. The list a console renders. */
export function renderableItems(
  items: readonly EducationItem[],
  sources: readonly SignedOffSource[],
): RenderableItem[] {
  return items
    .map((i) => renderable(i, sources))
    .filter((r): r is { renderable: true; item: RenderableItem } => r.renderable)
    .map((r) => r.item);
}

/**
 * Items that may NOT be shown, with why.
 *
 * Returned rather than dropped, for W68's reason: an item silently missing from a console is
 * indistinguishable from one that was never authored, and the person who has to fix a broken
 * source reference is the one who needs to be told it is broken.
 */
export function unrenderableItems(
  items: readonly EducationItem[],
  sources: readonly SignedOffSource[],
): Array<{ item: EducationItem; reason: ProvenanceRefusal }> {
  const out: Array<{ item: EducationItem; reason: ProvenanceRefusal }> = [];
  for (const item of items) {
    const result = renderable(item, sources);
    if (!result.renderable) out.push({ item, reason: result.reason });
  }
  return out;
}

export const PROVENANCE_REFUSAL_COPY: Record<ProvenanceRefusal, string> = {
  no_source_ref:
    "This material names no source, so it cannot be shown. Every item has to trace to content someone has signed off.",
  source_not_signed_off:
    "The content this material cites is not currently signed off — it may have been withdrawn, or the reference may be wrong. It is not shown until that is resolved.",
};
