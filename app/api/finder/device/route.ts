// Erasure of the finder's record for one device (src/db/finder.ts): DELETE { deviceId } removes every
// search, event, voice call, handoff and rating that device made, here and, when configured, in the
// tables. The settings sheet's Delete calls it before it clears the browser.

import { eraseFinderDevice } from "@/db/finder";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request) {
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit("finder-erase", caller, { limit: 10, windowMs: 10 * 60_000 })) return Response.json({ error: "busy" }, { status: 429, headers: NO_STORE });
  const { deviceId } = ((await request.json().catch(() => null)) ?? {}) as { deviceId?: unknown };
  if (typeof deviceId !== "string" || !UUID.test(deviceId)) return Response.json({ error: "device" }, { status: 400, headers: NO_STORE });
  eraseFinderDevice(deviceId.toLowerCase());
  return new Response(null, { status: 204, headers: NO_STORE });
}
