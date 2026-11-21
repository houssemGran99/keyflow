"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { KEYMAP_PRESETS, type KeyBinding } from "@/lib/music";

export type Theme = "dark" | "light";

export interface SettingsState {
  volume: number;
  reverb: number;
  accompanimentVolume: number;
  showNoteNames: boolean;
  showKeyLabels: boolean;
  octaves: number;
  /** Lowest C shown on the free-play keyboard. */
  startOctave: number;
  /** Octave of the first mapped computer key. */
  keyboardOctave: number;
  keymap: KeyBinding[];
  keymapPreset: string;
  theme: Theme;
  noteSpeed: number; // seconds of song visible in the falling-notes lane
  midiEnabled: boolean;
  set: (patch: Partial<SettingsState>) => void;
  shiftOctave: (delta: number) => void;
  resetKeymap: (preset?: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      volume: 0.8,
      reverb: 0.22,
      accompanimentVolume: 0.7,
      showNoteNames: true,
      showKeyLabels: true,
      octaves: 3,
      startOctave: 3,
      keyboardOctave: 4,
      keymap: KEYMAP_PRESETS.homerow.bindings,
      keymapPreset: "homerow",
      theme: "dark",
      noteSpeed: 3,
      midiEnabled: false,
      set: (patch) => set(patch),
      shiftOctave: (delta) => {
        const s = get();
        const kb = Math.max(0, Math.min(6, s.keyboardOctave + delta));
        // Keep the mapped range visible on the on-screen keyboard.
        const offsets = s.keymap.map((b) => b.offset);
        const mappedTopOct = kb + Math.floor(Math.max(...offsets) / 12);
        const mappedLowOct = kb + Math.floor(Math.min(...offsets) / 12);
        let start = s.startOctave;
        if (mappedLowOct < start) start = mappedLowOct;
        if (mappedTopOct > start + s.octaves - 1) start = Math.max(0, mappedTopOct - s.octaves + 1);
        start = Math.min(start, 8 - s.octaves);
        set({ keyboardOctave: kb, startOctave: Math.max(0, start) });
      },
      resetKeymap: (preset = "homerow") => {
        const p = KEYMAP_PRESETS[preset] ? preset : "homerow";
        // Home row starts at middle C; the two-row layout starts an octave lower so both rows fit.
        set({ keymap: KEYMAP_PRESETS[p].bindings, keymapPreset: p, keyboardOctave: p === "homerow" ? 4 : 3, startOctave: 3 });
      },
    }),
    {
      name: "keyflow-settings",
      version: 3,
      skipHydration: true,
      migrate: (state, version) => {
        const s = state as Partial<SettingsState>;
        // v1 defaulted to the two-row tracker layout; move untouched users to the easier home-row layout.
        if (version < 2 && s.keymapPreset === "tracker") {
          return { ...s, keymap: KEYMAP_PRESETS.homerow.bindings, keymapPreset: "homerow", keyboardOctave: 4 };
        }
        // v3 added the bottom row (lower octave) to the home-row preset.
        if (version < 3 && s.keymapPreset === "homerow") {
          return { ...s, keymap: KEYMAP_PRESETS.homerow.bindings };
        }
        return s;
      },
    }
  )
);
