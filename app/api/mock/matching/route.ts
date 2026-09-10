// Phase M (ADR 0007): introspection for the e2e suite, behind the mock-route guard. GET returns
// counts only (never a patient row); POST resets the store so a spec starts from the seeded
// roster and nothing else. `?seedFeedback=1` records a handful of example feedback rows against a
// synthetic GP so the profile's aggregate sentence can be swept.
import { NextResponse } from "next/server";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import { aggregateFeedback } from "@/lib/matching/feedback";
import { getMatching, gpById, matchingCounts, resetMatching, saveGP } from "@/lib/matching/store";
import type { Feedback, Rating } from "@/lib/matching/types";

export const dynamic = "force-dynamic";

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json(matchingCounts(getMatching()), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  assertMockRoutesEnabled();
  resetMatching();
  const url = new URL(request.url);
  if (url.searchParams.get("seedFeedback") === "1") {
    const state = getMatching();
    const gp = gpById("example-mei-chao", state);
    if (gp) {
      const fits: Rating[] = [5, 4, 5, 2, 4, 5, 3];
      const records: Feedback[] = fits.map((fit, i) => ({
        id: `seed-f-${i}`,
        matchId: `seed-m-${i}`,
        from: "patient",
        patientRating: { fit, communication: fit, clinicalAppropriateness: 4 },
        gpRating: null,
        freeTextFeedback: "",
        createdAt: "2026-09-01T00:00:00.000Z",
      }));
      saveGP({ ...gp, ratingAggregate: aggregateFeedback(records) }, state);
    }
  }
  return NextResponse.json(matchingCounts(getMatching()), { headers: { "Cache-Control": "no-store" } });
}
