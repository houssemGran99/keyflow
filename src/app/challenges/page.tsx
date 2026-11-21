"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarCheck, Crown, Medal, Swords, Target } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui";
import { SongCard } from "@/components/SongCard";
import { BUILTIN_SONGS } from "@/data/songs";
import { getDailyChallenge } from "@/data/daily";
import { CHALLENGE_LEVELS } from "@/lib/scoring";
import { useProgress } from "@/store/progress";
import { useLibrary } from "@/store/library";
import type { ChallengeLevel, ScoreEntry } from "@/lib/types";

const GRADE_CLS: Record<string, string> = {
  S: "text-amber-300", A: "text-emerald-300", B: "text-sky-300", C: "text-violet-300", D: "text-rose-300",
};

export default function ChallengesPage() {
  const [level, setLevel] = useState<ChallengeLevel>("normal");
  const progress = useProgress((s) => s.progress);
  const userSongs = useLibrary((s) => s.userSongs);
  const daily = getDailyChallenge();
  const dailyDone = progress.dailyCompleted.includes(daily.day);

  const best = useMemo(() => {
    const m = new Map<string, ScoreEntry>();
    for (const s of progress.challengeScores) {
      const k = `${s.songId}:${s.level}`;
      if (!m.has(k) || m.get(k)!.score < s.score) m.set(k, s);
    }
    return m;
  }, [progress.challengeScores]);

  const leaderboard = useMemo(
    () => [...progress.challengeScores].sort((a, b) => b.score - a.score).slice(0, 10),
    [progress.challengeScores]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-10">
      <PageHeader title="Rhythm Challenges" subtitle="Hit every note on time. Perfect 100 · Great 75 · Good 50 · Miss 0, multiplied by your combo." />

      {/* Daily */}
      <div className="card p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/15 via-transparent to-accent-2/15 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center shrink-0">
            <CalendarCheck className="text-white" size={22} />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.2em] text-accent-2 font-semibold">Daily challenge · {daily.day}</div>
            <div className="font-display text-xl font-bold">{daily.song.title}</div>
            <div className="text-sm text-muted">
              {CHALLENGE_LEVELS[daily.level].name} difficulty · reach <b className="text-fg">{daily.targetAccuracy}%</b> accuracy for +100 XP
            </div>
          </div>
          {dailyDone ? (
            <span className="chip text-good self-start sm:self-center">Completed today ✓</span>
          ) : null}
          <Link href="/challenges/play?daily=1" className="btn btn-primary">
            <Target size={16} /> {dailyDone ? "Play again" : "Take the challenge"}
          </Link>
        </div>
      </div>

      {/* Level picker */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {Object.values(CHALLENGE_LEVELS).map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={`text-left rounded-xl p-3 ring-1 transition-colors ${
              level === l.id ? "bg-accent/20 ring-accent" : "bg-surface-2 ring-line hover:bg-surface-3"
            }`}
          >
            <div className="font-semibold flex items-center gap-2">
              <Swords size={14} /> {l.name}
            </div>
            <div className="text-xs text-muted mt-0.5">{l.description}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 content-start">
          {[...BUILTIN_SONGS, ...userSongs].map((s) => {
            const b = best.get(`${s.id}:${level}`);
            return (
              <SongCard
                key={s.id}
                song={s}
                href={`/challenges/play?song=${s.id}&level=${level}`}
                cta="Challenge"
                extra={
                  <div className="flex items-center justify-between text-xs rounded-lg bg-surface-2 px-3 py-2 relative">
                    <span className="text-muted">Best ({CHALLENGE_LEVELS[level].name})</span>
                    {b ? (
                      <span className="flex items-center gap-2 tabular-nums">
                        <b>{b.score.toLocaleString()}</b>
                        <span className={`font-black ${GRADE_CLS[b.grade]}`}>{b.grade}</span>
                      </span>
                    ) : (
                      <span className="text-faint">Not played</span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>

        <aside className="card p-4 h-fit lg:sticky lg:top-20">
          <h2 className="font-display font-bold flex items-center gap-2 mb-3">
            <Crown size={16} className="text-warn" /> Your top scores
          </h2>
          {leaderboard.length === 0 ? (
            <EmptyState icon={<Medal size={28} />} title="No scores yet" body="Finish a challenge to start your local leaderboard." />
          ) : (
            <ol className="flex flex-col gap-1.5">
              {leaderboard.map((e, i) => (
                <li key={e.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span className={`w-5 text-center font-bold ${i < 3 ? "text-warn" : "text-faint"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.songTitle}</div>
                    <div className="text-[11px] text-muted">
                      {CHALLENGE_LEVELS[e.level].name} · {e.accuracy.toFixed(1)}% · {e.maxCombo}x
                    </div>
                  </div>
                  <span className="tabular-nums font-semibold">{e.score.toLocaleString()}</span>
                  <span className={`font-black ${GRADE_CLS[e.grade]}`}>{e.grade}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  );
}
