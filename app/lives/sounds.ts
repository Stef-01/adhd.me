"use client";
/**
 * One Web Audio engine for the live worlds: synthesised effects and a small per-world score.
 * Silent until the player turns sound on (persisted in one key, default off) and a gesture has
 * unlocked the context. Nothing is sampled; nothing is required to play.
 */
const KEY = "adhdme.sound";
type Bus = "music" | "sfx";
export type SfxName = "pop" | "stamp" | "thud" | "click" | "whoosh" | "scribble" | "rustle" | "notification" | "phone_buzz" | "till" | "zip" | "plate" | "honk" | "bike_bell" | "bark" | "footstep" | "keytap" | "chime" | "tick" | "error_buzz";
export interface ScoreSpec { bpm: number; root: number; scale: number[]; chords: number[][]; melody: (number | null)[]; bass: "root" | "walk"; lead: OscillatorType; pad: OscillatorType }

/** A MIDI note to Hz. */
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

class Engine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  buses: Partial<Record<Bus, GainNode>> = {};
  noise: AudioBuffer | null = null;
  muted = true;
  private listeners = new Set<() => void>();
  private timer = 0; private spec: ScoreSpec | null = null; private step = 0; private next = 0; private level = .3; private voices = 0;

  constructor() {
    if (typeof window !== "undefined") {
      try { this.muted = localStorage.getItem(KEY) !== "on"; } catch { this.muted = true; }
      document.documentElement.dataset.sound = this.muted ? "off" : "on";
      document.addEventListener("visibilitychange", () => { if (document.hidden) void this.ctx?.suspend(); else if (!this.muted && this.spec) void this.ctx?.resume(); });
    }
  }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  /** Create or resume the context: only ever from a user gesture. */
  unlock() {
    if (this.muted || typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .25;
      const master = ctx.createGain(); master.gain.value = .7; comp.connect(master); master.connect(ctx.destination);
      for (const bus of ["music", "sfx"] as Bus[]) { const g = ctx.createGain(); g.gain.value = bus === "music" ? .32 : .8; g.connect(comp); this.buses[bus] = g; }
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.ctx = ctx; this.master = master; this.noise = buffer;
    }
    if (this.ctx.state !== "running") void this.ctx.resume();
  }
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem(KEY, this.muted ? "off" : "on"); } catch { /* private mode */ }
    document.documentElement.dataset.sound = this.muted ? "off" : "on";
    if (this.muted) { this.master?.gain.setTargetAtTime(0, this.ctx!.currentTime, .03); window.setTimeout(() => { if (this.muted) void this.ctx?.suspend(); }, 200); }
    else { this.unlock(); if (this.ctx && this.master) { void this.ctx.resume(); this.master.gain.setTargetAtTime(.7, this.ctx.currentTime, .03); } }
    this.listeners.forEach(fn => fn());
  }
  pause() { void this.ctx?.suspend(); }
  resume() { if (!this.muted && this.ctx) void this.ctx.resume(); }

  private tone(freq: number, dur: number, { type = "sine" as OscillatorType, gain = .2, to, at = 0, bus = "sfx" as Bus, pan = 0, filter }: { type?: OscillatorType; gain?: number; to?: number; at?: number; bus?: Bus; pan?: number; filter?: number } = {}) {
    const ctx = this.ctx; if (!ctx || this.voices > 24) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let node: AudioNode = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filter; node.connect(f); node = f; }
    const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(g); g.connect(p); p.connect(this.buses[bus]!);
    this.voices++; o.onended = () => { this.voices--; o.disconnect(); g.disconnect(); p.disconnect(); };
    o.start(t); o.stop(t + dur + .02);
  }
  private burst(dur: number, { band = 1500, q = 1, gain = .2, at = 0, type = "bandpass" as BiquadFilterType, sweep, pan = 0 }: { band?: number; q?: number; gain?: number; at?: number; type?: BiquadFilterType; sweep?: number; pan?: number } = {}) {
    const ctx = this.ctx; if (!ctx || !this.noise) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(band, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(f); f.connect(g); g.connect(p); p.connect(this.buses.sfx!);
    src.start(t, Math.random()); src.stop(t + dur + .02);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); p.disconnect(); };
  }
  /** Diegetic effects; `x` (0..1) places the sound across the stereo field. */
  sfx(name: SfxName, x = .5) {
    if (this.muted || !this.ctx) return;
    const pan = Math.max(-.8, Math.min(.8, (x - .5) * 1.6));
    switch (name) {
      case "pop": return this.tone(800, .07, { to: 200, gain: .25, pan });
      case "stamp": this.tone(70, .09, { gain: .35, pan }); return this.burst(.012, { band: 2000, gain: .2, pan });
      case "thud": return this.tone(70, .09, { gain: .4, pan });
      case "click": this.burst(.002, { band: 3000, gain: .2 }); return this.tone(2000, .01, { gain: .12, pan });
      case "whoosh": return this.burst(.25, { type: "lowpass", band: 300, sweep: 4000, gain: .18, pan });
      case "scribble": for (let i = 0; i < 4; i++) this.burst(.03, { band: 3500, q: 2, gain: .12, at: i * .07, pan }); return;
      case "rustle": return this.burst(.2, { type: "lowpass", band: 2500, sweep: 900, gain: .14, pan });
      case "notification": this.tone(880, .12, { gain: .16, pan }); return this.tone(1108, .14, { gain: .14, at: .08, pan });
      case "phone_buzz": for (let i = 0; i < 7; i++) this.tone(180, .03, { type: "square", gain: .08, at: i * .034, filter: 900, pan }); return;
      case "till": return this.tone(1000, .06, { type: "square", gain: .08, filter: 3000, pan });
      case "zip": return this.burst(.15, { type: "highpass", band: 500, sweep: 6000, gain: .15, pan });
      case "plate": this.tone(1200, .4, { gain: .1, pan }); return this.tone(2400, .3, { gain: .05, pan });
      case "honk": this.tone(220, .35, { type: "sawtooth", gain: .1, filter: 1500, pan }); return this.tone(330, .35, { type: "sawtooth", gain: .08, filter: 1500, pan });
      case "bike_bell": this.tone(2100, .25, { gain: .12, pan }); return this.tone(2100, .3, { gain: .12, at: .09, pan });
      case "bark": return this.tone(260, .14, { type: "sawtooth", to: 200, gain: .14, filter: 900, pan });
      case "footstep": return this.tone(90, .06, { gain: .22, pan });
      case "keytap": return this.burst(.006, { type: "highpass", band: 3000 * (.95 + Math.random() * .1), gain: .14, pan });
      case "chime": [0, 7, 14].forEach((n, i) => this.tone(hz(76 + n), .9, { gain: .09, at: i * .05, pan })); return;
      case "tick": return this.burst(.004, { band: 2000, gain: .14, pan });
      case "error_buzz": return this.tone(120, .2, { type: "square", gain: .05, filter: 700, pan });
    }
  }

  /** Start a world's score. Layers enter with intensity: bass/pad always, melody from .4, sparkle from .75. */
  score(spec: ScoreSpec) {
    if (this.spec === spec) return;
    this.stopScore(); this.spec = spec; this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }
  intensity(v: number) { this.level = Math.max(0, Math.min(1, v)); }
  stopScore() { window.clearInterval(this.timer); this.timer = 0; this.spec = null; }
  /** A cadence on success, a suspended one on rest. */
  stinger(kind: "win" | "rest") {
    if (this.muted || !this.ctx || !this.spec) return;
    const r = this.spec.root + 12;
    (kind === "win" ? [0, 4, 7, 12] : [0, 5, 7, 10]).forEach((n, i) => this.tone(hz(r + n), .6, { type: "triangle", gain: .08, at: i * .09, bus: "music" }));
  }
  private schedule() {
    const ctx = this.ctx, spec = this.spec;
    if (!ctx || !spec || this.muted || ctx.state !== "running") return;
    const sixteenth = 60 / spec.bpm / 4;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + .05;
    while (this.next < ctx.currentTime + .1) {
      const at = this.next - ctx.currentTime, s = this.step % 16, bar = Math.floor(this.step / 16) % spec.chords.length;
      const chord = spec.chords[bar]!;
      if (s === 0) chord.forEach(n => this.tone(hz(spec.root + n), sixteenth * 15, { type: spec.pad, gain: .035, at, bus: "music", filter: 1200 }));
      if (s % 4 === 0) {
        const note = spec.bass === "walk" ? chord[(s / 4) % chord.length]! : chord[0]!;
        this.tone(hz(spec.root - 12 + note), sixteenth * 3, { type: "triangle", gain: .09, at, bus: "music", filter: 600 });
        this.burst(.006, { type: "highpass", band: 3000, gain: .03, at });
      }
      const m = spec.melody[(this.step % spec.melody.length)];
      if (this.level >= .4 && m !== null && m !== undefined) this.tone(hz(spec.root + 12 + spec.scale[m % spec.scale.length]! + 12 * Math.floor(m / spec.scale.length)), sixteenth * 1.8, { type: spec.lead, gain: .05, at, bus: "music", filter: 2400 });
      if (this.level >= .75 && s % 2 === 1) this.tone(hz(spec.root + 36 + chord[s % chord.length]!), .05, { gain: .02, at, bus: "music" });
      this.next += sixteenth; this.step++;
    }
  }
}

