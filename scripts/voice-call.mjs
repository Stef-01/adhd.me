// A live spoken voice-finder call against a running server with ADHDME_VOICE=1: Chromium's
// microphone is a WAV of a person answering, built from text by macOS `say` (one line per answer,
// each after a pause long enough for the next question), the call is real WebRTC to OpenAI through
// /api/voice/session, and nothing is typed. Prints what the model heard and asked, the request, the
// latencies and the cost, and appends the cost to qa/voice/ledger.jsonl. About $0.02 a call.
//
//   BASE=http://localhost:3021 node scripts/voice-call.mjs "I think I might have ADHD." "It's for me." "[pause 25]" ...
//   CONNECT_ONLY=1 ...   stops at the first spoken word and prints each step's time from the tap
//   NO_WEBGL=1 ...       the orb's still disc, so a software renderer does not skew the timings
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3021";
// The founder's testing budget (src/lib/matching/eval/run.ts, TESTING_BUDGET_USD) covers every live
// test: a call costs about $0.02, and none starts once $14 less that is spent.
const spentSoFar = ["qa/matching/ledger.jsonl", "qa/voice/ledger.jsonl"]
  .flatMap((f) => { try { return readFileSync(f, "utf8").split("\n").filter(Boolean); } catch { return []; } })
  .reduce((sum, line) => sum + (JSON.parse(line).costUsd ?? 0), 0);
if (spentSoFar + 0.05 > 14) {
  console.log(`refused: testing has spent $${spentSoFar.toFixed(2)} of $14`);
  process.exit(2);
}
const RATE = 24000;
const lines = process.argv.slice(2).length ? process.argv.slice(2) : [
  "I think I might have ADHD, and I'd like to get assessed.",
  "It's for me. I'm thirty four.",
  "I live in Hornsby, but telehealth is fine too.",
  "Yes, cost matters. Bulk billing would really help.",
  "I'd like a woman, if possible.",
  "Please don't rush me. I've been brushed off before.",
  "I have anxiety as well.",
  "No, that's everything.",
];

