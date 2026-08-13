// W127: pathway-registry seed + introspection for the Playwright e2e (synthetic only, same
// posture as the other /api/mock routes — removed when real persistence lands).
//
// The seeded content is deliberately placeholder: fact codes like `placeholder_fact_a` and
// rationales that say so. Seeding a REAL pathway here would put clinical content in the tree
// through a side door, which is exactly what the G5 gate exists to stop — and the shipped
// catalogue stays empty regardless, pinned by W118/W119's own tests.

import { NextResponse, type NextRequest } from "next/server";
import {
  addPathwayAttestations,
  addPathwayEvents,
  allVersions,
  getPathwayAttestations,
  resetPathwayRegistry,
} from "@/pathways/registry";
import { versionHash, type PathwayCriteria } from "@/pathways/versioning";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

const SIGNED: PathwayCriteria = {
  inclusion: [
    { factCode: "placeholder_fact_a", requires: "present", rationale: "Placeholder rationale — synthetic fixture, not clinical content." },
    { factCode: "placeholder_fact_b", requires: "absent", rationale: "Placeholder rationale — synthetic fixture, not clinical content." },
  ],
  exclusion: [
    { factCode: "placeholder_fact_c", requires: "present", rationale: "Placeholder rationale — synthetic fixture, not clinical content." },
  ],
  escalation: [],
};

const AWAITING: PathwayCriteria = {
  inclusion: [
    { factCode: "placeholder_fact_d", requires: "present", rationale: "Placeholder rationale — synthetic fixture, not clinical content." },
  ],
  exclusion: [],
  escalation: [],
};

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json({
    versions: allVersions(),
    attestations: getPathwayAttestations(),
  });
}

/**
 * Reset, and unless `?empty=1`, seed two versions: one fully signed off, and one reviewed but
 * awaiting sign-off — so the e2e can see that "waiting on the founder" renders as its own
 * state rather than as a generic refusal.
 */
export async function POST(request: NextRequest) {
  assertMockRoutesEnabled();
  resetPathwayRegistry();
  if (request.nextUrl.searchParams.get("empty") === "1") {
    return NextResponse.json({ versions: allVersions(), attestations: getPathwayAttestations() });
  }

  const signedHash = versionHash(SIGNED);
  const awaitingHash = versionHash(AWAITING);

  addPathwayEvents([
    { pathwayId: "placeholder-pathway-1", versionHash: signedHash, kind: "version_drafted", at: "2026-01-01", byEmail: "author@demo.example", criteria: SIGNED },
    { pathwayId: "placeholder-pathway-1", versionHash: signedHash, kind: "version_published", at: "2026-01-05", byEmail: "author@demo.example" },
    { pathwayId: "placeholder-pathway-2", versionHash: awaitingHash, kind: "version_drafted", at: "2026-02-01", byEmail: "author@demo.example", criteria: AWAITING },
    { pathwayId: "placeholder-pathway-2", versionHash: awaitingHash, kind: "version_published", at: "2026-02-05", byEmail: "author@demo.example" },
  ]);

  addPathwayAttestations([
    {
      pathwayId: "placeholder-pathway-1", versionHash: signedHash, kind: "specialist_review",
      byEmail: "reviewer@demo.example", at: "2026-01-03",
      finding: "Placeholder review finding — synthetic fixture.", revokedAt: null,
    },
    {
      pathwayId: "placeholder-pathway-1", versionHash: signedHash, kind: "founder_sign_off",
      byEmail: "founder@demo.example", at: "2026-01-04",
      finding: "Placeholder sign-off finding — synthetic fixture.", revokedAt: null,
    },
    {
      pathwayId: "placeholder-pathway-2", versionHash: awaitingHash, kind: "specialist_review",
      byEmail: "reviewer@demo.example", at: "2026-02-03",
      finding: "Placeholder review finding — synthetic fixture.", revokedAt: null,
    },
  ]);

  return NextResponse.json({ versions: allVersions(), attestations: getPathwayAttestations() });
}
