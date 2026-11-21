"use client";
import { create } from "zustand";

/** Live keyboard state (not persisted). */
interface PianoState {
  active: Record<number, boolean>;
  playback: Record<number, boolean>;
  sustain: boolean;
  midiStatus: "off" | "unsupported" | "denied" | "connected" | "no-devices";
  midiDevices: string[];
  setActive: (midi: number, on: boolean) => void;
  setPlayback: (notes: Record<number, boolean>) => void;
  setSustain: (on: boolean) => void;
  clearActive: () => void;
  setMidi: (status: PianoState["midiStatus"], devices?: string[]) => void;
}

export const usePiano = create<PianoState>()((set) => ({
  active: {},
  playback: {},
  sustain: false,
  midiStatus: "off",
  midiDevices: [],
  setActive: (midi, on) =>
    set((s) => {
      if (!!s.active[midi] === on) return s;
      const active = { ...s.active };
      if (on) active[midi] = true;
      else delete active[midi];
      return { active };
    }),
  setPlayback: (playback) => set({ playback }),
  setSustain: (sustain) => set({ sustain }),
  clearActive: () => set({ active: {} }),
  setMidi: (midiStatus, midiDevices = []) => set({ midiStatus, midiDevices }),
}));