/** 16-bit mono PCM samples of `say` speaking one line. */
function spoken(text, dir, i) {
  const file = join(dir, `line${i}.wav`);
  execFileSync("say", ["-v", "Karen", "-o", file, "--file-format=WAVE", `--data-format=LEI16@${RATE}`, text]);
  const wav = readFileSync(file);
  const data = wav.indexOf("data");
  return wav.subarray(data + 8, data + 8 + wav.readUInt32LE(data + 4));
}
function wavOf(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
const silence = (seconds) => Buffer.alloc(Math.round(RATE * seconds) * 2);
const dir = mkdtempSync(join(tmpdir(), "voice-call-"));
const wav = join(dir, "person.wav");
// A line "[pause 25]" is 25 seconds of saying nothing, to meet the quiet check.
const pcm = [silence(4)];
lines.forEach((line, i) => {
  const pause = /^\[pause (\d+)\]$/.exec(line);
  pcm.push(...(pause ? [silence(Number(pause[1]))] : [spoken(line, dir, i), silence(13)]));
});
writeFileSync(wav, wavOf(Buffer.concat([...pcm, silence(30)])));

const browser = await chromium.launch({
  args: [
    "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required",
    ...(process.env.NO_WEBGL ? ["--disable-webgl", "--disable-webgl2"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
  ],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
await context.addInitScript(() => {
  try { localStorage.setItem("adhdme-privacy-ack", "1"); } catch {}
  window.__events = [];
  window.__marks = {};
  document.addEventListener("click", () => { window.__marks.tap ??= Date.now(); }, true);
  const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (...a) => { window.__marks.micAsked ??= Date.now(); const s = await gum(...a); window.__marks.micGiven ??= Date.now(); return s; };
  const f = window.fetch.bind(window);
  window.fetch = async (url, init) => {
    const voice = String(url).includes("/api/voice/session");
    const read = String(url).includes("/api/finder/read");
    if (voice) window.__marks.offerSent = Date.now();
    if (read) window.__marks.readStart ??= Date.now();
    const r = await f(url, init);
    if (voice) window.__marks.answerBack = Date.now();
    if (read) r.clone().text().then(() => { window.__marks.readDone ??= Date.now(); });
    return r;
  };
  // The document does not exist yet when this runs: watch the stage once it does.
  document.addEventListener("DOMContentLoaded", () => {
    new MutationObserver(() => {
      if (document.querySelector("main")?.dataset.stage === "results") window.__marks.results ??= Date.now();
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["data-stage"] });
  });
  const make = RTCPeerConnection.prototype.createDataChannel;
  RTCPeerConnection.prototype.createDataChannel = function (...a) {
    const channel = make.apply(this, a);
    channel.addEventListener("open", () => { window.__marks.channelOpen = Date.now(); });
    channel.addEventListener("message", (m) => { try { const e = JSON.parse(m.data); window.__events.push({ t: Date.now(), ...e, delta: e.type?.endsWith("audio.delta") ? undefined : e.delta }); } catch {} });
    return channel;
  };
});
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error" && !/_vercel|404/.test(m.text())) console.log("  console:", m.text().slice(0, 160)); });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const t0 = Date.now();
await page.getByRole("button", { name: "Talk instead of typing" }).click();
await page.locator(".voice-orb").waitFor();
const timings = async () => {
  const marks = await page.evaluate(() => window.__marks);
  const ev = await page.evaluate(() => window.__events);
  const at = (type) => ev.find((e) => e.type === type)?.t;
  const tap = marks.tap ?? t0;
  const steps = { ...marks, sessionCreated: at("session.created"), firstWord: at("response.output_audio_transcript.delta") };
  return Object.entries(steps).filter(([k, v]) => k !== "tap" && v).map(([k, v]) => `${k} ${v - tap} ms`).join(" · ");
};
if (process.env.CONNECT_ONLY) {
  await page.waitForFunction(() => window.__events.some((e) => e.type === "response.output_audio_transcript.delta"), null, { timeout: 30_000 });
  console.log("from the tap:", await timings());
  await browser.close();
  process.exit(0);
}
await page.locator("main[data-stage='results']").waitFor({ timeout: 300_000 }).catch(() => undefined);
const stage = await page.locator("main").getAttribute("data-stage");
const ev = await page.evaluate(() => window.__events);
const request = await page.evaluate(() => { try { return JSON.parse(sessionStorage.getItem("adhdme.finder.v2") ?? "{}").request ?? "(none)"; } catch { return "(none)"; } });
console.log("from the tap:", await timings());
for (const e of ev) {
  if (e.type === "response.output_audio_transcript.done") console.log(`  assistant  ${e.transcript}`);
  if (e.type === "conversation.item.input_audio_transcription.completed") console.log(`  heard      ${e.transcript}`);
  if (e.type === "response.done") for (const o of e.response?.output ?? []) if (o.type === "function_call") console.log(`  tool       ${o.name} ${o.arguments}`);
  if (e.type === "error") console.log(`  error      ${e.error?.message}`);
}
const stops = ev.filter((e) => e.type === "input_audio_buffer.speech_stopped").map((e) => e.t);
const lat = stops.map((s) => { const d = ev.find((e) => e.t > s && e.type === "response.output_audio_transcript.delta"); return d ? d.t - s : null; }).filter((x) => x !== null);
console.log(`stage ${stage} · request: ${request}`);
console.log(`reply after speech stops: ${lat.map((m) => (m / 1000).toFixed(1)).join("/")} s`);
// gpt-realtime-2.1-mini, USD per 1M tokens.
const P = { ti: 0.6, tc: 0.06, ai: 10, ac: 0.3, to: 2.4, ao: 20 };
let usd = 0;
const tokens = { text_in: 0, audio_in: 0, cached: 0, text_out: 0, audio_out: 0 };
for (const e of ev.filter((e) => e.type === "response.done")) {
  const u = e.response?.usage; if (!u) continue;
  const d = u.input_token_details ?? {}; const c = d.cached_tokens_details ?? {}; const o = u.output_token_details ?? {};
  usd += (((d.text_tokens ?? 0) - (c.text_tokens ?? 0)) * P.ti + (c.text_tokens ?? 0) * P.tc + ((d.audio_tokens ?? 0) - (c.audio_tokens ?? 0)) * P.ai + (c.audio_tokens ?? 0) * P.ac + (o.text_tokens ?? 0) * P.to + (o.audio_tokens ?? 0) * P.ao) / 1e6;
  tokens.text_in += d.text_tokens ?? 0; tokens.audio_in += d.audio_tokens ?? 0; tokens.cached += d.cached_tokens ?? 0; tokens.text_out += o.text_tokens ?? 0; tokens.audio_out += o.audio_tokens ?? 0;
}
const seconds = Math.round((Date.now() - t0) / 1000);
const transcribe = (seconds / 60) * 0.003;
console.log(`call ${seconds} s · tokens ${JSON.stringify(tokens)} · $${usd.toFixed(4)} + about $${transcribe.toFixed(4)} transcription`);
appendFileSync("qa/voice/ledger.jsonl", `${JSON.stringify({ time: new Date().toISOString(), kind: "spoken", lines: lines.length, seconds, tokens, costUsd: Number((usd + transcribe).toFixed(6)), stage })}\n`);
await browser.close();
