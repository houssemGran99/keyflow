"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { audio } from "@/lib/audio";
import { CHORD_TYPES, NOTE_NAMES, pitchClass } from "@/lib/music";
import { playNotes } from "@/lib/playback";
import { usePiano } from "@/store/piano";
import { ExerciseLayout, ExerciseResult, Feedback, ProgressDots, pick } from "./shared";

const ROUNDS = 10;
const LEVELS = {
  basic: ["Major", "Minor"],
  triads: ["Major", "Minor", "Diminished", "Augmented"],
  sevenths: ["Major", "Minor", "Dominant 7", "Major 7", "Minor 7"],
} as const;
type Level = keyof typeof LEVELS;

interface Q {
  root: number;
  type: (typeof CHORD_TYPES)[number];
}

function makeQ(level: Level, prev?: Q): Q {
  let q: Q;
  do {
    const name = pick([...LEVELS[level]]);
    q = { root: 55 + Math.floor(Math.random() * 12), type: CHORD_TYPES.find((c) => c.name === name)! };
  } while (prev && q.root === prev.root && q.type.name === prev.type.name);
  return q;
}

const chordMidis = (q: Q) => q.type.intervals.map((i) => q.root + i);
const chordLabel = (q: Q) => `${NOTE_NAMES[pitchClass(q.root)]} ${q.type.name.toLowerCase()}`;

