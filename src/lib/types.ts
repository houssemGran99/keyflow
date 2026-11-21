// Core data model for KeyFlow. Kept framework-agnostic so a backend can reuse it.

export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Track identifiers: 0 = right hand / melody, 1 = left hand / accompaniment. */
export type TrackId = number;

export interface Note {
  /** MIDI note number (21 = A0, 60 = middle C, 108 = C8). */
  midi: number;
  /** Start time in seconds from the beginning of the song. */
  startTime: number;
  /** Duration in seconds. */
  duration: number;
  /** Velocity 0..1. */
  velocity: number;
  /** Track / instrument identifier. */
  track: TrackId;
}

export interface SongSection {
  name: string;
  start: number;
  end: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  /** Duration in seconds (end of last note). */
  duration: number;
  bpm: number;
  beatsPerBar: number;
  notes: Note[];
  /** Preview window in seconds. */
  preview: { start: number; end: number };
  sections: SongSection[];
  description?: string;
  source: "builtin" | "imported" | "recording";
  tracks: number;
}

export type Judgement = "perfect" | "great" | "good" | "miss";

export type SkillLevel = "Novice" | "Apprentice" | "Performer" | "Virtuoso" | "Maestro";

export interface SongStat {
  plays: number;
  completions: number;
  bestAccuracy: number;
  lastPlayed: number;
  /** Furthest point reached, 0..1. */
  bestProgress: number;
}

export type ChallengeLevel = "easy" | "normal" | "hard" | "expert";

/** Leaderboard-ready score entry: everything needed to rank or verify a run. */
export interface ScoreEntry {
  id: string;
  songId: string;
  songTitle: string;
  level: ChallengeLevel;
  score: number;
  accuracy: number;
  maxCombo: number;
  grade: Grade;
  counts: Record<Judgement, number>;
  wrongNotes: number;
  totalNotes: number;
  date: number;
  daily?: string;
}

export type Grade = "S" | "A" | "B" | "C" | "D";

export type ExerciseId = "notes" | "scales" | "chords" | "melody" | "rhythm";

export interface PracticeResult {
  exercise: ExerciseId;
  score: number;
  accuracy: number;
  date: number;
  detail?: string;
}

export interface UserProgress {
  songsCompleted: string[];
  highestScore: number;
  /** Seconds of active playing. */
  totalPracticeTime: number;
  achievements: string[];
  skillLevel: SkillLevel;
  xp: number;
  songStats: Record<string, SongStat>;
  challengeScores: ScoreEntry[];
  practiceHistory: PracticeResult[];
  dailyCompleted: string[];
  activeDays: string[];
  lastSongId?: string;
  notesPlayed: number;
}
