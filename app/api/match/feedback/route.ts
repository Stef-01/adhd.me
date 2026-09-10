// Phase M (ADR 0007): the patient half of the mutual feedback. Three answers on a 1 to 5 scale
// (fit, communication, clinical appropriateness) and optional words, recorded against the match
// and folded into the GP's aggregate and the learning loop in the same call. One record per
// match per side: a second submission replaces the first rather than counting twice.
import { NextResponse } from "next/server";
import { aggregateFeedback, feedbackForGP, isRating, learnWeights, learningSamples, MIN_SAMPLES } from "@/lib/matching/feedback";
import { allFeedback, allMatches, hydrateMatching, gpById, matchById, saveFeedback, saveGP, setWeights } from "@/lib/matching/store";
import type { Feedback } from "@/lib/matching/types";
import { serverNow } from "@/lib/server-clock";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const TEXT_MAX = 1000;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "not_json" }, { status: 400, headers: NO_STORE });
  }
  const p = (payload ?? {}) as Record<string, unknown>;
  if (typeof p.matchId !== "string" || typeof p.patientId !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }
  if (!isRating(p.fit) || !isRating(p.communication) || !isRating(p.clinicalAppropriateness)) {
    return NextResponse.json({ error: "rating" }, { status: 400, headers: NO_STORE });
  }
  const state = await hydrateMatching();
  const match = matchById(p.matchId, state);
  // "Not yours" and "does not exist" get the same answer (the referrals lane's rule).
  if (!match || match.patientId !== p.patientId) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  if (match.matchStatus !== "accepted" && match.matchStatus !== "completed") {
    return NextResponse.json({ error: "not_consulted" }, { status: 409, headers: NO_STORE });
  }
  const record: Feedback = {
    id: `f-${match.id}-patient`,
    matchId: match.id,
    from: "patient",
    patientRating: { fit: p.fit, communication: p.communication, clinicalAppropriateness: p.clinicalAppropriateness },
    gpRating: null,
    freeTextFeedback: typeof p.text === "string" ? p.text.trim().slice(0, TEXT_MAX) : "",
    createdAt: serverNow().toISOString(),
  };
  saveFeedback(record, state);

  const gp = gpById(match.gpId, state);
  if (gp) saveGP({ ...gp, ratingAggregate: aggregateFeedback(feedbackForGP(gp.id, allMatches(state), allFeedback(state))) }, state);
  const learned = learnWeights(learningSamples(allMatches(state), allFeedback(state)));
  if (learned.learnedFrom >= MIN_SAMPLES) setWeights(learned.weights, state);

  return NextResponse.json({ ok: true, learnedFrom: learned.learnedFrom, note: learned.note }, { headers: NO_STORE });
}
