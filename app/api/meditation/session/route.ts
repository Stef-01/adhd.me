import { sharedMeditation } from "@/learn/meditation";

export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(sharedMeditation(Date.now()), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
