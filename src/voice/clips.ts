// The recordings of the sentences the finder says (public/voice, listed in ./clips.json and made by
// scripts/voice-clips.mjs): fetched when the welcome screen arrives, the opening one first, and
// decoded once, so the call can play a question the moment it is due. A recording that has not
// arrived is no failure: the model says that sentence instead (src/voice/conversation.ts).

import list from "./clips.json";
import { SAY_IDS, type SayId } from "./plan";

export const CLIPS = list.clips as Record<SayId, { text: string; spoken?: string; seconds: number; bytes: number; sha: string }>;

/** Where a recording lives; the address changes when the recording does, so an old one is never played. */
export const clipUrl = (id: SayId) => `/voice/${id}.mp3?v=${CLIPS[id].sha}`;

const decoded = new Map<SayId, AudioBuffer>();
let loading: Promise<void> | null = null;

/** The scripted call (src/voice/fake-link.ts) plays nothing and has every sentence. */
const scripted = () => typeof window !== "undefined" && (window.__adhdmeVoiceFake === true || Array.isArray(window.__adhdmeVoiceFake));

function decode(context: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  // The callback form as well as the promise: Safari took the promise late.
  return new Promise((resolve, reject) => {
    const done = context.decodeAudioData(bytes, resolve, reject);
    if (done && typeof done.then === "function") done.then(resolve, reject);
  });
}

/** Fetches and decodes every recording. Safe to call again; never throws. */
export function loadClips(): Promise<void> {
  if (typeof window === "undefined" || scripted()) return Promise.resolve();
  const Offline = window.OfflineAudioContext ?? (window as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) return Promise.resolve();
  loading ??= (async () => {
    const context = new Offline(1, 1, 24000);
    const load = async (id: SayId) => {
      if (decoded.has(id)) return;
      try {
        const reply = await fetch(clipUrl(id));
        if (reply.ok) decoded.set(id, await decode(context, await reply.arrayBuffer()));
      } catch {
        // The model says this one.
      }
    };
    // The opening first and alone: it is the one a tap may be waiting on.
    await load("opening");
    await Promise.all(SAY_IDS.filter((id) => id !== "opening").map(load));
    // A recording that failed is tried again by the next call to loadClips.
    if (decoded.size < SAY_IDS.length) loading = null;
  })();
  return loading;
}

/** The recording, decoded, or null while it has not arrived. */
export const clip = (id: SayId): AudioBuffer | null => decoded.get(id) ?? null;

/** True when the call can play this sentence itself. */
export const clipReady = (id: SayId): boolean => scripted() || decoded.has(id);
