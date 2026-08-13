// W83: capability-store introspection + seed for the Playwright e2e (synthetic only, same
// posture as the other /api/mock routes — removed when real persistence lands).

import { NextResponse } from "next/server";
import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import {
  getCapability,
  ownProfile,
  panelView,
  putCompetence,
  putExperience,
  resetCapability,
  stateInterest,
} from "@/capability/graph";
import { getConsole } from "@/console/store";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

const COND = "placeholder_register_a" as ConditionCode;
const TODAY = "2026-08-10";

export async function GET() {
  assertMockRoutesEnabled();
  const practiceId = getConsole().practices[0]?.practice.id;
  const me = (getConsole().practices[0]?.clinicians ?? [])[0]?.id ?? ("clin-1" as ClinicianId);
  return NextResponse.json({
    state: getCapability(),
    panel: practiceId ? panelView(practiceId, TODAY) : [],
    own: practiceId && me ? ownProfile(practiceId, me, TODAY) : [],
  });
}

export async function POST() {
  assertMockRoutesEnabled();
  resetCapability();
  const console_ = getConsole();
  // W166: a mock route acts for the seeded practice — the first one, deterministically.
  const record = console_.practices[0];
  const practiceId = record!.practice.id as PracticeId | undefined;
  // Onboarding does not create a roster, so fall back to the same id the page falls back
  // to. Keeps the e2e exercising the real accessors rather than a special-cased path.
  const me = (record!.clinicians[0]?.id ?? "clin-1") as ClinicianId;
  if (practiceId) {
    stateInterest({
      practiceId, clinicianId: me, conditionCode: COND, strength: 4,
      source: "clinician_self_reported", statedAt: "2026-06-01",
    });
    putExperience([
      {
        practiceId, clinicianId: me, conditionCode: COND, attendedVisits: 12,
        windowFrom: "2026-01-01", windowTo: "2026-06-30",
        source: "derived_case_mix", computedAt: "2026-07-01T00:00:00Z",
      },
    ]);
    putCompetence([
      {
        practiceId, clinicianId: me, conditionCode: COND, credential: "Placeholder credential",
        attestedBy: "External Body", verifiedOn: "2026-01-01", expiresOn: "2027-01-01",
        source: "external_verification",
      },
    ]);
  }
  return NextResponse.json({ state: getCapability() });
}
