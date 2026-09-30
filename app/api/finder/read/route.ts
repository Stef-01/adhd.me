// The finder's read: POST { text } → { needs, source, unlisted }: each need the ranking runs on with
// the person's words that asked for it, whose reading it is, and the asks the model heard that no
// key covers (kept with the search, so a need the vocabulary lacks is seen rather than lost).
// At level 0 (ADHDME_LLM_LEVEL=0, or no key) the lexicon reads and nothing leaves the server; with a
// key and no level set it is 1. At 1 the model reads, once per request text (read-cache.ts), and any
// failure answers with the lexicon's needs and `source: "lexicon"`. ADHDME_LLM_CASSETTES=1 is for
// e2e: the committed cassettes answer instead of the network, and any other words get the answer
// that reads as the lexicon does. Paid reads stop at 20 a minute from one caller, and at
// ADHDME_LLM_DAILY_USD of spend a UTC day (default $1), both in memory on this server instance; the
// OpenAI project's budget is the ring outside them. A key that fails (wrong, revoked, out of credit)
// pauses the model for ten minutes (src/lib/llm/key-pause.ts).

import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { levelOf } from "@/lib/llm/client";
import { keyPaused, noteKeyFailure } from "@/lib/llm/key-pause";
import { todaysMeter } from "@/lib/llm/daily-meter";
import { lexiconReading, readRequest, type Reading } from "@/lib/matching/llm-read";
import { cachedReading, rememberReading } from "@/lib/matching/read-cache";
import { rateLimit } from "@/lib/rate-limit";
import { facetKey } from "@/matching/needs";

export const dynamic = "force-dynamic";

/** The /match narrative's cap: no paid read is longer. */
const MAX_CHARS = 2000;
const NO_STORE = { "Cache-Control": "no-store" };
/** The lexicon's reading as the model would give it: each key with the words it was heard in. */
const asLexicon = (input: string) => ({
  needs: lexiconReading(input).needs.map((need) => ({ tag: facetKey(need.facet), quote: input.toLowerCase().includes(need.matched.toLowerCase()) ? need.matched : input })),
  unlisted: [],
});
const replay = { fetch: cassetteFetch(CASSETTES, (input) => completed(asLexicon(input))), env: { OPENAI_API_KEY: "cassette" } };

/** What the finder gets: each need as its key and the person's words for it. */
const answerOf = (reading: Pick<Reading, "needs" | "unlisted">) => ({
  needs: reading.needs.map((need) => ({ key: facetKey(need.facet), quote: need.matched })),
  unlisted: reading.unlisted ?? [],
});

export async function POST(request: Request) {
  const { text } = ((await request.json().catch(() => null)) ?? {}) as { text?: unknown };
  if (typeof text !== "string" || text.length > MAX_CHARS) return Response.json({ error: "text" }, { status: 400, headers: NO_STORE });
  const env = process.env;
  // The same words read the same way, and a repeated search costs nothing (src/lib/matching/read-cache.ts).
  const held = levelOf(env) >= 1 ? cachedReading(text) : null;
  if (held) return Response.json({ ...held, source: "llm" }, { headers: NO_STORE });
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const paid = levelOf(env) >= 1 && !keyPaused() && rateLimit("finder-read", caller, { limit: 20, windowMs: 60_000 });
  const reading = paid ? await readRequest(text, { ...(env.ADHDME_LLM_CASSETTES === "1" ? replay : {}), meter: todaysMeter(env) }) : lexiconReading(text);
  noteKeyFailure(reading.error);
  const answer = answerOf(reading);
  if (reading.source === "llm" && !reading.error) rememberReading(text, answer);
  return Response.json({ ...answer, source: reading.source }, { headers: NO_STORE });
}
