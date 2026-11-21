"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EXERCISES } from "@/lib/exercises";
import { useProgress } from "@/store/progress";

export default function PracticePage() {
  const history = useProgress((s) => s.progress.practiceHistory);
  const stats = useMemo(() => {
    const m: Record<string, { count: number; best: number; last: number; trend: number[] }> = {};
    for (const h of history) {
      const s = (m[h.exercise] ??= { count: 0, best: 0, last: 0, trend: [] });
      s.count++;
      s.best = Math.max(s.best, h.accuracy);
      s.last = h.accuracy;
      s.trend.push(h.accuracy);
    }
    return m;
  }, [history]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-10">
      <PageHeader title="Practice" subtitle="Short, focused drills with instant feedback. Your results are tracked over time." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXERCISES.map((ex, i) => {
          const s = stats[ex.id];
          const trend = s?.trend.slice(-10) ?? [];
          return (
            <motion.div key={ex.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/practice/${ex.id}`} className="card p-5 flex flex-col gap-3 h-full group hover:ring-1 hover:ring-accent/50 transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-accent/30 to-accent-2/30 ring-1 ring-line flex items-center justify-center">
                    <Icon name={ex.icon} className="text-accent-2" />
                  </div>
                  <div>
                    <div className="font-semibold">{ex.title}</div>
                    <div className="text-xs text-muted">{ex.skill}</div>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-faint group-hover:text-accent-2 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm text-muted">{ex.description}</p>
                <div className="mt-auto flex items-end justify-between gap-3">
                  <div className="text-xs text-muted">
                    {s ? (
                      <>
                        <div>
                          Best <b className="text-fg">{s.best.toFixed(0)}%</b> · Last <b className="text-fg">{s.last.toFixed(0)}%</b>
                        </div>
                        <div>{s.count} session{s.count > 1 ? "s" : ""}</div>
                      </>
                    ) : (
                      "Not tried yet"
                    )}
                  </div>
                  {trend.length > 1 && (
                    <svg viewBox={`0 0 ${(trend.length - 1) * 10} 30`} className="h-8 w-24" preserveAspectRatio="none" aria-label="Accuracy trend">
                      <polyline
                        fill="none"
                        stroke="var(--accent-2)"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        points={trend.map((v, j) => `${j * 10},${30 - (v / 100) * 28}`).join(" ")}
                      />
                    </svg>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
