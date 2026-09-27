// One OpenAI Responses API call with a strict JSON schema: the only code that sends a request to a
// language model. Plain `fetch`, injectable for tests, so nothing retries behind our back. 429 and
// 5xx retry at most twice (retry-after, else 1s then 2s with jitter); a 400 never does; 20s aborts.

import type { BudgetMeter } from "./meter";

export type CallJson = {
  model?: string;
  effort: "minimal" | "low";
  instructions: string; // static and first, so the prefix can cache; the request is `input`, last
  input: string;
  schema: { name: string; schema: object };
  maxOutputTokens: number; // at least 400, so reasoning cannot starve the answer
  sample?: number; // which of several reads of one input this is, so each caches apart; never sent
  /** OpenAI's own prompt cache: requests with one key share a cache, and "24h" keeps a prefix warm between sparse requests. */
  cacheKey?: string;
  cacheRetention?: "24h";
};
export type Usage = { input: number; cached: number; output: number; reasoning: number };
export type CallResult<T> = { data: T; usage: Usage; costUsd: number; fromCache: boolean };
export type Cached = { data: unknown; usage: Usage };

type Reply = { ok: boolean; status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> };
type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<Reply>;

export type Deps = {
  fetch?: FetchLike;
  env?: Record<string, string | undefined>;
  meter?: BudgetMeter;
  /** Evals only: a hit costs nothing and makes no fetch. */
  cache?: { get(call: CallJson): Cached | undefined; set(call: CallJson, value: Cached): void };
  /** Evals only: "flex" is billed at Batch rates (half) and may be slower or briefly unavailable (a 429). */
  tier?: "flex";
  /** Evals only: wait for every call even once the outcome is settled, so every failure is counted. */
  waitForAll?: boolean;
};

/** USD per million tokens, standard tier (the pricing page, 2026-09-28). Reasoning tokens are billed as output. */
export const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-5-nano": { input: 0.05, cached: 0.005, output: 0.4 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2 },
};
/** The flex tier is billed at Batch rates: half of every standard price, for both models above. */
export const FLEX_RATE = 0.5;
export const TIMEOUT_MS = 20_000;
/** Flex answers more slowly and is for evals, where nobody is waiting. */
export const FLEX_TIMEOUT_MS = 60_000;
export const modelOf = (env: Record<string, string | undefined>) => env.ADHDME_LLM_MODEL ?? "gpt-5-nano";
/** `ADHDME_LLM_LEVEL` in effect: 0 unless there is a key, or the e2e cassettes stand in for one. */
export const levelOf = (env: Record<string, string | undefined>) =>
  env.OPENAI_API_KEY || env.ADHDME_LLM_CASSETTES === "1" ? Number(env.ADHDME_LLM_LEVEL) || 0 : 0;

export class IncompleteError extends Error { name = "IncompleteError"; }
export class RefusalError extends Error { name = "RefusalError"; }
export class SchemaError extends Error { name = "SchemaError"; }
export class TimeoutError extends Error { name = "TimeoutError"; }
export class HttpError extends Error { name = "HttpError"; }

/** The API's own error text echoes a masked key ("sk-proj-****1234"); nothing of a key stays in ours. */
export const withoutKeys = (text: string) => text.replace(/sk-[A-Za-z0-9_*.\-]+/g, "sk-…");

export function costOf(usage: Usage, model: string, tier?: string): number {
  const price = PRICES[model];
  if (!price) throw new Error(`no price for ${model}`);
  const rate = tier === "flex" ? FLEX_RATE : 1;
  return (rate * ((usage.input - usage.cached) * price.input + usage.cached * price.cached + usage.output * price.output)) / 1e6;
}

type Body = {
  status?: string;
  service_tier?: string;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
  usage?: { input_tokens?: number; input_tokens_details?: { cached_tokens?: number }; output_tokens?: number; output_tokens_details?: { reasoning_tokens?: number } };
};

/**
 * Whether the key can reach the model, for free: a model lookup, no tokens. A sentence to show when it
 * cannot (a refused key, a model the project may not use); null when it can, or when the network is
 * the problem (the paid run will say so itself).
 */
