import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { cacheKey, FileCache } from "./cache";
import { callJson, type CallJson } from "./client";

const CALL: CallJson = {
  model: "gpt-5-nano",
  effort: "minimal",
  instructions: "Read the request.",
  input: "a woman GP",
  schema: { name: "facets", schema: { type: "object" } },
  maxOutputTokens: 400,
};

const answer = () =>
  new Response(
    JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: '{"prefs":["woman-gp"]}' }] }],
      usage: { input_tokens: 800, output_tokens: 60 },
    }),
  );

describe("the cache", () => {
  it("replays a call it has seen with no fetch and no cost", async () => {
    const cache = new FileCache(mkdtempSync(join(tmpdir(), "llm-cache-")));
    const fetch = vi.fn(async () => answer());
    const first = await callJson(CALL, { fetch, env: { OPENAI_API_KEY: "k" }, cache });
    const again = await callJson(CALL, { fetch, env: { OPENAI_API_KEY: "k" }, cache });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(again).toEqual({ data: first.data, usage: first.usage, costUsd: 0, fromCache: true });
  });

  it("changes its key with the model, effort, instructions, schema, input or read, and read 0 keeps the old key", () => {
    const base = cacheKey(CALL);
    const variants: CallJson[] = [
      { ...CALL, model: "gpt-5-mini" },
      { ...CALL, effort: "low" },
      { ...CALL, instructions: "Read it." },
      { ...CALL, schema: { name: "facets", schema: { type: "array" } } },
      { ...CALL, input: "a woman doctor" },
      { ...CALL, sample: 1 },
    ];
    for (const variant of variants) expect(cacheKey(variant)).not.toBe(base);
    expect(cacheKey({ ...CALL })).toBe(base);
    expect(cacheKey({ ...CALL, sample: 0 })).toBe(base);
  });

  it("is read only when passed: without one, every call fetches", async () => {
    const fetch = vi.fn(async () => answer());
    await callJson(CALL, { fetch, env: { OPENAI_API_KEY: "k" } });
    await callJson(CALL, { fetch, env: { OPENAI_API_KEY: "k" } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
