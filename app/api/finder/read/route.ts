// The finder's read (docs/matching/LLM-MATCHING-PLAN.md §6, §15): POST { text } → { keys, source }.
// At level 0 (ADHDME_LLM_LEVEL=0, or no key) the lexicon reads and nothing leaves the server; with a
// key and no level set it is 1. At 1 the model reads, once per request text (read-cache.ts), and any failure answers with the lexicon's keys and
// `source: "lexicon"`. ADHDME_LLM_CASSETTES=1 is for e2e: the committed cassettes answer instead of
// the network, and any other words get the answer that reads as the lexicon does. Paid reads stop at
// 20 a minute from one caller, and at ADHDME_LLM_DAILY_USD of spend a UTC day (default $1), both in
// memory on this server instance; the OpenAI project's budget is the ring outside them. A key that fails
// (wrong, revoked, out of credit) pauses the model for ten minutes (src/lib/llm/key-pause.ts).

import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { levelOf } from "@/lib/llm/client";
import { keyPaused, noteKeyFailure } from "@/lib/llm/key-pause";
import { BudgetMeter } from "@/lib/llm/meter";
import { answerFor, lexiconReading, readRequest } from "@/lib/matching/llm-read";
import { cachedKeys, rememberKeys } from "@/lib/matching/read-cache";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** The /match narrative's cap: no paid read is longer. */
const MAX_CHARS = 2000;
const NO_STORE = { "Cache-Control": "no-store" };
const replay = {
  fetch: cassetteFetch(CASSETTES, (input) => completed(input.startsWith("Request: ") ? { verdicts: [] } : answerFor(lexiconReading(input).keys))),
  env: { OPENAI_API_KEY: "cassette" },
};

/** The day's spend on this instance: a new meter each UTC day, or when the cap changes. */
const day = { date: "", meter: new BudgetMeter(0) };
function todaysMeter(env: Record<string, string | undefined>): BudgetMeter {
  const set = Number(env.ADHDME_LLM_DAILY_USD);
  const cap = env.ADHDME_LLM_DAILY_USD?.trim() && Number.isFinite(set) && set >= 0 ? set : 1;
  const date = new Date().toISOString().slice(0, 10);
  if (day.date !== date || day.meter.capUsd !== cap) Object.assign(day, { date, meter: new BudgetMeter(cap) });
  return day.meter;
}

export async function POST(request: Request) {
  const { text } = ((await request.json().catch(() => null)) ?? {}) as { text?: unknown };
  if (typeof text !== "string" || text.length > MAX_CHARS) return Response.json({ error: "text" }, { status: 400, headers: NO_STORE });
  const env = process.env;
  // The same words read the same way, and a repeated search costs nothing (src/lib/matching/read-cache.ts).
  const held = levelOf(env) >= 1 ? cachedKeys(text) : null;
  if (held) return Response.json({ keys: held, source: "llm" }, { headers: NO_STORE });
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const paid = levelOf(env) >= 1 && !keyPaused() && rateLimit("finder-read", caller, { limit: 20, windowMs: 60_000 });
  const reading = paid ? await readRequest(text, { ...(env.ADHDME_LLM_CASSETTES === "1" ? replay : {}), meter: todaysMeter(env) }) : lexiconReading(text);
  noteKeyFailure(reading.error);
  if (reading.source === "llm" && !reading.error) rememberKeys(text, reading.keys);
  return Response.json({ keys: reading.keys, source: reading.source }, { headers: NO_STORE });
}
