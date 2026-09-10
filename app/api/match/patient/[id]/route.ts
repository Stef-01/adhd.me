// Phase M (ADR 0007): a patient's own view, by the opaque id their browser holds. The id is a
// 122-bit random value minted at intake and never written anywhere but the response body and
// the person's session storage; guessing one is not a practical attack, and the mock reset
// route empties the store between demonstrations.
import { NextResponse } from "next/server";
import { fittedEmbedder } from "@/lib/matching/pipeline";
import { checklistFor, eraseMatchingPatient, hydrateMatching, listGPs, matchesForPatient, patientById } from "@/lib/matching/store";
import { patientView } from "@/lib/matching/views";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  const state = await hydrateMatching();
  const patient = patientById(id, state);
  if (!patient) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  const embedder = fittedEmbedder(listGPs(state));
  const view = patientView(patient, matchesForPatient(id, state), (gpId) => state.gps.get(gpId) ?? null, checklistFor(id, state), embedder.concepts(patient.narrativeText), null);
  return NextResponse.json(view, { headers: NO_STORE });
}

/**
 * Erase the request: the row, every match proposed for it, the feedback on those matches, the
 * checklist. The privacy record class (src/privacy/record-classes.ts) promises this door; here it
 * is, behind the same opaque id the person's browser holds. A GP who had accepted sees the match
 * disappear from their list, which is the honest reading of "delete everything about me".
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  const result = eraseMatchingPatient(id, await hydrateMatching());
  if (!result.erased) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  return NextResponse.json(result, { headers: NO_STORE });
}
