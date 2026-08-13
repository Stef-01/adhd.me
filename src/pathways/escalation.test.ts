// W121 verify gate: "a test pins the shipped rule set at zero."
//
// That test is one line and it is the easy half. The half worth writing carefully is what
// zero rules MEANS: with an empty rule set every escalation must come back `unrouted`, because
// the alternative — an unmatched escalation producing nothing — would make the whole mechanism
// a no-op that looks like it is working. W68 established that a safety rail producing silence
// is worse than no rail; an empty rule set is where that trap is most likely to be sprung.

import { describe, expect, it } from "vitest";
import {
  ALL_ESCALATION_ACTIONS,
  describeAction,
  describeUnrouted,
  routeEscalations,
  SHIPPED_ESCALATION_RULES,
  type EscalationRule,
} from "./escalation";
import { evaluatePathway, type RecordedFact } from "./evaluation";
import { usablePathway, type PathwayAttestation, type UsablePathway } from "./approval";
import { versionHash, type PathwayCriteria, type PathwayVersion } from "./versioning";

const criterion = (factCode: string, requires: "present" | "absent" = "present") => ({
  factCode,
  requires,
  rationale: `placeholder rationale for ${factCode}`,
});

const CRITERIA: PathwayCriteria = {
  inclusion: [criterion("fact_in")],
  exclusion: [],
  escalation: [criterion("esc_a"), criterion("esc_b")],
};

function signedPathway(c: PathwayCriteria = CRITERIA): UsablePathway {
  const version: PathwayVersion = {
    pathwayId: "path-1",
    versionHash: versionHash(c),
    ordinal: 1,
    criteria: c,
    state: "published",
    draftedAt: "2026-01-01",
    draftedBy: "author@x.example",
    publishedAt: "2026-01-02",
    publishedBy: "author@x.example",
    supersededAt: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawnReason: null,
    publications: [],
  };
  const attestations: PathwayAttestation[] = [
    {
      pathwayId: "path-1", versionHash: version.versionHash, kind: "specialist_review",
      byEmail: "reviewer@x.example", at: "2026-01-03",
      finding: "Placeholder review finding — no clinical content is signed off in this tree.",
      revokedAt: null,
    },
    {
      pathwayId: "path-1", versionHash: version.versionHash, kind: "founder_sign_off",
      byEmail: "founder@x.example", at: "2026-01-04",
      finding: "Placeholder sign-off finding — fixture only.",
      revokedAt: null,
    },
  ];
  const result = usablePathway(version, attestations);
  if (!result.usable) throw new Error(`fixture is not usable: ${result.reason}`);
  return result.pathway;
}

const fact = (code: string, state: RecordedFact["state"] = "recorded_present"): RecordedFact => ({
  code,
  state,
  source: "pms_condition_flag",
  recordedAt: "2026-02-01",
  recordedBy: "clin-1",
});

/** Both escalations fired; the pathway is otherwise determinable. */
function bothFired(path: UsablePathway = signedPathway()) {
  return evaluatePathway(path, [fact("fact_in"), fact("esc_a"), fact("esc_b")]);
}

const rule = (over: Partial<EscalationRule> = {}): EscalationRule => ({
  pathwayId: "path-1",
  versionHash: versionHash(CRITERIA),
  factCode: "esc_a",
  action: "notify_usual_gp",
  rationale: "Placeholder rationale — fixture only, not clinical content.",
  ...over,
});

describe("W121 the shipped rule set is empty", () => {
  it("ships zero rules", () => {
    // The unit's named gate. Clinical authorship is G5; the mechanism ships, the content does not.
    expect(SHIPPED_ESCALATION_RULES).toEqual([]);
  });

  it("empty does NOT mean escalation is off — every fired escalation comes back unrouted", () => {
    // The trap: an unmatched escalation producing nothing would make this whole module a no-op
    // that looks like it works, and nobody would notice until the rules landed.
    const outcome = routeEscalations(bothFired());
    expect(outcome.routed).toEqual([]);
    expect(outcome.unrouted.map((u) => u.criterion.factCode)).toEqual(["esc_a", "esc_b"]);
    for (const item of outcome.unrouted) {
      expect(item.reason).toBe("no_rule_for_this_trigger");
    }
  });

  it("says plainly that nothing was actioned", () => {
    expect(describeUnrouted("no_rule_for_this_trigger")).toContain("no rule says what to do");
    expect(describeUnrouted("no_rule_for_this_trigger")).toContain("Nothing has been actioned");
  });
});

