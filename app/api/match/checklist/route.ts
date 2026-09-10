// Phase M (ADR 0007): tick or untick one checklist item. The body names the patient by the
// opaque id the browser holds; nothing else identifies anybody.
import { NextResponse } from "next/server";
import { hydrateMatching, setChecklistItem } from "@/lib/matching/store";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "not_json" }, { status: 400, headers: NO_STORE });
  }
  const p = (payload ?? {}) as Record<string, unknown>;
  if (typeof p.patientId !== "string" || typeof p.itemId !== "string" || typeof p.done !== "boolean") {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }
  const checklist = setChecklistItem(p.patientId, p.itemId, p.done, await hydrateMatching());
  if (!checklist) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  return NextResponse.json(checklist, { headers: NO_STORE });
}
