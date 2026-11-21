"use client";
import { motion, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { RotateCcw, SkipForward, List, Trophy, Sparkles } from "lucide-react";
import type { Grade, Judgement } from "@/lib/types";

interface Props {
  title: string;
  subtitle: string;
  score?: number;
  accuracy: number;
  maxCombo: number;
  grade: Grade;
  counts: Record<Judgement, number>;
  wrongNotes: number;
  newBest?: boolean;
  extra?: string;
  onReplay: () => void;
  onNext?: () => void;
  nextLabel?: string;
  onBack: () => void;
  mode: "learn" | "challenge";
}

const GRADE_COLOR: Record<Grade, string> = {
  S: "from-amber-300 via-yellow-200 to-amber-400",
  A: "from-emerald-300 to-cyan-300",
  B: "from-sky-300 to-indigo-300",
  C: "from-violet-300 to-fuchsia-300",
  D: "from-rose-300 to-orange-300",
};

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration: 1.2, ease: "easeOut", onUpdate: setV });
    return () => c.stop();
  }, [value]);
  return <>{decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()}</>;
}

export function GameResults(p: Props) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="card w-full max-w-lg p-6 sm:p-8 text-center relative overflow-hidden"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-accent/25 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.25em] text-muted font-semibold">{p.subtitle}</div>
          <h2 className="font-display text-2xl font-bold mt-1">{p.title}</h2>
          <motion.div
            initial={{ scale: 2.4, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 12 }}
            className={`font-display text-[7rem] leading-none font-black bg-gradient-to-br ${GRADE_COLOR[p.grade]} bg-clip-text text-transparent my-3 drop-shadow-[0_0_30px_rgba(139,92,246,0.45)]`}
          >
            {p.grade}
          </motion.div>
          {p.newBest && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="inline-flex items-center gap-1.5 chip text-warn mb-3">
              <Trophy size={12} /> New personal best!
            </motion.div>
          )}
          <div className="grid grid-cols-3 gap-3 my-4">
            {p.score !== undefined && (
              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line">
                <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Score</div>
                <div className="text-xl font-bold tabular-nums"><CountUp value={p.score} /></div>
              </div>
            )}
            <div className={`rounded-xl bg-surface-2 p-3 ring-1 ring-line ${p.score === undefined ? "col-span-2" : ""}`}>
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Accuracy</div>
              <div className="text-xl font-bold tabular-nums"><CountUp value={p.accuracy} decimals={1} />%</div>
            </div>
            <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line">
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Max combo</div>
              <div className="text-xl font-bold tabular-nums"><CountUp value={p.maxCombo} /></div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs mb-5">
            {(
              [
                ["Perfect", p.counts.perfect, "text-amber-300"],
                ["Great", p.counts.great, "text-emerald-300"],
                ["Good", p.counts.good, "text-sky-300"],
                ["Miss", p.counts.miss, "text-rose-300"],
                ["Wrong", p.wrongNotes, "text-faint"],
              ] as const
            ).map(([l, v, c]) => (
              <div key={l} className="rounded-lg bg-surface-2/70 py-2">
                <div className={`font-bold text-base tabular-nums ${c}`}>{v}</div>
                <div className="text-muted">{l}</div>
              </div>
            ))}
          </div>
          {p.extra && (
            <div className="text-sm text-muted mb-4 flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-accent-2" /> {p.extra}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button className="btn btn-primary" onClick={p.onReplay} autoFocus>
              <RotateCcw size={16} /> {p.mode === "learn" ? "Practice again" : "Replay"}
            </button>
            {p.onNext && (
              <button className="btn btn-ghost" onClick={p.onNext}>
                <SkipForward size={16} /> {p.nextLabel ?? "Next challenge"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={p.onBack}>
              <List size={16} /> Back to list
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
