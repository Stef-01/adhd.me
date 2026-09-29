// The finder's record (src/db/finder.ts): POST { type, record } for a search, a voice call, an event
// or a handoff. The browser sends it with sendBeacon, so the body may arrive as text; a record that
// does not parse is refused whole. 204 on success; 120 a minute from one caller.

import { noteRefusedRecord, parseEvent, parseHandoff, parseSearch, parseVoiceCall, recordEvent, recordHandoff, recordSearch, recordVoiceCall } from "@/db/finder";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BODY = 8000;
const NO_STORE = { "Cache-Control": "no-store" };

/** Parses and records one record of its type; false when it does not parse. */
function keep(type: unknown, record: unknown): boolean {
  switch (type) {
    case "search": {
      const parsed = parseSearch(record);
      if (parsed) recordSearch(parsed);
      return parsed !== null;
    }
    case "voice": {
      const parsed = parseVoiceCall(record);
      if (parsed) recordVoiceCall(parsed);
      return parsed !== null;
    }
    case "event": {
      const parsed = parseEvent(record);
      if (parsed) recordEvent(parsed);
      return parsed !== null;
    }
    case "handoff": {
      const parsed = parseHandoff(record);
      if (parsed) recordHandoff(parsed);
      return parsed !== null;
    }
    default:
      return false;
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "size" }, { status: 413, headers: NO_STORE });
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit("finder-track", caller, { limit: 120, windowMs: 60_000 })) return Response.json({ error: "busy" }, { status: 429, headers: NO_STORE });
  let body: { type?: unknown; record?: unknown } | null;
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return Response.json({ error: "json" }, { status: 400, headers: NO_STORE });
  }
  if (!keep(body?.type, body?.record)) {
    noteRefusedRecord();
    return Response.json({ error: "record" }, { status: 400, headers: NO_STORE });
  }
  return new Response(null, { status: 204, headers: NO_STORE });
}
