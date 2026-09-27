import { describe, expect, it } from "vitest";
import { playCue, SOUND_CUES, soundPlan, type SoundMoment } from "./sound";

describe("the Chaos Run's sound", () => {
  it("is silent unless switched on, and always silent under reduced sensory effects", () => {
    for (const moment of Object.keys(SOUND_CUES) as SoundMoment[]) {
      expect(soundPlan(moment, false, false)).toEqual([]);
      expect(soundPlan(moment, true, true)).toEqual([]);
      expect(soundPlan(moment, true, false).length).toBeGreaterThan(0);
    }
  });

  it("every cue is short and in a comfortable register", () => {
    for (const [moment, tones] of Object.entries(SOUND_CUES)) {
      expect(tones.reduce((n, t) => n + t.ms, 0), moment).toBeLessThanOrEqual(450);
      for (const t of tones) expect(t.hz >= 200 && t.hz <= 1000, `${moment} ${t.hz}`).toBe(true);
    }
  });

  it("asks nothing of the browser when off, and plays each tone once when on", () => {
    let made = 0;
    let started = 0;
    const node = () => ({ connect: (n: unknown) => n, start: () => { started += 1; }, stop: () => undefined, type: "sine", frequency: { setValueAtTime: () => undefined }, gain: { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined } });
    const make = () => { made += 1; return { currentTime: 0, destination: {}, state: "running", resume: async () => undefined, createOscillator: node, createGain: node } as never; };
    expect(playCue("hit", false, false, make)).toBe(false);
    expect(made).toBe(0);
    expect(playCue("faster", true, false, make)).toBe(true);
    expect(started).toBe(SOUND_CUES.faster.length);
    expect(playCue("end", true, false, () => null)).toBe(false);
  });
});
