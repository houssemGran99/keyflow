"use client";
import { useMemo, useRef, useState } from "react";
import { audio } from "@/lib/audio";
import { SCALES, noteName, scaleNotes } from "@/lib/music";
import { ExerciseLayout, ExerciseResult, Feedback, useNoteOn } from "./shared";

export function Scales() {
  const [scaleId, setScaleId] = useState("c-major");
  const [guided, setGuided] = useState(true);
  const [descend, setDescend] = useState(true);
  const scale = SCALES.find((s) => s.id === scaleId)!;
  const notes = useMemo(() => scaleNotes(scale.root, scale.steps, descend), [scale, descend]);
  const [pos, setPos] = useState(0);
  const [errors, setErrors] = useState(0);
  const [errAt, setErrAt] = useState<Set<number>>(new Set());
  const [stamps, setStamps] = useState<number[]>([]);
  const [fb, setFb] = useState<{ kind: "good" | "bad" | "info" | null; text: string }>({ kind: "info", text: "Play the first note to begin" });
  const [done, setDone] = useState(false);
  const runId = useRef(0);

  const reset = () => {
    runId.current++;
    setPos(0);
    setErrors(0);
    setErrAt(new Set());
    setStamps([]);
    setDone(false);
    setFb({ kind: "info", text: "Play the first note to begin" });
  };

  useNoteOn((e) => {
    if (done) return;
    const target = notes[pos];
    if (e.midi === target) {
      const st = [...stamps, e.time];
      setStamps(st);
      const np = pos + 1;
      setPos(np);
      setFb({ kind: "good", text: noteName(target) });
      if (np >= notes.length) {
        audio.blip("good");
        setDone(true);
      }
    } else {
      setErrors((x) => x + 1);
      setErrAt((s) => new Set(s).add(pos));
      setFb({ kind: "bad", text: `Expected ${guided ? noteName(target) : "a different note"}, you played ${noteName(e.midi)}` });
    }
  });

  // Evenness: coefficient of variation of the gaps between notes.
  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
  const mean = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const sd = gaps.length ? Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length) : 0;
  const evenness = mean ? Math.max(0, Math.min(100, 100 - (sd / mean) * 100)) : 0;
  const accuracy = (notes.length / (notes.length + errors)) * 100;
  const tempo = mean ? Math.round(60 / mean) : 0;

  const hints: Record<number, "target"> = {};
  if (!done && (guided || pos === 0)) hints[notes[pos]] = "target";

  return (
    <ExerciseLayout
      title="Scales"
      subtitle={`${scale.name}${descend ? ", up and down" : ", ascending"}. Keep an even tempo.`}
      hints={hints}
      low={48}
      high={84}
      toolbar={
        <div className="flex flex-wrap gap-2 text-xs items-center">
          <select
            value={scaleId}
            onChange={(e) => {
              setScaleId(e.target.value);
              reset();
            }}
            className="rounded-xl bg-surface-2 ring-1 ring-line px-3 py-2 outline-none"
            aria-label="Scale"
          >
            {SCALES.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface">
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost py-1.5" data-on={guided} onClick={() => setGuided(!guided)} title="Highlight each next key">
            Guided
          </button>
          <button
            className="btn btn-ghost py-1.5"
            data-on={descend}
            onClick={() => {
              setDescend(!descend);
              reset();
            }}
          >
            Up &amp; down
          </button>
        </div>
      }
    >
      {done ? (
        <ExerciseResult
          key={runId.current}
          exercise="scales"
          score={Math.round(accuracy * 0.7 + evenness * 0.3)}
          accuracy={accuracy}
          detail={scale.name}
          onRetry={reset}
          lines={[
            ["Scale", scale.name],
            ["Wrong notes", String(errors)],
            ["Evenness", `${evenness.toFixed(0)}%`],
            ["Average tempo", `${tempo} notes/min`],
            ["Mode", guided ? "Guided" : "From memory"],
          ]}
        />
      ) : (
        <div className="card flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="flex flex-wrap justify-center gap-1.5 max-w-3xl">
            {notes.map((m, i) => (
              <span
                key={i}
                className={`min-w-11 rounded-lg px-2 py-2 text-center text-sm font-mono font-semibold ring-1 transition-colors ${
                  i < pos
                    ? errAt.has(i)
                      ? "bg-warn/15 ring-warn/40 text-warn"
                      : "bg-good/15 ring-good/40 text-good"
                    : i === pos
                      ? "bg-accent-2/20 ring-accent-2 text-fg scale-110"
                      : "bg-surface-2 ring-line text-muted"
                }`}
              >
                {guided || i < pos ? noteName(m) : "?"}
              </span>
            ))}
          </div>
          <div className="w-full max-w-md h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${(pos / notes.length) * 100}%` }} />
          </div>
          <Feedback kind={fb.kind} text={fb.text} />
          <button className="btn btn-ghost" onClick={reset}>
            Restart
          </button>
        </div>
      )}
    </ExerciseLayout>
  );
}
