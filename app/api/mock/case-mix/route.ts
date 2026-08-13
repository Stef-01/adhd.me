// W81: case-mix introspection + clinician-identity linking for the Playwright e2e
// (synthetic only, same posture as the other /api/mock routes).

import { NextRequest, NextResponse } from "next/server";
import type { ClinicianId } from "@/domain/types";
import { getInterestState, resetInterestState } from "@/capability/store";
import { getConsole } from "@/console/store";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json({
    interests: Object.values(getInterestState().byKey),
    clinicians: (getConsole().practices[0]?.clinicians ?? []),
  });
}

/**
 * Reset, and optionally link a clinician to a sign-in identity so the console can tell
 * which clinician is signed in. The linking exists in the product (ClinicianRecord.email);
 * this route only sets it, because the W41 wizard does not collect it yet.
 */
export async function POST(request: NextRequest) {
  assertMockRoutesEnabled();
  resetInterestState();

  const email = request.nextUrl.searchParams.get("linkEmail");
  const state = getConsole();
  // W166: a mock route acts for the seeded practice — the first one, deterministically.
  const record = state.practices[0];
  if (!record) return NextResponse.json({ clinicians: [] });

  // Seed a roster entry if there is none. The e2e is testing the case-mix surface, not the
  // W41 wizard, so it should not have to drive the wizard to get a clinician to exist.
  if (record!.clinicians.length === 0) {
    record!.nextClinicianSeq += 1;
    record!.clinicians.push({
      id: `clin-${record!.nextClinicianSeq}` as ClinicianId,
      displayName: "Dr Amara Lee",
      participating: true,
      email: null,
    });
  }
  const clinician = record!.clinicians[0];
  if (clinician) clinician.email = email;

  return NextResponse.json({ clinicians: record!.clinicians });
}
