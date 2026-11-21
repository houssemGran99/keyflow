import { BUILTIN_SONGS } from "./songs";
import { dayKey, hashString } from "@/lib/scoring";
import type { ChallengeLevel, Song } from "@/lib/types";

export interface DailyChallenge {
  day: string;
  song: Song;
  level: ChallengeLevel;
  targetAccuracy: number;
}

export function getDailyChallenge(date = new Date()): DailyChallenge {
  const day = dayKey(date);
  const h = hashString("keyflow-" + day);
  const song = BUILTIN_SONGS[h % BUILTIN_SONGS.length];
  const level: ChallengeLevel =
    song.difficulty === "beginner" ? (h % 3 === 0 ? "hard" : "normal") : song.difficulty === "advanced" ? "easy" : "normal";
  const targetAccuracy = 75 + (h % 4) * 5; // 75–90%
  return { day, song, level, targetAccuracy };
}
