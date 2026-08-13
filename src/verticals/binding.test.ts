// W160 verify gate: the bound practice stays on the version it accepted; no silent upgrade; and
// W128's withdrawal semantics are inherited rather than restated.

import { describe, expect, it } from "vitest";
import * as bindingModule from "./binding";
import {
  ACCEPT_REFUSAL_COPY,
  RESOLUTION_COPY,
  type VerticalBinding,
  acceptVersion,
  currentBinding,
  resolveBinding,
} from "./binding";
import { type VerticalEvidence, type VerticalSpec, verticalHash } from "./model";
import type { PracticeId } from "@/domain/types";
import type { ApprovedContent } from "@/registers/authoring";
import type { UsablePathway } from "@/pathways/approval";
import { loadIntervals } from "@/registers/intervals";
import { foldIsOrderIndependent } from "@/quality/order-independence";

const PRACTICE = "prac-1" as PracticeId;
const OTHER = "prac-2" as PracticeId;
const VERTICAL = "vert-cardiometabolic";

// Branded values cast here for W157's reason: production code cannot mint them.
// Carries criteria because W159's consistency check reads them — a fixture thin enough to
// satisfy only the module under test would break the moment it is composed, which is the point
// of assembling it through the real `usableVertical`.
const pathway = (versionHash: string) =>
  ({
    version: {
      versionHash,
      criteria: {
        inclusion: [{ factCode: "fact-in", requires: "present", rationale: "placeholder" }],
        exclusion: [],
        escalation: [],
      },
    },
  }) as unknown as UsablePathway;
const content = (id: string) => ({ record: { id } }) as unknown as ApprovedContent;

const V1: VerticalSpec = {
  verticalId: VERTICAL,
  name: "Example vertical",
  members: [
    { kind: "pathway", ref: "hash-a" },
    { kind: "content", ref: "content-1" },
  ],
};

/** v2 widens the bundle — a different membership, therefore a different version. */
const V2: VerticalSpec = {
  ...V1,
  members: [...V1.members, { kind: "content", ref: "content-2" }],
};

/** A different bundle that shares no member with v1 — so v1's withdrawal cannot touch it. */
const V_INDEPENDENT: VerticalSpec = {
  verticalId: VERTICAL,
  name: "Example vertical",
  members: [
    { kind: "pathway", ref: "hash-b" },
    { kind: "content", ref: "content-2" },
  ],
};

const EMPTY = loadIntervals([]);

/** Everything both versions need. */
const ALL: VerticalEvidence = {
  pathways: [pathway("hash-a"), pathway("hash-b")],
  content: [content("content-1"), content("content-2")],
  educationItems: [],
  intervals: EMPTY,
};

/** v1's pathway withdrawn — its sign-off revoked, so it left `usablePathways()`. */
const PATHWAY_WITHDRAWN: VerticalEvidence = { ...ALL, pathways: [pathway("hash-b")] };

/** Every pathway gone. v2 shares v1's pathway, so in practice a withdrawal often takes both. */
const ALL_PATHWAYS_WITHDRAWN: VerticalEvidence = { ...ALL, pathways: [] };

const accept = (
  bindings: readonly VerticalBinding[],
  spec: VerticalSpec,
  evidence: VerticalEvidence = ALL,
  at = "2026-03-01T00:00:00Z",
  practiceId: PracticeId = PRACTICE,
) => acceptVersion(bindings, spec, evidence, practiceId, "manager@demo.practice.example", at);

function boundToV1(): VerticalBinding[] {
  const result = accept([], V1);
  if (!result.ok) throw new Error(`fixture must bind: ${result.reason}`);
  return result.bindings;
}

