"use client";
import { audio } from "./audio";
import { subscribeNotes, subscribeSustain } from "./input";
import type { Note } from "./types";
import { usePiano } from "@/store/piano";

export interface PlaybackHandle {
  stop: () => void;
  done: Promise<void>;
}

/**
 * Play notes on the audio clock and light up the on-screen keys while they sound.
 * Notes are scheduled ahead in small batches (lookahead) for precise timing.
 */
export function playNotes(notes: Note[], opts: { offset?: number; until?: number; highlight?: boolean; gain?: number } = {}): PlaybackHandle {
  const ctx = audio.ensure();
  const offset = opts.offset ?? 0;
  const until = opts.until ?? Infinity;
  const list = notes.filter((n) => n.startTime >= offset && n.startTime < until).sort((a, b) => a.startTime - b.startTime);
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  if (!ctx || !list.length) {
    resolve();
    return { stop: () => {}, done };
  }
  const t0 = audio.now() + 0.12;
  const end = Math.max(...list.map((n) => n.startTime + n.duration)) - offset;
  const handles: unknown[] = [];
  let idx = 0;
  let raf = 0;
  let stopped = false;
  let lastKey = "";
  const gain = opts.gain ?? 1;

  // Audio scheduling: a timer only wakes the scheduler; every note is placed exactly
  // on the audio clock with a lookahead, so throttled frames never affect timing.
  const pump = () => {
    if (stopped) return;
    const now = audio.now();
    while (idx < list.length && list[idx].startTime - offset < now - t0 + 0.35) {
      const n = list[idx++];
      handles.push(audio.schedule(n.midi, t0 + n.startTime - offset, n.duration, n.velocity * gain));
    }
    if (now - t0 > end + 0.3) {
      finish();
      return;
    }
    timer = setTimeout(pump, 30);
  };
  let timer: ReturnType<typeof setTimeout> | null = null;

  // Visuals: light up keys while notes sound.
  const tick = () => {
    if (stopped) return;
    const songT = audio.now() - t0 + offset;
    if (opts.highlight !== false) {
      const active: Record<number, boolean> = {};
      for (const n of list) {
        if (n.startTime > songT) break;
        if (n.startTime + n.duration > songT) active[n.midi] = true;
      }
      const key = Object.keys(active).join(",");
      if (key !== lastKey) {
        lastKey = key;
        usePiano.getState().setPlayback(active);
      }
    }
    raf = requestAnimationFrame(tick);
  };
  const finish = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
    if (opts.highlight !== false) usePiano.getState().setPlayback({});
    resolve();
  };
  pump();
  raf = requestAnimationFrame(tick);
  return {
    stop: () => {
      for (const h of handles) audio.cancel(h);
      finish();
    },
    done,
  };
}

// ---------------------------------------------------------------------------

/** Records live input (any source) into Note[] with sustain-pedal handling. */
export class Recorder {
  notes: Note[] = [];
  private start = 0;
  private open = new Map<number, { t: number; v: number }>();
  private pendingRelease = new Set<number>();
  private sustain = false;
  private unsubs: (() => void)[] = [];
  recording = false;

  begin() {
    audio.ensure();
    this.notes = [];
    this.open.clear();
    this.pendingRelease.clear();
    this.sustain = usePiano.getState().sustain;
    this.start = audio.now();
    this.recording = true;
    this.unsubs = [
      subscribeNotes((e) => {
        const t = e.time - this.start;
        if (e.type === "on") {
          if (this.open.has(e.midi)) this.close(e.midi, t);
          this.pendingRelease.delete(e.midi);
          this.open.set(e.midi, { t, v: e.velocity });
        } else if (this.sustain) {
          this.pendingRelease.add(e.midi);
        } else {
          this.close(e.midi, t);
        }
      }),
      subscribeSustain((on, time) => {
        this.sustain = on;
        if (!on) {
          const t = time - this.start;
          for (const m of this.pendingRelease) this.close(m, t);
          this.pendingRelease.clear();
        }
      }),
    ];
  }

  private close(midi: number, t: number) {
    const o = this.open.get(midi);
    if (!o) return;
    this.open.delete(midi);
    this.notes.push({ midi, startTime: o.t, duration: Math.max(0.05, t - o.t), velocity: o.v, track: midi >= 60 ? 0 : 1 });
  }

  end(): Note[] {
    const t = audio.now() - this.start;
    for (const m of [...this.open.keys()]) this.close(m, t);
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.recording = false;
    // Trim leading silence.
    this.notes.sort((a, b) => a.startTime - b.startTime);
    const first = this.notes[0]?.startTime ?? 0;
    const lead = Math.max(0, first - 0.3);
    this.notes = this.notes.map((n) => ({ ...n, startTime: +(n.startTime - lead).toFixed(4) }));
    return this.notes;
  }

  get elapsed() {
    return this.recording ? audio.now() - this.start : 0;
  }
}

// ---------------------------------------------------------------------------

/** Lookahead metronome on the audio clock. */
export class Metronome {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private next = 0;
  private beat = 0;
  bpm = 100;
  beatsPerBar = 4;
  onBeat?: (beat: number, when: number) => void;

  start() {
    const ctx = audio.ensure();
    if (!ctx) return;
    this.stop();
    this.next = ctx.currentTime + 0.08;
    this.beat = 0;
    this.pump();
  }
  private pump = () => {
    const ctx = audio.ctx!;
    // setTimeout only wakes the scheduler; clicks are placed precisely on the audio clock.
    while (this.next < ctx.currentTime + 0.15) {
      const b = this.beat % this.beatsPerBar;
      audio.click(this.next, b === 0);
      const when = this.next;
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      setTimeout(() => this.onBeat?.(b, when), delay);
      this.next += 60 / this.bpm;
      this.beat++;
    }
    this.timer = setTimeout(this.pump, 25);
  };
  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  get running() {
    return this.timer !== null;
  }
}
