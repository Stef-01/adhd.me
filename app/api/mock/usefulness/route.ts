// W15: usefulness-audit introspection for the Playwright e2e suite (synthetic
// only; gated out of production by the W13 mock guard).
//
// W209: the snapshot is TAKEN FOR ONE PRACTICE, because the store is now scoped and an
// unscoped fixture would be the last place the old whole-store read survived — and a fixture
// that reads wider than the product is a fixture that cannot fail when the product leaks.

import { NextResponse } from "next/server";
import { AUDIT_SEED_PRACTICE_ID, getAudit, outcomesFor, pendingVisitsFor, resetAudit } from "@/audit/store";
import { tallyOutcomes } from "@/audit/usefulness";
import type { PracticeId } from "@/domain/types";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

function snapshot(practiceId: PracticeId) {
  const outcomes = outcomesFor(practiceId);
  return {
    practiceId,
    pending: pendingVisitsFor(practiceId).map((v) => ({
      appointmentId: v.appointmentId,
      patientLabel: v.patientLabel,
    })),
    outcomes,
    tally: tallyOutcomes(outcomes),
  };
}

const targetOf = (url: string): PracticeId =>
  (new URL(url).searchParams.get("practice") ?? AUDIT_SEED_PRACTICE_ID) as PracticeId;

export async function GET(request: Request) {
  assertMockRoutesEnabled();
  return NextResponse.json(snapshot(targetOf(request.url)));
}

export async function POST(request: Request) {
  assertMockRoutesEnabled();
  resetAudit();
  const target = targetOf(request.url);
  // Re-key the seeded queue onto the practice under test, the way the ops fixture does. The
  // product never rewrites a practice id; a fixture that needs a different practice says so.
  if (target !== AUDIT_SEED_PRACTICE_ID) {
    for (const visit of getAudit().visits) visit.practiceId = target;
  }
  return NextResponse.json(snapshot(target));
}
