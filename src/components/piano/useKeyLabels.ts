"use client";
import { useEffect, useMemo, useState } from "react";
import { codeLabel } from "@/lib/music";
import { useSettings } from "@/store/settings";

let layoutMapCache: Map<string, string> | null = null;
let layoutMapPending: Promise<Map<string, string> | null> | null = null;

/**
 * Keyboard layout map (e.g. AZERTY) so labels show what is printed on the user's keys.
 * Browsers refuse the lookup while the page is unfocused, so failures are not cached:
 * callers retry when the window regains focus.
 */
export function getLayoutMap(): Promise<Map<string, string> | null> {
  if (layoutMapCache) return Promise.resolve(layoutMapCache);
  if (layoutMapPending) return layoutMapPending;
  const kb = (navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
  if (!kb?.getLayoutMap) return Promise.resolve(null);
  layoutMapPending = kb
    .getLayoutMap()
    .then((m) => (layoutMapCache = m))
    .catch(() => null)
    .finally(() => (layoutMapPending = null));
  return layoutMapPending;
}

/** Layout map as React state, refreshed on focus (and when the user switches layouts). */
export function useLayoutMap(): Map<string, string> | null {
  const [map, setMap] = useState<Map<string, string> | null>(layoutMapCache);
  useEffect(() => {
    const load = () => getLayoutMap().then((m) => m && setMap(m));
    const refresh = () => {
      layoutMapCache = null; // the OS layout may have changed while away
      load();
    };
    load();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return map;
}

/** midi -> computer key letter for the current mapping and octave. */
export function useKeyLabels(enabled = true): Record<number, string> {
  const keymap = useSettings((s) => s.keymap);
  const octave = useSettings((s) => s.keyboardOctave);
  const layoutMap = useLayoutMap();
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
