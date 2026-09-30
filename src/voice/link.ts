// The voice finder's call, in the browser: the microphone and the assistant's voice over WebRTC,
// the realtime API's events over the "oai-events" data channel, the recorded sentences played here
// (src/voice/clips.ts), and a loudness meter on each side for the orb. The offer goes through
// /api/voice/session, so no key is ever here.
//
// THE TAP STARTS THREE THINGS AT ONCE (O263, 2026-09-30): the microphone, the call, and with them
// the recording of the opening question, which plays as soon as the microphone is open. Measured
// on production the day before, with the three in a row and the model saying the question: the
// microphone at 0.37 s, the offer sent at 0.40 s, the channel open at 2.8 s, the first word at 3.8 s.
//
// `window.__adhdmeVoiceFake` swaps in the scripted call in src/voice/fake-link.ts, which the e2e
// suite, the text budget and screenshot audits use: the whole screen, with no microphone and no
// spend. `true` holds at the first question; an array of answers runs a whole call.
// `window.__adhdmeVoiceLevel` plays a voice to the orb on that call: levels, or a function of time.

import { clip, loadClips } from "./clips";
import type { ClientEvent, Failure, ServerEvent } from "./conversation";
import type { SayId } from "./plan";

export interface VoiceLink {
  /** The realtime model the call runs on, as the route named it. */
  readonly model: string;
  /** One client event over the call's data channel; held until the channel is open. */
  emit(event: ClientEvent): void;
  setMuted(muted: boolean): void;
  /** Loudness now, 0 to 1: the person's microphone and the assistant's voice. */
  level(): { input: number; output: number };
  /** Plays a recorded sentence. Resolves with the share of it that was played: 1 at its end, less when hushed, 0 when there is no recording. */
  say(id: SayId): Promise<number>;
  /** Stops the sentence being played. */
  hush(): void;
  close(): void;
}

export interface LinkHandlers {
  /** The microphone is open: a recorded sentence can be played. */
  onMic(): void;
  /** The call is connected: events can be sent. `missed` when the person spoke before their voice could be carried. */
  onOpen(missed?: boolean): void;
  onEvent(event: ServerEvent): void;
  onFail(failure: Failure): void;
}

type Levels = ReturnType<VoiceLink["level"]>;

declare global {
  interface Window {
    __adhdmeVoiceFake?: boolean | string[];
    __adhdmeVoiceLevel?: Levels | (() => Levels);
  }
}

/** True when the scripted call stands in: the finder opens voice mode even with voice off. */
export function fakeVoice(): boolean {
  return typeof window !== "undefined" && (window.__adhdmeVoiceFake === true || Array.isArray(window.__adhdmeVoiceFake));
}

async function openLink(handlers: LinkHandlers): Promise<VoiceLink> {
  if (fakeVoice()) {
    const script = window.__adhdmeVoiceFake;
    return (await import("./fake-link")).fakeLink(handlers, Array.isArray(script) ? script : []);
  }
  return webrtcLink(handlers);
}

/** Handlers that arrive later: whatever the call says before the screen is there waits for it. */
function relay(): LinkHandlers & { attach(handlers: LinkHandlers): void } {
  let target: LinkHandlers | null = null;
  const waiting: ((handlers: LinkHandlers) => void)[] = [];
  const call = (deliver: (handlers: LinkHandlers) => void) => (target ? deliver(target) : void waiting.push(deliver));
  return {
    onMic: () => call((h) => h.onMic()),
    onOpen: (missed) => call((h) => h.onOpen(missed)),
    onEvent: (event) => call((h) => h.onEvent(event)),
    onFail: (failure) => call((h) => h.onFail(failure)),
    attach(handlers) {
      target = handlers;
      for (const deliver of waiting.splice(0)) deliver(handlers);
    },
  };
}

