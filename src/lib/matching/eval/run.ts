// One level at one phase (docs/matching/LLM-MATCHING-PLAN.md §8): the phase's requests, limits and
// gates, the circuit breakers, and one report in qa/matching/reports/. `pnpm match:eval` runs it.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clinicians, rankClinicians, type Clinician } from "@/demo/clinicians";
import { FileCache } from "@/lib/llm/cache";
import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { modelOf, type Deps } from "@/lib/llm/client";
import { appendLedger, BudgetMeter, ledgerSpend, RateGate } from "@/lib/llm/meter";
import { answerFor, lexiconReading, READ_CALL, readRequest, type Reading } from "../llm-read";
import { facetScore, faults, flipRate, ndcgAt, reciprocalRank, scoreReader } from "./metrics";
import { CLASSES, evalEntries, oracleGains, type EvalEntry } from "./sets";

export const PHASES = {
  P0: { concurrency: 8, rpm: Infinity, capUsd: Infinity },
  P1: { concurrency: 1, rpm: 6, capUsd: 0.01 },
  P2: { concurrency: 1, rpm: 20, capUsd: 0.02 },
  P3: { concurrency: 2, rpm: 60, capUsd: 0.1 },
  P4: { concurrency: 4, rpm: 200, capUsd: 0.5 },
  P5: { concurrency: 8, rpm: 400, capUsd: 2 },
};
type Phase = keyof typeof PHASES;

/** Per L1 call at effort "low" (§5): $0.000136 to $0.000147 measured on the P3 set, 2026-09-28. */
export const ESTIMATE_USD = 0.00015;
const PROGRAMME_CAP_USD = 8;
const TODAY = new Date("2026-09-27T00:00:00Z");
const FLAWS: Record<string, string> = { IncompleteError: "F1", SchemaError: "F2", HttpError: "F12/F22", TimeoutError: "F13", BudgetError: "F11" };

export type EvalOptions = {
  level: string;
  phase: string;
  live?: boolean;
  env?: Record<string, string | undefined>;
  fetch?: Deps["fetch"];
  root?: string; // where qa/ and .cache/ live
  estimateUsd?: number;
  /** Rosters to rank on, by name. The script adds syntheticRoster(50), which no src/ module may import. */
  rosters?: Record<string, readonly Clinician[]>;
};
export type Outcome = { code: 0 | 1 | 2; message: string; report?: string };
type Done = { entry: EvalEntry; reading: Reading };

const gold = (e: EvalEntry) => [...(e.reaches ?? []), ...(e.aspires ?? [])];
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
const cell = (value: number | null) => (value === null ? "–" : value.toFixed(3));
const pct = (value: number | null) => (value === null ? "–" : `${(value * 100).toFixed(1)}%`);

export function promptHash(level: string, env: Record<string, string | undefined> = process.env): string {
  if (level === "L0") return "lexicon";
  return createHash("sha256").update(JSON.stringify([modelOf(env), READ_CALL])).digest("hex").slice(0, 12);
}

