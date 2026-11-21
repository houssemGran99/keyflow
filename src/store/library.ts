"use client";
import { create } from "zustand";
import { BUILTIN_SONGS } from "@/data/songs";
import { repository } from "@/lib/repository";
import type { Song } from "@/lib/types";

const KEY = "user-songs";
const MAX_USER_SONGS = 30;

interface LibraryState {
  userSongs: Song[];
  hydrated: boolean;
  hydrate: () => void;
  add: (song: Song) => void;
  remove: (id: string) => void;
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  userSongs: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ userSongs: repository.load<Song[]>(KEY) ?? [], hydrated: true });
  },
  add: (song) => {
    const userSongs = [song, ...get().userSongs.filter((s) => s.id !== song.id)].slice(0, MAX_USER_SONGS);
    set({ userSongs });
    repository.save(KEY, userSongs);
  },
  remove: (id) => {
    const userSongs = get().userSongs.filter((s) => s.id !== id);
    set({ userSongs });
    repository.save(KEY, userSongs);
  },
}));

export function findSong(id: string | null | undefined): Song | undefined {
  if (!id) return undefined;
  return BUILTIN_SONGS.find((s) => s.id === id) ?? useLibrary.getState().userSongs.find((s) => s.id === id);
}

export function useAllSongs(): Song[] {
  const user = useLibrary((s) => s.userSongs);
  return [...BUILTIN_SONGS, ...user];
}
