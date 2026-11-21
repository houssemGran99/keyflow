"use client";
import { useEffect, useRef, useState } from "react";
import { Drum, Play, Volume2 } from "lucide-react";
import { audio } from "@/lib/audio";
import { ExerciseLayout, ExerciseResult, Feedback, ProgressDots, shuffle, useNoteOn } from "./shared";

// Patterns: onset positions in beats within a 4/4 bar.
const PATTERNS = {
  basic: [
    [0, 1, 2, 3],
    [0, 2],
    [0, 1, 2],
    [0, 0.5, 1, 2, 3],
    [0, 1, 1.5, 2, 3],
    [0, 1, 2, 2.5, 3, 3.5],
  ],
  syncopated: [
    [0, 1.5, 2, 3],
    [0, 0.5, 1.5, 2.5, 3],
    [0, 0.75, 1.5, 2, 3],
    [0.5, 1, 2, 3.5],
    [0, 1.5, 3],
    [0, 0.5, 1, 1.75, 2.5, 3],
  ],
};
type Level = keyof typeof PATTERNS;
const ROUNDS = 5;
const WINDOW = 0.2;

interface RoundResult {
  points: number;
  max: number;
  errors: number[]; // ms per matched onset
  extra: number;
  missed: number;
}

function evaluate(expected: number[], taps: number[]): RoundResult & { matched: (number | null)[] } {
  const used = new Set<number>();
  const matched: (number | null)[] = [];
  let points = 0;
  const errors: number[] = [];
  let missed = 0;
  for (const e of expected) {
    let best = -1;
    let bd = Infinity;
    taps.forEach((t, i) => {
      const d = Math.abs(t - e);
      if (!used.has(i) && d < bd && d <= WINDOW) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0) {
      used.add(best);
      matched.push(taps[best]);
      errors.push((taps[best] - e) * 1000);
      points += bd <= 0.04 ? 100 : bd <= 0.08 ? 75 : bd <= 0.13 ? 50 : 25;
    } else {
      matched.push(null);
      missed++;
    }
  }
  const extra = taps.length - used.size;
  points = Math.max(0, points - extra * 25);
  return { points, max: expected.length * 100, errors, extra, missed, matched };
}

export function Rhythm() {
  const [level, setLevel] = useState<Level>("basic");
  const [bpm, setBpm] = useState(84);
  const [queue, setQueue] = useState<number[][]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"idle" | "ready" | "countin" | "playing" | "review" | "done">("idle");
  const [taps, setTaps] = useState<number[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [last, setLast] = useState<ReturnType<typeof evaluate> | null>(null);
  const [fb, setFb] = useState<{ kind: "good" | "bad" | "info" | null; text: string }>({ kind: null, text: "" });
  const barStart = useRef(0);
  const tapsRef = useRef<number[]>([]);
  const playhead = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const spb = 60 / bpm;
  const pattern = queue[round] ?? [];

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const begin = () => {
    audio.ensure();
    setQueue(shuffle(PATTERNS[level]).slice(0, ROUNDS));
    setRound(0);
    setResults([]);
    setLast(null);
    setPhase("ready");
    setFb({ kind: "info", text: "Press Go — you'll hear 4 count-in clicks" });
  };

  const demo = () => {
    const ctx = audio.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.1;
    for (let b = 0; b < 4; b++) audio.click(t0 + b * spb, b === 0, 0.25);
    for (const p of pattern) audio.schedule(72, t0 + p * spb, 0.15, 0.7);
  };

  const go = () => {
    const ctx = audio.ensure();
    if (!ctx) return;
    const t0 = audio.now() + 0.15;
    const ctxOffset = ctx.currentTime - audio.now();
    for (let b = 0; b < 8; b++) audio.click(t0 + ctxOffset + b * spb, b % 4 === 0, b < 4 ? 0.55 : 0.25);
    barStart.current = t0 + 4 * spb;
    tapsRef.current = [];
    setTaps([]);
    setPhase("countin");
    setFb({ kind: "info", text: "Count in… 1 · 2 · 3 · 4" });
    const loop = () => {
      const now = audio.now();
      const rel = (now - barStart.current) / (4 * spb);
      if (playhead.current) playhead.current.style.left = `${Math.max(0, Math.min(1, rel)) * 100}%`;
      if (rel >= 0) setPhase((p) => (p === "countin" ? "playing" : p));
      if (rel >= 0 && rel < 1) setFb((f) => (f.text === "Tap!" ? f : { kind: "info", text: "Tap!" }));
      if (now > barStart.current + 4 * spb + 0.25) {
        const expected = pattern.map((p) => barStart.current + p * spb);
        const res = evaluate(expected, tapsRef.current);
        setLast(res);
        setResults((r) => [...r, res]);
        setPhase("review");
        const pct = res.points / res.max;
        setFb({ kind: pct >= 0.7 ? "good" : "bad", text: pct >= 0.9 ? "Excellent timing!" : pct >= 0.7 ? "Nice groove" : res.missed ? `Missed ${res.missed} beat${res.missed > 1 ? "s" : ""}` : "Timing was off — try to lock in with the click" });
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  };

  const tap = (time: number) => {
    if (phase !== "playing" && phase !== "countin") return;
    if (time < barStart.current - WINDOW || time > barStart.current + 4 * spb + WINDOW) return;
    tapsRef.current.push(time);
    setTaps([...tapsRef.current]);
  };
  useNoteOn((e) => tap(e.time));

  const nextRound = () => {
    if (round + 1 >= ROUNDS) setPhase("done");
    else {
      setRound(round + 1);
      setLast(null);
      setPhase("ready");
      setFb({ kind: "info", text: "Press Go when ready" });
    }
  };

  const totalPts = results.reduce((a, r) => a + r.points, 0);
  const totalMax = results.reduce((a, r) => a + r.max, 0);
  const allErr = results.flatMap((r) => r.errors);
  const meanErr = allErr.length ? allErr.reduce((a, b) => a + Math.abs(b), 0) / allErr.length : 0;
  const bias = allErr.length ? allErr.reduce((a, b) => a + b, 0) / allErr.length : 0;

  const xOf = (t: number) => ((t - barStart.current) / (4 * spb)) * 100;

  return (
    <ExerciseLayout
      title="Rhythm Training"
      subtitle="Tap the rhythm in time with the click — any piano key or the tap pad works."
      low={60}
      high={72}
      toolbar={
        <div className="flex flex-wrap gap-2 text-xs items-center">
          <div className="flex rounded-xl bg-surface-2 ring-1 ring-line p-0.5">
            {(["basic", "syncopated"] as Level[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLevel(l);
                  setPhase("idle");
                }}
                className={`px-2.5 py-1 rounded-lg capitalize font-semibold ${level === l ? "bg-accent text-white" : "text-muted"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-surface-2 ring-1 ring-line px-3 py-1.5">
            <input type="range" min={60} max={132} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} disabled={phase === "countin" || phase === "playing"} className="w-20" aria-label="Tempo" />
            <span className="tabular-nums">{bpm} BPM</span>
          </label>
        </div>
      }
    >
      {phase === "done" ? (
        <ExerciseResult
          exercise="rhythm"
          score={Math.round(totalPts / 10)}
          accuracy={totalMax ? (totalPts / totalMax) * 100 : 0}
          detail={`${level}@${bpm}`}
          onRetry={begin}
          lines={[
            ["Average timing error", `${meanErr.toFixed(0)} ms`],
            ["Tendency", Math.abs(bias) < 12 ? "Right on the beat" : bias < 0 ? `Rushing (${Math.abs(bias).toFixed(0)} ms early)` : `Dragging (${bias.toFixed(0)} ms late)`],
            ["Tempo", `${bpm} BPM`],
          ]}
        />
      ) : phase === "idle" ? (
        <div className="card p-8 text-center max-w-md mx-auto my-auto">
          <Drum className="mx-auto text-accent-2" size={32} />
          <h2 className="font-display text-xl font-bold mt-2">Lock into the groove</h2>
          <p className="text-sm text-muted mt-2">{ROUNDS} one-bar rhythms. After a 4-click count-in, tap each note of the pattern. Timing is measured on the audio clock.</p>
          <button className="btn btn-primary mt-5" onClick={begin} autoFocus>
            Start
          </button>
        </div>
      ) : (
        <div className="card flex-1 flex flex-col items-center justify-center gap-5 p-4 sm:p-6">
          <ProgressDots total={ROUNDS} results={results.map((r) => r.points / r.max >= 0.7)} />
          {/* Timeline */}
          <div className="w-full max-w-3xl">
            <div className="relative h-24 rounded-xl bg-surface-2 ring-1 ring-line overflow-hidden">
              {[0, 1, 2, 3].map((b) => (
                <div key={b} className="absolute top-0 bottom-0 border-l border-line-strong" style={{ left: `${b * 25}%` }}>
                  <span className="absolute top-1 left-1 text-[10px] text-faint">{b + 1}</span>
                </div>
              ))}
              {pattern.map((p, i) => {
                const m = last?.matched[i];
                return (
                  <div
                    key={i}
                    className={`absolute top-6 h-8 w-3 -ml-1.5 rounded-md ${last ? (m != null ? "bg-good" : "bg-bad") : "bg-accent-2"}`}
                    style={{ left: `${(p / 4) * 100}%`, boxShadow: "0 0 12px currentColor" }}
                  />
                );
              })}
              {taps.map((t, i) => (
                <div key={i} className="absolute bottom-2 h-5 w-1 -ml-0.5 rounded bg-warn" style={{ left: `${Math.max(0, Math.min(100, xOf(t)))}%` }} />
              ))}
              <div ref={playhead} className={`absolute top-0 bottom-0 w-0.5 bg-white/80 ${phase === "playing" || phase === "countin" ? "" : "hidden"}`} style={{ left: 0 }} />
            </div>
            <div className="flex justify-between text-[11px] text-faint mt-1">
              <span>Blue = notes to tap · Yellow = your taps</span>
              <span>
                Round {round + 1}/{ROUNDS}
              </span>
            </div>
          </div>
          <Feedback kind={fb.kind} text={fb.text} />
          <div className="flex flex-wrap gap-2 justify-center">
            {phase === "ready" && (
              <>
                <button className="btn btn-ghost" onClick={demo}>
                  <Volume2 size={16} /> Hear it
                </button>
                <button className="btn btn-primary" onClick={go} autoFocus>
                  <Play size={16} /> Go
                </button>
              </>
            )}
            {phase === "review" && (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setResults((r) => r.slice(0, -1));
                    setLast(null);
                    go();
                  }}
                >
                  Retry bar
                </button>
                <button className="btn btn-primary" onClick={nextRound} autoFocus>
                  {round + 1 >= ROUNDS ? "See results" : "Next rhythm"}
                </button>
              </>
            )}
          </div>
          <button
            className="select-none touch-none h-24 w-full max-w-sm rounded-2xl bg-gradient-to-br from-accent/30 to-accent-2/30 ring-1 ring-accent/40 font-display text-2xl font-bold active:scale-95 transition-transform"
            onPointerDown={(e) => {
              e.preventDefault();
              audio.schedule(76, (audio.ctx?.currentTime ?? 0), 0.08, 0.5);
              tap(audio.now());
            }}
          >
            TAP
          </button>
        </div>
      )}
    </ExerciseLayout>
  );
}
