import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { completed } from "@/lib/llm/cassettes";
import { appendLedger, ledgerSpend } from "@/lib/llm/meter";
import { syntheticRoster } from "@/matching/scale-fixture";
import { READS } from "../llm-read";
import { promptHash, runEval } from "./run";

const ENV = { OPENAI_API_KEY: "k" };
const EMPTY = { care: [], manner: [], prefs: [], languages: [], negated: [] };
const USAGE = { input: 900, cached: 0, output: 30, reasoning: 0 };

function workspace(passing?: { phase: string; prompt?: string }): string {
  const root = mkdtempSync(join(tmpdir(), "match-eval-"));
  if (passing) {
    mkdirSync(join(root, "qa/matching/reports"), { recursive: true });
    const prompt = passing.prompt ?? promptHash("L1", ENV);
    writeFileSync(join(root, `qa/matching/reports/L1-${passing.phase}-earlier.md`), `# L1 ${passing.phase}\n\nResult: PASS\nPrompt: ${prompt} · model gpt-5-nano\n`);
  }
  return root;
}

/** A fake API: `answer(n)` gives the nth call's body and status. */
function api(answer: (n: number) => { body: object; status?: number }) {
  let n = 0;
  return async (_url: string, init?: { method?: string }) => {
    if (init?.method === "GET") return new Response("{}", { status: 200 }); // the free key check
    const { body, status } = answer((n += 1));
    return new Response(JSON.stringify(body), { status: status ?? 200 });
  };
}

describe("P0 and L0", () => {
  it("runs L1 at P0 end to end on the cassettes and writes a passing report", async () => {
    const rosters = { real: clinicians, "synthetic-50": syntheticRoster(50) };
    const outcome = await runEval({ level: "L1", phase: "P0", root: workspace(), env: {}, rosters });
    expect(outcome.code).toBe(0);
    const report = readFileSync(outcome.report!, "utf8");
    expect(report).toContain("| NDCG@3 synthetic-50 |");
    expect(report).toMatch(/^Result: PASS$/m);
    expect(report).toContain(`Prompt: ${promptHash("L1", {})} `);
    expect(report).toContain("| every answer reads back as sent | 0 differ | yes |");
    expect(report).toMatch(/\| C7 \| dev \| childhood was rough .* \| RefusalError \|/);
    expect(report).toMatch(/\| C1 \| dev \| I think I have ADHD .* \| F1 \|/);
  });

  it("measures L0 with no calls", async () => {
    const outcome = await runEval({ level: "L0", phase: "P0", root: workspace() });
    expect(outcome.code).toBe(0);
    expect(readFileSync(outcome.report!, "utf8")).toContain("paid calls 0 · fallbacks 0");
  });
});

describe("the ladder", () => {
  it("refuses a phase the ladder does not allow, with a reason", async () => {
    const root = workspace();
    const refused = async (level: string, phase: string, live: boolean) => {
      const outcome = await runEval({ level, phase, live, root, env: ENV });
      expect(outcome.code).toBe(2);
      return outcome.message;
    };
    expect(await refused("L1", "P3", true)).toMatch(/no passing L1 P2 report/);
    expect(await refused("L1", "P1", false)).toMatch(/add --live/);
    expect(await refused("L1", "P0", true)).toMatch(/drop --live/);
    expect(await refused("L0", "P2", true)).toMatch(/L0 makes no calls/);
    expect(await refused("L1", "P6", true)).toMatch(/L6/);
    expect(await refused("L2", "P0", false)).toMatch(/--level/);
  });

  it("refuses P3 after a P2 pass under another prompt, and runs it under the same one", async () => {
    const other = await runEval({ level: "L1", phase: "P3", live: true, root: workspace({ phase: "P2", prompt: "0123456789ab" }), env: ENV });
    expect(other.message).toMatch(/no passing L1 P2 report for prompt/);
    const fetch = api(() => ({ body: completed(EMPTY) }));
    const same = await runEval({ level: "L1", phase: "P3", live: true, root: workspace({ phase: "P2" }), env: ENV, fetch });
    expect(same.code).toBe(1);
    // An empty answer keeps every key the lexicon hears, so recall holds and the aspires gate fails.
    expect(readFileSync(same.report!, "utf8")).toMatch(/\| recall on reaches within 0.02 of L0's \| .* \| yes \|/);
    expect(readFileSync(same.report!, "utf8")).toMatch(/\| aspires reached \| .* \| NO \|/);
  });

  it("refuses a live phase when the API refuses the key, before any paid call or report", async () => {
    const root = workspace({ phase: "P1" });
    const refused = async () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), { status: 401 });
    const outcome = await runEval({ level: "L1", phase: "P2", live: true, root, env: ENV, fetch: refused });
    expect(outcome).toMatchObject({ code: 2, message: expect.stringMatching(/refused: the API refused the key \(401\)/) });
    expect(outcome.report).toBeUndefined();
    expect(ledgerSpend(join(root, "qa/matching/ledger.jsonl"))).toBe(0);
  });

  it("writes every paid call to the ledger, and refuses to start once it holds $8", async () => {
    const root = workspace({ phase: "P1" });
    const fetch = api(() => ({ body: completed(EMPTY) }));
    await runEval({ level: "L1", phase: "P2", live: true, root, env: ENV, fetch });
    const ledger = join(root, "qa/matching/ledger.jsonl");
    expect(readFileSync(ledger, "utf8").trim().split("\n")).toHaveLength(10 * READS);
    appendLedger(ledger, { level: "L1", phase: "P2", model: "gpt-5-nano", usage: USAGE, costUsd: 8 - ledgerSpend(ledger) });
    const outcome = await runEval({ level: "L1", phase: "P2", live: true, root, env: ENV, fetch });
    expect(outcome).toMatchObject({ code: 2, message: expect.stringMatching(/programme's \$8 cap/) });
  });
});

describe("circuit breakers", () => {
  const breaks = async (phase: string, answer: (n: number) => { body: object; status?: number }, estimateUsd?: number) => {
    const before = `P${Number(phase[1]) - 1}`;
    const outcome = await runEval({ level: "L1", phase, live: true, root: workspace({ phase: before }), env: ENV, fetch: api(answer), estimateUsd });
    expect(outcome.code).toBe(1);
    expect(readFileSync(outcome.report!, "utf8")).toMatch(/\| no circuit breaker \| .+ \| NO \|/);
    return outcome.message;
  };

  it("stops after 3 failed calls in a row", async () => {
    expect(await breaks("P2", () => ({ body: { error: { message: "bad schema" } }, status: 400 }))).toMatch(/3 failed calls in a row/);
  });

  it("stops when schema or incomplete failures pass 5% after 20 calls", async () => {
    const answer = (n: number) => ({ body: n % 3 === 1 ? completed({ care: "titration" }) : completed(EMPTY) });
    expect(await breaks("P3", answer)).toMatch(/schema or incomplete failures over 5% after 20 calls/);
  });

  it("stops when the meter refuses a call at the phase's spend cap", async () => {
    const dear = { body: completed(EMPTY, { input_tokens: 900, output_tokens: 30_000 }) };
    expect(await breaks("P2", () => dear, 1)).toMatch(/spend cap refused a call/);
  });

  it("stops when one call costs over 5x the estimate", async () => {
    const runaway = { body: completed(EMPTY, { input_tokens: 900, output_tokens: 3_000 }) };
    expect(await breaks("P2", () => runaway)).toMatch(/over 5x the estimate/);
  });
});
