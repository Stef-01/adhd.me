// How far the live interviewer drifts from its given questions, over the calls on record: the runs
// under qa/voice/runs (scripts/voice-call.mjs) and, with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY,
// the voice_calls table. The text eval (scripts/voice-eval.mjs) simulates the model in text and
// passed 11 of 11 on 2026-09-29 while a live call the same hour added a choice to a question and
// thought aloud once; this reads what was actually said.
//
//   node --env-file=.env.local scripts/voice-drift.mjs [count]
//
// A turn is flagged when it: asks two questions (two question marks); joins questions with "or" /
// "and" outside the given wording; adds a choice or example ("like …", "such as", "for example");
// says what it is about to do ("let me", "one moment", "I'll narrow"); or runs past 15 words.
import { readdirSync, readFileSync } from "node:fs";

const GIVEN = [...readFileSync("src/voice/interviewer.ts", "utf8").matchAll(/"([^"\n]{8,120}\?)"/g)].map((m) => m[1].toLowerCase());
const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
const given = (text) => GIVEN.some((q) => norm(text).includes(q.replace(/[’']/g, "'")));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function flags(text) {
  const t = norm(text);
  const out = [];
  if ((t.match(/\?/g) ?? []).length > 1) out.push("two questions");
  if (/\b(let me|one moment|i'll narrow|i will narrow|bear with me|give me a second)\b/.test(t)) out.push("thinks aloud");
  if (!given(t)) {
    // "like" as a verb ("how would you like") is not an example; ", like their approach" is.
    if (/\?/.test(t) && /(,\s*like\b|\blike (their|a|an|some|your)\b|\bsuch as\b|\bfor example\b|\be\.g\.)/.test(t)) out.push("adds a choice");
    // The given place question is itself "…, or would telehealth suit you?"; a paraphrase of it is not a second question.
    if (/\?/.test(t) && /,\s*or\s+\w+.*\?/.test(t) && !/telehealth/.test(t)) out.push("joins with or");
  }
  if (/\?/.test(t) && words(text) > 15) out.push(`${words(text)} words`);
  return out;
}

async function fromTable(count) {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return [];
  const reply = await fetch(`${url}/rest/v1/voice_calls?select=id,created_at,model,transcript&order=created_at.desc&limit=${count}`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!reply.ok) throw new Error(`voice_calls: ${reply.status}`);
  return (await reply.json()).map((row) => ({ name: `table ${row.created_at.slice(0, 19)}`, model: row.model, turns: row.transcript ?? [] }));
}

const count = Math.min(200, Math.max(1, Number(process.argv[2]) || 50));
const runs = readdirSync("qa/voice/runs").filter((f) => f.endsWith(".json") && !f.startsWith("eval-")).sort().slice(-count).map((f) => {
  const d = JSON.parse(readFileSync(`qa/voice/runs/${f}`, "utf8"));
  return { name: `run ${f.replace(".json", "")}`, model: d.model, turns: d.turns ?? d.transcript ?? [] };
});
const calls = [...runs, ...(await fromTable(count))];
let asked = 0, flagged = 0;
for (const call of calls) {
  const questions = call.turns.filter((t) => t.who === "assistant" && /\?/.test(t.text));
  const bad = questions.map((t) => [t.text, flags(t.text)]).filter(([, f]) => f.length);
  asked += questions.length;
  flagged += bad.length;
  console.log(`${call.name}: ${questions.length} questions, ${bad.length} flagged`);
  for (const [text, f] of bad) console.log(`    ${f.join(", ")}: "${text}"`);
}
console.log(`\n${calls.length} calls · ${asked} questions · ${flagged} flagged (${asked ? Math.round((flagged / asked) * 100) : 0}%) · given questions known: ${GIVEN.length}`);
