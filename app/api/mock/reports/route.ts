// U4 (O229): what reached the reporter sink — the last fifty reports, oldest first. The e2e runs
// the server as Playwright's `webServer` and cannot read its stdout, so this is how a spec proves
// the fault fixture's error, a Web Vital beacon or a policy violation arrived. Behind the
// mock-route guard like every other mock surface: a report carries paths and error messages,
// and the production deployment answers 404.
import { NextResponse } from "next/server";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import { recentReports } from "@/ops/reporter";

export const dynamic = "force-dynamic";

export function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json({ reports: recentReports() }, { headers: { "Cache-Control": "no-store" } });
}
