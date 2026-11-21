// AudioEngine: a synthesized piano built on the raw Web Audio API.
// - Lazily creates the AudioContext on the first user gesture (autoplay policy).
// - Per-note voices: custom PeriodicWave (inharmonic-ish partials), detuned
//   second string, brightness filter envelope, hammer noise, double-decay envelope.
// - Sustain pedal, polyphony cap, scheduled playback on the audio clock.

import { midiToFreq } from "./music";

interface Voice {
  midi: number;
  start: number;
  out: GainNode; // release stage
  sources: AudioScheduledSourceNode[];
  sustained: boolean;
  released: boolean;
  tag: "live" | "song";
  endAt: number;
}

type StateListener = (state: AudioContextState | "uninitialized") => void;

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private comp!: DynamicsCompressorNode;
  private noiseBuf!: AudioBuffer;
  private waves = new Map<number, PeriodicWave>();
  private live = new Map<number, Voice>(); // currently held/ringing live notes by midi
  private voices: Voice[] = [];
  private sustain = false;
  private held = new Set<number>();
  private volume = 0.8;
  private reverbAmount = 0.22;
  private listeners = new Set<StateListener>();
  private lastNow = 0;

  /** Must be called from a user gesture at least once. Safe to call repeatedly. */
  ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor({ latencyHint: "interactive" });
      this.ctx = ctx;
      this.build(ctx);
      ctx.onstatechange = () => this.emit();
    }
    if (this.ctx.state !== "running") {
      this.ctx.resume().then(() => this.emit()).catch(() => this.emit());
    }
    return this.ctx;
  }

  get state(): AudioContextState | "uninitialized" {
    return this.ctx?.state ?? "uninitialized";
  }

  onStateChange(fn: StateListener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    for (const l of this.listeners) l(this.state);
  }

  private build(ctx: AudioContext) {
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.wet.gain.value = this.reverbAmount;
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(ctx, 2.2);
    this.dry.connect(this.comp);
    this.dry.connect(convolver);
    convolver.connect(this.wet);
    this.wet.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);

    // White noise buffer for the hammer thump.
    const len = Math.floor(ctx.sampleRate * 0.08);
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }

  private makeImpulse(ctx: AudioContext, seconds: number) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < rate * 0.01 ? i / (rate * 0.01) : 1);
      }
    }
    return buf;
  }

  private wave(midi: number): PeriodicWave {
    const cached = this.waves.get(midi);
    if (cached) return cached;
    const ctx = this.ctx!;
    const f = midiToFreq(midi);
    const n = Math.max(2, Math.min(24, Math.floor(10000 / f)));
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    // Hammer strike position (~1/8 of string) suppresses every ~8th partial.
    for (let k = 1; k <= n; k++) {
      const strike = Math.abs(Math.sin((Math.PI * k) / 8.3));
      const rolloff = 1 / Math.pow(k, midi < 48 ? 1.0 : 1.35);
      imag[k] = rolloff * (0.35 + 0.65 * strike);
    }
    // Low notes: weaker fundamental, like a real piano.
    if (midi < 45) imag[1] *= 0.6;
    const w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.waves.set(midi, w);
    return w;
  }

  /** Smooth "what the listener hears now" audio time. */
  now(): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    let t = ctx.currentTime;
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.performanceTime && ts.contextTime !== undefined && ctx.state === "running") {
      const est = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
      // The estimate must never run ahead of the scheduling clock or go backwards.
      t = Math.min(est, ctx.currentTime + 0.05);
    }
    if (t < this.lastNow && this.lastNow - t < 0.05) t = this.lastNow;
    this.lastNow = t;
    return t;
  }

  private createVoice(midi: number, velocity: number, when: number, tag: Voice["tag"]): Voice {
    const ctx = this.ctx!;
    const f = midiToFreq(midi);
    const v = Math.max(0.05, Math.min(1, velocity));
    // Decay time: long for bass, short for treble.
    const decay = Math.max(0.9, 9 * Math.pow(0.5, (midi - 33) / 16));
    const peak = 0.32 * Math.pow(v, 1.4) * (midi > 84 ? 0.8 : 1);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.004);
    env.gain.setTargetAtTime(peak * 0.42, when + 0.004, 0.09 + decay * 0.03);
    env.gain.setTargetAtTime(0.00001, when + 0.25, decay / 3);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const bright = Math.min(18000, f * (3 + 14 * v));
    filter.frequency.setValueAtTime(bright, when);
    filter.frequency.setTargetAtTime(Math.min(16000, f * (1.6 + 3 * v)), when + 0.01, 0.35 + decay * 0.05);
    filter.Q.value = 0.5;

    const out = ctx.createGain();
    out.gain.value = 1;

    const o1 = ctx.createOscillator();
    o1.setPeriodicWave(this.wave(midi));
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.setPeriodicWave(this.wave(midi));
    o2.frequency.value = f;
    o2.detune.value = midi < 40 ? 4 : 2.2; // second string slightly detuned -> chorus/beating
    const g2 = ctx.createGain();
    g2.gain.value = 0.55;

    o1.connect(filter);
    o2.connect(g2).connect(filter);
    filter.connect(env).connect(out).connect(this.dry);

    // Hammer noise
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = Math.min(9000, f * 4 + 600);
    nf.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.value = 0.18 * v * v;
    noise.connect(nf).connect(ng).connect(out);

    o1.start(when);
    o2.start(when);
    noise.start(when);
    const maxLife = when + decay * 3 + 0.5;
    o1.stop(maxLife);
    o2.stop(maxLife);

    const voice: Voice = {
      midi, start: when, out, sources: [o1, o2, noise], sustained: false, released: false, tag, endAt: maxLife,
    };
    o1.onended = () => {
      out.disconnect();
      const i = this.voices.indexOf(voice);
      if (i >= 0) this.voices.splice(i, 1);
      if (this.live.get(midi) === voice) this.live.delete(midi);
    };
    this.voices.push(voice);
    this.enforcePolyphony();
    return voice;
  }

  private enforcePolyphony(max = 56) {
    if (this.voices.length <= max) return;
    const victims = this.voices.filter((v) => !v.released).slice(0, this.voices.length - max);
    for (const v of victims) this.releaseVoice(v, this.ctx!.currentTime, 0.03);
  }

  private releaseVoice(v: Voice, at: number, tc = 0.07) {
    if (v.released) return;
    v.released = true;
    const g = v.out.gain;
    g.cancelScheduledValues(at);
    g.setValueAtTime(1, at);
    g.setTargetAtTime(0, at, tc);
    const stopAt = at + tc * 8;
    for (const s of v.sources) {
      try {
        s.stop(stopAt);
      } catch {
        /* already stopped */
      }
    }
    v.endAt = stopAt;
  }

  // ---- Live playing --------------------------------------------------------

  noteOn(midi: number, velocity = 0.75) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const prev = this.live.get(midi);
    if (prev) this.releaseVoice(prev, t, 0.02);
    const v = this.createVoice(midi, velocity, t, "live");
    this.live.set(midi, v);
    this.held.add(midi);
  }

  noteOff(midi: number) {
    this.held.delete(midi);
    const v = this.live.get(midi);
    if (!v || !this.ctx) return;
    if (this.sustain) {
      v.sustained = true;
      return;
    }
    this.releaseVoice(v, this.ctx.currentTime, midi < 48 ? 0.12 : 0.07);
  }

  setSustain(on: boolean) {
    this.sustain = on;
    if (on || !this.ctx) return;
    const t = this.ctx.currentTime;
    for (const v of this.live.values()) {
      if (v.sustained && !this.held.has(v.midi)) this.releaseVoice(v, t, 0.12);
      v.sustained = false;
    }
  }

  allNotesOff() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const v of [...this.voices]) this.releaseVoice(v, t, 0.04);
    this.live.clear();
    this.held.clear();
  }

  // ---- Scheduled playback (songs, recordings, previews) ---------------------

  /** Schedule a note at an absolute AudioContext time. Returns a handle to cancel it. */
  schedule(midi: number, when: number, duration: number, velocity = 0.7) {
    const ctx = this.ensure();
    if (!ctx) return null;
    const start = Math.max(when, ctx.currentTime);
    const v = this.createVoice(midi, velocity, start, "song");
    this.releaseVoice(v, start + Math.max(0.05, duration), midi < 48 ? 0.15 : 0.09);
    return v;
  }

  cancel(handle: unknown) {
    const v = handle as Voice | null;
    if (!v || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (v.start > now) {
      for (const s of v.sources) {
        try {
          s.stop(0);
        } catch {
          /* noop */
        }
      }
      v.out.disconnect();
    } else {
      // Already sounding: fade out gracefully.
      v.released = false;
      this.releaseVoice(v, now, 0.05);
    }
  }

  /** Stop scheduled song voices; `futureOnly` keeps notes that are already sounding. */
  stopSong(futureOnly = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const v of [...this.voices]) {
      if (v.tag !== "song") continue;
      if (futureOnly && v.start <= now) continue;
      this.cancel(v);
    }
  }

  click(when: number, accent: boolean, gain = 0.5) {
    const ctx = this.ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = accent ? 1760 : 1175;
    o.type = "triangle";
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain * (accent ? 0.9 : 0.6), when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    o.connect(g).connect(this.master);
    o.start(when);
    o.stop(when + 0.08);
  }

  /** Short feedback tones for exercises. */
  blip(kind: "good" | "bad") {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = kind === "good" ? "sine" : "square";
    o.frequency.setValueAtTime(kind === "good" ? 880 : 180, t);
    if (kind === "good") o.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kind === "good" ? 0.12 : 0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setReverb(v: number) {
    this.reverbAmount = v;
    if (this.ctx) this.wet.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }
}

export const audio = new AudioEngine();
