// One matching eval: every corpus request read by the reader, scored against the pins, ranked on
// the roster, and written as one report in qa/matching/reports/. `pnpm match:eval` runs it dry
// (cassettes, then each entry's own pins) and `--live` reads with the model, under the testing
// budget. There is no ladder: one run, one report, four gates.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clinicians, rankClinicians, type Clinician } from "@/demo/clinicians";
import { FileCache } from "@/lib/llm/cache";
import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { keyProblem, modelOf, type Deps } from "@/lib/llm/client";
import { appendLedger, BudgetMeter, ledgerSpend, RateGate } from "@/lib/llm/meter";
import { answerFor, lexiconReading, READ_CALL, readRequest, TAGS, type Reading } from "../llm-read";
import { faults, ndcgAt, reciprocalRank, scoreReader } from "./metrics";
import { CLASSES, evalEntries, oracleGains, type EvalEntry } from "./sets";

/**
 * All live testing against OpenAI together (founder, 2026-09-28: "set testing budget $14 total"): the
 * matching ledger and the voice finder's (scripts/voice-eval.mjs, scripts/voice-call.mjs) count
 * against one cap, and each runner refuses to start a run that could cross it.
 */
export const TESTING_BUDGET_USD = 14;
/** One run's own cap: the whole corpus at gpt-5-mini is about $0.15. */
const RUN_CAP_USD = 1;

/** Everything live testing has spent so far: the matching ledger and the voice one. */
export function testingSpend(root = "."): number {
  return ledgerSpend(join(root, "qa/matching/ledger.jsonl")) + ledgerSpend(join(root, "qa/voice/ledger.jsonl"));
}
const TODAY = new Date("2026-09-27T00:00:00Z");

export type EvalOptions = {
  live?: boolean;
  /** At most this many requests per class, for a quick live look. */
  sample?: number;
  env?: Record<string, string | undefined>;
  fetch?: Deps["fetch"];
  root?: string; // where qa/ and .cache/ live
  /** Rosters to rank on, by name. The script adds syntheticRoster(50), which no src/ module may import. */
  rosters?: Record<string, readonly Clinician[]>;
};
export type Outcome = { code: 0 | 1 | 2; message: string; report?: string };
type Done = { entry: EvalEntry; reading: Reading };

/** The pins the reader is scored on: care and preferences. Manner traits are read by nobody now, and the corpus cannot pin a language. */
export const scored = (key: string) => TAGS.includes(key) && !key.startsWith("language:");
const gold = (e: EvalEntry) => [...(e.reaches ?? []), ...(e.aspires ?? [])].filter(scored);
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
const cell = (value: number | null) => (value === null ? "–" : value.toFixed(3));
const pct = (value: number | null) => (value === null ? "–" : `${(value * 100).toFixed(1)}%`);
const same = (a: readonly string[], b: readonly string[]) => [...a].sort().join() === [...b].sort().join();

/** What a report is about: the model and everything sent with a request. */
export function promptHash(env: Record<string, string | undefined> = process.env): string {
  return createHash("sha256").update(JSON.stringify([modelOf(env), READ_CALL])).digest("hex").slice(0, 12);
}

