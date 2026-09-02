// U4 (O229): the browser's Core Web Vitals intake. `app/web-vitals.tsx` beacons one JSON object
// per metric; `src/ops/intake.ts` decides whether it is one of the three the plan names and
// strips the query from its path before anything is kept. Anything else is a 400. Same-origin
// only by the policy's `connect-src 'self'`; there is nothing to authenticate because there is
// nothing to disclose.
import { NextResponse } from "next/server";
import { webVitalReport } from "@/ops/intake";
import { report } from "@/ops/reporter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const entry = webVitalReport(payload);
  if (!entry) return new Response(null, { status: 400 });
  report(entry);
  return new NextResponse(null, { status: 204 });
}
