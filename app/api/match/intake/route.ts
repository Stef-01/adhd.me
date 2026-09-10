// Phase M (ADR 0007): the intake. One JSON body in, the patient's view out: up to three matches
// with a rationale each, the document checklist, and the opaque id the browser keeps in its own
// session storage. The narrative arrives in the body and goes nowhere but the store; the
// response carries nothing that was not the person's own or a GP's declaration.
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { patientFromIntake } from "@/lib/matching/adapters";
import { generateChecklist } from "@/lib/matching/checklist";
import { fittedEmbedder, matchPatient } from "@/lib/matching/pipeline";
import { hydrateMatching, listGPs, openPatients, saveChecklist, saveMatches, savePatient } from "@/lib/matching/store";
import { patientView, validateIntake } from "@/lib/matching/views";
import { rateLimit } from "@/lib/rate-limit";
import { serverNow } from "@/lib/server-clock";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "not_json" }, { status: 400, headers: NO_STORE });
  }
  const validated = validateIntake(payload);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400, headers: NO_STORE });

  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit("match-intake", key, { limit: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }

  const state = await hydrateMatching();
  const gps = listGPs(state);
  const embedder = fittedEmbedder(gps);
  const now = serverNow().toISOString();
  const { body } = validated;
  const patient = patientFromIntake(
    { id: randomUUID(), name: body.name, narrative: body.narrative, suburb: body.suburb, ageGroup: body.ageGroup, consultStyle: body.consultStyle, billing: body.billing, createdAt: now },
    embedder,
  );
  const outcome = matchPatient(patient, gps, {
    embedder,
    now,
    openPatients: openPatients(state),
    weights: state.weights ?? undefined,
    matchId: (p, g) => `m-${p}-${g}`,
  });
  const saved = savePatient({ ...outcome.patient, status: outcome.presented.length > 0 ? "matched" : "intake" }, state);
  saveMatches(
    outcome.presented.map((p) => p.match),
    state,
  );
  const checklist = saveChecklist(generateChecklist(saved, embedder, now), state);
  const view = patientView(
    saved,
    outcome.presented.map((p) => p.match),
    (id) => state.gps.get(id) ?? null,
    checklist,
    embedder.concepts(saved.narrativeText),
    outcome.note,
  );
  return NextResponse.json(view, { headers: NO_STORE });
}
