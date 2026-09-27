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
};

/** USD per million tokens. Reasoning tokens are billed as output. */
export const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-5-nano": { input: 0.05, cached: 0.005, output: 0.4 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2 }, // to be confirmed on the pricing page before use
};
export const TIMEOUT_MS = 20_000;
export const modelOf = (env: Record<string, string | undefined>) => env.ADHDME_LLM_MODEL ?? "gpt-5-nano";

export class IncompleteError extends Error { name = "IncompleteError"; }
export class RefusalError extends Error { name = "RefusalError"; }
export class SchemaError extends Error { name = "SchemaError"; }
export class TimeoutError extends Error { name = "TimeoutError"; }
export class HttpError extends Error { name = "HttpError"; }

export function costOf(usage: Usage, model: string): number {
  const price = PRICES[model];
  if (!price) throw new Error(`no price for ${model}`);
  return ((usage.input - usage.cached) * price.input + usage.cached * price.cached + usage.output * price.output) / 1e6;
}

type Body = {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
  usage?: { input_tokens?: number; input_tokens_details?: { cached_tokens?: number }; output_tokens?: number; output_tokens_details?: { reasoning_tokens?: number } };
};

export async function callJson<T>(request: CallJson, deps: Deps = {}): Promise<CallResult<T>> {
  const env = deps.env ?? process.env;
  const call = { ...request, model: request.model ?? modelOf(env) };
  const hit = deps.cache?.get(call);
  if (hit) return { data: hit.data as T, usage: hit.usage, costUsd: 0, fromCache: true };
  const key = env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  // Worst case: every three characters a token, every output token spent.
  const chars = call.instructions.length + call.input.length + JSON.stringify(call.schema).length;
  const hold = costOf({ input: Math.ceil(chars / 3), cached: 0, output: call.maxOutputTokens, reasoning: 0 }, call.model);
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
    const costUsd = costOf(usage, call.model);
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
  const { model, instructions, input, effort, maxOutputTokens, schema } = call;
  const format = { type: "json_schema", name: schema.name, schema: schema.schema, strict: true };
  const body = JSON.stringify({ model, instructions, input, reasoning: { effort }, max_output_tokens: maxOutputTokens, text: { format } });
  for (let attempt = 0; ; attempt += 1) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    let reply: Reply;
    try {
      const headers = { "content-type": "application/json", authorization: `Bearer ${key}` };
      reply = await fetchFn(`${base.replace(/\/$/, "")}/v1/responses`, { method: "POST", headers, body, signal: abort.signal });
      if (reply.ok) return (await reply.json()) as Body;
    } catch (error) {
      if (deps.meter) deps.meter.errors += 1;
      throw abort.signal.aborted ? new TimeoutError(`no answer in ${TIMEOUT_MS / 1000}s`) : error;
    } finally {
      clearTimeout(timer);
    }
    if (deps.meter) deps.meter.errors += 1;
    if ((reply.status !== 429 && reply.status < 500) || attempt === 2) {
      const detail = ((await reply.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? "";
      throw new HttpError(`${reply.status} ${detail}`.trim());
    }
    const wait = Number(reply.headers.get("retry-after")) * 1000;
    await new Promise((resolve) => setTimeout(resolve, wait > 0 ? wait : 1000 * 2 ** attempt + Math.random() * 250));
  }
}
