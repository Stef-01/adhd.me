// Recorded-shape Responses API answers for tests and the P0 dry run: one per complexity class C1
// to C10, one incomplete, one refusal. HAND-WRITTEN, not recorded: the sandbox cannot reach the
// API. They carry the fields the client reads plus id, model and created_at, and the first live
// P2 run replaces them with real ones. Imported, not read from the folder, so the finder's read
// route can replay them in a server build (ADHDME_LLM_CASSETTES=1); a new file needs a line here.

import c01 from "./c01-plain.json";
import c02 from "./c02-paraphrase.json";
import c03 from "./c03-several.json";
import c04 from "./c04-negation.json";
import c05 from "./c05-priority.json";
import c06 from "./c06-narrative.json";
import c07 from "./c07-aspires.json";
import c08 from "./c08-instructions.json";
import c09 from "./c09-locale.json";
import c10 from "./c10-empty.json";
import x1 from "./x1-incomplete.json";
import x2 from "./x2-refusal.json";

export type Cassette = {
  class: string;
  input: string;
  /** What `readRequest` must return for this input. */
  expect: { keys: string[]; source: "llm" | "lexicon" };
  status: number;
  response: unknown;
};

export const CASSETTES = [c01, c02, c03, c04, c05, c06, c07, c08, c09, c10, x1, x2] as readonly Cassette[];

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
