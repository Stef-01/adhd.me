// A live spoken voice-finder call against a running server with ADHDME_VOICE=1: Chromium's
// microphone is a WAV of a person answering, built from text by macOS `say` (one line per answer,
// each after a pause long enough for the next question), the call is real WebRTC to OpenAI through
// /api/voice/session, and nothing is typed. Prints what the model heard and asked, the request, the
// latencies and the cost, and appends the cost to qa/voice/ledger.jsonl. About $0.02 a call.
//
//   BASE=http://localhost:3021 node scripts/voice-call.mjs "I think I might have ADHD." "It's for me." "[pause 25]" ...
//   CONNECT_ONLY=1 ...   stops once the first sentence has been heard and the call has connected, and prints each step's time from the tap
//   NO_WEBGL=1 ...       the orb's still disc, so a software renderer does not skew the timings
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
// LEAD is how long the person waits before their first word, from the moment the microphone opens (default 4 s).
const pcm = [silence(Number(process.env.LEAD) || 4)];
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
  window.__sounds = [];
  window.__calls = [];
  // A recorded sentence is played through an AudioBufferSourceNode: its start is the first sound a person hears.
  const startSound = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    window.__marks.firstSound ??= Date.now();
    window.__sounds.push({ t: Date.now(), seconds: this.buffer?.duration ?? 0 });
    return startSound.apply(this, a);
  };
  document.addEventListener("click", () => { window.__marks.tap ??= Date.now(); }, true);
  const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (...a) => { window.__marks.micAsked ??= Date.now(); const s = await gum(...a); window.__marks.micGiven ??= Date.now(); return s; };
  // The call as the journal is sent it (a beacon), turn by turn: the last one is the whole call.
  const beacon = navigator.sendBeacon?.bind(navigator);
  if (beacon) navigator.sendBeacon = (url, data) => {
    if (String(url).includes("/api/finder/track") && data instanceof Blob) void data.text().then((body) => { try { const sent = JSON.parse(body); if (sent.type === "voice") window.__calls.push(sent.record); } catch {} });
    return beacon(url, data);
  };
  const f = window.fetch.bind(window);
  window.fetch = async (url, init) => {
    const voice = String(url).includes("/api/voice/session");
    const read = String(url).includes("/api/finder/read");
    // The call as the journal is sent it, turn by turn: the last one is the whole call.
    if (String(url).includes("/api/finder/track")) try { const sent = JSON.parse(String(init?.body ?? "{}")); if (sent.type === "voice") window.__calls.push(sent.record); } catch {}
    if (voice) window.__marks.offerSent = Date.now();
    if (read) window.__marks.readStart ??= Date.now();
    const r = await f(url, init);
    if (voice) window.__marks.answerBack = Date.now();
    if (read) r.clone().json().then((answer) => {
      window.__marks.readDone ??= Date.now();
      try { window.__reads = [...(window.__reads ?? []), { text: JSON.parse(String(init?.body ?? "{}")).text, answer }]; } catch {}
    }).catch(() => {});
    return r;
  };
  // The document does not exist yet when this runs: watch the stage once it does.
  document.addEventListener("DOMContentLoaded", () => {
    new MutationObserver(() => {
      if (document.querySelector("main")?.dataset.stage === "results") window.__marks.results ??= Date.now();
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["data-stage"] });
  });
  // The connection's own steps: candidates gathered, a route found, the secure channel up.
  const Peer = window.RTCPeerConnection;
  window.RTCPeerConnection = function (...a) {
    const pc = new Peer(...a);
    pc.addEventListener("icegatheringstatechange", () => { window.__marks[`gathering-${pc.iceGatheringState}`] ??= Date.now(); });
    pc.addEventListener("iceconnectionstatechange", () => { window.__marks[`ice-${pc.iceConnectionState}`] ??= Date.now(); });
    pc.addEventListener("connectionstatechange", () => { window.__marks[`peer-${pc.connectionState}`] ??= Date.now(); });
    pc.addEventListener("icecandidate", (e) => { if (e.candidate) window.__marks.firstCandidate ??= Date.now(); });
    return pc;
  };
  window.RTCPeerConnection.prototype = Peer.prototype;
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
  const steps = { ...marks, sessionCreated: at("session.created"), firstModelWord: at("response.output_audio_transcript.delta") };
  return Object.entries(steps).filter(([k, v]) => k !== "tap" && v).map(([k, v]) => `${k} ${v - tap} ms`).join(" · ");
};
if (process.env.CONNECT_ONLY) {
  await page.waitForFunction(() => (window.__marks.firstSound || window.__events.some((e) => e.type === "response.output_audio_transcript.delta")) && window.__marks.channelOpen, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  console.log("from the tap:", await timings());
  await browser.close();
  process.exit(0);
}
await page.locator("main[data-stage='results']").waitFor({ timeout: 300_000 }).catch(() => undefined);
const stage = await page.locator("main").getAttribute("data-stage");
const ev = await page.evaluate(() => window.__events);
const request = await page.evaluate(() => { try { return JSON.parse(sessionStorage.getItem("adhdme.finder.v2") ?? "{}").request ?? "(none)"; } catch { return "(none)"; } });
console.log("from the tap:", await timings());
const record = (await page.evaluate(() => window.__calls ?? [])).at(-1);
for (const turn of record?.turns ?? []) console.log(`  ${turn.who.padEnd(10)} ${turn.text}`);
for (const e of ev) if (e.type === "error") console.log(`  error      ${e.error?.message}`);
// From the end of the person's speech to the next sound: a recording played, or the model's first word.
const sounds = [...(await page.evaluate(() => window.__sounds ?? [])).map((sound) => sound.t), ...ev.filter((e) => e.type === "response.output_audio_transcript.delta").map((e) => e.t)].sort((a, b) => a - b);
const stops = ev.filter((e) => e.type === "input_audio_buffer.speech_stopped").map((e) => e.t);
const lat = stops.map((s) => { const d = sounds.find((t) => t > s); return d ? d - s : null; }).filter((x) => x !== null);
console.log(`stage ${stage} · request: ${request}`);
// What the finder made of it: the read route's answer, the chips, the first five, and the first's reasons.
await page.locator(".reading-line").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
await page.waitForTimeout(800);
const reads = await page.evaluate(() => window.__reads ?? []);
const heardChips = await page.getByRole("group", { name: "What we heard" }).getByRole("button").allTextContents().catch(() => []);
const rows = await page.locator(".clinician-row").evaluateAll((els) => els.slice(0, 5).map((el) => el.innerText.replace(/\s+/g, " ").slice(0, 140)));
let whyMatched = "";
if (stage === "results" && rows.length) {
  await page.locator(".clinician-row").first().click().catch(() => undefined);
  const why = page.locator("details.profile-disclosure", { hasText: "Why matched" });
  await why.locator("summary").click().catch(() => undefined);
  whyMatched = (await why.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
}
for (const r of reads) console.log(`read       ${JSON.stringify(r.text)} -> ${JSON.stringify(r.answer)}`);
console.log(`heard      ${heardChips.join(" | ")}`);
rows.forEach((row, i) => console.log(`  ${i + 1}.       ${row}`));
console.log(`why        ${whyMatched}`);
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
// The whole call, for going back to it: every turn both ways, the request, the read and the results.
const turns = record?.turns ?? [];
mkdirSync("qa/voice/runs", { recursive: true });
writeFileSync(`qa/voice/runs/${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify({ base: BASE, lines, turns, request, reads, heard: heardChips, results: rows, whyMatched, stage }, null, 2));
appendFileSync("qa/voice/ledger.jsonl", `${JSON.stringify({ time: new Date().toISOString(), kind: "spoken", lines: lines.length, seconds, tokens, costUsd: Number((usd + transcribe).toFixed(6)), stage })}\n`);
await browser.close();
