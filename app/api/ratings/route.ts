// The stars and words after a visit (src/db/finder.ts): POST { handoffId | matchId, clinicianId,
// stars, feedback?, deviceId?, asked?, met? }. One rating per visit; a second answer (the note after
// the stars) replaces the first. Never shown to anyone: it teaches the ranking which asks mattered
// (src/db/learn.ts). 20 in ten minutes from one caller.

import { parseRating, rateVisit } from "@/db/finder";
import { rosterFor } from "@/demo/synthetic-roster";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const KNOWN = new Set(rosterFor(true).map((c) => c.id));

export async function POST(request: Request) {
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit("visit-rating", caller, { limit: 20, windowMs: 10 * 60_000 })) return Response.json({ error: "busy" }, { status: 429, headers: NO_STORE });
  const input = parseRating(await request.json().catch(() => null));
  // A finder visit names a clinician the finder lists; /match's own ids are checked by its flow.
  if (!input || (input.source === "finder" && !KNOWN.has(input.clinicianId))) return Response.json({ error: "rating" }, { status: 400, headers: NO_STORE });
  rateVisit(input);
  return new Response(null, { status: 204, headers: NO_STORE });
}
