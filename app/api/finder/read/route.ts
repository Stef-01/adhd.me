// The finder's read (docs/matching/LLM-MATCHING-PLAN.md §6, §15): POST { text } → { keys, source }.
// At level 0 (ADHDME_LLM_LEVEL unset or 0, or no key) the lexicon reads and nothing leaves the
// server. At 1 the model reads, uncached, and any failure answers with the lexicon's keys and
// `source: "lexicon"`. ADHDME_LLM_CASSETTES=1 is for e2e: the committed cassettes answer instead of
// the network, and any other words get the answer that reads as the lexicon does.

import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { levelOf } from "@/lib/llm/client";
import { answerFor, lexiconReading, readRequest } from "@/lib/matching/llm-read";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** The /match narrative's cap: no paid read is longer. */
const MAX_CHARS = 2000;
const NO_STORE = { "Cache-Control": "no-store" };
const replay = {
  fetch: cassetteFetch(CASSETTES, (input) => completed(input.startsWith("Request: ") ? { verdicts: [] } : answerFor(lexiconReading(input).keys))),
  env: { OPENAI_API_KEY: "cassette" },
};

export async function POST(request: Request) {
  const { text } = ((await request.json().catch(() => null)) ?? {}) as { text?: unknown };
  if (typeof text !== "string" || text.length > MAX_CHARS) return Response.json({ error: "text" }, { status: 400, headers: NO_STORE });
  const env = process.env;
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const paid = levelOf(env) >= 1 && rateLimit("finder-read", caller, { limit: 20, windowMs: 60_000 });
  const reading = paid ? await readRequest(text, env.ADHDME_LLM_CASSETTES === "1" ? replay : {}) : lexiconReading(text);
  return Response.json({ keys: reading.keys, source: reading.source }, { headers: NO_STORE });
}
