// W128 verify gate: withdrawal is immediate and terminal for that version, and re-publication
// is a fresh act (the W67 shape).

import { describe, expect, it } from "vitest";
import { PATHWAY_REFUSAL_COPY, type PathwayAttestation, usablePathway } from "./approval";
import {
  PATHWAY_REJECTION_COPY,
  type PathwayCriteria,
  type PathwayEvent,
  currentPathway,
  pathwayAt,
  replayPathway,
  versionHash,
} from "./versioning";

const PATHWAY = "pathway-placeholder-a";
const AUTHOR = "author@example.test";
const REVIEWER = "specialist@example.test";
const FOUNDER = "founder@example.test";
const REASON = "Withdrawn pending review of the exclusion list.";

function criteria(factCode = "placeholder_fact_a"): PathwayCriteria {
  return {
    inclusion: [{ factCode, requires: "present", rationale: "placeholder rationale" }],
    exclusion: [],
    escalation: [],
  };
}

const draft = (c: PathwayCriteria, at: string): PathwayEvent => ({
  pathwayId: PATHWAY, kind: "version_drafted", versionHash: versionHash(c), at, byEmail: AUTHOR, criteria: c,
});
const publish = (c: PathwayCriteria, at: string): PathwayEvent => ({
  pathwayId: PATHWAY, kind: "version_published", versionHash: versionHash(c), at, byEmail: FOUNDER,
});
const withdraw = (c: PathwayCriteria, at: string, reason: string | undefined = REASON): PathwayEvent => ({
  pathwayId: PATHWAY, kind: "version_withdrawn", versionHash: versionHash(c), at, byEmail: FOUNDER, reason,
});

const V1 = criteria();

describe("W128 withdrawal is immediate", () => {
  const events = [draft(V1, "2026-03-01T00:00:00Z"), publish(V1, "2026-03-02T00:00:00Z"), withdraw(V1, "2026-05-01T00:00:00Z")];

  it("leaves force at the instant it is recorded, not at the end of anything", () => {
    expect(pathwayAt(events, PATHWAY, "2026-04-30T23:59:59Z")?.criteria).toEqual(V1);
    expect(pathwayAt(events, PATHWAY, "2026-05-01T00:00:00Z")).toBeNull();
    expect(currentPathway(events, PATHWAY)).toBeNull();
  });

  it("does not rewrite the period it WAS in force", () => {
    // The point of W118's event log: withdrawing today must not make March look empty.
    expect(pathwayAt(events, PATHWAY, "2026-03-15T00:00:00Z")?.criteria).toEqual(V1);
  });

  it("records who, when and why", () => {
    const [version] = replayPathway(events, PATHWAY).versions;
    expect(version!.state).toBe("withdrawn");
    expect(version!.withdrawnAt).toBe("2026-05-01T00:00:00Z");
    expect(version!.withdrawnBy).toBe(FOUNDER);
    expect(version!.withdrawnReason).toBe(REASON);
    // Withdrawn is not superseded — nothing replaced it.
    expect(version!.supersededAt).toBeNull();
  });

  it("refuses a withdrawal with no reason", () => {
    for (const reason of [undefined, "", "   "]) {
      // Built inline rather than through `withdraw()`: passing undefined to a parameter with
      // a default silently supplies the default, so the helper would have tested the
      // opposite of this case.
      const noReason: PathwayEvent = {
        pathwayId: PATHWAY,
        kind: "version_withdrawn",
        versionHash: versionHash(V1),
        at: "2026-05-01T00:00:00Z",
        byEmail: FOUNDER,
        reason,
      };
      const events = [draft(V1, "2026-03-01T00:00:00Z"), publish(V1, "2026-03-02T00:00:00Z"), noReason];
      const history = replayPathway(events, PATHWAY);
      expect(history.rejected[0]?.reason, `reason ${JSON.stringify(reason)}`).toBe(
        "missing_withdrawal_reason",
      );
      // And it is still in force, because the withdrawal did not happen.
      expect(currentPathway(events, PATHWAY)).not.toBeNull();
    }
    expect(PATHWAY_REJECTION_COPY.missing_withdrawal_reason).toContain("safety withdrawal");
  });
});