export async function keyProblem(env: Record<string, string | undefined>, fetchFn: Deps["fetch"] = (url, init) => fetch(url, init)): Promise<string | null> {
  const key = env.OPENAI_API_KEY;
  if (!key) return "OPENAI_API_KEY is not set: put it in .env.local";
  const model = modelOf(env);
  try {
    const reply = await fetchFn!(`${(env.ADHDME_LLM_BASE ?? "https://api.openai.com").replace(/\/$/, "")}/v1/models/${model}`, {
      method: "GET",
      headers: { authorization: `Bearer ${key}` },
      body: undefined as unknown as string,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (reply.status === 401 || reply.status === 403) return `the API refused the key (${reply.status}): check OPENAI_API_KEY in .env.local`;
    if (reply.status === 404) return `this key's project cannot use ${model}`;
    return null;
  } catch {
    return null;
  }
}

export async function callJson<T>(request: CallJson, deps: Deps = {}): Promise<CallResult<T>> {
  const env = deps.env ?? process.env;
  const call = { ...request, model: request.model ?? modelOf(env) };
  const hit = deps.cache?.get(call);
  if (hit) return { data: hit.data as T, usage: hit.usage, costUsd: 0, fromCache: true };
  const key = env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  // Worst case: every three characters a token, every output token spent.
  const chars = call.instructions.length + call.input.length + JSON.stringify(call.schema).length;
  const hold = costOf({ input: Math.ceil(chars / 3), cached: 0, output: call.maxOutputTokens, reasoning: 0 }, call.model, deps.tier);
  deps.meter?.reserve(hold);
  try {
    const body = await post(call, key, env.ADHDME_LLM_BASE ?? "https://api.openai.com", deps);
    const u = body.usage ?? {};
    const usage = {
      input: u.input_tokens ?? 0,
      cached: u.input_tokens_details?.cached_tokens ?? 0,
      output: u.output_tokens ?? 0,
      reasoning: u.output_tokens_details?.reasoning_tokens ?? 0,
    };
    const costUsd = costOf(usage, call.model, body.service_tier); // the tier the API says it used
    deps.meter?.charge(costUsd, usage, call.model);

    if (body.status === "incomplete") throw new IncompleteError(body.incomplete_details?.reason ?? "incomplete");
    const content = body.output?.find((item) => item.type === "message")?.content ?? [];
    const refusal = content.find((part) => part.type === "refusal");
    if (refusal) throw new RefusalError(refusal.refusal ?? "refused");
    const text = body.output_text ?? content.find((part) => part.type === "output_text")?.text ?? "";
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new SchemaError(`not JSON: ${text.slice(0, 80)}`);
    }
    deps.cache?.set(call, { data, usage });
    return { data, usage, costUsd, fromCache: false };
  } finally {
    deps.meter?.release(hold);
  }
}

async function post(call: CallJson & { model: string }, key: string, base: string, deps: Deps): Promise<Body> {
  const fetchFn: FetchLike = deps.fetch ?? ((url, init) => fetch(url, init));
  const { model, instructions, input, effort, maxOutputTokens, schema, cacheKey, cacheRetention } = call;
  const format = { type: "json_schema", name: schema.name, schema: schema.schema, strict: true };
  const options = { ...(cacheKey ? { prompt_cache_key: cacheKey } : {}), ...(cacheRetention ? { prompt_cache_retention: cacheRetention } : {}), ...(deps.tier ? { service_tier: deps.tier } : {}) };
  const body = JSON.stringify({ model, instructions, input, reasoning: { effort }, max_output_tokens: maxOutputTokens, text: { format }, ...options });
  const timeoutMs = deps.tier === "flex" ? FLEX_TIMEOUT_MS : TIMEOUT_MS;
  for (let attempt = 0; ; attempt += 1) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    let reply: Reply;
    try {
      const headers = { "content-type": "application/json", authorization: `Bearer ${key}` };
      reply = await fetchFn(`${base.replace(/\/$/, "")}/v1/responses`, { method: "POST", headers, body, signal: abort.signal });
      if (reply.ok) return (await reply.json()) as Body;
    } catch (error) {
      if (deps.meter) deps.meter.errors += 1;
      throw abort.signal.aborted ? new TimeoutError(`no answer in ${timeoutMs / 1000}s`) : error;
    } finally {
      clearTimeout(timer);
    }
    if (deps.meter) deps.meter.errors += 1;
    const failure = ((await reply.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null)?.error;
    // An account out of credit answers 429 too, and waiting will not fix it.
    const spent = failure?.code === "insufficient_quota";
    if ((reply.status !== 429 && reply.status < 500) || spent || attempt === 2) {
      throw new HttpError(withoutKeys(`${reply.status} ${failure?.code === "insufficient_quota" ? "insufficient_quota " : ""}${failure?.message ?? ""}`.trim()));
    }
    const wait = Number(reply.headers.get("retry-after")) * 1000;
    await new Promise((resolve) => setTimeout(resolve, wait > 0 ? wait : 1000 * 2 ** attempt + Math.random() * 250));
  }
}