describe("W160 the binding names a version, not a vertical", () => {
  it("binds to the membership hash", () => {
    const [b] = boundToV1();
    expect(b!.versionHash).toBe(verticalHash(V1.members));
    expect(b!.acceptedBy).toBe("manager@demo.practice.example");
  });

  it("publishing v2 does not move the practice", () => {
    // The whole unit. v2 exists and is perfectly usable; the practice is still on v1, because
    // nothing resolves "the latest version of X".
    const bindings = boundToV1();
    const resolved = resolveBinding(bindings, [V1, V2], ALL, PRACTICE, VERTICAL);

    expect(resolved.state).toBe("in_force");
    expect(resolved.spec).toEqual(V1);
    expect(resolved.binding?.versionHash).toBe(verticalHash(V1.members));
  });

  it("exports no way to upgrade to whatever is newest", () => {
    // An upgradeToLatest() would reintroduce the silent upgrade at the moment of the call: the
    // practice gets whatever happens to be newest, which is what they did not agree to.
    for (const name of Object.keys(bindingModule)) {
      expect(name.toLowerCase(), `${name} looks like an implicit upgrade`).not.toMatch(
        /latest|newest|auto|sync|refresh/,
      );
    }
    expect(Object.keys(bindingModule)).toContain("acceptVersion");
  });

  it("v2 is offered as an alternative, never applied", () => {
    const resolved = resolveBinding(boundToV1(), [V1, V2], ALL, PRACTICE, VERTICAL);
    expect(resolved.usableAlternatives).toContain(verticalHash(V2.members));
    // ...and the practice is still on v1.
    expect(resolved.spec).toEqual(V1);
  });
});

describe("W160 accepting is an act with a name on it", () => {
  it("moving to v2 requires an explicit acceptance, and keeps the history", () => {
    const after = accept(boundToV1(), V2, ALL, "2026-06-01T00:00:00Z");
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error("unreachable");

    // The old binding is CLOSED, not deleted — "on v1 from March to June" is what an audit needs.
    const closed = after.bindings.find((b) => b.versionHash === verticalHash(V1.members));
    expect(closed?.replacedAt).toBe("2026-06-01T00:00:00Z");
    expect(closed?.acceptedAt).toBe("2026-03-01T00:00:00Z");

    expect(currentBinding(after.bindings, PRACTICE, VERTICAL)?.versionHash).toBe(
      verticalHash(V2.members),
    );
  });

  it("refuses an unattributed acceptance", () => {
    expect(acceptVersion([], V1, ALL, PRACTICE, "  ", "2026-03-01T00:00:00Z")).toEqual({
      ok: false,
      reason: "unattributed",
    });
    expect(acceptVersion([], V1, ALL, PRACTICE, "someone@x.test", "")).toEqual({
      ok: false,
      reason: "unattributed",
    });
  });

  it("refuses to bind a practice to a version that does not work today", () => {
    const result = accept([], V1, PATHWAY_WITHDRAWN);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.reason).toBe("version_not_usable");
    // Named, so it can be fixed before being offered again.
    expect(result.unusable?.map((u) => u.member.ref)).toEqual(["hash-a"]);
  });

  it("re-accepting the same version changes nothing", () => {
    expect(accept(boundToV1(), V1, ALL, "2026-06-01T00:00:00Z")).toEqual({
      ok: false,
      reason: "already_on_this_version",
    });
  });

  it("one practice's acceptance binds nobody else", () => {
    const bindings = boundToV1();
    expect(currentBinding(bindings, OTHER, VERTICAL)).toBeNull();
    expect(resolveBinding(bindings, [V1], ALL, OTHER, VERTICAL).state).toBe("not_bound");
  });
});

describe("W167 two acceptances at the same instant resolve the same way", () => {
  it("the answer does not depend on the order the store returned the rows", () => {
    // W167's register names this fold. Without the tie-break the practice's answer to "which
    // version am I on" would depend on row order — the silent version drift this whole module
    // exists to prevent, arriving by a different door.
    const at = "2026-03-01T00:00:00Z";
    const tied: VerticalBinding[] = [V1, V_INDEPENDENT].map((spec) => ({
      practiceId: PRACTICE,
      verticalId: VERTICAL,
      versionHash: verticalHash(spec.members),
      acceptedBy: "manager@demo.practice.example",
      acceptedAt: at,
      replacedAt: null,
    }));

    const result = foldIsOrderIndependent(
      (rows) => currentBinding(rows as VerticalBinding[], PRACTICE, VERTICAL)?.versionHash ?? null,
      tied,
    );
    expect(result.stable, `forward ${result.forward} vs reversed ${result.reversed}`).toBe(true);
  });
});

