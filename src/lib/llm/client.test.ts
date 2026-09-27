import { afterEach, describe, expect, it, vi } from "vitest";
import { callJson, costOf, HttpError, IncompleteError, keyProblem, RefusalError, SchemaError, TimeoutError, type CallJson } from "./client";
import { BudgetError, BudgetMeter } from "./meter";

const ENV = { OPENAI_API_KEY: "k" };
const CALL: CallJson = {
  effort: "minimal",
  instructions: "Read the request.",
  input: "a woman GP",
  schema: { name: "facets", schema: { type: "object" } },
  maxOutputTokens: 400,
};
const USAGE = { input_tokens: 800, input_tokens_details: { cached_tokens: 0 }, output_tokens: 60, output_tokens_details: { reasoning_tokens: 0 } };

function completed(text: string, extra: object = {}) {
  return {
    status: "completed",
    output: [
      { type: "reasoning", summary: [] },
      { type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] },
    ],
    usage: USAGE,
    ...extra,
  };
}

function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function recording(...replies: (() => Response)[]) {
  const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
  const fetch = vi.fn(async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, headers: init.headers, body: init.body });
    return replies[Math.min(calls.length, replies.length) - 1]!();
  });
  return { fetch, calls };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("callJson", () => {
  it("posts one strict json_schema request, instructions before input", async () => {
    const { fetch, calls } = recording(() => reply(completed('{"care":[]}')));
    await callJson(CALL, { fetch, env: { ...ENV, ADHDME_LLM_BASE: "https://proxy.test/" } });
    expect(calls[0]!.url).toBe("https://proxy.test/v1/responses");
    expect(calls[0]!.headers.authorization).toBe("Bearer k");
    const body = JSON.parse(calls[0]!.body);
    expect(body).toEqual({
      model: "gpt-5-nano",
      instructions: "Read the request.",
      input: "a woman GP",
      reasoning: { effort: "minimal" },
      max_output_tokens: 400,
      text: { format: { type: "json_schema", name: "facets", schema: { type: "object" }, strict: true } },
    });
    expect(calls[0]!.body.indexOf('"instructions"')).toBeLessThan(calls[0]!.body.indexOf('"input"'));
  });

  it("reads the model from the environment", async () => {
    const { fetch, calls } = recording(() => reply(completed("{}")));
    await callJson(CALL, { fetch, env: { ...ENV, ADHDME_LLM_MODEL: "gpt-5-mini" } });
    expect(JSON.parse(calls[0]!.body).model).toBe("gpt-5-mini");
  });

  it("parses the message text, or output_text when the body carries it", async () => {
    const { fetch } = recording(() => reply(completed('{"care":["titration"]}')), () => reply({ ...completed("{}"), output_text: '{"care":["anxiety"]}' }));
    expect((await callJson(CALL, { fetch, env: ENV })).data).toEqual({ care: ["titration"] });
    expect((await callJson(CALL, { fetch, env: ENV })).data).toEqual({ care: ["anxiety"] });
  });

  it("throws IncompleteError on a reasoning-only incomplete answer, and still charges its tokens", async () => {
    const meter = new BudgetMeter(1);
    const incomplete = {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [{ type: "reasoning", summary: [] }],
      usage: { input_tokens: 800, output_tokens: 400, output_tokens_details: { reasoning_tokens: 400 } },
    };
    const { fetch } = recording(() => reply(incomplete));
    await expect(callJson(CALL, { fetch, env: ENV, meter })).rejects.toThrow(IncompleteError);
    expect(meter.spent).toBeCloseTo((800 * 0.05 + 400 * 0.4) / 1e6, 12);
    expect(meter.calls).toBe(1);
  });

  it("throws RefusalError on a refusal item", async () => {
    const refused = { status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "I can't help with that." }] }], usage: USAGE };
    const { fetch } = recording(() => reply(refused));
    await expect(callJson(CALL, { fetch, env: ENV })).rejects.toThrow(RefusalError);
  });

  it("throws SchemaError when the text is not JSON", async () => {
    const { fetch } = recording(() => reply(completed("care: titration")));
    await expect(callJson(CALL, { fetch, env: ENV })).rejects.toThrow(SchemaError);
  });

  it("refuses without a key or a price, before any fetch", async () => {
    const { fetch } = recording(() => reply(completed("{}")));
    await expect(callJson(CALL, { fetch, env: {} })).rejects.toThrow(/OPENAI_API_KEY/);
    await expect(callJson({ ...CALL, model: "gpt-9" }, { fetch, env: ENV })).rejects.toThrow(/no price/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("retries and timeouts", () => {
  it("waits retry-after on a 429, then retries", async () => {
    vi.useFakeTimers();
    const { fetch } = recording(() => reply({}, 429, { "retry-after": "2" }), () => reply(completed("{}")));
    const meter = new BudgetMeter(1);
    const done = callJson(CALL, { fetch, env: ENV, meter });
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await expect(done).resolves.toMatchObject({ data: {} });
    expect(meter.errors).toBe(1);
  });

  it("backs off 1s then 2s on a 5xx, and gives up after the second retry", async () => {
    vi.useFakeTimers();
    const { fetch } = recording(() => reply({ error: { message: "overloaded" } }, 503));
    const done = expect(callJson(CALL, { fetch, env: ENV })).rejects.toThrow(HttpError);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(251);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2250);
    expect(fetch).toHaveBeenCalledTimes(3);
    await done;
  });

  it("never retries a 400, and names the API's reason", async () => {
    const { fetch } = recording(() => reply({ error: { message: "Invalid schema for response_format" } }, 400));
    await expect(callJson(CALL, { fetch, env: ENV })).rejects.toThrow("400 Invalid schema for response_format");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("aborts a hung request at 20s", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    const done = expect(callJson(CALL, { fetch, env: ENV })).rejects.toThrow(TimeoutError);
    await vi.advanceTimersByTimeAsync(20_000);
    await done;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives the flex tier sixty seconds before it aborts", async () => {
    vi.useFakeTimers();
    let settled = false;
    const fetch = (_url: string, init: { signal: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const done = callJson(CALL, { fetch, env: ENV, tier: "flex" }).catch((error: unknown) => ((settled = true), error));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(40_000);
    expect(await done).toBeInstanceOf(TimeoutError);
  });
});

describe("a key that fails", () => {
  it("keeps no part of a key in the error, though the API's own text echoes one", async () => {
    const { fetch } = recording(() => reply({ error: { message: "Incorrect API key provided: sk-proj-abc************************1234. You can find your API key at …", code: "invalid_api_key" } }, 401));
    const error = (await callJson(CALL, { fetch, env: ENV }).catch((failure: unknown) => failure)) as Error;
    expect(error).toBeInstanceOf(HttpError);
    expect(error.message).toMatch(/^401 Incorrect API key provided: sk-…/);
    expect(error.message).not.toMatch(/abc|1234/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not wait and retry when a 429 says the account is out of credit", async () => {
    const { fetch } = recording(() => reply({ error: { message: "You exceeded your current quota", code: "insufficient_quota" } }, 429));
    await expect(callJson(CALL, { fetch, env: ENV })).rejects.toThrow(/^429 insufficient_quota You exceeded/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("the free key check", () => {
  const answering = (status: number) => vi.fn(async () => new Response("{}", { status }));
  it("says what is wrong with a key before anything is spent, and nothing when the key works", async () => {
    expect(await keyProblem({})).toMatch(/not set/);
    expect(await keyProblem(ENV, answering(401))).toMatch(/refused the key \(401\)/);
    expect(await keyProblem(ENV, answering(404))).toMatch(/cannot use gpt-5-nano/);
    expect(await keyProblem(ENV, answering(200))).toBeNull();
    expect(await keyProblem(ENV, vi.fn(async () => Promise.reject(new Error("offline"))))).toBeNull();
  });

  it("asks for the model with a GET and no body, which costs nothing", async () => {
    const fetch = answering(200);
    await keyProblem({ ...ENV, ADHDME_LLM_MODEL: "gpt-5-mini" }, fetch);
    expect(fetch).toHaveBeenCalledWith("https://api.openai.com/v1/models/gpt-5-mini", expect.objectContaining({ method: "GET", body: undefined }));
  });
});

describe("OpenAI's options", () => {
  it("sends the cache key, the retention and the tier only when they are set", async () => {
    const { fetch, calls } = recording(() => reply(completed("{}")));
    await callJson(CALL, { fetch, env: ENV });
    await callJson({ ...CALL, cacheKey: "adhdme-l1-read", cacheRetention: "24h" }, { fetch, env: ENV, tier: "flex" });
    const bodies = calls.map((call) => JSON.parse(call.body) as Record<string, unknown>);
    expect(bodies[0]).not.toHaveProperty("prompt_cache_key");
    expect(bodies[0]).not.toHaveProperty("service_tier");
    expect(bodies[1]).toMatchObject({ prompt_cache_key: "adhdme-l1-read", prompt_cache_retention: "24h", service_tier: "flex" });
  });
});

describe("cost", () => {
  it("prices input, cached input and output (reasoning included) per million tokens", () => {
    expect(costOf({ input: 1_000_000, cached: 0, output: 0, reasoning: 0 }, "gpt-5-nano")).toBeCloseTo(0.05, 12);
    expect(costOf({ input: 1_000_000, cached: 1_000_000, output: 0, reasoning: 0 }, "gpt-5-nano")).toBeCloseTo(0.005, 12);
    expect(costOf({ input: 760, cached: 0, output: 90, reasoning: 30 }, "gpt-5-nano")).toBeCloseTo(0.000074, 12);
  });

  it("charges the meter from the usage block, and the meter refuses before fetch", async () => {
    const { fetch } = recording(() => reply(completed("{}")));
    const meter = new BudgetMeter(0.01);
    const result = await callJson(CALL, { fetch, env: ENV, meter });
    expect(result.costUsd).toBeCloseTo((800 * 0.05 + 60 * 0.4) / 1e6, 12);
    expect(meter.spent).toBe(result.costUsd);
    await expect(callJson(CALL, { fetch, env: ENV, meter: new BudgetMeter(0.0001) })).rejects.toThrow(BudgetError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("charges flex at half, by the tier the answer says it was served on", async () => {
    expect(costOf({ input: 1_000_000, cached: 0, output: 1_000_000, reasoning: 0 }, "gpt-5-nano", "flex")).toBeCloseTo((0.05 + 0.4) / 2, 12);
    const served = (tier: string) => recording(() => reply(completed("{}", { service_tier: tier }))).fetch;
    const flex = await callJson(CALL, { fetch: served("flex"), env: ENV, tier: "flex" });
    const fellBack = await callJson(CALL, { fetch: served("default"), env: ENV, tier: "flex" });
    expect(flex.costUsd).toBeCloseTo((800 * 0.05 + 60 * 0.4) / 2 / 1e6, 12);
    expect(fellBack.costUsd).toBeCloseTo((800 * 0.05 + 60 * 0.4) / 1e6, 12);
  });
});
