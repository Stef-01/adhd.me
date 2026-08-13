// W137: referral-rail seed + introspection for the Playwright e2e (synthetic only, same
// posture as the other /api/mock routes — removed when real persistence lands).

import { NextResponse, type NextRequest } from "next/server";
import { getConsole } from "@/console/store";
import { buildReferral } from "@/referrals/document";
import { recordReturn } from "@/referrals/return-report";
import {
  addAcceptanceActs,
  addReferralDocuments,
  addReferralEvents,
  addReturnReports,
  resetReferralRail,
  sentBy,
  sentTo,
} from "@/referrals/store";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import type { PatientId, PracticeId } from "@/domain/types";

export const dynamic = "force-dynamic";

const OTHER = "prac-other" as PracticeId;
const THIRD = "prac-third" as PracticeId;

export async function GET() {
  assertMockRoutesEnabled();
  const practiceId = getConsole().practices[0]?.practice.id;
  return NextResponse.json({
    sent: practiceId ? sentBy(practiceId) : [],
    received: practiceId ? sentTo(practiceId) : [],
  });
}

/**
 * Reset and seed both sides plus a THIRD practice's referral, which exists so the e2e can
 * assert it appears on neither list — the isolation case, visible from one browser session.
 */
export async function POST(request: NextRequest) {
  assertMockRoutesEnabled();
  resetReferralRail();
  const practiceId = getConsole().practices[0]?.practice.id;
  if (!practiceId) return NextResponse.json({ sent: [], received: [] });
  if (request.nextUrl.searchParams.get("empty") === "1") {
    return NextResponse.json({ sent: sentBy(practiceId), received: sentTo(practiceId) });
  }

  const make = (id: string, from: string, to: string, patient: string) => {
    const result = buildReferral(
      {
        referralId: id, fromPracticeId: from, toPracticeId: to, patientId: patient,
        createdAt: "2026-02-01", createdBy: "clin-demo", reason: "extended_scope",
        request: "procedure", conditionCode: null, recordedFactCodes: [], narrative: null,
      },
      "2026-08-11",
    );
    if (!result.ok) throw new Error(result.errors.join(", "));
    return result.document;
  };

  addReferralDocuments([
    make("ref-sent-open", practiceId, OTHER, "pat-1"),
    make("ref-sent-back", practiceId, OTHER, "pat-2"),
    make("ref-received", OTHER, practiceId, "pat-3"),
    make("ref-elsewhere", THIRD, "prac-fourth", "pat-9"),
  ]);

  addAcceptanceActs([
    { kind: "sent", referralId: "ref-sent-open", at: "2026-02-01", by: "clin-demo", fromPracticeId: practiceId, toPracticeId: OTHER, patientId: "pat-1" as PatientId },
    { kind: "sent", referralId: "ref-sent-back", at: "2026-02-01", by: "clin-demo", fromPracticeId: practiceId, toPracticeId: OTHER, patientId: "pat-2" as PatientId },
    { kind: "accepted", referralId: "ref-sent-back", at: "2026-02-03", by: "clin-other", byPracticeId: OTHER },
    { kind: "sent", referralId: "ref-received", at: "2026-02-01", by: "clin-other", fromPracticeId: OTHER, toPracticeId: practiceId, patientId: "pat-3" as PatientId },
  ]);

  addReferralEvents([
    { practiceId, patientId: "pat-1" as PatientId, referralId: "ref-sent-open", kind: "referral_written", at: "2026-02-01" },
    { practiceId, patientId: "pat-2" as PatientId, referralId: "ref-sent-back", kind: "referral_written", at: "2026-02-01" },
    { practiceId, patientId: "pat-2" as PatientId, referralId: "ref-sent-back", kind: "appointment_recorded", at: "2026-02-10" },
    { practiceId, patientId: "pat-2" as PatientId, referralId: "ref-sent-back", kind: "completion_recorded", at: "2026-02-20" },
  ]);

  const returned = recordReturn({
    referralId: "ref-sent-back", fromPracticeId: practiceId, toPracticeId: OTHER,
    patientId: "pat-2", outcome: "seen_care_returned", reportedAt: "2026-02-20",
    reportedBy: "clin-other", seenOn: "2026-02-10", narrative: null,
    referralWrittenOn: "2026-02-01",
  });
  if (returned.ok) addReturnReports([returned.report]);

  // W173: opt-in extra referral recorded as NOT PROCEEDING, so the outcome dashboard can be
  // scanned with all three of W170's verdicts populated. Behind a flag rather than added to the
  // default seed: the referral console's e2e pins the two lists it renders, and widening a
  // shared fixture to suit one page is how the other page's assertions quietly go vacuous.
  if (request.nextUrl.searchParams.get("cancelled") === "1") {
    addReferralDocuments([make("ref-sent-cancelled", practiceId, OTHER, "pat-4")]);
    addAcceptanceActs([
      { kind: "sent", referralId: "ref-sent-cancelled", at: "2026-02-01", by: "clin-demo", fromPracticeId: practiceId, toPracticeId: OTHER, patientId: "pat-4" as PatientId },
    ]);
    addReferralEvents([
      { practiceId, patientId: "pat-4" as PatientId, referralId: "ref-sent-cancelled", kind: "referral_written", at: "2026-02-01" },
      { practiceId, patientId: "pat-4" as PatientId, referralId: "ref-sent-cancelled", kind: "referral_cancelled", at: "2026-02-04" },
    ]);
  }

  // W199: a rail large enough for a figure to clear the reporting floor of 5. Without it every
  // figure on /console/reporting is suppressed, and the denominator rendering — the thing W196
  // and W199 both exist for — is never exercised by any test.
  if (request.nextUrl.searchParams.get("reportable") === "1") {
    for (let n = 1; n <= 6; n++) {
      const id = `ref-bulk-${n}`;
      addReferralDocuments([make(id, practiceId, OTHER, `pat-b${n}`)]);
      addReferralEvents([
        { practiceId, patientId: `pat-b${n}` as PatientId, referralId: id, kind: "referral_written", at: "2026-02-01" },
      ]);
    }
  }

  return NextResponse.json({ sent: sentBy(practiceId), received: sentTo(practiceId) });
}