export async function runEval(options: EvalOptions): Promise<Outcome> {
  const { level, live = false, env = process.env, root = ".", estimateUsd = ESTIMATE_USD } = options;
  const phase = options.phase as Phase;
  const reports = join(root, "qa/matching/reports");
  const ledger = join(root, "qa/matching/ledger.jsonl");
  const prompt = promptHash(level, env);
  const before = `P${Number(phase[1]) - 1}`;
  const spentBefore = ledgerSpend(ledger);
  const refusal =
    level !== "L0" && level !== "L1" ? `--level is L0 or L1, not ${level}`
    : !(phase in PHASES) ? (options.phase === "P6" ? "P6 belongs to L6 and the Batch API" : `--phase is P0 to P6, not ${phase}`)
    : level === "L0" && phase !== "P0" ? "L0 makes no calls: run it at P0"
    : live !== (phase !== "P0") ? (live ? "P0 is dry: drop --live" : `${phase} calls the API: add --live`)
    : phase !== "P0" && !passed(reports, `${level}-${before}-`, prompt) ? `no passing ${level} ${before} report for prompt ${prompt}`
    : spentBefore >= PROGRAMME_CAP_USD ? `the ledger holds $${spentBefore.toFixed(2)}, at the programme's $${PROGRAMME_CAP_USD} cap`
    : null;
  if (refusal) return { code: 2, message: `refused: ${refusal}` };

  const limits = PHASES[phase];
  const entries = evalEntries();
  const dev = entries.filter((e) => e.split === "dev");
  const perClass = (n: number) => CLASSES.flatMap((cls) => dev.filter((e) => e.cls === cls).slice(0, n));
  const selected = { P0: entries, P1: perClass(1).slice(0, 1), P2: perClass(1), P3: perClass(6), P4: dev, P5: entries }[phase];

  const tripped: string[] = [];
  const meter = new BudgetMeter(Math.min(limits.capUsd, PROGRAMME_CAP_USD - spentBefore), (costUsd, usage, model) => {
    if (live) appendLedger(ledger, { level, phase, model, usage, costUsd });
    if (costUsd > 5 * estimateUsd) tripped.push(`one call cost $${costUsd.toFixed(5)}, over 5x the estimate`);
  });
  const byText = new Map(entries.map((e) => [e.text, e]));
  // The corpus pins no languages, so the oracle also takes any language the text names.
  const oracleKeys = (text: string) => [...gold(byText.get(text)!), ...lexiconReading(text).keys.filter((k) => k.startsWith("language:"))];
  const deps: Deps = live
    ? { fetch: options.fetch, env, meter, cache: new FileCache(join(root, ".cache/llm")) }
    : { fetch: cassetteFetch(CASSETTES, (input) => completed(answerFor(oracleKeys(input)))), env: { ...env, OPENAI_API_KEY: "dry" }, meter };
  const gate = new RateGate(limits.concurrency, limits.rpm);
  let [calls, streak, malformed] = [0, 0, 0];
  const read = async (entry: EvalEntry, cached = true): Promise<Done | null> => {
    if (level === "L0") return { entry, reading: lexiconReading(entry.text) };
    const reading = await gate.run(async () => (tripped.length ? null : readRequest(entry.text, cached ? deps : { ...deps, cache: undefined })));
    if (!reading) return null;
    calls += 1;
    streak = reading.source === "llm" ? 0 : streak + 1;
    if (/^(SchemaError|IncompleteError)/.test(reading.error ?? "")) malformed += 1;
    if (reading.error?.startsWith("BudgetError")) tripped.push("the spend cap refused a call");
    if (streak === 3) tripped.push("3 failed calls in a row");
    if (calls > 20 && malformed / calls > 0.05) tripped.push("schema or incomplete failures over 5% after 20 calls");
    return { entry, reading };
  };
  const done = (await Promise.all(selected.map((e) => read(e)))).filter((d) => d !== null);
  const devDone = done.filter((d) => d.entry.split === "dev");
  const holdDone = done.filter((d) => d.entry.split === "holdout");
  const again = () => Promise.all(devDone.map((d) => read(d.entry, false)));
  const repeats = phase === "P5" ? [await again(), await again()] : [];

  // Metrics, per class and per split.
  const keysOf = new Map(done.map((d) => [d.entry.text, d.reading.keys]));
  const score = (of: Done[]) => scoreReader(of.map((d) => d.entry), (text) => keysOf.get(text)!);
  const lexicon = (of: Done[]) => scoreReader(of.map((d) => d.entry), (text) => lexiconReading(text).keys);
  const rosters = Object.entries(options.rosters ?? { real: clinicians });
  const grade = ({ entry, reading }: Done, roster: readonly Clinician[]) => {
    const gains = oracleGains(oracleKeys(entry.text), roster);
    const order = rankClinicians(entry.text, roster, TODAY, reading.needs).map((c) => c.id);
    const ndcg = ndcgAt(3, order, gains);
    return ndcg === null ? null : { ndcg, rr: reciprocalRank(order, gains) };
  };
  const orders = new Map(done.map((d) => [d, rosters.map(([, roster]) => grade(d, roster))]));
  const byClass = CLASSES.map((cls): [string, Done[]] => [cls, done.filter((d) => d.entry.cls === cls)]);
  const groups: [string, Done[]][] = [...byClass, ["dev", devDone], ["holdout", holdDone], ["all", done]];
  const all = score(done);
  const fallback = (reading: Reading) => level === "L1" && reading.source === "lexicon";
  const fallbacks = done.filter((d) => fallback(d.reading)).length;
  const valid = 1 - fallbacks / Math.max(1, done.length);
  const flips = repeats.length ? flipRate([devDone.map((d) => d.reading.keys), ...repeats.map((run) => run.map((d) => d?.reading.keys ?? []))]) : null;
  const perCall = meter.calls ? meter.spent / meter.calls : 0;
  const errorRate = meter.errors / Math.max(1, calls);

  // Gates (§7 for L1, P0's own for the dry run) and the lifting rule's (b) to (d).
  const gates: [string, string, boolean][] = [];
  if (level === "L0") gates.push(["L0 is measured, not gated", `${done.length} entries read`, done.length > 0]);
  else if (phase === "P0") {
    const off = done.filter((d) => {
      const want = CASSETTES.find((c) => c.input === d.entry.text)?.expect ?? { keys: oracleKeys(d.entry.text), source: "llm" };
      return d.reading.source !== want.source || [...d.reading.keys].sort().join() !== [...want.keys].sort().join();
    });
    gates.push(["every answer reads back as sent", `${off.length} differ`, off.length === 0]);
  } else {
    gates.push(["schema-valid answers", pct(valid), phase <= "P2" ? valid === 1 : valid >= 0.995]);
    if (phase >= "P3") {
      const base = lexicon(done);
      const c4 = score(done.filter((d) => d.entry.cls === "C4"));
      // L0 hears every `reaches` pin by construction (the pins are what the lexicon hears), so "at least L0's" would allow no miss at all.
      gates.push(["recall on reaches within 0.02 of L0's", `${pct(all.recall)} vs ${pct(base.recall)}`, (all.recall ?? 1) >= (base.recall ?? 1) - 0.02]);
      gates.push(["aspires reached", pct(all.aspires), (all.aspires ?? 1) >= 0.5]);
      gates.push(["precision (lower bound)", pct(all.precision), (all.precision ?? 1) >= 0.9]);
      gates.push(["never violations", pct(all.never), (all.never ?? 0) <= 0.01]);
      gates.push(["C4 negation correct", pct(c4.correct), (c4.correct ?? 1) >= 0.9]);
    }
    if (flips !== null) {
      const [devScore, holdScore] = [score(devDone), score(holdDone)];
      gates.push(["flip rate over 3 runs", pct(flips), flips <= 0.05]);
      gates.push(["holdout recall within 0.05 of dev", `${pct(holdScore.recall)} vs ${pct(devScore.recall)}`, (holdScore.recall ?? 1) >= (devScore.recall ?? 1) - 0.05]);
    }
    gates.push(["cost per call within 1.5x the estimate", `$${perCall.toFixed(6)} vs $${estimateUsd}`, perCall <= 1.5 * estimateUsd]);
    gates.push(["error rate (network, 429, 5xx, timeout)", pct(errorRate), errorRate <= 0.02]);
  }
  gates.push(["no circuit breaker", tripped[0] ?? "none", tripped.length === 0]);
  const pass = gates.every(([, , ok]) => ok);

  // The report.
  const stamp = new Date().toISOString();
  const vsL0 = level === "L1";
  const lines = [
    `# ${level} ${phase}, ${stamp}`,
    "",
    `Result: ${pass ? "PASS" : "FAIL"}`,
    `Prompt: ${prompt} · model ${modelOf(env)} · ${live ? "live" : level === "L0" ? "no calls" : "dry run: cassettes, then each entry's gold keys"}`,
    "",
    "| Gate | Value | Pass |",
    "| --- | --- | --- |",
    ...gates.map(([name, value, ok]) => `| ${name} | ${value} | ${ok ? "yes" : "NO"} |`),
    "",
    `Requests ${done.length} of ${selected.length} (dev ${devDone.length}) · paid calls ${meter.calls} · fallbacks ${fallbacks} (${pct(1 - valid)}) · failed attempts ${meter.errors} · spend $${meter.spent.toFixed(5)}${live ? "" : " (simulated)"}, $${perCall.toFixed(6)} a call${flips === null ? "" : ` · flip rate ${pct(flips)}`}`,
    "",
    "Reader against the corpus pins. Precision is a lower bound; language keys are not scored. Orders are the tiered ranker's on the reader's keys, graded against the same ranker on gold keys (NDCG@3, hit@1, MRR).",
    "",
    `| Group | n | Recall | Aspires | Precision | Never | Correct |${vsL0 ? " L0 recall |" : ""} ${rosters.map(([name]) => `NDCG@3 ${name} | hit@1 | MRR |`).join(" ")}`,
    `|${" --- |".repeat((vsL0 ? 8 : 7) + 3 * rosters.length)}`,
    ...groups.map(([name, of]) => {
      const s = score(of);
      const ranked = rosters.map((_, r) => {
        const graded = of.map((d) => orders.get(d)![r]!).filter((o) => o !== null);
        return `${cell(mean(graded.map((o) => o.ndcg)))} | ${cell(mean(graded.map((o) => (o.rr === 1 ? 1 : 0))))} | ${cell(mean(graded.map((o) => o.rr)))} |`;
      });
      return `| ${name} | ${of.length} | ${cell(s.recall)} | ${cell(s.aspires)} | ${cell(s.precision)} | ${cell(s.never)} | ${cell(s.correct)} |${vsL0 ? ` ${cell(lexicon(of).recall)} |` : ""} ${ranked.join(" ")}`;
    }),
    "",
    "| Facet | Reaches heard | Aspires heard | Read | Precision | F1 |",
    "| --- | --- | --- | --- | --- | --- |",
    ...[...all.perFacet].sort(([a], [b]) => a.localeCompare(b)).map(([facet, t]) => {
      const f = facetScore(t);
      return `| ${facet} | ${t.heard}/${t.asked} | ${t.aspiredHeard}/${t.aspired} | ${t.extracted} | ${cell(f.precision)} | ${cell(f.f1)} |`;
    }),
    "",
    "Failures: missed keys, `never` keys read, keys read where nothing was asked, and every fallback.",
    "",
    "| Class | Split | Request | Gold | Read | Code |",
    "| --- | --- | --- | --- | --- | --- |",
    ...done.flatMap(({ entry, reading }) => {
      const wrong = faults(entry, reading.keys);
      if (!fallback(reading) && !wrong.missed.length && !wrong.broke.length && !wrong.stray.length) return [];
      const error = reading.error?.split(":")[0];
      const code = error ? FLAWS[error] ?? error : wrong.broke.length ? (entry.cls === "C4" ? "F5" : "F6") : wrong.stray.length ? "F6" : "F7";
      const never = entry.never?.length ? ` (never ${entry.never.join(", ")})` : "";
      return [`| ${entry.cls} | ${entry.split} | ${entry.text.replace(/\|/g, "/")} | ${gold(entry).join(", ") || "nothing"}${never} | ${reading.keys.join(", ") || "nothing"} | ${code} |`];
    }),
    "",
  ];
  mkdirSync(reports, { recursive: true });
  const report = join(reports, `${level}-${phase}-${stamp.replace(/[:.]/g, "-")}.md`);
  writeFileSync(report, lines.join("\n"));
  return { code: pass ? 0 : 1, message: `${level} ${phase} ${pass ? "PASS" : "FAIL"}${tripped.length ? ` (stopped: ${tripped[0]})` : ""}: ${report}`, report };
}

function passed(dir: string, prefix: string, prompt: string): boolean {
  if (!existsSync(dir)) return false;
  const texts = readdirSync(dir).filter((file) => file.startsWith(prefix)).map((file) => readFileSync(join(dir, file), "utf8"));
  return texts.some((text) => /^Result: PASS$/m.test(text) && text.includes(`Prompt: ${prompt} `));
}
