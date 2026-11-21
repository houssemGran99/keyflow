"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { subscribeNotes, type NoteEvent } from "@/lib/input";
import { useProgress } from "@/store/progress";
import type { ExerciseId } from "@/lib/types";
import { PianoKeyboard, type KeyHint } from "@/components/piano/PianoKeyboard";

export function useNoteOn(handler: (e: NoteEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribeNotes((e) => e.type === "on" && ref.current(e)), []);
}

export function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 640px)");
    const f = () => setM(q.matches);
    f();
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  return m;
}

export function ExerciseLayout({
  title, subtitle, children, hints, low = 48, high = 84, keyboard = true, toolbar,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  hints?: Record<number, KeyHint>;
  low?: number;
  high?: number;
  keyboard?: boolean;
  toolbar?: ReactNode;
}) {
  const mobile = useIsMobile();
  const lo = mobile ? Math.max(low, 60) : low;
  const hi = mobile ? Math.min(high, lo + 24) : high;
  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-4 pt-4 pb-24 md:pb-6 flex flex-col gap-4 min-h-[calc(100dvh-56px)]">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/practice" className="btn btn-ghost btn-icon" aria-label="Back to practice">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {toolbar}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
      {keyboard && (
        <div className="sticky bottom-[calc(60px+env(safe-area-inset-bottom))] md:static z-30">
          <PianoKeyboard low={lo} high={hi} hints={hints} height="clamp(120px, 24vh, 210px)" />
        </div>
      )}
    </main>
  );
}

export function Feedback({ kind, text }: { kind: "good" | "bad" | "info" | null; text: string }) {
  if (!kind) return <div className="h-8" />;
  return (
    <motion.div
      key={text + kind}
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`h-8 text-center font-semibold ${kind === "good" ? "text-good" : kind === "bad" ? "text-bad" : "text-muted"}`}
    >
      {text}
    </motion.div>
  );
}

export function ProgressDots({ total, results }: { total: number; results: (boolean | null)[] }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-6 rounded-full ${
            results[i] === true ? "bg-good" : results[i] === false ? "bg-bad" : i === results.length ? "bg-accent-2 animate-pulse" : "bg-surface-3"
          }`}
        />
      ))}
    </div>
  );
}

/** Saves the result once and shows a summary with history for this exercise. */
export function ExerciseResult({
  exercise, score, accuracy, detail, onRetry, lines,
}: {
  exercise: ExerciseId;
  score: number;
  accuracy: number;
  detail?: string;
  onRetry: () => void;
  lines: [string, string][];
}) {
  const saved = useRef(false);
  const all = useProgress((s) => s.progress.practiceHistory);
  const history = useMemo(() => all.filter((h) => h.exercise === exercise), [all, exercise]);
  const [prevBest] = useState(() => Math.max(0, ...history.map((h) => h.score)));
  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    useProgress.getState().recordPractice({ exercise, score, accuracy, date: Date.now(), detail });
  }, [exercise, score, accuracy, detail]);
  const recent = history.slice(-12);
  const max = Math.max(1, ...recent.map((h) => h.accuracy));
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-6 max-w-md w-full mx-auto text-center">
      <Trophy className="mx-auto text-warn" size={32} />
      <h2 className="font-display text-2xl font-bold mt-2">Exercise complete</h2>
      {score > prevBest && history.length > 1 && <div className="chip text-warn mt-2">New best!</div>}
      <div className="grid grid-cols-2 gap-3 my-5">
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Score</div>
          <div className="text-2xl font-bold tabular-nums">{score}</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Accuracy</div>
          <div className="text-2xl font-bold tabular-nums">{accuracy.toFixed(0)}%</div>
        </div>
      </div>
      <div className="text-sm text-left flex flex-col gap-1 mb-4">
        {lines.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-muted">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      {recent.length > 1 && (
        <div className="mb-5">
          <div className="text-xs text-muted mb-2 text-left">Your last {recent.length} attempts (accuracy)</div>
          <div className="flex items-end gap-1 h-14">
            {recent.map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-accent to-accent-2" style={{ height: `${Math.max(6, (h.accuracy / max) * 100)}%`, opacity: i === recent.length - 1 ? 1 : 0.55 }} />
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-center">
        <button className="btn btn-primary" onClick={onRetry} autoFocus>
          <RotateCcw size={16} /> Try again
        </button>
        <Link href="/practice" className="btn btn-ghost">
          All exercises
        </Link>
      </div>
    </motion.div>
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
