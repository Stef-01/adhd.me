// W60: register-store introspection + reset for the Playwright e2e (synthetic only,
// same posture as the other /api/mock routes — removed when real persistence lands).

import { NextResponse } from "next/server";
import type { PracticeId } from "@/domain/types";
import { getConsole } from "@/console/store";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import { getRegisters, registersFor, resetRegisters, seedCounts } from "@/registers/store";

export const dynamic = "force-dynamic";

export async function GET() {
  assertMockRoutesEnabled();
  const practiceId = getConsole().practices[0]?.practice.id;
  return NextResponse.json({
    state: getRegisters(),
    forPractice: practiceId ? registersFor(practiceId) : [],
  });
}

export async function POST() {
  assertMockRoutesEnabled();
  const state = resetRegisters();
  // Give the current practice non-zero counts so the console renders something real
  // to look at. Synthetic, and replaced by W57/W58 once those engines exist.
  const practiceId = getConsole().practices[0]?.practice.id;
  if (practiceId) {
    seedCounts(practiceId as PracticeId, {
      placeholder_register_a: { memberCount: 42, gapCount: 9 },
      placeholder_register_b: { memberCount: 17, gapCount: 3 },
    });
  }
  return NextResponse.json(state);
}
