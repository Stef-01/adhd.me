// The Chaos Run's sound (roadmap: "the Chaos Run still has no sound"): a short tone on a hit, a
// miss, a speed-up and the end of a run. Off by default, like haptics, and never under reduced
// sensory effects, because a sound is one more thing competing for attention. Tones are made in
// the browser, so there is no file to fetch; the plan is pure so the rule is testable without one.

export type SoundMoment = "hit" | "miss" | "faster" | "end";

/** One tone: its pitch in hertz and how long it sounds, in milliseconds. */
export interface Tone { readonly hz: number; readonly ms: number }

/**
 * Short and soft, in a comfortable middle register. A hit rises, a miss falls, a speed-up is
 * three quick steps up, and the end settles back down.
 */
export const SOUND_CUES: Readonly<Record<SoundMoment, readonly Tone[]>> = {
  hit: [{ hz: 523, ms: 70 }, { hz: 659, ms: 90 }],
  miss: [{ hz: 330, ms: 90 }, { hz: 262, ms: 120 }],
  faster: [{ hz: 440, ms: 60 }, { hz: 554, ms: 60 }, { hz: 659, ms: 90 }],
  end: [{ hz: 523, ms: 120 }, { hz: 440, ms: 120 }, { hz: 392, ms: 200 }],
};

/** The tones to play for `moment`: none unless sound is on and reduced sensory effects are off. */
export function soundPlan(moment: SoundMoment, enabled: boolean, reducedSensory: boolean): readonly Tone[] {
  return enabled && !reducedSensory ? SOUND_CUES[moment] : [];
}

type AudioContextLike = Pick<AudioContext, "currentTime" | "destination" | "createOscillator" | "createGain" | "resume" | "state">;
let shared: AudioContextLike | null = null;

function context(): AudioContextLike | null {
  if (shared) return shared;
  const Ctor = typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  try { shared = new Ctor(); } catch { return null; }
  return shared;
}

/** Play the cue for `moment` when allowed and the browser can. Returns whether anything sounded. */
export function playCue(moment: SoundMoment, enabled: boolean, reducedSensory: boolean, make: () => AudioContextLike | null = context): boolean {
  const tones = soundPlan(moment, enabled, reducedSensory);
  if (tones.length === 0) return false;
  const ctx = make();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    let at = ctx.currentTime + 0.01;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.hz, at);
      // A soft attack and release, so no tone clicks on or off.
      const end = at + tone.ms / 1000;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.08, at + 0.012);
      gain.gain.linearRampToValueAtTime(0, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(end + 0.02);
      at = end + 0.015;
    }
    return true;
  } catch {
    return false;
  }
}
