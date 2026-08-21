// W248: one declaration path, so a second vertical is a DECLARATION rather than a second copy.
//
// THE ROW SAYS "W157's MODEL REUSED, NOT RE-IMPLEMENTED", AND THE CHEAP BUILD FAILS THAT CLAUSE
// WHILE APPEARING TO SATISFY IT. Copying `dermatology.ts`, changing the ids and calling
// `usableVertical` from the copy does reuse W157's model — and duplicates the four functions
// around it. Two verticals then hold two evidence assemblers reading the same registries, two
// outstanding-work wrappers and two gate lists, and this tree's whole experience of duplication is
// that the copy is what drifts (W177's rule, W239's two-constants finding, W223 carrying W222's
// sentences verbatim rather than restating them).
//
// A SECOND INSTANCE IS WHEN AN ABSTRACTION STOPS BEING SPECULATIVE. W191 wrote the assembly once
// for one vertical, which was right — there was nothing to share it with. This unit is the second,
// and the shape it needs is already visible rather than guessed at: a vertical is a spec, a list of
// members each with the gate it waits on, and four derived answers that are identical for every
// vertical because they are just W157 and W158 called with the spec.
//
// SO WHAT IS DECLARED HERE IS THE PART THAT DIFFERS AND NOTHING ELSE — the id, the name, and which
// members the bundle would contain. Everything else is computed. A vertical that wanted to compute
// them differently would not be a vertical.
//
// EVIDENCE IS READ FROM THE TREE'S OWN REGISTRIES, ONCE. `dermatologyEvidence` assembled it from
// `SHIPPED_WORKSPACE` and `SHIPPED_INTERVALS` rather than writing empty literals, on the argument
// that a hand-written empty object is a second claim about the same fact and the second claim goes
// stale. That argument does not become weaker with two verticals — it becomes the reason this is a
// shared function. What is signed off is a property of the TREE, not of a bundle: no vertical has
// its own answer to "what has been approved", and giving each one a place to hold a different
// answer would be inventing a distinction that does not exist.

import { SHIPPED_INTERVALS } from "@/registers/intervals";
import { SHIPPED_WORKSPACE } from "@/registers/authoring";
import {
  usableVertical,
  type VerticalEvidence,
  type VerticalMemberKind,
  type VerticalResult,
  type VerticalSpec,
} from "./model";
import { assessCompleteness, type CompletenessReport, type KnownMembers } from "./completeness";

/**
 * A member of a declared bundle, with the gate or act it is waiting on.
 *
 * `waitsOn` is the only descriptive field, and that is W191's decision carried rather than
 * re-argued: the obvious thing to add is a sentence saying what each member is FOR, and for a
 * clinical pathway that sentence IS the content G5 gates. The field does not exist rather than
 * existing and being carefully worded.
 */
export interface DeclaredMember {
  kind: VerticalMemberKind;
  ref: string;
  waitsOn: string;
}

/** What a caller declares. Everything else about a vertical is computed from it. */
export interface VerticalDeclaration {
  verticalId: string;
  name: string;
  members: readonly DeclaredMember[];
}

/**
 * A declared vertical: the spec, and the four answers every vertical gives the same way.
 *
 * Note there is no `usable` field and no cached result. W157 assembles evidence at CALL TIME so a
 * withdrawn sign-off propagates with nothing noticing — a stored verdict would be the invalidation
 * step that property exists to make unnecessary.
 */
export interface DeclaredVertical {
  readonly declaration: VerticalDeclaration;
  readonly spec: VerticalSpec;
  readonly members: readonly DeclaredMember[];
  /** What is signed off in the tree today. Read from the registries, never written as literals. */
  evidence(): VerticalEvidence;
  /** Assemble against what is signed off. Refuses today, and names every missing member. */
  assemble(evidence?: VerticalEvidence): VerticalResult;
  /** The outstanding work, decomposed by who has to act (W158). */
  outstanding(evidence?: VerticalEvidence, known?: KnownMembers): CompletenessReport;
  /** The gates this vertical waits on, deduplicated, in declaration order. */
  gates(): string[];
}

/**
 * What is signed off across the tree today: nothing.
 *
 * Assembled from the `SHIPPED_*` registries rather than written as empty literals, so it cannot say
 * "nothing is signed off" while something is.
 */
export function treeEvidence(): VerticalEvidence {
  return {
    // The registries are typed as their branded members and are pinned empty by their own units.
    // Casts are the reading of an intentionally-empty list, not a construction of a branded value.
    pathways: [],
    content: SHIPPED_WORKSPACE as unknown as VerticalEvidence["content"],
    educationItems: [],
    intervals: { intervals: SHIPPED_INTERVALS as VerticalEvidence["intervals"]["intervals"], rejected: [] },
  };
}

/**
 * Declare a vertical.
 *
 * The one door. A vertical assembled any other way is a vertical whose behaviour has to be checked
 * separately, which is the thing this unit exists to stop.
 */
export function declareVertical(declaration: VerticalDeclaration): DeclaredVertical {
  const declaredActs = Object.fromEntries(
    declaration.members.map((member) => [member.ref, member.waitsOn]),
  );
  const spec: VerticalSpec = {
    verticalId: declaration.verticalId,
    name: declaration.name,
    members: declaration.members.map(({ kind, ref }) => ({ kind, ref })),
  };

  return {
    declaration,
    spec,
    members: declaration.members,
    evidence: treeEvidence,
    assemble: (evidence = treeEvidence()) => usableVertical(spec, evidence),
    // The declared acts travel to the report, so "who must act" has ONE answer. W250 found two:
    // this layer's per-member `waitsOn` and W158's per-kind `REMAINING_CHAIN`, already disagreeing
    // about whether an education item needs a founder gate. The report CARRIES the sentence
    // declared here rather than composing a second wording of it (W177).
    outstanding: (evidence = treeEvidence(), known?: KnownMembers) =>
      assessCompleteness(spec, evidence, known, declaredActs),
    gates: () => [...new Set(declaration.members.map((member) => member.waitsOn))],
  };
}
