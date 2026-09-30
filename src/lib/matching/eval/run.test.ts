import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { completed } from "@/lib/llm/cassettes";
import { appendLedger, ledgerSpend } from "@/lib/llm/meter";
import { syntheticRoster } from "@/matching/scale-fixture";
import { promptHash, runEval, TESTING_BUDGET_USD } from "./run";

const ENV = { OPENAI_API_KEY: "k" };
const NONE = { needs: [], unlisted: [] };
const USAGE = { input: 900, cached: 0, output: 30, reasoning: 0 };
const workspace = () => mkdtempSync(join(tmpdir(), "match-eval-"));

/** A fake API: `answer(n)` gives the nth call's body and status. */
function api(answer: (n: number) => { body: object; status?: number }) {
  let n = 0;
  return async (_url: string, init?: { method?: string }) => {
    if (init?.method === "GET") return new Response("{}", { status: 200 }); // the free key check
    const { body, status } = answer((n += 1));
    return new Response(JSON.stringify(body), { status: status ?? 200 });
  };
}

describe("the dry run", () => {
  it("reads every entry from the cassettes and its own pins, and writes a passing report", async () => {
    const rosters = { real: clinicians, "synthetic-50": syntheticRoster(50) };
    const outcome = await runEval({ root: workspace(), env: {}, rosters });
    expect(outcome.code).toBe(0);
    const report = readFileSync(outcome.report!, "utf8");
    expect(report).toContain("| NDCG@3 synthetic-50 |");
    expect(report).toMatch(/^Result: PASS$/m);
    expect(report).toContain(`Prompt: ${promptHash({})} · model gpt-5-mini`);
    expect(report).toContain("| every answer reads back as sent | 0 differ | yes |");
    // The two failing cassettes fall back, and the report names them with the fault.
    expect(report).toMatch(/\| C7 \| dev \| childhood was rough .* \| fallback: RefusalError \|/);
    expect(report).toMatch(/\| C1 \| dev \| I think I have ADHD .* \| fallback: IncompleteError \|/);
    expect(report).toContain("(simulated)");
  });

  it("takes a sample per class", async () => {
    const outcome = await runEval({ root: workspace(), env: {}, sample: 1 });
    expect(readFileSync(outcome.report!, "utf8")).toMatch(/Requests 10 of 10/);
  });
});

describe("a live run", () => {
  it("refuses when the API refuses the key, before any paid call or report", async () => {
    const root = workspace();
    const refused = async () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), { status: 401 });
    const outcome = await runEval({ live: true, root, env: ENV, fetch: refused });
    expect(outcome).toMatchObject({ code: 2, message: expect.stringMatching(/refused: the API refused the key \(401\)/) });
    expect(outcome.report).toBeUndefined();
    expect(ledgerSpend(join(root, "qa/matching/ledger.jsonl"))).toBe(0);
  });

  it("gates on never, precision, recall and aspires, and writes every paid call to the ledger", async () => {
    const root = workspace();
    const outcome = await runEval({ live: true, root, env: ENV, fetch: api(() => ({ body: completed(NONE) })), sample: 2 });
    expect(outcome.code).toBe(1);
    const report = readFileSync(outcome.report!, "utf8");
    // Reading nothing breaks no never pin and misses every reach.
    expect(report).toMatch(/\| never violations \| 0\.0% \| yes \|/);
    expect(report).toMatch(/\| recall on reaches \| 0\.0% \| NO \|/);
    expect(report).toMatch(/\| fallbacks to the lexicon \| 0 \| yes \|/);
    const ledger = join(root, "qa/matching/ledger.jsonl");
    expect(readFileSync(ledger, "utf8").trim().split("\n").length).toBeGreaterThanOrEqual(10);
  });

  it("refuses to start once testing has spent the budget, the voice ledger counted too", async () => {
    const root = workspace();
    const ledger = join(root, "qa/matching/ledger.jsonl");
    appendLedger(ledger, { level: "L1", phase: "eval", model: "gpt-5-mini", usage: USAGE, costUsd: TESTING_BUDGET_USD - 1 });
    appendLedger(join(root, "qa/voice/ledger.jsonl"), { level: "voice", phase: "eval", model: "gpt-realtime-2.1-mini", usage: USAGE, costUsd: 1 });
    const outcome = await runEval({ live: true, root, env: ENV, fetch: api(() => ({ body: completed(NONE) })) });
    expect(outcome).toMatchObject({ code: 2, message: expect.stringMatching(new RegExp(`\\$${TESTING_BUDGET_USD} testing budget`)) });
  });

  it("stops after 3 failed calls in a row", async () => {
    const outcome = await runEval({ live: true, root: workspace(), env: ENV, fetch: api(() => ({ body: { error: { message: "bad schema" } }, status: 400 })), sample: 1 });
    expect(outcome.code).toBe(1);
    expect(outcome.message).toMatch(/3 failed calls in a row/);
    expect(readFileSync(outcome.report!, "utf8")).toMatch(/\| no circuit breaker \| 3 failed calls in a row \| NO \|/);
  });
});
