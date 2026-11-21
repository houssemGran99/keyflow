"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CalendarCheck, Clock, Dumbbell, Flame, Music, Piano, Swords, Trophy, Target } from "lucide-react";
import { PianoKeyboard } from "@/components/piano/PianoKeyboard";
import { Stat } from "@/components/ui";
import { SongCard } from "@/components/SongCard";
import { BUILTIN_SONGS, POPULAR_IDS } from "@/data/songs";
import { getDailyChallenge } from "@/data/daily";
import { CHALLENGE_LEVELS, currentStreak, skillFromXp } from "@/lib/scoring";
import { useProgress } from "@/store/progress";
import { findSong, useLibrary } from "@/store/library";
import { useSettings } from "@/store/settings";

const MODES = [
  { href: "/play", title: "Free Play", body: "Record, loop and export your own ideas.", icon: Piano },
  { href: "/learn", title: "Learn Songs", body: "Falling notes that wait for you.", icon: BookOpen },
  { href: "/challenges", title: "Challenges", body: "Timing, combos and S-ranks.", icon: Swords },
  { href: "/practice", title: "Practice", body: "Notes, scales, chords, ear & rhythm.", icon: Dumbbell },
];

export default function Home() {
  const progress = useProgress((s) => s.progress);
  const hydrated = useProgress((s) => s.hydrated);
  useLibrary((s) => s.userSongs);
  const kbOct = useSettings((s) => s.keyboardOctave);
  const daily = getDailyChallenge();
  const dailyDone = progress.dailyCompleted.includes(daily.day);
  const skill = skillFromXp(progress.xp);
  const last = findSong(progress.lastSongId);
  const nextUp = last ?? BUILTIN_SONGS.find((s) => !progress.songsCompleted.includes(s.id)) ?? BUILTIN_SONGS[0];
  const lastStat = progress.songStats[nextUp.id];
  const popular = POPULAR_IDS.map((id) => BUILTIN_SONGS.find((s) => s.id === id)!).filter(Boolean);
  const previewLow = Math.min(84, (kbOct + 1) * 12);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 md:pb-12">
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-6 grid lg:grid-cols-[1fr_1.15fr] gap-8 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="chip text-accent-2 mb-4">
            <Music size={12} /> {hydrated && progress.notesPlayed > 0 ? `Welcome back · ${skill.level}` : "Welcome to KeyFlow"}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Play piano.<br />
            <span className="text-gradient">Feel the flow.</span>
          </h1>
          <p className="text-muted mt-4 max-w-md">
            Learn real songs with falling notes, chase combos in rhythm challenges, and sharpen your skills with daily practice — right in your browser.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Link href="/learn" className="btn btn-primary px-5 py-3">
              Start learning <ArrowRight size={16} />
            </Link>
            <Link href="/play" className="btn btn-ghost px-5 py-3">
              <Piano size={16} /> Free play
            </Link>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative">
          <div className="absolute -inset-6 bg-gradient-to-tr from-accent/30 to-accent-2/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative card p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs text-muted">Try it — click the keys or type the letters shown on them</span>
              <span className="text-xs text-faint hidden sm:inline">Hold Space to sustain</span>
            </div>
            <PianoKeyboard low={previewLow} high={previewLow + 24} height="clamp(150px, 26vw, 230px)" />
          </div>
        </motion.div>
      </section>

      {/* Mode tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {MODES.map((m, i) => (
          <motion.div key={m.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
            <Link href={m.href} className="card p-4 flex flex-col gap-2 h-full hover:ring-1 hover:ring-accent/50 transition-shadow group">
              <m.icon size={20} className="text-accent-2" />
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs text-muted">{m.body}</div>
            </Link>
          </motion.div>
        ))}
      </section>

      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        {/* Continue learning */}
        <section className="card p-5 lg:col-span-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-accent-2/10 to-transparent pointer-events-none" />
          <div className="text-xs uppercase tracking-[0.2em] text-muted font-semibold">{last ? "Continue learning" : "Start here"}</div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-2 relative">
            <div className="flex-1">
              <div className="font-display text-2xl font-bold">{nextUp.title}</div>
              <div className="text-sm text-muted">{nextUp.artist} · {nextUp.difficulty}</div>
              <div className="mt-3 h-2 rounded-full bg-surface-3 overflow-hidden max-w-md">
                <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${Math.round((lastStat?.bestProgress ?? 0) * 100)}%` }} />
              </div>
              <div className="text-xs text-muted mt-1">
                {lastStat ? `${Math.round(lastStat.bestProgress * 100)}% reached · best accuracy ${lastStat.bestAccuracy.toFixed(0)}%` : "Not started yet"}
              </div>
            </div>
            <Link href={`/learn/play?song=${nextUp.id}`} className="btn btn-primary">
              {last ? "Continue" : "Begin lesson"} <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* Daily challenge */}
        <section className="card p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/25 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent-2 font-semibold">
            <CalendarCheck size={14} /> Daily challenge
          </div>
          <div className="font-display text-xl font-bold mt-2">{daily.song.title}</div>
          <div className="text-sm text-muted">
            {CHALLENGE_LEVELS[daily.level].name} · {daily.targetAccuracy}% accuracy target
          </div>
          <Link href="/challenges/play?daily=1" className={`btn mt-4 w-full ${dailyDone ? "btn-ghost" : "btn-primary"}`}>
            <Target size={16} /> {dailyDone ? "Completed ✓ — play again" : "Play now · +100 XP"}
          </Link>
        </section>
      </div>

      {/* Stats */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-bold mb-3">Your stats</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Skill level" value={skill.level} sub={`${progress.xp.toLocaleString()} XP`} icon={<Trophy size={13} />} />
          <Stat label="Songs completed" value={progress.songsCompleted.length} icon={<Music size={13} />} />
          <Stat label="Practice time" value={`${Math.round(progress.totalPracticeTime / 60)} min`} icon={<Clock size={13} />} />
          <Stat label="Day streak" value={currentStreak(progress.activeDays)} icon={<Flame size={13} />} />
        </div>
      </section>

      {/* Popular */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Popular songs</h2>
          <Link href="/learn" className="text-sm text-accent-2 hover:underline flex items-center gap-1">
            Full library <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((s) => (
            <SongCard key={s.id} song={s} stat={progress.songStats[s.id]} completed={progress.songsCompleted.includes(s.id)} href={`/learn/play?song=${s.id}`} />
          ))}
        </div>
      </section>
    </main>
  );
}