describe("W160 withdrawal is inherited, not restated", () => {
  it("a member's withdrawal reaches the bound practice with no step in this module", () => {
    // Evidence is assembled at call time, so revoking the pathway's sign-off is enough: the
    // vertical stops being usable and the binding's resolution says so. Same free inheritance
    // W152 got from W119 and W119 got from W118.
    const bindings = boundToV1();
    expect(resolveBinding(bindings, [V1], ALL, PRACTICE, VERTICAL).state).toBe("in_force");

    const after = resolveBinding(bindings, [V1], PATHWAY_WITHDRAWN, PRACTICE, VERTICAL);
    expect(after.state).toBe("bound_version_unusable");
    expect(after.unusable.map((u) => u.member.ref)).toEqual(["hash-a"]);
  });

  it("the binding STANDS — it is neither migrated nor dropped", () => {
    // The two wrong answers that both look helpful. Auto-migrating is the silent upgrade
    // arriving at the worst moment; dropping the binding reverses a decision without telling
    // anyone. Both are refused: the binding is still there, still on v1.
    const bindings = boundToV1();
    const after = resolveBinding(bindings, [V1, V_INDEPENDENT], PATHWAY_WITHDRAWN, PRACTICE, VERTICAL);

    expect(after.binding).not.toBeNull();
    expect(after.binding?.versionHash).toBe(verticalHash(V1.members));
    expect(after.binding?.replacedAt).toBeFalsy();
    // A version sharing none of v1's members still works and is named as an option...
    expect(after.usableAlternatives).toEqual([verticalHash(V_INDEPENDENT.members)]);
    // ...but nothing is in force, because nobody has decided.
    expect(after.spec).toBeNull();
    expect(RESOLUTION_COPY.bound_version_unusable).toContain("Somebody has to decide");
  });

  it("offers no alternative when the withdrawal takes out every version", () => {
    // The common case, and the one the first draft of this test got wrong: v2 is usually v1
    // WIDENED, so it cites the same pathway and a single withdrawal takes both. A practice
    // whose vertical breaks does not generally have somewhere to move to.
    const after = resolveBinding(boundToV1(), [V1, V2], ALL_PATHWAYS_WITHDRAWN, PRACTICE, VERTICAL);
    expect(after.state).toBe("bound_version_unusable");
    expect(after.usableAlternatives).toEqual([]);
  });

  it("recovers on its own when the withdrawal is reversed", () => {
    // Nothing had to be repaired, because nothing was invalidated — the state was derived.
    const bindings = boundToV1();
    expect(resolveBinding(bindings, [V1], PATHWAY_WITHDRAWN, PRACTICE, VERTICAL).state).toBe(
      "bound_version_unusable",
    );
    expect(resolveBinding(bindings, [V1], ALL, PRACTICE, VERTICAL).state).toBe("in_force");
  });

  it("this module contains none of the sign-off vocabulary", () => {
    // W157's test, applied here: a second implementation of the G5 rule is a second thing to
    // keep in step, and the copy is always the one that drifts.
    const source = bindingModule as Record<string, unknown>;
    expect(Object.keys(source)).not.toContain("usableVertical");
    for (const name of Object.keys(source)) {
      expect(name.toLowerCase()).not.toMatch(/signoff|attest|review/);
    }
  });
});

describe("W160 nothing is assumed in place of a missing version", () => {
  it("a binding to a hash nobody has on file resolves to unknown, not to something else", () => {
    const orphan: VerticalBinding[] = [
      {
        practiceId: PRACTICE,
        verticalId: VERTICAL,
        versionHash: "a-hash-nobody-has",
        acceptedBy: "manager@demo.practice.example",
        acceptedAt: "2026-03-01T00:00:00Z",
        replacedAt: null,
      },
    ];
    const resolved = resolveBinding(orphan, [V1, V2], ALL, PRACTICE, VERTICAL);
    expect(resolved.state).toBe("bound_version_unknown");
    expect(resolved.spec).toBeNull();
    expect(RESOLUTION_COPY.bound_version_unknown).toContain("Nothing has been assumed");
  });

  it("every state and refusal has copy that says what happened", () => {
    for (const [state, copy] of Object.entries(RESOLUTION_COPY)) {
      expect(copy.length, state).toBeGreaterThan(30);
    }
    for (const [reason, copy] of Object.entries(ACCEPT_REFUSAL_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(30);
    }
  });
});