export async function runEval(options: EvalOptions = {}): Promise<Outcome> {
  const { live = false, env = process.env, root = "." } = options;
  const reports = join(root, "qa/matching/reports");
  const ledger = join(root, "qa/matching/ledger.jsonl");
  const prompt = promptHash(env);
  const spentBefore = testingSpend(root);
  if (live && spentBefore >= TESTING_BUDGET_USD) return { code: 2, message: `refused: the ledgers hold $${spentBefore.toFixed(2)}, at the $${TESTING_BUDGET_USD} testing budget` };
  // A refused key is found for free, before a paid call or a report: the rotation case.
  const problem = live ? await keyProblem(env, options.fetch) : null;
  if (problem) return { code: 2, message: `refused: ${problem}` };

  const entries = evalEntries();
  const selected = options.sample ? CLASSES.flatMap((cls) => entries.filter((e) => e.cls === cls).slice(0, options.sample)) : entries;
  const byText = new Map(entries.map((e) => [e.text, e]));
  /** The dry run's answer for an entry: its own pins, each quoting the whole request. */
  const sent = (text: string) => answerFor(gold(byText.get(text)!), text);
  const meter = new BudgetMeter(Math.min(RUN_CAP_USD, TESTING_BUDGET_USD - spentBefore), (costUsd, usage, model) => {
    if (live) appendLedger(ledger, { level: "L1", phase: "eval", model, usage, costUsd });
  });
  const deps: Deps = live
    ? { fetch: options.fetch, env, meter, cache: new FileCache(join(root, ".cache/llm")), tier: "flex", waitForAll: true } // nobody is waiting: half price, every failure counted
    : { fetch: cassetteFetch(CASSETTES, (input) => completed(sent(input))), env: { ...env, OPENAI_API_KEY: "dry" }, meter, waitForAll: true };
  const gate = new RateGate(live ? 4 : 8, live ? 200 : Infinity);
  let [failures, stopped] = [0, ""];
  const read = async (entry: EvalEntry): Promise<Done | null> => {
    if (stopped) return null;
    const reading = await gate.run(() => readRequest(entry.text, deps));
    failures = reading.source === "llm" ? 0 : failures + 1;
    if (failures === 3) stopped = "3 failed calls in a row";
    if (reading.error?.startsWith("BudgetError")) stopped = "the spend cap refused a call";
    return { entry, reading };
  };
  const done = (await Promise.all(selected.map(read))).filter((d) => d !== null);

  // Scores against the pins, per class and per split; orders against the ranker on the pins.
  const keysOf = new Map(done.map((d) => [d.entry.text, d.reading.keys.filter(scored)]));
  const score = (of: Done[]) => scoreReader(of.map((d) => d.entry), (text) => keysOf.get(text)!, scored);
  const lexicon = (of: Done[]) => scoreReader(of.map((d) => d.entry), (text) => lexiconReading(text).keys, scored);
  const rosters = Object.entries(options.rosters ?? { real: clinicians });
  const grade = ({ entry, reading }: Done, roster: readonly Clinician[]) => {
    const gains = oracleGains([...gold(entry), ...lexiconReading(entry.text).keys.filter((k) => k.startsWith("language:"))], roster);
    const order = rankClinicians(entry.text, roster, TODAY, reading.needs).map((c) => c.id);
    const ndcg = ndcgAt(3, order, gains);
    return ndcg === null ? null : { ndcg, rr: reciprocalRank(order, gains) };
  };
  const orders = new Map(done.map((d) => [d, rosters.map(([, roster]) => grade(d, roster))]));
  const groups: [string, Done[]][] = [
    ...CLASSES.map((cls): [string, Done[]] => [cls, done.filter((d) => d.entry.cls === cls)]),
    ["dev", done.filter((d) => d.entry.split === "dev")],
    ["holdout", done.filter((d) => d.entry.split === "holdout")],
    ["all", done],
  ];
  const all = score(done);
  const fallbacks = done.filter((d) => d.reading.source === "lexicon").length;
  const dropped = done.reduce((sum, d) => sum + d.reading.dropped, 0);
  const perCall = meter.calls ? meter.spent / meter.calls : 0;

  // The gates. The dry run proves the plumbing: every answer reads back as sent.
  const off = live ? [] : done.filter((d) => { const want = CASSETTES.find((c) => c.input === d.entry.text); return want ? d.reading.source !== want.expect.source || !same(d.reading.keys, want.expect.keys) : !same(keysOf.get(d.entry.text)!, gold(d.entry)); });
  const gates: [string, string, boolean][] = live
    ? [
        // Five never pins of about 110 describe a state (G7: "flat for months") and the model reads them one run in two; the rest hold.
        ["never violations", pct(all.never), (all.never ?? 0) <= 0.05],
        ["precision (lower bound)", pct(all.precision), (all.precision ?? 1) >= 0.85],
        ["recall on reaches", pct(all.recall), (all.recall ?? 1) >= 0.85],
        ["aspires reached", pct(all.aspires), (all.aspires ?? 1) >= 0.5],
        ["fallbacks to the lexicon", `${fallbacks}`, fallbacks / Math.max(1, done.length) <= 0.005],
      ]
    : [["every answer reads back as sent", `${off.length} differ`, off.length === 0]];
  gates.push(["no circuit breaker", stopped || "none", !stopped]);
  const pass = gates.every(([, , ok]) => ok);

  // The report.
  const stamp = new Date().toISOString();
  const lines = [
    `# Reader eval, ${stamp}`,
    "",
    `Result: ${pass ? "PASS" : "FAIL"}`,
    `Prompt: ${prompt} · model ${modelOf(env)} · ${live ? "live, flex tier" : "dry run: cassettes, then each entry's own pins"}`,
    "",
    "| Gate | Value | Pass |",
    "| --- | --- | --- |",
    ...gates.map(([name, value, ok]) => `| ${name} | ${value} | ${ok ? "yes" : "NO"} |`),
    "",
    `Requests ${done.length} of ${selected.length} · calls ${meter.calls} · fallbacks ${fallbacks} · ungrounded tags dropped ${dropped} · failed attempts ${meter.errors} · spend $${meter.spent.toFixed(5)}${live ? "" : " (simulated)"}, $${perCall.toFixed(6)} a call`,
    "",
    "Reader against the corpus pins for care and preferences. Precision is a lower bound; language and manner keys are not scored. Orders are the ranker's on the reader's needs, graded against the same ranker on the pins (NDCG@3, hit@1, MRR).",
    "",
    `| Group | n | Recall | Aspires | Precision | Never | Correct | Lexicon recall | ${rosters.map(([name]) => `NDCG@3 ${name} | hit@1 | MRR |`).join(" ")}`,
    `|${" --- |".repeat(8 + 3 * rosters.length)}`,
    ...groups.map(([name, of]) => {
      const s = score(of);
      const ranked = rosters.map((_, r) => {
        const graded = of.map((d) => orders.get(d)![r]!).filter((o) => o !== null);
        return `${cell(mean(graded.map((o) => o.ndcg)))} | ${cell(mean(graded.map((o) => (o.rr === 1 ? 1 : 0))))} | ${cell(mean(graded.map((o) => o.rr)))} |`;
      });
      return `| ${name} | ${of.length} | ${cell(s.recall)} | ${cell(s.aspires)} | ${cell(s.precision)} | ${cell(s.never)} | ${cell(s.correct)} | ${cell(lexicon(of).recall)} | ${ranked.join(" ")}`;
    }),
    "",
    "| Tag | Reaches heard | Aspires heard | Read | Precision |",
    "| --- | --- | --- | --- | --- |",
    ...[...all.perFacet].sort(([a], [b]) => a.localeCompare(b)).map(([facet, t]) => `| ${facet} | ${t.heard}/${t.asked} | ${t.aspiredHeard}/${t.aspired} | ${t.extracted} | ${cell(t.extracted ? t.right / t.extracted : null)} |`),
    "",
    "Failures: missed keys, `never` keys read, keys read where nothing was asked, keys read beside the pins (extra: wrong, or a pin the corpus lacks), and every fallback, with the words each read quoted.",
    "",
    "| Class | Split | Request | Gold | Read | Fault |",
    "| --- | --- | --- | --- | --- | --- |",
    ...done.flatMap(({ entry, reading }) => {
      const keys = keysOf.get(entry.text)!;
      const wrong = faults(entry, keys, scored);
      const fell = reading.source === "lexicon";
      if (!fell && !wrong.missed.length && !wrong.broke.length && !wrong.stray.length && !wrong.extra.length) return [];
      const fault = fell ? `fallback: ${reading.error?.split(":")[0]}` : wrong.broke.length ? `never: ${wrong.broke.join(", ")}` : wrong.stray.length ? "stray" : wrong.missed.length ? "missed" : `extra: ${wrong.extra.join(", ")}`;
      const quoted = reading.needs.filter((n) => scored(reading.keys[reading.needs.indexOf(n)]!)).map((n) => `${reading.keys[reading.needs.indexOf(n)]} “${n.matched}”`).join(", ");
      return [`| ${entry.cls} | ${entry.split} | ${entry.text.replace(/\|/g, "/")} | ${gold(entry).join(", ") || "nothing"} | ${quoted || "nothing"} | ${fault} |`];
    }),
    "",
    "Asks no tag covers: the reads' `unlisted` phrases, a needs-gap list that never reaches a person.",
    "",
    "| Class | Request | Unlisted |",
    "| --- | --- | --- |",
    ...done.filter((d) => d.reading.unlisted?.length).map(({ entry, reading }) => `| ${entry.cls} | ${entry.text.slice(0, 90).replace(/\|/g, "/")} | ${reading.unlisted!.join("; ").replace(/\|/g, "/")} |`),
    "",
  ];
  mkdirSync(reports, { recursive: true });
  const report = join(reports, `reader-${live ? "live" : "dry"}-${stamp.replace(/[:.]/g, "-")}.md`);
  writeFileSync(report, lines.join("\n"));
  return { code: pass ? 0 : 1, message: `reader eval ${pass ? "PASS" : "FAIL"}${stopped ? ` (stopped: ${stopped})` : ""}: ${report}`, report };
}
