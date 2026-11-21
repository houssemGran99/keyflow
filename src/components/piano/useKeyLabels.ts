"use client";
import { useEffect, useMemo, useState } from "react";
import { codeLabel } from "@/lib/music";
import { useSettings } from "@/store/settings";

let layoutMapPromise: Promise<Map<string, string> | null> | null = null;

/** Keyboard layout map (e.g. AZERTY) so labels show what is printed on the user's keys. */
export function getLayoutMap(): Promise<Map<string, string> | null> {
  if (!layoutMapPromise) {
    const kb = (navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    layoutMapPromise = kb?.getLayoutMap ? kb.getLayoutMap().catch(() => null) : Promise.resolve(null);
  }
  return layoutMapPromise;
}

/** midi -> computer key letter for the current mapping and octave. */
export function useKeyLabels(enabled = true): Record<number, string> {
  const keymap = useSettings((s) => s.keymap);
  const octave = useSettings((s) => s.keyboardOctave);
  const [layoutMap, setLayoutMap] = useState<Map<string, string> | null>(null);
  useEffect(() => {
    getLayoutMap().then(setLayoutMap);
  }, []);
  return useMemo(() => {
    const m: Record<number, string> = {};
    if (!enabled) return m;
    for (const b of keymap) {
      const midi = (octave + 1) * 12 + b.offset;
      if (!m[midi]) m[midi] = codeLabel(b.code, layoutMap); // first binding wins
    }
    return m;
  }, [enabled, keymap, octave, layoutMap]);
}
