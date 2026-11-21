"use client";
// GameEngine: drives Learn and Challenge modes.
// Timing is derived exclusively from the Web Audio clock (audio.now()), so
// visuals, accompaniment audio and input judging share one timeline. Rendering
// runs on requestAnimationFrame; accompaniment is scheduled ahead on the audio clock.

import { audio } from "./audio";
import type { Judgement, Note, Song } from "./types";
import { JUDGE_POINTS, WRONG_NOTE_PENALTY, accuracyOf, comboMultiplier, judge, type TimingWindows } from "./scoring";

export class SongClock {
  private anchorAudio = 0;
  private anchorSong = 0;
  rate = 1;
  running = false;

  time(): number {
    return this.running ? this.anchorSong + (audio.now() - this.anchorAudio) * this.rate : this.anchorSong;
  }
  start(at: number) {
    this.anchorSong = at;
    this.anchorAudio = audio.now();
    this.running = true;
  }
  pause() {
    this.anchorSong = this.time();
    this.running = false;
  }
  holdAt(t: number) {
    this.anchorSong = t;
    this.running = false;
  }
  resume() {
    this.anchorAudio = audio.now();
    this.running = true;
  }
  seek(t: number) {
    this.anchorSong = t;
    this.anchorAudio = audio.now();
  }
  setRate(r: number) {
    this.anchorSong = this.time();
    this.anchorAudio = audio.now();
    this.rate = r;
  }
  /** AudioContext time at which song time `t` will be heard. */
  audioTimeAt(t: number) {
    return this.anchorAudio + (t - this.anchorSong) / this.rate;
  }
}

export type NoteState = "pending" | "hit" | "missed";

export interface EngineNote extends Note {
  idx: number;
  player: boolean;
  state: NoteState;
  judgement?: Judgement;
  hitAt?: number;
  voice?: unknown;
}

export interface EngineStats {
  score: number;
  combo: number;
  maxCombo: number;
  counts: Record<Judgement, number>;
  wrongNotes: number;
  accuracy: number;
  judged: number;
  totalPlayerNotes: number;
  progress: number; // 0..1 within range
  loops: number;
}

export interface JudgeEvent {
  id: number;
  judgement: Judgement | "wrong";
  midi: number;
  points: number;
  combo: number;
}

export interface EngineOptions {
  song: Song;
  /** 'listen' autoplays everything without judging. */
  mode: "learn" | "challenge" | "listen";
  playerTracks: number[];
  /** Accompaniment volume multiplier for non-player tracks (0 mutes them). */
  accompaniment: number;
  waitMode: boolean;
  rate: number;
  range: { start: number; end: number };
  loop: boolean;
  windows: TimingWindows;
  reduceChords?: boolean;
  /** Seconds of song time shown before the first note so it can fall in. */
  leadIn: number;
}

export interface EngineCallbacks {
  onFrame?: (t: number) => void;
  onStats?: (s: EngineStats) => void;
  onJudge?: (e: JudgeEvent) => void;
  onHints?: (hints: Record<number, "target" | "auto">) => void;
  onEnd?: (s: EngineStats) => void;
  onWaiting?: (waiting: boolean) => void;
}

const LOOKAHEAD = 0.25; // seconds (real time) of audio scheduled ahead

export class GameEngine {
  readonly clock = new SongClock();
  notes: EngineNote[] = [];
  private opts: EngineOptions;
  private cb: EngineCallbacks;
  private raf = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private judgeId = 0;
  private hintKey = "";
  private waiting = false;
  private finished = false;
  private started = false;
  private lastStatsEmit = 0;
  stats: EngineStats;

  constructor(opts: EngineOptions, cb: EngineCallbacks) {
    this.opts = opts;
    this.cb = cb;
    this.notes = this.prepareNotes();
    this.stats = this.freshStats();
    this.clock.rate = opts.rate;
    this.clock.holdAt(opts.range.start - opts.leadIn);
  }

