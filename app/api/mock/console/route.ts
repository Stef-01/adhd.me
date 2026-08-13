// W11: console-store introspection for the Playwright e2e suite (synthetic only,
// same posture as /api/mock/state — removed when real persistence lands).

import { NextResponse } from "next/server";
import { resetComplaints } from "@/complaints/store";
import { getConsole, resetConsole } from "@/console/store";
import { resetPrivacy } from "@/privacy/store";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetRegisters } from "@/registers/store";
import { resetInterestState } from "@/capability/store";

export const dynamic = "force-dynamic";

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json(getConsole());
}

export async function POST() {
  assertMockRoutesEnabled();
  resetPrivacy(); // W33 state rides along with the console reset in e2e
  // The W37 sign-in limiter is per-identifier per minute, and the e2e suite signs in
  // as the same manager dozens of times inside that window. Without this the suite
  // trips its own rate limit and fails in whichever spec happens to cross the
  // threshold — a wandering flake, not a product defect. Clearing it here keeps the
  // limiter's production behaviour untouched.
  resetRateLimits();
  resetComplaints(); // W43 likewise
  resetRegisters(); // W60 likewise
  resetInterestState(); // W81 likewise
  return NextResponse.json(resetConsole());
}