export function Chords() {
  const [mode, setMode] = useState<"ear" | "build">("ear");
  const [level, setLevel] = useState<Level>("basic");
  const [q, setQ] = useState<Q | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [wrongThis, setWrongThis] = useState(false);
  const [fb, setFb] = useState<{ kind: "good" | "bad" | "info" | null; text: string }>({ kind: null, text: "" });
  const [answered, setAnswered] = useState(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const active = usePiano((s) => s.active);
  const lock = useRef(false);

  const play = (qq: Q | null = q) => {
    if (!qq) return;
    const ms = chordMidis(qq);
    // Arpeggiate briefly, then the block chord.
    playNotes(
      [
        ...ms.map((m, i) => ({ midi: m, startTime: i * 0.18, duration: 0.5, velocity: 0.6, track: 0 })),
        ...ms.map((m) => ({ midi: m, startTime: ms.length * 0.18 + 0.15, duration: 1.4, velocity: 0.65, track: 0 })),
      ],
      { highlight: false }
    );
  };

  const nextQ = (prev?: Q) => {
    const nq = makeQ(level, prev);
    setQ(nq);
    setWrongThis(false);
    setAnswered(false);
    lock.current = false;
    setFb({ kind: "info", text: mode === "ear" ? "What kind of chord is this?" : `Play ${chordLabel(nq)} (any inversion or octave)` });
    if (mode === "ear") setTimeout(() => play(nq), 150);
  };

  const start = () => {
    audio.ensure();
    setResults([]);
    setDone(false);
    setStarted(true);
    nextQ();
  };

  useEffect(() => {
    setStarted(false);
    setDone(false);
    setQ(null);
  }, [mode, level]);

  const advance = (ok: boolean) => {
    const nr = [...results, ok];
    setResults(nr);
    setTimeout(() => {
      if (nr.length >= ROUNDS) setDone(true);
      else nextQ(q!);
    }, ok ? 900 : 1600);
  };

  const answerEar = (name: string) => {
    if (!q || answered) return;
    const ok = name === q.type.name;
    setAnswered(true);
    audio.blip(ok ? "good" : "bad");
    setFb({ kind: ok ? "good" : "bad", text: ok ? `Correct — ${chordLabel(q)}` : `It was ${chordLabel(q)}` });
    advance(ok);
  };

  // Build mode: check held notes on every change.
  useEffect(() => {
    if (mode !== "build" || !q || lock.current || done) return;
    const held = Object.keys(active).map(Number);
    if (!held.length) return;
    const want = new Set(q.type.intervals.map((i) => pitchClass(q.root + i)));
    const have = new Set(held.map(pitchClass));
    const stray = [...have].some((p) => !want.has(p));
    if (stray && !wrongThis) {
      setWrongThis(true);
      setFb({ kind: "bad", text: "Not quite — check the chord tones" });
    }
    if (want.size === have.size && [...want].every((p) => have.has(p))) {
      lock.current = true;
      audio.blip("good");
      setFb({ kind: "good", text: `${chordLabel(q)} ✓` });
      advance(!wrongThis);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mode, q]);


  const correct = results.filter(Boolean).length;
  const showAnswer = mode === "build" && q && wrongThis;
  const hints: Record<number, "target"> = {};
  if (showAnswer) for (const m of chordMidis(q!)) hints[m] = "target";

  return (
    <ExerciseLayout
      title="Chord Identification"
      subtitle={mode === "ear" ? "Listen to the chord and name its quality." : "Read the chord name and play it on the keyboard."}
      hints={hints}
      keyboard={mode === "build"}
      low={48}
      high={84}
      toolbar={
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex rounded-xl bg-surface-2 ring-1 ring-line p-0.5">
            {(["ear", "build"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-2.5 py-1 rounded-lg font-semibold ${mode === m ? "bg-accent text-white" : "text-muted"}`}>
                {m === "ear" ? "By ear" : "Build it"}
              </button>
            ))}
          </div>
          <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="rounded-xl bg-surface-2 ring-1 ring-line px-3 outline-none" aria-label="Chord set">
            <option value="basic" className="bg-surface">Major / minor</option>
            <option value="triads" className="bg-surface">All triads</option>
            <option value="sevenths" className="bg-surface">Seventh chords</option>
          </select>
        </div>
      }
    >
      {done ? (
        <ExerciseResult
          exercise="chords"
          score={correct * 10}
          accuracy={(correct / ROUNDS) * 100}
          detail={`${mode}:${level}`}
          onRetry={start}
          lines={[
            ["Correct", `${correct} / ${ROUNDS}`],
            ["Mode", mode === "ear" ? "Ear training" : "Build the chord"],
            ["Chord set", level],
          ]}
        />
      ) : !started ? (
        <div className="card p-8 text-center max-w-md mx-auto my-auto">
          <h2 className="font-display text-xl font-bold">{mode === "ear" ? "Train your ear" : "Build chords"}</h2>
          <p className="text-sm text-muted mt-2">
            {mode === "ear"
              ? `${ROUNDS} chords will play. Choose the right quality for each.`
              : `${ROUNDS} chord names will appear. Hold down all of the chord's notes at once.`}
          </p>
          <button className="btn btn-primary mt-5" onClick={start} autoFocus>
            Start
          </button>
        </div>
      ) : (
        <div className="card flex-1 flex flex-col items-center justify-center gap-5 p-6">
          <ProgressDots total={ROUNDS} results={results} />
          {mode === "ear" ? (
            <>
              <button className="btn btn-ghost text-base px-6 py-4 rounded-2xl" onClick={() => play()}>
                <Volume2 size={22} className="text-accent-2" /> Play chord again
              </button>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {LEVELS[level].map((name) => {
                  const isAnswer = answered && q?.type.name === name;
                  return (
                    <button
                      key={name}
                      disabled={answered}
                      onClick={() => answerEar(name)}
                      className={`btn ${isAnswer ? "bg-good text-white" : "btn-ghost"} min-w-28 py-3`}
                      style={answered ? { opacity: isAnswer ? 1 : 0.5 } : undefined}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            q && <div className="font-display text-5xl font-bold text-gradient">{chordLabel(q).replace(/^\w/, (c) => c.toUpperCase())}</div>
          )}
          <Feedback kind={fb.kind} text={fb.text} />
        </div>
      )}
    </ExerciseLayout>
  );
}