  private prepareNotes(): EngineNote[] {
    const { song, playerTracks, mode, reduceChords } = this.opts;
    let notes = song.notes.map((n, idx) => ({
      ...n,
      idx,
      player: mode !== "listen" && playerTracks.includes(n.track),
      state: "pending" as NoteState,
    }));
    if (reduceChords) {
      // Keep only the highest player note of each simultaneous group; demote the rest to accompaniment.
      const groups = new Map<string, EngineNote[]>();
      for (const n of notes) {
        if (!n.player) continue;
        const k = `${n.track}:${Math.round(n.startTime * 50)}`;
        const g = groups.get(k) ?? [];
        g.push(n);
        groups.set(k, g);
      }
      for (const g of groups.values()) {
        g.sort((a, b) => b.midi - a.midi);
        g.slice(1).forEach((n) => (n.player = false));
      }
    }
    notes = notes.sort((a, b) => a.startTime - b.startTime);
    notes.forEach((n, i) => (n.idx = i));
    return notes;
  }

  private freshStats(): EngineStats {
    const total = this.notes.filter((n) => n.player && this.inRange(n)).length;
    return {
      score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 },
      wrongNotes: 0, accuracy: 0, judged: 0, totalPlayerNotes: total, progress: 0, loops: 0,
    };
  }

  private inRange(n: Note) {
    return n.startTime >= this.opts.range.start - 0.001 && n.startTime < this.opts.range.end - 0.001;
  }

  get options() {
    return this.opts;
  }
  get isRunning() {
    return this.clock.running || this.waiting;
  }
  get isStarted() {
    return this.started;
  }
  get isWaiting() {
    return this.waiting;
  }

  start() {
    audio.ensure();
    this.started = true;
    this.finished = false;
    this.clock.resume();
    if (!this.raf) this.loop();
    if (!this.timer) this.pump();
  }

  /** Start the render loop without starting the clock (shows the initial frame). */
  attach() {
    if (!this.raf) this.loop();
  }

  pause() {
    if (!this.started) return;
    this.clock.pause();
    this.waiting = false;
    this.cancelScheduled(false);
  }

  resume() {
    if (!this.started || this.finished) return;
    this.clock.resume();
  }

  restart() {
    this.cancelScheduled(false);
    for (const n of this.notes) {
      n.state = "pending";
      n.judgement = undefined;
      n.hitAt = undefined;
    }
    this.stats = this.freshStats();
    this.finished = false;
    this.waiting = false;
    this.clock.holdAt(this.opts.range.start - this.opts.leadIn);
    this.emitStats(true);
  }

  setRate(rate: number) {
    this.opts.rate = rate;
    this.cancelScheduled(true);
    this.clock.setRate(rate);
  }

  setRange(range: { start: number; end: number }, loop: boolean) {
    this.opts.range = range;
    this.opts.loop = loop;
    this.restart();
  }

  setLoop(loop: boolean) {
    this.opts.loop = loop;
  }

  setWaitMode(v: boolean) {
    this.opts.waitMode = v;
    if (!v && this.waiting) {
      this.waiting = false;
      this.cb.onWaiting?.(false);
      this.clock.resume();
    }
  }

  setAccompaniment(v: number) {
    this.opts.accompaniment = v;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.cancelScheduled(false);
  }

  // -------------------------------------------------------------- input

  handleNoteOn(midi: number) {
    if (!this.started || this.finished || this.opts.mode === "listen") return;
    if (!this.clock.running && !this.waiting) return; // paused
    const t = this.clock.time();
    const rate = this.opts.rate;

    if (this.opts.waitMode) {
      const group = this.currentGroup();
      if (group) {
        const target = group.find((n) => n.midi === midi && n.state === "pending");
        // Accept a press slightly before the group arrives.
        if (target && t >= target.startTime - 0.6 * rate) {
          // Wait mode grades correctness, not timing: on time = perfect, after the song had to wait = great.
          const delta = (t - target.startTime) / rate;
          const timed = judge(delta, this.opts.windows);
          const j: Judgement = this.waiting ? "great" : timed === "miss" ? "great" : timed;
          this.registerHit(target, j, t);
          if (group.every((n) => n.state !== "pending") && this.waiting) {
            this.waiting = false;
            this.cb.onWaiting?.(false);
            this.clock.resume();
          }
          return;
        }
      }
      this.registerWrong(midi);
      return;
    }

    // Timing mode: closest pending player note with this pitch inside the "good" window.
    const win = this.opts.windows.good * rate;
    let best: EngineNote | null = null;
    let bestD = Infinity;
    for (const n of this.notes) {
      if (n.startTime > t + win) break;
      if (!n.player || n.state !== "pending" || n.midi !== midi) continue;
      const d = Math.abs(n.startTime - t);
      if (d <= win && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    if (best) this.registerHit(best, judge((t - best.startTime) / rate, this.opts.windows), t);
    else this.registerWrong(midi);
  }

  private registerHit(n: EngineNote, j: Judgement, t: number) {
    n.state = "hit";
    n.judgement = j;
    n.hitAt = t;
    const s = this.stats;
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.counts[j]++;
    s.judged++;
    const points = JUDGE_POINTS[j] * comboMultiplier(s.combo);
    s.score += points;
    s.accuracy = this.accuracy();
    this.cb.onJudge?.({ id: ++this.judgeId, judgement: j, midi: n.midi, points, combo: s.combo });
    this.emitStats(true);
  }

  private registerMiss(n: EngineNote) {
    n.state = "missed";
    n.judgement = "miss";
    const s = this.stats;
    s.combo = 0;
    s.counts.miss++;
    s.judged++;
    s.accuracy = this.accuracy();
    this.cb.onJudge?.({ id: ++this.judgeId, judgement: "miss", midi: n.midi, points: 0, combo: 0 });
    this.emitStats(true);
  }

  private registerWrong(midi: number) {
    const s = this.stats;
    s.wrongNotes++;
    if (this.opts.mode === "challenge") {
      s.score = Math.max(0, s.score - WRONG_NOTE_PENALTY);
      s.combo = 0;
    }
    s.accuracy = this.accuracy();
    this.cb.onJudge?.({ id: ++this.judgeId, judgement: "wrong", midi, points: -WRONG_NOTE_PENALTY, combo: s.combo });
    this.emitStats(true);
  }

  /** Timing modes weigh judgements; wait mode is simply correct notes vs. wrong presses. */
  private accuracy(): number {
    const s = this.stats;
    if (this.opts.waitMode) {
      const hits = s.counts.perfect + s.counts.great + s.counts.good;
      return hits + s.wrongNotes ? (hits / (hits + s.wrongNotes)) * 100 : 0;
    }
    return accuracyOf(s.counts, s.wrongNotes);
  }

  /** Earliest chord-group of pending player notes in range. */
  private currentGroup(): EngineNote[] | null {
    let first: EngineNote | null = null;
    for (const n of this.notes) {
      if (n.player && n.state === "pending" && this.inRange(n)) {
        first = n;
        break;
      }
    }
    if (!first) return null;
    const g: EngineNote[] = [];
    for (let i = first.idx; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.startTime - first.startTime > 0.035) break;
      if (n.player && n.state === "pending") g.push(n);
    }
    return g;
  }

  // -------------------------------------------------------------- loop

  /** Rendering: one frame per display refresh. */
  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.step();
    const t = this.clock.time();
    this.updateHints(t);
    this.cb.onFrame?.(t);
  };

  /** Game logic + audio scheduling, also driven by a timer so it never depends on frame rate. */
  private pump = () => {
    this.step();
    this.timer = setTimeout(this.pump, 20);
  };

  private step() {
    if (this.started && !this.finished && (this.clock.running || this.waiting)) this.update(this.clock.time());
  }

  private update(t: number) {
    const { range, waitMode, mode } = this.opts;
    this.schedule(t);

    if (mode !== "listen") {
      if (waitMode) {
        const group = this.currentGroup();
        if (group && !this.waiting && t >= group[0].startTime) {
          this.waiting = true;
          this.clock.holdAt(group[0].startTime);
          this.cancelScheduled(true);
          this.cb.onWaiting?.(true);
        }
      } else {
        const win = this.opts.windows.good * this.opts.rate;
        for (const n of this.notes) {
          if (n.startTime > t) break;
          if (n.player && n.state === "pending" && this.inRange(n) && t - n.startTime > win) this.registerMiss(n);
        }
      }
    }

    // Progress & end of range
    const span = Math.max(0.001, range.end - range.start);
    this.stats.progress = Math.max(0, Math.min(1, (t - range.start) / span));
    const lastEnd = this.lastNoteEndInRange();
    if (t >= lastEnd + 0.6) {
      if (this.opts.loop) {
        this.stats.loops++;
        this.cancelScheduled(false);
        for (const n of this.notes) if (this.inRange(n)) {
          n.state = "pending";
          n.judgement = undefined;
        }
        this.clock.seek(range.start - Math.min(2, this.opts.leadIn));
      } else {
        this.finished = true;
        this.clock.pause();
        this.stats.progress = 1;
        this.emitStats(true);
        this.cb.onEnd?.({ ...this.stats, counts: { ...this.stats.counts } });
        return;
      }
    }
    if (performance.now() - this.lastStatsEmit > 120) this.emitStats(false);
  }

  private lastNoteEndInRange() {
    let end = this.opts.range.start;
    for (const n of this.notes) if (this.inRange(n)) end = Math.max(end, n.startTime + n.duration);
    return Math.min(end, this.opts.range.end + 0.5);
  }

  private emitStats(force: boolean) {
    if (!force && performance.now() - this.lastStatsEmit < 120) return;
    this.lastStatsEmit = performance.now();
    this.cb.onStats?.({ ...this.stats, counts: { ...this.stats.counts } });
  }

  private schedule(t: number) {
    const horizon = t + LOOKAHEAD * this.opts.rate;
    const { accompaniment, mode } = this.opts;
    for (const n of this.notes) {
      if (n.startTime >= horizon) break;
      if (n.voice || n.startTime < t - 0.03 || !this.inRange(n)) continue;
      const auto = mode === "listen" || !n.player;
      if (!auto) continue;
      const vol = mode === "listen" ? 1 : accompaniment;
      if (vol <= 0.001) continue;
      const when = this.clock.audioTimeAt(n.startTime);
      n.voice = audio.schedule(n.midi, when, n.duration / this.opts.rate, n.velocity * vol) ?? true;
    }
  }

  /** Cancel scheduled accompaniment. futureOnly keeps notes already sounding. */
  private cancelScheduled(futureOnly: boolean) {
    const ctx = audio.ctx;
    const now = ctx?.currentTime ?? 0;
    for (const n of this.notes) {
      if (!n.voice) continue;
      const v = n.voice as { start?: number };
      const isFuture = typeof v.start === "number" ? v.start > now + 0.005 : true;
      if (futureOnly && !isFuture) continue;
      if (typeof v.start === "number") audio.cancel(n.voice);
      n.voice = undefined;
    }
    if (!futureOnly) audio.stopSong(false);
  }

  private updateHints(t: number) {
    const hints: Record<number, "target" | "auto"> = {};
    const { mode, waitMode } = this.opts;
    if (waitMode && mode !== "listen" && this.started) {
      const g = this.currentGroup();
      if (g && g[0].startTime - t < 0.6 * this.opts.rate) for (const n of g) hints[n.midi] = "target";
    }
    for (const n of this.notes) {
      if (n.startTime > t + 0.02) break;
      if (n.startTime + Math.max(n.duration, 0.12) < t) continue;
      if (!this.inRange(n)) continue;
      if (n.player && !waitMode && n.state !== "missed") hints[n.midi] = "target";
      else if (!n.player && hints[n.midi] === undefined) hints[n.midi] = "auto";
    }
    const key = Object.entries(hints).map(([k, v]) => k + v[0]).join(",");
    if (key !== this.hintKey) {
      this.hintKey = key;
      this.cb.onHints?.(hints);
    }
  }
}
