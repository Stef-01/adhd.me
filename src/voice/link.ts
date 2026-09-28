// The voice finder's call, in the browser: the microphone and the assistant's voice over WebRTC,
// the realtime API's events over the "oai-events" data channel, and a loudness meter on each side
// for the orb. The offer goes through /api/voice/session, so no key is ever here.
//
// `window.__adhdmeVoiceFake` swaps in the scripted call in src/voice/fake-link.ts, which the e2e
// suite, the text budget and screenshot audits use: the whole screen, with no microphone and no
// spend. `true` holds at the first question; an array of answers runs a whole call.

import type { ClientEvent, Failure, ServerEvent } from "./conversation";

export interface VoiceLink {
  /** The realtime model the call runs on, as the route named it. */
  readonly model: string;
  /** One client event over the call's data channel. */
  emit(event: ClientEvent): void;
  setMuted(muted: boolean): void;
  /** Loudness now, 0 to 1: the person's microphone and the assistant's voice. */
  level(): { input: number; output: number };
  close(): void;
}

export interface LinkHandlers {
  onOpen(): void;
  onEvent(event: ServerEvent): void;
  onFail(failure: Failure): void;
}

declare global {
  interface Window {
    __adhdmeVoiceFake?: boolean | string[];
  }
}

/** True when the scripted call stands in: the finder opens voice mode even with voice off. */
export function fakeVoice(): boolean {
  return typeof window !== "undefined" && (window.__adhdmeVoiceFake === true || Array.isArray(window.__adhdmeVoiceFake));
}

export async function openLink(handlers: LinkHandlers): Promise<VoiceLink> {
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
    onOpen: () => call((h) => h.onOpen()),
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

async function webrtcLink(handlers: LinkHandlers): Promise<VoiceLink> {
  if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") throw new LinkError("unavailable");
  // Made before the first await, so it is made in the tap and runs from the start.
  const context = new AudioContext();
  void context.resume().catch(() => undefined);
  const mic = await navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    .catch((error: unknown) => {
      void context.close().catch(() => undefined);
      throw error;
    });
  const input = meter(context, mic);
  let output: (() => number) | null = null;
  const voice = new Audio();
  voice.autoplay = true;

  const pc = new RTCPeerConnection();
  let closed = false;
  let model = "realtime";
  const close = () => {
    if (closed) return;
    closed = true;
    channel.close();
    pc.close();
    for (const track of mic.getTracks()) track.stop();
    voice.srcObject = null;
    void context.close().catch(() => undefined);
  };
  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    voice.srcObject = stream;
    void voice.play().catch(() => undefined);
    output = meter(context, stream);
  };
  pc.onconnectionstatechange = () => {
    if (!closed && pc.connectionState === "failed") handlers.onFail("unavailable");
  };
  for (const track of mic.getAudioTracks()) pc.addTrack(track, mic);
  const channel = pc.createDataChannel("oai-events");
  channel.onopen = () => handlers.onOpen();
  channel.onmessage = (message) => {
    try {
      const event: unknown = JSON.parse(String(message.data));
      if (event && typeof event === "object" && typeof (event as ServerEvent).type === "string") handlers.onEvent(event as ServerEvent);
    } catch {
      // A frame that is not JSON is not an event.
    }
  };

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const reply = await fetch("/api/voice/session", {
      method: "POST",
      headers: { "content-type": "application/sdp" },
      body: offer.sdp,
    });
    if (!reply.ok) throw new LinkError(reply.status === 429 ? "busy" : "unavailable");
    model = reply.headers.get("x-voice-model") ?? "realtime";
    await pc.setRemoteDescription({ type: "answer", sdp: await reply.text() });
  } catch (error) {
    close();
    throw error;
  }

  return {
    model,
    emit: (event) => {
      if (channel.readyState === "open") channel.send(JSON.stringify(event));
    },
    setMuted: (muted) => {
      for (const track of mic.getAudioTracks()) track.enabled = !muted;
    },
    level: () => ({ input: closed ? 0 : input(), output: closed || !output ? 0 : output() }),
    close,
  };
}
