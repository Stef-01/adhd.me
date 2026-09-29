// Why this clinician, in their own words: POST { text, clinicianId } → { sentences, source }. At
// level 1 the model writes one sentence from the request and the clinician's own listing
// (src/lib/matching/why.ts); at level 0, with the key paused, over the caller's rate or the day's
// spend, the answer is empty and the profile shows the keys alone. ADHDME_LLM_CASSETTES=1 answers
// from the listing without the network, for e2e.

import { clinicians, matchEvidence } from "@/demo/clinicians";
import { completed } from "@/lib/llm/cassettes";
import { levelOf } from "@/lib/llm/client";
import { todaysMeter } from "@/lib/llm/daily-meter";
import { keyPaused, noteKeyFailure } from "@/lib/llm/key-pause";
import { whyMatched, type Why } from "@/lib/matching/why";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_CHARS = 2000;
const NO_STORE = { "Cache-Control": "no-store" };
const NONE: Why = { sentences: [], source: "none" };

/** The cassette answer: the first key the listing answers, said the way the model would, so e2e sees the shape without a model. */
function replayFor(text: string, clinician: (typeof clinicians)[number]) {
  const labels = matchEvidence(clinician, text).map((need) => need.label);
  // A label keeps its case unless it starts a plain word: "ADHD assessment" stays, "Telehealth" lowers.
  const plain = (label: string) => label.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase());
  const sentences = labels.slice(0, 1).map((label) => `You asked for ${plain(label)}; ${clinician.shortName} lists it.`);
  return { fetch: async () => new Response(JSON.stringify(completed({ sentences }))), env: { OPENAI_API_KEY: "cassette" } };
}

export async function POST(request: Request) {
  const body = ((await request.json().catch(() => null)) ?? {}) as { text?: unknown; clinicianId?: unknown };
  const { text, clinicianId } = body;
  if (typeof text !== "string" || text.length > MAX_CHARS || typeof clinicianId !== "string") return Response.json({ error: "text" }, { status: 400, headers: NO_STORE });
  const clinician = clinicians.find((c) => c.id === clinicianId);
  if (!clinician) return Response.json({ error: "clinician" }, { status: 404, headers: NO_STORE });
  const env = process.env;
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const paid = levelOf(env) >= 1 && !keyPaused() && rateLimit("finder-why", caller, { limit: 20, windowMs: 60_000 });
  const why = paid ? await whyMatched(text, clinician, { ...(env.ADHDME_LLM_CASSETTES === "1" ? replayFor(text, clinician) : {}), meter: todaysMeter(env) }) : NONE;
  noteKeyFailure(why.error);
  return Response.json({ sentences: why.sentences, source: why.source }, { headers: NO_STORE });
}
