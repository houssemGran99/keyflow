// Pure scoring rules (unit-tested). No imports except types.
import type { ChallengeLevel, Grade, Judgement, SkillLevel } from "./types";

export const JUDGE_POINTS: Record<Judgement, number> = { perfect: 100, great: 75, good: 50, miss: 0 };

/** Pressing a key that matches no expected note costs points (never below 0). */
export const WRONG_NOTE_PENALTY = 25;

export interface TimingWindows {
  perfect: number;
  great: number;
  good: number;
}

export interface LevelConfig {
  id: ChallengeLevel;
  name: string;
  rate: number;
  tracks: number[];
  reduceChords: boolean;
  windows: TimingWindows;
  description: string;
}

export const CHALLENGE_LEVELS: Record<ChallengeLevel, LevelConfig> = {
  easy: {
    id: "easy", name: "Easy", rate: 0.75, tracks: [0], reduceChords: true,
    windows: { perfect: 0.07, great: 0.13, good: 0.2 },
    description: "Melody only, 75% speed, generous timing",
  },
  normal: {
    id: "normal", name: "Normal", rate: 1, tracks: [0], reduceChords: false,
    windows: { perfect: 0.05, great: 0.1, good: 0.16 },
    description: "Full melody at full speed",
  },
  hard: {
    id: "hard", name: "Hard", rate: 1, tracks: [0, 1], reduceChords: false,
    windows: { perfect: 0.045, great: 0.09, good: 0.14 },
    description: "Both hands, tighter timing",
  },
  expert: {
    id: "expert", name: "Expert", rate: 1.2, tracks: [0, 1], reduceChords: false,
    windows: { perfect: 0.035, great: 0.07, good: 0.11 },
    description: "Both hands at 120% speed, razor timing",
  },
};

/** Classify an absolute timing error (seconds, real time). */
export function judge(deltaSeconds: number, w: TimingWindows): Judgement {
  const d = Math.abs(deltaSeconds);
  if (d <= w.perfect) return "perfect";
  if (d <= w.great) return "great";
  if (d <= w.good) return "good";
  return "miss";
}

export function comboMultiplier(combo: number): number {
  if (combo >= 50) return 4;
  if (combo >= 25) return 3;
  if (combo >= 10) return 2;
  return 1;
}

/** Accuracy 0..100: judged points over the maximum possible. Wrong notes count as a miss-weight. */
export function accuracyOf(counts: Record<Judgement, number>, wrongNotes = 0): number {
  const total = counts.perfect + counts.great + counts.good + counts.miss;
  if (total === 0) return 0;
  const pts = counts.perfect * 100 + counts.great * 75 + counts.good * 50;
  return Math.max(0, Math.min(100, (pts / ((total + wrongNotes * 0.25) * 100)) * 100));
}

export function gradeFor(accuracy: number): Grade {
  if (accuracy >= 95) return "S";
  if (accuracy >= 85) return "A";
  if (accuracy >= 70) return "B";
  if (accuracy >= 55) return "C";
  return "D";
}

export const SKILL_THRESHOLDS: [SkillLevel, number][] = [
  ["Novice", 0],
  ["Apprentice", 300],
  ["Performer", 1000],
  ["Virtuoso", 2500],
  ["Maestro", 5000],
];

export function skillFromXp(xp: number): { level: SkillLevel; next: number | null; floor: number } {
  let idx = 0;
  for (let i = 0; i < SKILL_THRESHOLDS.length; i++) if (xp >= SKILL_THRESHOLDS[i][1]) idx = i;
  const next = SKILL_THRESHOLDS[idx + 1]?.[1] ?? null;
  return { level: SKILL_THRESHOLDS[idx][0], next, floor: SKILL_THRESHOLDS[idx][1] };
}

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Consecutive days (ending today or yesterday) present in `days`. */
export function currentStreak(days: string[], today = new Date()): number {
  const set = new Set(days);
  const d = new Date(today);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (set.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Deterministic string hash (for daily challenge seeding). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
