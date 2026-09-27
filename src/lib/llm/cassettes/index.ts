// Recorded-shape Responses API answers for tests and the P0 dry run: one per complexity class C1
// to C10, one incomplete, one refusal. HAND-WRITTEN, not recorded: the sandbox cannot reach the
// API. They carry the fields the client reads plus id, model and created_at, and the first live
// P2 run replaces them with real ones.

import { readdirSync, readFileSync } from "node:fs";

export type Cassette = {
  class: string;
  input: string;
  /** What `readRequest` must return for this input. */
  expect: { keys: string[]; source: "llm" | "lexicon" };
  status: number;
  response: unknown;
};

const DIR = new URL("./", import.meta.url);

export const CASSETTES: readonly Cassette[] = readdirSync(DIR)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => JSON.parse(readFileSync(new URL(file, DIR), "utf8")) as Cassette);

/** A completed answer carrying `data`, at a typical L1 read's usage. */
export function completed(data: object, usage = { input_tokens: 910, output_tokens: 30 }): object {
  return {
    status: "completed",
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(data) }] }],
    usage,
  };
}

/** A fetch answering from the cassettes by request input, and from `otherwise` for any other input. */
export function cassetteFetch(cassettes: readonly Cassette[], otherwise?: (input: string) => object) {
  return async (_url: string, init: { body: string }): Promise<Response> => {
    const { input } = JSON.parse(init.body) as { input: string };
    const hit = cassettes.find((cassette) => cassette.input === input);
    const body = hit?.response ?? otherwise?.(input);
    if (!body) throw new Error(`no cassette for "${input}"`);
    return new Response(JSON.stringify(body), { status: hit?.status ?? 200 });
  };
}
