"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GameScreen } from "@/components/game/GameScreen";
import { findSong, useLibrary } from "@/store/library";
import { BUILTIN_SONGS } from "@/data/songs";

function LearnPlay() {
  const params = useSearchParams();
  const id = params.get("song");
  const hydrated = useLibrary((s) => s.hydrated);
  useLibrary((s) => s.userSongs);
  const song = findSong(id);
  if (!song) {
    if (!hydrated) return null;
    return <NotFound />;
  }
  const idx = BUILTIN_SONGS.findIndex((s) => s.id === song.id);
  const next = idx >= 0 ? BUILTIN_SONGS[idx + 1] ?? null : null;
  return <GameScreen key={song.id} song={song} mode="learn" nextSong={next} backHref="/learn" />;
}

function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Song not found</h1>
      <p className="text-muted mt-2">It may have been deleted from your library.</p>
      <Link href="/learn" className="btn btn-primary mt-6">
        Back to the library
      </Link>
    </main>
  );
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
      <LearnPlay />
    </Suspense>
  );
}