/** A call started by the tap and not yet claimed by the voice screen; one nobody claims closes. */
let started: { link: Promise<VoiceLink>; attach(handlers: LinkHandlers): void; timer: ReturnType<typeof setTimeout> } | null = null;
const UNCLAIMED_MS = 10_000;

function drop() {
  if (!started) return;
  clearTimeout(started.timer);
  void started.link.then((link) => link.close(), () => undefined);
  started = null;
}

/**
 * Starts a call inside the tap that asked for it, so the microphone, the audio and the network begin
 * while the voice screen arrives (measured 2026-09-28: the screen's own mount and the orb's shader
 * came first, up to a second on a software renderer), and the browser counts the tap as the gesture
 * the audio needs. The screen takes it with `claimLink`.
 */
export function startLink(): void {
  drop();
  void loadClips();
  const handlers = relay();
  const link = openLink(handlers);
  link.catch(() => undefined);
  started = { link, attach: handlers.attach, timer: setTimeout(drop, UNCLAIMED_MS) };
}

/** The call the tap started, or a new one: the screen's handlers get everything it has said. */
export function claimLink(handlers: LinkHandlers): Promise<VoiceLink> {
  if (!started) return openLink(handlers);
  const { link, attach, timer } = started;
  clearTimeout(timer);
  started = null;
  attach(handlers);
  return link;
}

class LinkError extends Error {
  constructor(readonly failure: Failure) {
    super(failure);
  }
}

/** Why a call could not start, for the screen's one line. */
export function failureOf(error: unknown): Failure {
  if (error instanceof LinkError) return error.failure;
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "NotFoundError" || error.name === "SecurityError")) return "mic";
  return "unavailable";
}

/** RMS loudness of a stream, smoothed by the caller; 0 when nothing is flowing. */
function meter(context: AudioContext, stream: MediaStream): () => number {
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  return () => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) sum += ((s - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / samples.length) * 4);
  };
}

/** How long the offer waits for the browser's routes; a network that gathers slowly is not held up by it. */
const GATHER_MS = 700;
/** A voice in the microphone before the call can carry it: this loud, for this long, looked for this often. */
const EARLY_LEVEL = 0.25;
const EARLY_FOR_MS = 250;
const EARLY_EVERY_MS = 50;

/** Resolves when the connection has gathered its routes, or when it has taken too long. */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", changed);
      resolve();
    };
    const changed = () => pc.iceGatheringState === "complete" && done();
    const timer = setTimeout(done, GATHER_MS);
    pc.addEventListener("icegatheringstatechange", changed);
  });
}

/** A loudness meter on a node the sound already passes through. */
function loudness(analyser: AnalyserNode): () => number {
  const samples = new Uint8Array(analyser.fftSize);
  return () => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / samples.length) * 4);
  };
}

