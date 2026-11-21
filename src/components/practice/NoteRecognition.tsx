"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "@/lib/audio";
import { isBlack, noteName, pitchClass } from "@/lib/music";
import { ExerciseLayout, ExerciseResult, Feedback, ProgressDots, pick, useNoteOn } from "./shared";
import { Staff } from "./Staff";

const ROUNDS = 10;
type ClefMode = "treble" | "bass" | "both";

function randomNote(clef: "treble" | "bass", sharps: boolean, prev: number | null) {
  const [lo, hi] = clef === "treble" ? [60, 81] : [40, 60];
  const pool: number[] = [];
  for (let m = lo; m <= hi; m++) if ((sharps || !isBlack(m)) && m !== prev) pool.push(m);
  return pick(pool);
}

export function NoteRecognition() {
  const [clefMode, setClefMode] = useState<ClefMode>("treble");
  const [sharps, setSharps] = useState(false);
  const [strict, setStrict] = useState(false);
  const [round, setRound] = useState<{ midi: number; clef: "treble" | "bass" } | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [missedThis, setMissedThis] = useState(false);
  const [fb, setFb] = useState<{ kind: "good" | "bad" | null; text: string }>({ kind: null, text: "" });
  const [times, setTimes] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const shownAt = useRef(0);
  const locked = useRef(false);

  const next = useCallback(
    (prev: number | null) => {
      const clef = clefMode === "both" ? pick(["treble", "bass"] as const) : clefMode;
      setRound({ midi: randomNote(clef, sharps, prev), clef });
      setMissedThis(false);
      shownAt.current = performance.now();
      locked.current = false;
    },
    [clefMode, sharps]
  );

  const start = () => {
    setResults([]);
    setTimes([]);
    setDone(false);
    setStarted(true);
    setFb({ kind: null, text: "" });
    next(null);
  };

  useEffect(() => {
    if (started && !done) next(round?.midi ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clefMode, sharps]);

  useNoteOn((e) => {
    if (!round || done || locked.current) return;
    const ok = strict ? e.midi === round.midi : pitchClass(e.midi) === pitchClass(round.midi);
    if (ok) {
      locked.current = true;
      audio.blip("good");
      const firstTry = !missedThis;
      const nr = [...results, firstTry];
      setResults(nr);
      setTimes((t) => [...t, (performance.now() - shownAt.current) / 1000]);
      setFb({ kind: "good", text: firstTry ? `Yes! ${noteName(round.midi)}` : `That's it — ${noteName(round.midi)}` });
      setTimeout(() => {
        if (nr.length >= ROUNDS) setDone(true);
        else next(round.midi);
      }, 550);
    } else {
      audio.blip("bad");
      setMissedThis(true);
      setFb({ kind: "bad", text: `Not ${noteName(e.midi, strict)} — look for the highlighted key` });
    }
  });

  const correct = results.filter(Boolean).length;
  const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;

  return (
    <ExerciseLayout
      title="Note Recognition"
      subtitle={`Read the note on the staff and play it${strict ? " in the exact octave" : " (any octave)"}.`}
      hints={round && missedThis ? { [strict ? round.midi : 60 + pitchClass(round.midi)]: "target" } : undefined}
      low={36}
      high={84}
      toolbar={
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex rounded-xl bg-surface-2 ring-1 ring-line p-0.5">
            {(["treble", "bass", "both"] as ClefMode[]).map((c) => (
              <button key={c} onClick={() => setClefMode(c)} className={`px-2.5 py-1 rounded-lg capitalize font-semibold ${clefMode === c ? "bg-accent text-white" : "text-muted"}`}>
                {c}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost py-1" data-on={sharps} onClick={() => setSharps(!sharps)}>
            Sharps
          </button>
          <button className="btn btn-ghost py-1" data-on={strict} onClick={() => setStrict(!strict)}>
            Exact octave
          </button>
        </div>
      }
    >
      {done ? (
        <ExerciseResult
          exercise="notes"
          score={correct * 10 + Math.round(Math.max(0, (4 - avgTime) * 10) * (correct / ROUNDS))}
          accuracy={(correct / ROUNDS) * 100}
          detail={`${clefMode}${sharps ? "+sharps" : ""}`}
          onRetry={start}
          lines={[
            ["Correct on first try", `${correct} / ${ROUNDS}`],
            ["Average response time", `${avgTime.toFixed(2)} s`],
            ["Clef", clefMode],
          ]}
        />
      ) : !started ? (
        <div className="card p-8 text-center max-w-md mx-auto my-auto">
          <h2 className="font-display text-xl font-bold">Ready to read some notes?</h2>
          <p className="text-sm text-muted mt-2">{ROUNDS} notes will appear on the staff. Play each one on the keyboard. If you miss, the right key lights up.</p>
          <button className="btn btn-primary mt-5" onClick={start} autoFocus>
            Start
          </button>
        </div>
      ) : (
        <div className="card flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <ProgressDots total={ROUNDS} results={results} />
          {round && <Staff midi={round.midi} clef={round.clef} state={fb.kind === "good" ? "good" : missedThis ? "bad" : null} />}
          <Feedback kind={fb.kind} text={fb.text} />
        </div>
      )}
    </ExerciseLayout>
  );
}
