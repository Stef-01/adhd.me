/** A deliberately quiet, bounded mix; only enabled by an explicit sound gesture. */
export class BedroomAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<number, { oscillator: OscillatorNode; gain: GainNode }>();
  private bed: { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;

  async enable() {
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContext();
      this.master = this.context.createGain(); this.master.gain.value = .1;
      this.master.connect(this.context.destination);
    }
    const context = this.context;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Audio did not become available")), 1500);
      context.resume().then(() => {
        window.clearTimeout(timeout);
        if (context.state === "running") resolve(); else reject(new Error("Audio is suspended"));
      }, error => { window.clearTimeout(timeout); reject(error); });
    });
  }

  update(ids: readonly number[], comfort: boolean, audible: boolean) {
    const ctx = this.context, master = this.master;
    if (!ctx || !master || ctx.state === "closed") return;
    const active = new Set(audible ? ids.slice(0, 6) : []);
    for (const [id, voice] of this.voices) if (!active.has(id)) {
      voice.gain.gain.setTargetAtTime(0, ctx.currentTime, .025);
      voice.oscillator.stop(ctx.currentTime + .12);
      voice.oscillator.onended = () => { voice.oscillator.disconnect(); voice.gain.disconnect(); };
      this.voices.delete(id);
    }
    for (const id of active) {
      if (!this.voices.has(id)) {
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.type = "triangle"; oscillator.frequency.value = 185 + (id % 7) * 21;
        gain.gain.value = 0; oscillator.connect(gain); gain.connect(master); oscillator.start();
        this.voices.set(id, { oscillator, gain });
      }
      this.voices.get(id)!.gain.gain.setTargetAtTime((comfort ? .05 : .13) / Math.max(3, active.size), ctx.currentTime, .08);
    }
    if (comfort && audible && !this.bed) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * .018) / 1.018; data[i] = last * 3; }
      const source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      source.buffer = buffer; source.loop = true; filter.type = "lowpass"; filter.frequency.value = 550;
      gain.gain.value = 0; gain.gain.setTargetAtTime(.15, ctx.currentTime, .4);
      source.connect(filter); filter.connect(gain); gain.connect(master); source.start();
      this.bed = { source, gain, filter };
    } else if ((!comfort || !audible) && this.bed) {
      const bed = this.bed; this.bed = null;
      bed.gain.gain.setTargetAtTime(0, ctx.currentTime, .04); bed.source.stop(ctx.currentTime + .2);
      bed.source.onended = () => { bed.source.disconnect(); bed.filter.disconnect(); bed.gain.disconnect(); };
    }
  }

  dispose() {
    for (const v of this.voices.values()) { v.oscillator.stop(); v.oscillator.disconnect(); v.gain.disconnect(); }
    this.voices.clear();
    if (this.bed) { this.bed.source.stop(); this.bed.source.disconnect(); this.bed.filter.disconnect(); this.bed.gain.disconnect(); this.bed = null; }
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null; this.master = null;
  }
}
