// The voice finder's call: POST a WebRTC offer (application/sdp) → the answer. The offer goes to
// OpenAI's realtime calls endpoint with the interviewer's session (src/voice/interviewer.ts), so
// the key never reaches the browser. Off (404) unless ADHDME_VOICE=1 and a key are set. Calls stop
// at 8 in ten minutes from one caller and at ADHDME_VOICE_DAILY_SESSIONS a UTC day (default 40),
// in memory on this instance. A key that fails pauses voice and the read for ten minutes.

import { keyPaused, noteKeyFailure } from "@/lib/llm/key-pause";
import { rateLimit } from "@/lib/rate-limit";
import { sessionFor, voiceOn } from "@/voice/interviewer";
import { takeVoiceSession } from "@/voice/sessions";

export const dynamic = "force-dynamic";

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const MAX_SDP = 20_000;
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const env = process.env;
  if (!voiceOn(env)) return Response.json({ error: "off" }, { status: 404, headers: NO_STORE });
  const offer = await request.text();
  if (!offer.startsWith("v=0") || offer.length > MAX_SDP) return Response.json({ error: "sdp" }, { status: 400, headers: NO_STORE });
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (keyPaused() || !rateLimit("voice-session", caller, { limit: 8, windowMs: 10 * 60_000 }) || !takeVoiceSession(env)) {
    return Response.json({ error: "busy" }, { status: 429, headers: NO_STORE });
  }
  const form = new FormData();
  form.set("sdp", offer);
  const session = sessionFor(env);
  form.set("session", JSON.stringify(session));
  const reply = await fetch(CALLS_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!reply?.ok) {
    if (reply) noteKeyFailure(`HttpError: ${reply.status} ${await reply.text().catch(() => "")}`);
    return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
  return new Response(await reply.text(), { status: 201, headers: { "content-type": "application/sdp", "x-voice-model": session.model, ...NO_STORE } });
}
