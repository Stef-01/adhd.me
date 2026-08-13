// W113: credential-ledger seed + introspection for the Playwright e2e (synthetic only, same
// posture as the other /api/mock routes — removed when real persistence lands).

import { NextResponse, type NextRequest } from "next/server";
import { getConsole } from "@/console/store";
import { logFor, practiceCredentials, recordEvent, resetLedger } from "@/credentials/ledger";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import type { ClinicianId } from "@/domain/types";

export const dynamic = "force-dynamic";

const TODAY = "2026-08-10";

export async function GET() {
  assertMockRoutesEnabled();
  const practiceId = getConsole().practices[0]?.practice.id;
  return NextResponse.json({
    log: practiceId ? logFor(practiceId) : [],
    credentials: practiceId ? practiceCredentials(practiceId, TODAY) : [],
  });
}

/**
 * Reset and seed two credentials for the first clinician, and one for a SECOND clinician —
 * the second exists so the e2e can assert that a colleague's record is not on the page.
 * `linkEmail` ties the signed-in identity to the first clinician the same way W81's route
 * does; without a link the console refuses to show anything, which is its own test.
 */
export async function POST(request: NextRequest) {
  assertMockRoutesEnabled();
  resetLedger();
  const console_ = getConsole();
  // W166: a mock route acts for the seeded practice — the first one, deterministically.
  const record = console_.practices[0];
  const practiceId = record!.practice.id;
  const email = request.nextUrl.searchParams.get("linkEmail");

  if (record!.clinicians.length < 2) {
    record!.clinicians.length = 0;
    record!.clinicians.push(
      { id: "clin-1" as ClinicianId, displayName: "Dr Demo One", participating: true, email: null },
      { id: "clin-2" as ClinicianId, displayName: "Dr Demo Two", participating: true, email: null },
    );
  }
  const mine = record!.clinicians[0];
  if (mine && email) mine.email = email;

  if (practiceId && mine) {
    // A confirmed credential with a stated expiry, for the ordinary case.
    recordEvent(practiceId, {
      kind: "submitted", at: "2026-01-10", credentialId: "cred-live",
      subjectClinicianId: mine.id, submittedBy: "manager@demo.practice.example",
    });
    recordEvent(practiceId, {
      kind: "checked", at: "2026-01-12", credentialId: "cred-live",
      checkedBy: "manager@demo.practice.example", examined: ["ev_00000000deadbeef"],
    });
    recordEvent(practiceId, {
      kind: "verified", at: "2026-01-14", credentialId: "cred-live",
      verifiedBy: "manager@demo.practice.example", expiresOn: "2026-10-31",
    });
    // One still waiting to be checked, so the page shows more than one status.
    recordEvent(practiceId, {
      kind: "submitted", at: "2026-07-01", credentialId: "cred-waiting",
      subjectClinicianId: mine.id, submittedBy: "manager@demo.practice.example",
    });
    // A colleague's, which must never appear on this clinician's page.
    const other = record!.clinicians[1];
    if (other) {
      recordEvent(practiceId, {
        kind: "submitted", at: "2026-02-01", credentialId: "cred-colleague",
        subjectClinicianId: other.id, submittedBy: "manager@demo.practice.example",
      });
    }
  }

  return NextResponse.json({
    clinicians: record!.clinicians,
    credentials: practiceId ? practiceCredentials(practiceId, TODAY) : [],
  });
}
