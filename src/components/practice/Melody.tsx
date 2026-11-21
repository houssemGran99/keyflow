"use client";
import { useEffect, useRef, useState } from "react";
import { Heart, Ear } from "lucide-react";
import { audio } from "@/lib/audio";
import { noteName } from "@/lib/music";
import { playNotes, type PlaybackHandle } from "@/lib/playback";
import { ExerciseLayout, ExerciseResult, Feedback, pick, useNoteOn } from "./shared";

const POOLS = {
  pentatonic: { name: "C pentatonic (5 notes)", notes: [60, 62, 64, 67, 69] },
  major: { name: "C major (8 notes)", notes: [60, 62, 64, 65, 67, 69, 71, 72] },
  chromatic: { name: "Chromatic (13 notes)", notes: Array.from({ length: 13 }, (_, i) => 60 + i) },
};
type PoolId = keyof typeof POOLS;
const LIVES = 3;

export function Melody() {
  const [poolId, setPoolId] = useState<PoolId>("pentatonic");
  const [seq, setSeq] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [phase, setPhase] = useState<"idle" | "listen" | "play" | "done">("idle");
  const [lives, setLives] = useState(LIVES);
  const [best, setBest] = useState(0);
  const [attempts, setAttempts] = useState({ ok: 0, total: 0 });
  const [fb, setFb] = useState<{ kind: "good" | "bad" | "info" | null; text: string }>({ kind: null, text: "" });
  const pb = useRef<PlaybackHandle | null>(null);
  const pool = POOLS[poolId].notes;

  useEffect(() => () => pb.current?.stop(), []);

  const playSeq = async (s: number[]) => {
    setPhase("listen");
    setInput([]);
    setFb({ kind: "info", text: "Listen…" });
    pb.current?.stop();
    const gap = Math.max(0.32, 0.55 - s.length * 0.02);
    const h = playNotes(s.map((m, i) => ({ midi: m, startTime: i * gap, duration: gap * 0.85, velocity: 0.7, track: 0 })));
    pb.current = h;
    await h.done;
    if (pb.current !== h) return;
    setPhase("play");
    setFb({ kind: "info", text: "Your turn — play it back" });
  };

  const start = () => {
    audio.ensure();
    const first = [pick(pool), pick(pool), pick(pool)];
    setSeq(first);
    setLives(LIVES);
    setBest(0);
    setAttempts({ ok: 0, total: 0 });
    setTimeout(() => playSeq(first), 300);
  };

  useNoteOn((e) => {
    if (phase !== "play") return;
    const idx = input.length;
    if (e.midi === seq[idx]) {
      const ni = [...input, e.midi];
      setInput(ni);
      if (ni.length === seq.length) {
        audio.blip("good");
        setBest(seq.length);
        setAttempts((a) => ({ ok: a.ok + 1, total: a.total + 1 }));
        setFb({ kind: "good", text: `Perfect! Length ${seq.length + 1} next` });
        setPhase("listen");
        const ns = [...seq, pick(pool)];
        setSeq(ns);
        setTimeout(() => playSeq(ns), 900);
      }
    } else {
      audio.blip("bad");
      const nl = lives - 1;
      setLives(nl);
      setAttempts((a) => ({ ok: a.ok, total: a.total + 1 }));
      setFb({ kind: "bad", text: `Oops — note ${idx + 1} was ${noteName(seq[idx])}` });
      setPhase("listen");
      if (nl <= 0) setTimeout(() => setPhase("done"), 900);
      else setTimeout(() => playSeq(seq), 1400);
    }
  });

  return (
    <ExerciseLayout
      title="Melody Reproduction"
      subtitle="Listen to the melody, then play it back. It grows by one note every round."
      low={48}
      high={84}
      toolbar={
        <select
          value={poolId}
          onChange={(e) => {
            setPoolId(e.target.value as PoolId);
            setPhase("idle");
          }}
          className="rounded-xl bg-surface-2 ring-1 ring-line px-3 py-2 text-xs outline-none"
          aria-label="Note pool"
        >
          {Object.entries(POOLS).map(([id, p]) => (
            <option key={id} value={id} className="bg-surface">
              {p.name}
            </option>
          ))}
        </select>
      }
    >
      {phase === "done" ? (
        <ExerciseResult
          exercise="melody"
          score={best * 10}
          accuracy={attempts.total ? (attempts.ok / attempts.total) * 100 : 0}
          detail={`${poolId}:${best}`}
          onRetry={start}
          lines={[
            ["Longest melody", `${best} notes`],
            ["Rounds cleared", `${attempts.ok} / ${attempts.total}`],
            ["Note pool", POOLS[poolId].name],
          ]}
        />
      ) : phase === "idle" ? (
        <div className="card p-8 text-center max-w-md mx-auto my-auto">
          <Ear className="mx-auto text-accent-2" size={32} />
          <h2 className="font-display text-xl font-bold mt-2">Echo the melody</h2>
          <p className="text-sm text-muted mt-2">Melodies start with 3 notes from middle C upward. You have {LIVES} lives. Watch the keys light up as it plays.</p>
          <button className="btn btn-primary mt-5" onClick={start} autoFocus>
            Start
          </button>
        </div>
      ) : (
        <div className="card flex-1 flex flex-col items-center justify-center gap-5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex gap-1" aria-label={`${lives} lives`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Heart key={i} size={18} className={i < lives ? "text-bad fill-bad" : "text-faint"} />
              ))}
            </div>
            <div className="text-sm text-muted">Length <b className="text-fg">{seq.length}</b></div>
            <div className="text-sm text-muted">Best <b className="text-fg">{best}</b></div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {seq.map((m, i) => (
              <span
                key={i}
                className={`h-10 w-10 rounded-xl ring-1 flex items-center justify-center text-xs font-mono font-semibold ${
                  i < input.length ? "bg-good/20 ring-good/50 text-good" : phase === "play" && i === input.length ? "ring-accent-2 bg-accent-2/10" : "ring-line bg-surface-2 text-faint"
                }`}
              >
                {i < input.length ? noteName(m, false) : "•"}
              </span>
            ))}
          </div>
          <Feedback kind={fb.kind} text={fb.text} />
          <button className="btn btn-ghost" onClick={() => playSeq(seq)} disabled={phase !== "play"}>
            Hear it again
          </button>
        </div>
      )}
    </ExerciseLayout>
  );
}