describe("W128 withdrawal is terminal for that episode", () => {
  it("withdrawing twice is refused", () => {
    const history = replayPathway(
      [
        draft(V1, "2026-03-01T00:00:00Z"),
        publish(V1, "2026-03-02T00:00:00Z"),
        withdraw(V1, "2026-05-01T00:00:00Z"),
        withdraw(V1, "2026-06-01T00:00:00Z", "again"),
      ],
      PATHWAY,
    );
    expect(history.rejected).toHaveLength(1);
    expect(history.rejected[0]?.reason).toBe("not_in_force");
    // The first withdrawal stands, unchanged by the second attempt.
    expect(history.versions[0]?.withdrawnAt).toBe("2026-05-01T00:00:00Z");
    expect(history.versions[0]?.withdrawnReason).toBe(REASON);
  });

  it("withdrawing a draft or a superseded version is refused, not a no-op", () => {
    // Each is somebody believing a pathway is live when it is not, which is worth telling them.
    const draftOnly = replayPathway([draft(V1, "2026-03-01T00:00:00Z"), withdraw(V1, "2026-03-05T00:00:00Z")], PATHWAY);
    expect(draftOnly.rejected[0]?.reason).toBe("not_in_force");

    const V2 = criteria("second_fact");
    const superseded = replayPathway(
      [
        draft(V1, "2026-03-01T00:00:00Z"),
        publish(V1, "2026-03-02T00:00:00Z"),
        draft(V2, "2026-06-01T00:00:00Z"),
        publish(V2, "2026-06-02T00:00:00Z"),
        withdraw(V1, "2026-07-01T00:00:00Z"),
      ],
      PATHWAY,
    );
    expect(superseded.rejected[0]?.reason).toBe("not_in_force");
    expect(superseded.versions[0]?.state).toBe("superseded");
  });

  it("the closed episode is never written to again", () => {
    const V2 = criteria("second_fact");
    const [version] = replayPathway(
      [
        draft(V1, "2026-03-01T00:00:00Z"),
        publish(V1, "2026-03-02T00:00:00Z"),
        withdraw(V1, "2026-05-01T00:00:00Z"),
        publish(V1, "2026-08-01T00:00:00Z"),
        draft(V2, "2026-09-01T00:00:00Z"),
        publish(V2, "2026-09-02T00:00:00Z"),
      ],
      PATHWAY,
    ).versions;

    expect(version!.publications).toHaveLength(2);
    const [first, second] = version!.publications;
    expect(first).toEqual({
      publishedAt: "2026-03-02T00:00:00Z",
      publishedBy: FOUNDER,
      endedAt: "2026-05-01T00:00:00Z",
      endedBy: FOUNDER,
      endedReason: "withdrawn",
      withdrawnReason: REASON,
    });
    // The second episode ended by supersession, and did not overwrite the first's reason.
    expect(second?.endedReason).toBe("superseded");
    expect(second?.withdrawnReason).toBeNull();
  });
});

describe("W128 re-publication is a fresh act", () => {
  const events = [
    draft(V1, "2026-03-01T00:00:00Z"),
    publish(V1, "2026-03-02T00:00:00Z"),
    withdraw(V1, "2026-05-01T00:00:00Z"),
    publish(V1, "2026-08-01T00:00:00Z"),
  ];

  it("a withdrawn version can be published again as a new episode", () => {
    const [version] = replayPathway(events, PATHWAY).versions;
    expect(version!.state).toBe("published");
    expect(version!.publications).toHaveLength(2);
    // Identity is unchanged — it is the same content, not a new version.
    expect(version!.versionHash).toBe(versionHash(V1));
    expect(replayPathway(events, PATHWAY).versions).toHaveLength(1);
  });

  it("the gap between the episodes stays a gap", () => {
    // The property a single publishedAt field cannot represent, and the reason publication
    // had to become an episode rather than a pair of dates on the version.
    expect(pathwayAt(events, PATHWAY, "2026-04-01T00:00:00Z")?.criteria).toEqual(V1);
    expect(pathwayAt(events, PATHWAY, "2026-06-15T00:00:00Z")).toBeNull();
    expect(pathwayAt(events, PATHWAY, "2026-09-01T00:00:00Z")?.criteria).toEqual(V1);
  });

  it("still refuses publishing something already in force", () => {
    const twice = replayPathway([...events, publish(V1, "2026-09-01T00:00:00Z")], PATHWAY);
    expect(twice.rejected[0]?.reason).toBe("already_published");
  });
});

