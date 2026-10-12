// Lightweight procedural sound effects via WebAudio oscillators.
// No external audio assets are required, so there is nothing with unclear
// licensing bundled with the game. If WebAudio is unavailable the game
// simply stays silent and fully playable.

type SfxName =
  | "jump"
  | "land"
  | "collect"
  | "hidden"
  | "transform"
  | "magnetAttach"
  | "magnetDetach"
  | "checkpoint"
  | "finish"
  | "click"
  | "hurt";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure() {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    this.ensure();
    this.ctx?.resume().catch(() => {});
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
  }

  private tone(freq: number, duration: number, type: OscillatorType = "sine", glideTo?: number, vol = 1) {
    this.ensure();
    if (!this.ctx || !this.master || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.02);
  }

  play(name: SfxName) {
    switch (name) {
      case "jump":
        this.tone(320, 0.18, "square", 540, 0.25);
        break;
      case "land":
        this.tone(160, 0.12, "sine", 80, 0.3);
        break;
      case "collect":
        this.tone(740, 0.1, "triangle", 1100, 0.3);
        break;
      case "hidden":
        this.tone(500, 0.12, "triangle", 900, 0.25);
        setTimeout(() => this.tone(900, 0.18, "triangle", 1300, 0.25), 90);
        break;
      case "transform":
        this.tone(220, 0.22, "sawtooth", 660, 0.22);
        break;
      case "magnetAttach":
        this.tone(180, 0.15, "square", 420, 0.22);
        break;
      case "magnetDetach":
        this.tone(420, 0.12, "square", 180, 0.2);
        break;
      case "checkpoint":
        this.tone(440, 0.1, "sine", 660, 0.25);
        setTimeout(() => this.tone(660, 0.14, "sine", 880, 0.25), 80);
        break;
      case "finish":
        [0, 90, 180, 280].forEach((d, i) =>
          setTimeout(() => this.tone(440 + i * 120, 0.22, "triangle", 440 + i * 180, 0.3), d)
        );
        break;
      case "click":
        this.tone(500, 0.05, "square", 500, 0.15);
        break;
      case "hurt":
        this.tone(150, 0.2, "sawtooth", 60, 0.28);
        break;
    }
  }
}

export const audio = new AudioManager();