function webrtcLink(handlers: LinkHandlers): Promise<VoiceLink> {
  if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") return Promise.reject(new LinkError("unavailable"));
  // Made before anything is awaited, so it is made in the tap and runs from the start.
  const context = new AudioContext();
  void context.resume().catch(() => undefined);
  // The recorded sentences pass through a meter of their own on the way to the speaker.
  const spoken = context.createAnalyser();
  spoken.fftSize = 512;
  spoken.connect(context.destination);
  const recorded = loudness(spoken);
  let playing: { source: AudioBufferSourceNode; from: number; seconds: number; done(share: number): void } | null = null;
  let mic: MediaStream | null = null;
  let input: (() => number) | null = null;
  let output: (() => number) | null = null;
  const voice = new Audio();
  voice.autoplay = true;

  const pc = new RTCPeerConnection();
  // The call is offered before the microphone is open; its track joins when it is.
  const sender = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
  const channel = pc.createDataChannel("oai-events");
  const waiting: ClientEvent[] = [];
  let closed = false;
  let model = "realtime";
  // Words said after the opening sentence and before the call can carry them are lost: the call says so when it opens.
  let carried = false;
  let loudFor = 0;
  let missed = false;
  const watch = setInterval(() => {
    if (closed || carried) return clearInterval(watch);
    const loud = !playing && input !== null && input() > EARLY_LEVEL;
    loudFor = loud ? loudFor + EARLY_EVERY_MS : 0;
    if (loudFor >= EARLY_FOR_MS) missed = true;
  }, EARLY_EVERY_MS);

  const hush = () => {
    const now = playing;
    if (!now) return;
    playing = null;
    now.source.onended = null;
    try {
      now.source.stop();
    } catch {
      // Already at its end.
    }
    now.done(Math.max(0, Math.min(1, (context.currentTime - now.from) / now.seconds)));
  };
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(watch);
    hush();
    channel.close();
    pc.close();
    for (const track of mic?.getTracks() ?? []) track.stop();
    voice.srcObject = null;
    void context.close().catch(() => undefined);
  };
  const fail = (error: unknown) => {
    if (closed) return;
    close();
    handlers.onFail(failureOf(error));
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    voice.srcObject = stream;
    void voice.play().catch(() => undefined);
    output = meter(context, stream);
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") carried = true;
    if (!closed && pc.connectionState === "failed") handlers.onFail("unavailable");
  };
  channel.onopen = () => {
    carried = true;
    for (const event of waiting.splice(0)) channel.send(JSON.stringify(event));
    handlers.onOpen(missed);
  };
  channel.onmessage = (message) => {
    try {
      const event: unknown = JSON.parse(String(message.data));
      if (event && typeof event === "object" && typeof (event as ServerEvent).type === "string") handlers.onEvent(event as ServerEvent);
    } catch {
      // A frame that is not JSON is not an event.
    }
  };

  void navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    .then(async (stream) => {
      if (closed) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      mic = stream;
      input = meter(context, stream);
      const [track] = stream.getAudioTracks();
      if (track) await sender.replaceTrack(track);
      // With the microphone open a browser lets the page speak: the model's voice, if it got here first.
      void voice.play().catch(() => undefined);
      void context.resume().catch(() => undefined);
      handlers.onMic();
    })
    .catch(fail);

  void (async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // The offer goes once, over HTTP, so it carries the routes to this browser with it: sent before they
    // are gathered (measured 2026-09-30: gathered at 0.4 s, sent at 0.25 s) the far end learns them from
    // the first packets, and each layer of the connection waits out a lost first packet (4 to 8 s to open).
    await gathered(pc);
    const reply = await fetch("/api/voice/session", {
      method: "POST",
      headers: { "content-type": "application/sdp" },
      body: pc.localDescription?.sdp ?? offer.sdp,
    });
    if (!reply.ok) throw new LinkError(reply.status === 429 ? "busy" : "unavailable");
    model = reply.headers.get("x-voice-model") ?? "realtime";
    if (!closed) await pc.setRemoteDescription({ type: "answer", sdp: await reply.text() });
  })().catch(fail);

  return Promise.resolve({
    get model() {
      return model;
    },
    emit: (event) => {
      if (closed) return;
      if (channel.readyState === "open") channel.send(JSON.stringify(event));
      else waiting.push(event);
    },
    setMuted: (muted) => {
      for (const track of mic?.getAudioTracks() ?? []) track.enabled = !muted;
    },
    level: () => ({ input: closed || !input ? 0 : input(), output: closed ? 0 : Math.max(output ? output() : 0, playing ? recorded() : 0) }),
    say: (id) => {
      hush();
      const buffer = clip(id);
      if (!buffer || closed) return Promise.resolve(0);
      return new Promise<number>((resolve) => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(spoken);
        const entry = { source, from: context.currentTime, seconds: buffer.duration, done: resolve };
        source.onended = () => {
          if (playing !== entry) return;
          playing = null;
          resolve(1);
        };
        playing = entry;
        source.start();
      });
    },
    hush,
    close,
  });
}
