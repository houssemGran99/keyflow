"use client";
import { create } from "zustand";
import { repository } from "@/lib/repository";
import type { PracticeResult, ScoreEntry, SongStat, UserProgress } from "@/lib/types";
import { dayKey, skillFromXp } from "@/lib/scoring";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import { BUILTIN_SONGS } from "@/data/songs";
import { toast } from "./toasts";

const KEY = "progress";

export const emptyProgress = (): UserProgress => ({
  songsCompleted: [],
  highestScore: 0,
  totalPracticeTime: 0,
  achievements: [],
  skillLevel: "Novice",
  xp: 0,
  songStats: {},
  challengeScores: [],
  practiceHistory: [],
  dailyCompleted: [],
  activeDays: [],
  notesPlayed: 0,
});

interface ProgressState {
  progress: UserProgress;
  hydrated: boolean;
  hydrate: () => void;
  addXp: (xp: number) => void;
  recordSongPlay: (songId: string, progress: number, accuracy: number, completed: boolean) => void;
  recordChallenge: (entry: ScoreEntry) => { newBest: boolean };
  recordPractice: (r: PracticeResult) => void;
  completeDaily: (day: string) => boolean;
  addPracticeTime: (sec: number, notes: number) => void;
  unlock: (id: string) => void;
  reset: () => void;
  importData: (p: UserProgress) => void;
}

const beginnerIds = BUILTIN_SONGS.filter((s) => s.difficulty === "beginner").map((s) => s.id);

function finalize(p: UserProgress, prevAchievements: string[]): UserProgress {
  const unlocked = new Set(p.achievements);
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.check(p, { beginnerSongIds: beginnerIds })) unlocked.add(a.id);
  }
  const today = dayKey();
  const activeDays = p.activeDays.includes(today) ? p.activeDays : [...p.activeDays, today].slice(-400);
  const next: UserProgress = {
    ...p,
    activeDays,
    achievements: [...unlocked],
    skillLevel: skillFromXp(p.xp).level,
    highestScore: Math.max(p.highestScore, ...p.challengeScores.map((s) => s.score), 0),
  };
  for (const id of next.achievements) {
    if (!prevAchievements.includes(id)) {
      const def = ACHIEVEMENT_BY_ID[id];
      if (def) toast(`Achievement unlocked: ${def.title}`, def.description, "achievement");
    }
  }
  return next;
}

export const useProgress = create<ProgressState>()((set, get) => {
  const update = (fn: (p: UserProgress) => UserProgress) => {
    const prev = get().progress;
    const next = finalize(fn(prev), prev.achievements);
    set({ progress: next });
    repository.save(KEY, next);
  };

  return {
    progress: emptyProgress(),
    hydrated: false,
    hydrate: () => {
      if (get().hydrated) return;
      const stored = repository.load<UserProgress>(KEY);
      set({ progress: { ...emptyProgress(), ...(stored ?? {}) }, hydrated: true });
    },
    addXp: (xp) => update((p) => ({ ...p, xp: p.xp + Math.round(xp) })),
    recordSongPlay: (songId, prog, accuracy, completed) =>
      update((p) => {
        const prev: SongStat = p.songStats[songId] ?? { plays: 0, completions: 0, bestAccuracy: 0, lastPlayed: 0, bestProgress: 0 };
        const firstCompletion = completed && !p.songsCompleted.includes(songId);
        const stat: SongStat = {
          plays: prev.plays + 1,
          completions: prev.completions + (completed ? 1 : 0),
          bestAccuracy: completed ? Math.max(prev.bestAccuracy, accuracy) : prev.bestAccuracy,
          lastPlayed: Date.now(),
          bestProgress: Math.max(prev.bestProgress, prog),
        };
        const xpGain = completed ? (firstCompletion ? 60 : 15) + Math.round(accuracy / 5) : Math.round(prog * 10);
        return {
          ...p,
          xp: p.xp + xpGain,
          lastSongId: songId,
          songStats: { ...p.songStats, [songId]: stat },
          songsCompleted: firstCompletion ? [...p.songsCompleted, songId] : p.songsCompleted,
        };
      }),
    recordChallenge: (entry) => {
      const prevBest = Math.max(
        0,
        ...get().progress.challengeScores.filter((s) => s.songId === entry.songId && s.level === entry.level).map((s) => s.score)
      );
      update((p) => ({
        ...p,
        xp: p.xp + Math.round(entry.score / 250) + (entry.grade === "S" ? 40 : entry.grade === "A" ? 20 : 5),
        lastSongId: entry.songId,
        challengeScores: [...p.challengeScores, entry].slice(-300),
      }));
      return { newBest: entry.score > prevBest };
    },
    recordPractice: (r) =>
      update((p) => ({
        ...p,
        xp: p.xp + Math.round(10 + r.accuracy / 5),
        practiceHistory: [...p.practiceHistory, r].slice(-500),
      })),
    completeDaily: (day) => {
      if (get().progress.dailyCompleted.includes(day)) return false;
      update((p) => ({ ...p, xp: p.xp + 100, dailyCompleted: [...p.dailyCompleted, day] }));
      return true;
    },
    addPracticeTime: (sec, notes) =>
      update((p) => ({ ...p, totalPracticeTime: p.totalPracticeTime + sec, notesPlayed: p.notesPlayed + notes })),
    unlock: (id) => {
      if (get().progress.achievements.includes(id)) return;
      update((p) => ({ ...p, achievements: [...p.achievements, id] }));
    },
    reset: () => {
      const fresh = emptyProgress();
      set({ progress: fresh });
      repository.save(KEY, fresh);
    },
    importData: (data) => {
      const merged = { ...emptyProgress(), ...data };
      set({ progress: merged });
      repository.save(KEY, merged);
    },
  };
});
