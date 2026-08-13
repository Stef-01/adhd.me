// W119 verify gate: an unapproved pathway is unusable BY TYPE, not by check, and the tree
// ships with zero pathways signed.

import { describe, expect, it } from "vitest";
import {
  PATHWAY_REFUSAL_COPY,
  type PathwayAttestation,
  SHIPPED_ATTESTATIONS,
  assertUsable,
  usablePathway,
  usablePathways,
} from "./approval";
import {
  type PathwayCriteria,
  type PathwayEvent,
  type PathwayVersion,
  replayPathway,
  versionHash,
} from "./versioning";

import { foldIsOrderIndependent } from "@/quality/order-independence";

const PATHWAY = "pathway-placeholder-a";
const AUTHOR = "author@example.test";
const REVIEWER = "specialist@example.test";
const FOUNDER = "founder@example.test";

function criteria(factCode = "placeholder_fact_a"): PathwayCriteria {
  return {
    inclusion: [{ factCode, requires: "present", rationale: "placeholder rationale" }],
    exclusion: [],
    escalation: [],
  };
}

/** A published version, via W118's replay — not hand-built, so the two units stay composed. */
function publishedVersion(c: PathwayCriteria = criteria(), by = AUTHOR): PathwayVersion {
  const hash = versionHash(c);
  const events: PathwayEvent[] = [
    { pathwayId: PATHWAY, kind: "version_drafted", versionHash: hash, at: "2026-03-01T00:00:00Z", byEmail: by, criteria: c },
    { pathwayId: PATHWAY, kind: "version_published", versionHash: hash, at: "2026-03-02T00:00:00Z", byEmail: FOUNDER },
  ];
  const version = replayPathway(events, PATHWAY).versions[0];
  if (!version) throw new Error("fixture must produce a version");
  return version;
}

function attest(over: Partial<PathwayAttestation> = {}): PathwayAttestation {
  return {
    pathwayId: PATHWAY,
    versionHash: versionHash(criteria()),
    kind: "specialist_review",
    byEmail: REVIEWER,
    at: "2026-03-03T00:00:00Z",
    finding: "Criteria match the published guidance.",
    ...over,
  };
}

const REVIEW = attest();
const SIGN_OFF = attest({ kind: "founder_sign_off", byEmail: FOUNDER, at: "2026-03-04T00:00:00Z", finding: "Accepted for release." });

describe("W119 G5: nothing ships signed", () => {
  it("no attestation is shipped, so no pathway is usable", () => {
    expect(SHIPPED_ATTESTATIONS).toEqual([]);
    expect(usablePathway(publishedVersion(), SHIPPED_ATTESTATIONS)).toEqual({
      usable: false,
      reason: "not_reviewed",
    });
  });
});

describe("W119 the gate", () => {
  it("both stages, by different people, in order ⇒ usable", () => {
    const result = usablePathway(publishedVersion(), [REVIEW, SIGN_OFF]);
    expect(result.usable).toBe(true);
    if (!result.usable) throw new Error("unreachable");
    expect(result.pathway.reviewedBy).toBe(REVIEWER);
    expect(result.pathway.signedOffBy).toBe(FOUNDER);
  });

  const refusals: Array<[string, PathwayAttestation[], string]> = [
    ["nothing at all", [], "not_reviewed"],
    ["reviewed but not signed off", [REVIEW], "not_signed_off"],
    ["signed off but never reviewed", [SIGN_OFF], "not_reviewed"],
    [
      "the author reviewed their own work",
      [attest({ byEmail: AUTHOR }), SIGN_OFF],
      "reviewer_was_the_author",
    ],
    [
      "one person did both stages",
      [attest({ byEmail: FOUNDER }), SIGN_OFF],
      "signatory_was_the_reviewer",
    ],
    [
      "the sign-off predates the review",
      [attest({ at: "2026-03-09T00:00:00Z" }), SIGN_OFF],
      "sign_off_precedes_review",
    ],
    ["the review was withdrawn", [attest({ revokedAt: "2026-03-05T00:00:00Z" }), SIGN_OFF], "review_revoked"],
    [
      "the sign-off was withdrawn",
      [REVIEW, attest({ kind: "founder_sign_off", byEmail: FOUNDER, at: "2026-03-04T00:00:00Z", revokedAt: "2026-03-06T00:00:00Z" })],
      "sign_off_revoked",
    ],
  ];

  for (const [label, attestations, reason] of refusals) {
    it(`refuses when ${label}`, () => {
      const result = usablePathway(publishedVersion(), attestations);
      expect(result).toEqual({ usable: false, reason });
    });
  }

  it("a revoked attestation can be replaced by a fresh one", () => {
    // Revocation is terminal for that attestation, not for the version — otherwise a
    // withdrawn sign-off would kill a pathway permanently.
    const again = attest({ at: "2026-03-07T00:00:00Z", finding: "Re-reviewed after the withdrawal." });
    const result = usablePathway(publishedVersion(), [
      attest({ revokedAt: "2026-03-05T00:00:00Z" }),
      again,
      attest({ kind: "founder_sign_off", byEmail: FOUNDER, at: "2026-03-08T00:00:00Z", finding: "Accepted." }),
    ]);
    expect(result.usable).toBe(true);
  });
});

