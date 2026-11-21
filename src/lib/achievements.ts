import type { UserProgress } from "./types";
import { currentStreak } from "./scoring";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  check: (p: UserProgress, ctx: AchievementContext) => boolean;
}

/** Extra signals that are not stored in progress. */
export interface AchievementContext {
  beginnerSongIds: string[];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-note", title: "First Note", description: "Play your very first note", icon: "Music",
    check: (p) => p.notesPlayed > 0 },
  { id: "thousand-notes", title: "Busy Fingers", description: "Play 1,000 notes", icon: "Hand",
    check: (p) => p.notesPlayed >= 1000 },
  { id: "first-song", title: "Song Learner", description: "Complete a song in Learn mode", icon: "BookOpen",
    check: (p) => p.songsCompleted.length > 0 },
  { id: "beginner-graduate", title: "Beginner Graduate", description: "Complete every beginner song", icon: "GraduationCap",
    check: (p, c) => c.beginnerSongIds.length > 0 && c.beginnerSongIds.every((id) => p.songsCompleted.includes(id)) },
  { id: "perfectionist", title: "Perfectionist", description: "Finish a song with 100% accuracy", icon: "Gem",
    check: (p) => Object.values(p.songStats).some((s) => s.bestAccuracy >= 99.95) || p.challengeScores.some((s) => s.accuracy >= 99.95) },
  { id: "combo-50", title: "On a Roll", description: "Reach a 50-note combo", icon: "Flame",
    check: (p) => p.challengeScores.some((s) => s.maxCombo >= 50) },
  { id: "combo-100", title: "Unstoppable", description: "Reach a 100-note combo", icon: "Zap",
    check: (p) => p.challengeScores.some((s) => s.maxCombo >= 100) },
  { id: "s-rank", title: "Superstar", description: "Earn an S grade in a challenge", icon: "Star",
    check: (p) => p.challengeScores.some((s) => s.grade === "S") },
  { id: "expert-clear", title: "Expert Clear", description: "Score B or better on Expert", icon: "Trophy",
    check: (p) => p.challengeScores.some((s) => s.level === "expert" && ["S", "A", "B"].includes(s.grade)) },
  { id: "daily-1", title: "Daily Player", description: "Complete a daily challenge", icon: "CalendarCheck",
    check: (p) => p.dailyCompleted.length > 0 },
  { id: "streak-3", title: "Habit Forming", description: "Play 3 days in a row", icon: "CalendarDays",
    check: (p) => currentStreak(p.activeDays) >= 3 },
  { id: "practice-10", title: "Dedicated Student", description: "Finish 10 practice exercises", icon: "Dumbbell",
    check: (p) => p.practiceHistory.length >= 10 },
  { id: "all-exercises", title: "Well Rounded", description: "Try all five practice exercises", icon: "Shapes",
    check: (p) => new Set(p.practiceHistory.map((h) => h.exercise)).size >= 5 },
  { id: "marathon", title: "Marathon", description: "Play for 30 minutes in total", icon: "Timer",
    check: (p) => p.totalPracticeTime >= 1800 },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

// Event-driven achievements (unlocked directly, not derived from progress)
export const EVENT_ACHIEVEMENTS: AchievementDef[] = [
  { id: "recorder", title: "Recording Artist", description: "Record a free-play session", icon: "Mic", check: () => false },
  { id: "midi", title: "Plugged In", description: "Connect a MIDI keyboard", icon: "Cable", check: () => false },
  { id: "importer", title: "Crate Digger", description: "Import a MIDI file", icon: "FileMusic", check: () => false },
];
for (const a of EVENT_ACHIEVEMENTS) ACHIEVEMENT_BY_ID[a.id] = a;
export const ALL_ACHIEVEMENTS = [...ACHIEVEMENTS, ...EVENT_ACHIEVEMENTS];
