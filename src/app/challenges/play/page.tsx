"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GameScreen } from "@/components/game/GameScreen";
import { findSong, useLibrary } from "@/store/library";
import { BUILTIN_SONGS } from "@/data/songs";
import { getDailyChallenge } from "@/data/daily";
import { CHALLENGE_LEVELS } from "@/lib/scoring";
import type { ChallengeLevel } from "@/lib/types";

function ChallengePlay() {
  const params = useSearchParams();
  const hydrated = useLibrary((s) => s.hydrated);
  useLibrary((s) => s.userSongs);
  const isDaily = params.get("daily") === "1";
  const daily = isDaily ? getDailyChallenge() : null;
  const song = daily ? daily.song : findSong(params.get("song"));
  const levelParam = params.get("level") as ChallengeLevel | null;
  const level: ChallengeLevel = daily ? daily.level : levelParam && CHALLENGE_LEVELS[levelParam] ? levelParam : "normal";
  if (!song) {
    if (!hydrated) return null;
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Challenge not found</h1>
        <Link href="/challenges" className="btn btn-primary mt-6">
          Back to challenges
        </Link>
      </main>
    );
  }
  const idx = BUILTIN_SONGS.findIndex((s) => s.id === song.id);
  const next = daily ? null : idx >= 0 ? BUILTIN_SONGS[(idx + 1) % BUILTIN_SONGS.length] : null;
  return <GameScreen key={`${song.id}-${level}-${isDaily}`} song={song} mode="challenge" level={level} daily={daily} nextSong={next} backHref="/challenges" />;
}

export default function Page() {
  // Songs can live in localStorage and the layout depends on the viewport, so the
  // game screen renders on the client only (avoids SSR/hydration mismatches).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    useLibrary.getState().hydrate();
    setMounted(true);
  }, []);
  if (!mounted) return <div className="fixed inset-0 bg-bg" />;
  return (
    <Suspense fallback={null}>
      <ChallengePlay />
    </Suspense>
  );
}