describe("W119 an edit is a different version, so sign-off does not carry", () => {
  it("attestations do not follow an edit", () => {
    // The property that comes free from W118 making identity be content. W67 had to build
    // hash-keyed revocation deliberately; here there is no code path that could get it wrong,
    // because the edited version simply has no attestations against its hash.
    const edited = publishedVersion(criteria("edited_fact"));
    expect(usablePathway(edited, [REVIEW, SIGN_OFF])).toEqual({
      usable: false,
      reason: "not_reviewed",
    });

    // And the original is still usable — an edit revokes nothing retroactively.
    expect(usablePathway(publishedVersion(), [REVIEW, SIGN_OFF]).usable).toBe(true);
  });

  it("another pathway's attestation does not sign this one off", () => {
    const foreign = [
      attest({ pathwayId: "other-pathway" }),
      attest({ pathwayId: "other-pathway", kind: "founder_sign_off", byEmail: FOUNDER, at: "2026-03-04T00:00:00Z" }),
    ];
    expect(usablePathway(publishedVersion(), foreign)).toEqual({
      usable: false,
      reason: "not_reviewed",
    });
  });
});

describe("W119 sign-off is not the same as being in force", () => {
  it("a draft is unusable however well attested", () => {
    const c = criteria();
    const hash = versionHash(c);
    const draftOnly = replayPathway(
      [{ pathwayId: PATHWAY, kind: "version_drafted", versionHash: hash, at: "2026-03-01T00:00:00Z", byEmail: AUTHOR, criteria: c }],
      PATHWAY,
    ).versions[0]!;

    expect(draftOnly.state).toBe("draft");
    expect(usablePathway(draftOnly, [REVIEW, SIGN_OFF])).toEqual({
      usable: false,
      reason: "version_not_published",
    });
  });

  it("a superseded version stops being usable when a newer one takes over", () => {
    const v1 = criteria();
    const v2 = criteria("second_fact");
    const events: PathwayEvent[] = [
      { pathwayId: PATHWAY, kind: "version_drafted", versionHash: versionHash(v1), at: "2026-03-01T00:00:00Z", byEmail: AUTHOR, criteria: v1 },
      { pathwayId: PATHWAY, kind: "version_published", versionHash: versionHash(v1), at: "2026-03-02T00:00:00Z", byEmail: FOUNDER },
      { pathwayId: PATHWAY, kind: "version_drafted", versionHash: versionHash(v2), at: "2026-06-01T00:00:00Z", byEmail: AUTHOR, criteria: v2 },
      { pathwayId: PATHWAY, kind: "version_published", versionHash: versionHash(v2), at: "2026-06-02T00:00:00Z", byEmail: FOUNDER },
    ];
    const [first] = replayPathway(events, PATHWAY).versions;
    expect(usablePathway(first!, [REVIEW, SIGN_OFF])).toEqual({
      usable: false,
      reason: "version_not_published",
    });
  });
});

describe("W119 the gate cannot be skipped by forgetting to read it", () => {
  it("assertUsable throws rather than returning false", () => {
    // W67's reason: a boolean nobody reads is not a gate.
    expect(() => assertUsable(publishedVersion(), [])).toThrow(/founder gate G5/);
    expect(() => assertUsable(publishedVersion(), [REVIEW, SIGN_OFF])).not.toThrow();
  });

  it("usablePathways returns only what cleared the gate", () => {
    const signed = publishedVersion();
    const unsigned = publishedVersion(criteria("other_fact"));
    const cleared = usablePathways([signed, unsigned], [REVIEW, SIGN_OFF]);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.version.versionHash).toBe(signed.versionHash);
  });
});

describe("W167 two attestations at the same instant name the same attester", () => {
  it("the audit record does not change with row order", () => {
    // W167's register names this fold. Two specialists recording a review at the same instant
    // used to resolve to whichever the store listed first, so the document whose job is to say
    // WHO LOOKED would name a different person on a refresh.
    const at = "2026-03-03T00:00:00Z";
    const tied: PathwayAttestation[] = [
      attest({ byEmail: "zoe@example.test", at }),
      attest({ byEmail: "ada@example.test", at }),
    ];

    const result = foldIsOrderIndependent((rows) => {
      const outcome = usablePathway(publishedVersion(), [...rows, SIGN_OFF]);
      return outcome.usable ? outcome.pathway.reviewedBy : outcome.reason;
    }, tied);

    expect(result.stable, `forward ${result.forward} vs reversed ${result.reversed}`).toBe(true);
    expect(result.forward).toBe("ada@example.test");
  });
});

describe("W119 refusal copy", () => {
  it("every refusal says what is waiting on whom", () => {
    for (const [reason, copy] of Object.entries(PATHWAY_REFUSAL_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(30);
    }
    expect(PATHWAY_REFUSAL_COPY.not_signed_off).toContain("founder sign-off");
  });
});