describe("W121 routing", () => {
  it("routes a trigger that has a rule and leaves the others unrouted", () => {
    const outcome = routeEscalations(bothFired(), [rule()]);
    expect(outcome.routed.map((r) => [r.criterion.factCode, r.action])).toEqual([
      ["esc_a", "notify_usual_gp"],
    ]);
    expect(outcome.unrouted.map((u) => u.criterion.factCode)).toEqual(["esc_b"]);
  });

  it("carries the rule's rationale through, so an action can be questioned", () => {
    const outcome = routeEscalations(bothFired(), [rule({ rationale: "Because the fixture says so." })]);
    expect(outcome.routed[0]?.rationale).toBe("Because the fixture says so.");
  });

  it("routes nothing when no escalation fired", () => {
    const verdict = evaluatePathway(signedPathway(), [
      fact("fact_in"),
      fact("esc_a", "recorded_absent"),
      fact("esc_b", "recorded_absent"),
    ]);
    const outcome = routeEscalations(verdict, [rule()]);
    expect(outcome.routed).toEqual([]);
    expect(outcome.unrouted).toEqual([]);
  });

  it("ignores a rule belonging to another pathway", () => {
    const outcome = routeEscalations(bothFired(), [rule({ pathwayId: "path-other" })]);
    expect(outcome.routed).toEqual([]);
    expect(outcome.unrouted.map((u) => u.reason)).toEqual([
      "no_rule_for_this_trigger",
      "no_rule_for_this_trigger",
    ]);
  });

  it("carries the disclaimer on the value", () => {
    expect(routeEscalations(bothFired()).notAClinicalRecommendation).toBe(true);
  });
});

describe("W121 an edited pathway loses its escalation rules", () => {
  it("does not apply a rule written against a different version, and says which problem it is", () => {
    // Same shape as W118/W119: an edit produces a different hash, so a rule written against
    // criteria that have since changed is a rule nobody reviewed. Distinguished from "no rule"
    // because the fixes differ — one needs a rule written, the other needs re-review.
    const outcome = routeEscalations(bothFired(), [rule({ versionHash: "stale-hash" })]);
    expect(outcome.routed).toEqual([]);
    const escA = outcome.unrouted.find((u) => u.criterion.factCode === "esc_a");
    expect(escA?.reason).toBe("rules_written_against_another_version");
    // The other trigger has no rule at all, and that is a different message.
    expect(outcome.unrouted.find((u) => u.criterion.factCode === "esc_b")?.reason).toBe(
      "no_rule_for_this_trigger",
    );
    expect(describeUnrouted("rules_written_against_another_version")).toContain("re-reviewing");
  });

  it("an edit really does change the hash the rule must match", () => {
    // Guards the test above from passing on a hand-written wrong hash rather than on the
    // mechanism: two different criteria sets must hash differently.
    const edited: PathwayCriteria = { ...CRITERIA, escalation: [criterion("esc_a")] };
    expect(versionHash(edited)).not.toBe(versionHash(CRITERIA));
  });
});

describe("W121 the action vocabulary is operational, never clinical", () => {
  it("is closed and says nothing about urgency or severity", () => {
    expect([...ALL_ESCALATION_ACTIONS].sort()).toEqual([
      "flag_for_practice_review",
      "notify_usual_gp",
    ]);
    for (const action of ALL_ESCALATION_ACTIONS) {
      expect(action).not.toMatch(/urgent|emergency|immediate|priority|severe|critical|now|today/i);
    }
  });

  it("describes what happens, not what it means", () => {
    for (const action of ALL_ESCALATION_ACTIONS) {
      const copy = describeAction(action).toLowerCase();
      expect(copy.length).toBeGreaterThan(20);
      for (const banned of ["urgent", "immediately", "emergency", "serious", "risk", "danger"]) {
        expect(copy, `"${banned}" in the copy for ${action}`).not.toContain(banned);
      }
    }
  });

  it("has no timeframe field for an author to put urgency in", () => {
    // Deliberate: a timeframe attached to a clinical escalation is a judgement about urgency,
    // and that judgement belongs in content the founder signs off, not in a shape this module
    // invents. W114 drew the same line for what a credential permits.
    const keys = Object.keys(rule()).sort();
    expect(keys).toEqual(["action", "factCode", "pathwayId", "rationale", "versionHash"]);
    for (const key of keys) {
      expect(key).not.toMatch(/within|hours|days|deadline|urgency|priority|severity/i);
    }
  });
});
