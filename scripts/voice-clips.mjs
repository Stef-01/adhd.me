// Records every sentence the voice finder says itself (src/voice/plan.ts, SENTENCES) in the voice the
// calls use, once, so a call plays a question the moment it is due: no model in the way, no wait,
// no drift. Each is said by the realtime model with no conversation behind it, checked against its
// text word for word, trimmed of silence and written to public/voice/<id>.mp3, with the list in
// src/voice/clips.json (src/voice/clips.test.ts holds the two to each other).
//
//   node --env-file=.env.local scripts/voice-clips.mjs [id ...]      (about $0.01 for all of them)
//   MODEL=gpt-realtime-2.1 VOICE=marin ...                          another model or voice
//
// Needs ffmpeg. A sentence changed in plan.ts is recorded again by naming it, or by running with none
// named, which records whatever is missing or out of date.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVitest } from "vitest/node";

const v = await createVitest("test", { watch: false });
const load = (p) => v.import(new URL(`../${p}`, import.meta.url).pathname);
const plan = await load("src/voice/plan.ts");
const iv = await load("src/voice/interviewer.ts");
await v.close();

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error("OPENAI_API_KEY is not set: put it in .env.local");
const MODEL = process.env.MODEL || process.env.ADHDME_VOICE_MODEL || iv.DEFAULT_VOICE_MODEL;
const VOICE = process.env.VOICE || process.env.ADHDME_VOICE_NAME || iv.DEFAULT_VOICE;
const RATE = 24000;
const OUT = "public/voice";
const LIST = "src/voice/clips.json";
const TRIES = 5;
/** USD per 1M tokens (the model pages, 2026-09-28): text in and out, audio out. */
const PRICES = { "gpt-realtime-2.1-mini": { ti: 0.6, to: 2.4, ao: 20 }, "gpt-realtime-2.1": { ti: 4, to: 24, ao: 64 } };

const words = (text) => text.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).join(" ");
/** "000" is said "triple zero", and written down either way. */
const sameWords = (heard, sentence) => words(heard).replace(/\b000\b/g, "triple zero") === words(sentence).replace(/\b000\b/g, "triple zero");

function session() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${MODEL}`, { headers: { authorization: `Bearer ${KEY}` } });
    const listeners = new Set();
    ws.onmessage = (m) => { const e = JSON.parse(m.data); for (const l of listeners) l(e); };
    ws.onerror = (e) => reject(new Error(e.message ?? "ws error"));
    ws.onopen = () => resolve({ send: (e) => ws.send(JSON.stringify(e)), on: (l) => { listeners.add(l); return () => listeners.delete(l); }, close: () => ws.close() });
  });
}

/** One sentence said once: its samples, what the model says it said, and what it cost. */
function record(link, sentence) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let heard = "";
    const timer = setTimeout(() => { off(); reject(new Error("no answer in 30 s")); }, 30000);
    const off = link.on((e) => {
      if (e.type === "response.output_audio.delta") chunks.push(Buffer.from(e.delta, "base64"));
      else if (e.type === "response.output_audio_transcript.done") heard = e.transcript ?? "";
      else if (e.type === "error") { clearTimeout(timer); off(); reject(new Error(e.error?.message ?? "error")); }
      else if (e.type === "response.done") {
        clearTimeout(timer);
        off();
        const u = e.response?.usage ?? {};
        const P = PRICES[MODEL] ?? PRICES["gpt-realtime-2.1-mini"];
        const usd = (((u.input_token_details?.text_tokens ?? u.input_tokens ?? 0) * P.ti) + ((u.output_token_details?.text_tokens ?? 0) * P.to) + ((u.output_token_details?.audio_tokens ?? 0) * P.ao)) / 1e6;
        resolve({ pcm: Buffer.concat(chunks), heard, status: e.response?.status, usd });
      }
    });
    link.send({ type: "response.create", response: { conversation: "none", input: [], instructions: iv.sayExactly(sentence), tool_choice: "none", metadata: { purpose: "say" } } });
  });
}

/** The recording heard back by the transcriber the calls use: the model's own account of what it said is not proof. */
async function heardBack(wav) {
  const form = new FormData();
  form.set("model", "gpt-4o-mini-transcribe");
  form.set("language", "en");
  form.set("file", new Blob([wav], { type: "audio/wav" }), "clip.wav");
  const reply = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${KEY}` }, body: form });
  const json = await reply.json();
  if (!reply.ok) throw new Error(json.error?.message ?? `transcription ${reply.status}`);
  return json.text ?? "";
}
/** The same words, however the digits are spaced ("13 11 14", "131114"). */
const sameSounds = (heard, sentence) => words(heard).replace(/\b000\b/g, "triple zero").replace(/\s/g, "") === words(sentence).replace(/\b000\b/g, "triple zero").replace(/\s/g, "");

