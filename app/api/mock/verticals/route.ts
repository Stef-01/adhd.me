// W164: vertical seed + introspection for the Playwright e2e (synthetic only, same posture as the
// other /api/mock routes — removed when real persistence lands).
//
// The seed reaches the states the page has to distinguish: nothing declared, declared with
// nothing ready, and a vertical whose members contradict each other.
//
// THE CONTRADICTION CASE NEEDS SIGNED-OFF MEMBERS, and that is not an accident of the fixture —
// W159 compares members only once they all resolve, because a vertical missing a member has a
// different problem first. So this route seeds `specialist_review` and `founder_sign_off`
// attestations for that mode. That follows the posture W127 already established in
// /api/mock/pathways: synthetic attestations behind `assertMockRoutesEnabled()`, naming
// obviously-fake reviewers, while `SHIPPED_ATTESTATIONS` stays empty and no real content is
// signed off anywhere. The G5 gate is about what SHIPS, and nothing here ships.
//
// WHICH contradiction is seeded is itself a finding, recorded here because building the fixture
// is what surfaced it. W159 detects three blocking kinds and only ONE is reachable through the
// registries today:
//
//   * `two_versions_of_one_pathway` — NOT reachable. W118 supersedes the earlier version when a
//     later one publishes, and `usablePathway` refuses anything not in force, so two versions of
//     one pathway cannot both be usable at once. The check is a structural guard against evidence
//     assembled some other way, not a live path.
//   * `two_intervals_for_one_condition` — NOT reachable. `SHIPPED_INTERVALS` is empty and filling
//     it is G5 (W163).
//   * `pathway_unsatisfiable` — reachable, and seeded below: one version, in force, whose criteria
//     include and exclude the same fact with the same requirement.
//
// Filed for W168 rather than acted on here: a guard that cannot fire is not wrong, but it should
// be known to be a guard.

import { NextResponse, type NextRequest } from "next/server";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import { addPathwayAttestations, addPathwayEvents, resetPathwayRegistry } from "@/pathways/registry";
import { versionHash, type PathwayCriteria } from "@/pathways/versioning";
import { addVerticalSpecs, getVerticalSpecs, resetVerticals } from "@/verticals/store";

export const dynamic = "force-dynamic";

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json({ specs: getVerticalSpecs() });
}

const criteria = (factCode: string, where: "inclusion" | "escalation"): PathwayCriteria => ({
  inclusion: where === "inclusion" ? [{ factCode, requires: "present", rationale: "Placeholder." }] : [],
  exclusion: [],
  escalation: where === "escalation" ? [{ factCode, requires: "present", rationale: "Placeholder." }] : [],
});

export async function POST(request: NextRequest) {
  assertMockRoutesEnabled();
  resetVerticals();
  resetPathwayRegistry();

  const mode = request.nextUrl.searchParams.get("mode") ?? "declared";
  if (mode === "empty") return NextResponse.json({ specs: getVerticalSpecs() });

  // Two DRAFTED versions — drafted, never published or attested, so nothing is usable. That is
  // the honest state: the assembly exists and the sign-off does not.
  const a = criteria("fact_a", "inclusion");
  const b = criteria("fact_a", "escalation");
  const hashA = versionHash(a);
  const hashB = versionHash(b);
  addPathwayEvents([
    { pathwayId: "path-a", kind: "version_drafted", versionHash: hashA, at: "2026-03-01", byEmail: "author@x.example", criteria: a },
    { pathwayId: "path-b", kind: "version_drafted", versionHash: hashB, at: "2026-03-01", byEmail: "author@x.example", criteria: b },
  ]);

  if (mode === "contradiction") {
    // One pathway, in force and signed off, that excludes everyone it includes. Nobody can
    // satisfy it, so the vertical citing it cannot be used — and no clinical judgement is needed
    // to know that, which is why it is a blocking finding rather than one for review.
    const broken: PathwayCriteria = {
      inclusion: [{ factCode: "fact_c", requires: "present", rationale: "Placeholder." }],
      exclusion: [{ factCode: "fact_c", requires: "present", rationale: "Placeholder." }],
      escalation: [],
    };
    const hashBroken = versionHash(broken);
    addPathwayEvents([
      { pathwayId: "path-broken", kind: "version_drafted", versionHash: hashBroken, at: "2026-03-02", byEmail: "author@x.example", criteria: broken },
      { pathwayId: "path-broken", kind: "version_published", versionHash: hashBroken, at: "2026-03-03", byEmail: "author@x.example" },
    ]);
    addPathwayAttestations([
      {
        pathwayId: "path-broken", versionHash: hashBroken, kind: "specialist_review",
        byEmail: "reviewer@demo.example", at: "2026-03-04",
        finding: "Placeholder review finding — synthetic fixture.", revokedAt: null,
      },
      {
        pathwayId: "path-broken", versionHash: hashBroken, kind: "founder_sign_off",
        byEmail: "founder@demo.example", at: "2026-03-05",
        finding: "Placeholder sign-off finding — synthetic fixture.", revokedAt: null,
      },
    ]);
    addVerticalSpecs([
      {
        verticalId: "vert-clash",
        name: "Example vertical with a clash",
        members: [{ kind: "pathway", ref: hashBroken }],
      },
    ]);
    return NextResponse.json({ specs: getVerticalSpecs() });
  }

  addVerticalSpecs([
    {
      verticalId: "vert-example",
      name: "Example care model",
      members: [
        { kind: "pathway", ref: hashA },
        { kind: "pathway", ref: hashB },
        { kind: "interval", ref: "int-not-authored" },
      ],
    },
  ]);
  return NextResponse.json({ specs: getVerticalSpecs() });
}
