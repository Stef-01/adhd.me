/** One quiet voice per flying mosquito. Audio starts through Play or the sound button. */
export class LeoBuzz {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<string, { oscillator: OscillatorNode; gain: GainNode }>();

  async enable() {
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = .16;
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
  }

  update(ids: readonly string[], audible: boolean) {
    const context = this.context;
    if (!context || !this.master || context.state === "closed") return;
    const active = new Set(audible ? ids : []);
    for (const [id, voice] of this.voices) if (!active.has(id)) {
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      voice.gain.gain.setTargetAtTime(0, context.currentTime, .02);
      voice.oscillator.stop(context.currentTime + .1);
      voice.oscillator.onended = () => { voice.oscillator.disconnect(); voice.gain.disconnect(); };
      this.voices.delete(id);
    }
    for (const id of active) if (!this.voices.has(id)) {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 220 + (Number(id.slice(1)) % 9) * 23;
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(.025, context.currentTime, .06);
      oscillator.connect(gain); gain.connect(this.master); oscillator.start();
      this.voices.set(id, { oscillator, gain });
    }
  }

  dispose() {
    for (const voice of this.voices.values()) { voice.oscillator.stop(); voice.oscillator.disconnect(); voice.gain.disconnect(); }
    this.voices.clear();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null; this.master = null;
  }
}
