// U4 (O229): the health endpoint — `src/ops/health.ts` decides the shape; this is its door.
// Public and unauthenticated: it discloses the commit and the boot time, neither of which is
// secret (the voice debug banner has carried the commit since O73), and nothing else.
import { NextResponse } from "next/server";
import { health } from "@/ops/health";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(health(), { headers: { "Cache-Control": "no-store" } });
}