describe("W128 attestations do not survive a withdrawal", () => {
  const review = (at: string): PathwayAttestation => ({
    pathwayId: PATHWAY, versionHash: versionHash(V1), kind: "specialist_review", byEmail: REVIEWER, at, finding: "Checked.",
  });
  const signOff = (at: string): PathwayAttestation => ({
    pathwayId: PATHWAY, versionHash: versionHash(V1), kind: "founder_sign_off", byEmail: FOUNDER, at, finding: "Accepted.",
  });

  const republished = replayPathway(
    [
      draft(V1, "2026-03-01T00:00:00Z"),
      publish(V1, "2026-03-02T00:00:00Z"),
      withdraw(V1, "2026-05-01T00:00:00Z"),
      publish(V1, "2026-08-01T00:00:00Z"),
    ],
    PATHWAY,
  ).versions[0]!;

  it("a republished version is NOT usable on its pre-withdrawal signatures", () => {
    // Without this, "a fresh act" is nominal: a pathway withdrawn for a safety reason could be
    // put back in force by one person and be immediately usable, satisfied by signatures given
    // before anyone knew there was a problem.
    expect(republished.state).toBe("published");
    expect(usablePathway(republished, [review("2026-03-03T00:00:00Z"), signOff("2026-03-04T00:00:00Z")])).toEqual({
      usable: false,
      reason: "attested_before_withdrawal",
    });
  });

  it("a half-fresh pair is still refused", () => {
    // One new signature is not a fresh decision; both stages have to be taken again.
    expect(usablePathway(republished, [review("2026-03-03T00:00:00Z"), signOff("2026-08-02T00:00:00Z")]).usable).toBe(false);
    expect(usablePathway(republished, [review("2026-08-02T00:00:00Z"), signOff("2026-03-04T00:00:00Z")]).usable).toBe(false);
  });

  it("fresh review and sign-off after the withdrawal make it usable again", () => {
    const result = usablePathway(republished, [
      review("2026-03-03T00:00:00Z"),
      signOff("2026-03-04T00:00:00Z"),
      review("2026-08-02T00:00:00Z"),
      signOff("2026-08-03T00:00:00Z"),
    ]);
    expect(result.usable).toBe(true);
  });

  it("a version that was never withdrawn is unaffected", () => {
    // Guard against the rule being applied everywhere: this must not tighten the normal path.
    const clean = replayPathway([draft(V1, "2026-03-01T00:00:00Z"), publish(V1, "2026-03-02T00:00:00Z")], PATHWAY).versions[0]!;
    expect(usablePathway(clean, [review("2026-03-03T00:00:00Z"), signOff("2026-03-04T00:00:00Z")]).usable).toBe(true);
  });

  it("the refusal explains what is needed", () => {
    expect(PATHWAY_REFUSAL_COPY.attested_before_withdrawal).toContain("fresh review and sign-off");
  });
});

describe("W128 nothing is dropped silently", () => {
  it("every event lands in applied or rejected", () => {
    const events = [
      draft(V1, "2026-03-01T00:00:00Z"),
      withdraw(V1, "2026-03-01T12:00:00Z"), // not in force yet
      publish(V1, "2026-03-02T00:00:00Z"),
      withdraw(V1, "2026-05-01T00:00:00Z", ""), // no reason
      withdraw(V1, "2026-05-02T00:00:00Z"),
      withdraw(V1, "2026-06-01T00:00:00Z"), // already withdrawn
    ];
    const history = replayPathway(events, PATHWAY);
    expect(history.applied.length + history.rejected.length).toBe(events.length);
    expect(history.rejected.map((r) => r.reason)).toEqual([
      "not_in_force",
      "missing_withdrawal_reason",
      "not_in_force",
    ]);
  });

  it("ingest order cannot change the verdict", () => {
    const ordered = [
      draft(V1, "2026-03-01T00:00:00Z"),
      publish(V1, "2026-03-02T00:00:00Z"),
      withdraw(V1, "2026-05-01T00:00:00Z"),
      publish(V1, "2026-08-01T00:00:00Z"),
    ];
    const shuffled = [ordered[3]!, ordered[0]!, ordered[2]!, ordered[1]!];
    expect(replayPathway(shuffled, PATHWAY)).toEqual(replayPathway(ordered, PATHWAY));
  });
});
