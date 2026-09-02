// U4 (O229): where the report-only Content Security Policy sends its violations. U1 wrote the
// policy with no reporting endpoint; the plan's U13 decides whether to enforce it "on a week of
// reports through the U4 sink", and this route is how the week is collected. The parsing is
// `src/ops/intake.ts`; this handler keeps the door narrow — anything unparseable is a 400,
// anything over the cap a 413, a wrong content type a 415 — so the endpoint cannot be used as a
// free log line.
import { NextResponse } from "next/server";
import { cspViolationReport, violationBodies } from "@/ops/intake";
import { report } from "@/ops/reporter";

export const dynamic = "force-dynamic";

const ACCEPTED_TYPES = ["application/csp-report", "application/json", "application/reports+json"];
const CSP_REPORT_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ACCEPTED_TYPES.includes(type)) return new Response(null, { status: 415 });
  const text = await request.text();
  if (text.length > CSP_REPORT_BYTES) return new Response(null, { status: 413 });
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const bodies = violationBodies(payload);
  if (bodies.length === 0) return new Response(null, { status: 400 });
  for (const body of bodies) report(cspViolationReport(body));
  return new NextResponse(null, { status: 204 });
}