/** The samples without the silence before and after: a recording starts when it is played. */
function trimmed(pcm) {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const loud = (i) => Math.abs(samples[i]) > 400;
  let from = 0;
  while (from < samples.length && !loud(from)) from++;
  let to = samples.length - 1;
  while (to > from && !loud(to)) to--;
  const lead = Math.round(RATE * 0.02);
  const tail = Math.round(RATE * 0.12);
  const start = Math.max(0, from - lead);
  const end = Math.min(samples.length, to + tail);
  return Buffer.from(samples.slice(start, end).buffer);
}

function wavOf(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const list = existsSync(LIST) ? JSON.parse(readFileSync(LIST, "utf8")) : { model: MODEL, voice: VOICE, clips: {} };
const named = process.argv.slice(2);
const stale = (id) => {
  const sentence = plan.SENTENCES[id];
  const held = list.clips[id];
  return !held || held.text !== sentence.text || (held.spoken ?? "") !== (sentence.spoken ?? "") || !existsSync(join(OUT, `${id}.mp3`));
};
const ids = named.length ? named : plan.SAY_IDS.filter(stale);
for (const id of ids) if (!plan.SENTENCES[id]) throw new Error(`no sentence called ${id}`);
if (!ids.length) {
  console.log("every sentence is recorded as written");
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), "voice-clips-"));
// wavOf is used by the check above and the encoder below.
const link = await session();
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("the session did not start")), 15000);
  const off = link.on((e) => {
    if (e.type !== "session.updated" && e.type !== "error") return;
    clearTimeout(timer);
    off();
    if (e.type === "error") reject(new Error(e.error?.message ?? "error"));
    else resolve();
  });
  link.send({ type: "session.update", session: { type: "realtime", instructions: "You say the sentence you are given, exactly as written.", output_modalities: ["audio"], audio: { output: { voice: VOICE } } } });
});
let total = 0;
for (const id of ids) {
  const sentence = plan.SENTENCES[id];
  const said = sentence.spoken ?? sentence.text;
  let kept = null;
  for (let attempt = 1; attempt <= TRIES && !kept; attempt++) {
    const take = await record(link, said);
    total += take.usd;
    if (take.status !== "completed" || !sameWords(take.heard, said)) {
      console.log(`${id.padEnd(20)} again (${attempt}): said ${JSON.stringify(take.heard)}`);
      continue;
    }
    const back = await heardBack(wavOf(trimmed(take.pcm)));
    if (!sameSounds(back, said)) {
      console.log(`${id.padEnd(20)} again (${attempt}): heard back as ${JSON.stringify(back)}`);
      continue;
    }
    kept = take;
  }
  if (!kept) throw new Error(`${id}: the model did not say the sentence as written in ${TRIES} tries`);
  const pcm = trimmed(kept.pcm);
  const wav = join(dir, `${id}.wav`);
  writeFileSync(wav, wavOf(pcm));
  const file = join(OUT, `${id}.mp3`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "64k", "-ar", String(RATE), "-ac", "1", file]);
  const bytes = readFileSync(file);
  list.clips[id] = {
    text: sentence.text,
    ...(sentence.spoken ? { spoken: sentence.spoken } : {}),
    seconds: Number((pcm.length / 2 / RATE).toFixed(2)),
    bytes: bytes.length,
    sha: createHash("sha256").update(bytes).digest("hex").slice(0, 12),
  };
  console.log(`${id.padEnd(20)} ${list.clips[id].seconds.toFixed(2)} s · ${(bytes.length / 1024).toFixed(1)} KB · ${JSON.stringify(kept.heard)}`);
}
link.close();
list.model = MODEL;
list.voice = VOICE;
// In the order the sentences are written, whatever order they were recorded in.
list.clips = Object.fromEntries(plan.SAY_IDS.filter((id) => list.clips[id]).map((id) => [id, list.clips[id]]));
writeFileSync(LIST, `${JSON.stringify(list, null, 2)}\n`);
mkdirSync("qa/voice", { recursive: true });
appendFileSync("qa/voice/ledger.jsonl", `${JSON.stringify({ time: new Date().toISOString(), kind: "clips", model: MODEL, voice: VOICE, recorded: ids.length, costUsd: Number(total.toFixed(4)) })}\n`);
console.log(`${ids.length} recorded in ${VOICE} on ${MODEL} · $${total.toFixed(4)} · ${LIST}`);