let engine: Engine | null = null;
export function sound(): Engine { return (engine ??= new Engine()); }

/** World scores (docs/design/game-upgrade-v2/PROMPTS.md §1.1), kept short and quiet. */
export const SCORES = {
  arjun: { bpm: 100, root: 50, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 3, 7, 10], [5, 9, 12, 15], [0, 3, 7, 10], [7, 10, 14, 17]], melody: [4, null, null, 3, null, 2, null, null, 4, null, 5, null, 3, null, null, null], bass: "walk", lead: "sawtooth", pad: "sine" },
  zoe: { bpm: 84, root: 57, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], melody: [0, null, 2, null, 4, null, null, 2, 0, null, null, null, 6, null, 4, null], bass: "root", lead: "square", pad: "sine" },
  jax: { bpm: 118, root: 53, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], melody: [4, null, 2, null, 0, null, 2, 4, 5, null, 4, null, 2, null, null, null], bass: "root", lead: "sine", pad: "sawtooth" },
  nina: { bpm: 66, root: 58, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], melody: [4, null, null, null, null, null, 6, null, null, null, null, null, 5, null, null, null], bass: "root", lead: "sine", pad: "triangle" },
  maya: { bpm: 108, root: 51, scale: [0, 2, 4, 5, 7, 9, 10], chords: [[0, 4, 7], [10, 14, 17], [5, 9, 12], [0, 4, 7]], melody: [0, null, 4, null, 2, null, 4, null, 6, null, 4, null, 2, null, 0, null], bass: "root", lead: "triangle", pad: "sawtooth" },
} satisfies Record<string, ScoreSpec>;
