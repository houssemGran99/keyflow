"use client";
import { useMemo } from "react";
import { codeLabel, isBlack, noteName } from "@/lib/music";
import { useSettings } from "@/store/settings";
import { useLayoutMap } from "./useKeyLabels";

/**
 * Cheat-sheet for the computer keyboard: black-key letters on the top row,
 * white-key letters on the bottom row, laid out like a piano.
 */
export function KeymapGuide({ className = "" }: { className?: string }) {
  const keymap = useSettings((s) => s.keymap);
  const octave = useSettings((s) => s.keyboardOctave);
  const layoutMap = useLayoutMap();

  const keys = useMemo(() => {
    const seen = new Set<number>();
    return [...keymap]
      .sort((a, b) => a.offset - b.offset)
      .filter((b) => !seen.has(b.offset) && seen.add(b.offset))
      .map((b) => {
        const midi = (octave + 1) * 12 + b.offset;
        return { midi, label: codeLabel(b.code, layoutMap), black: isBlack(midi) };
      });
  }, [keymap, octave, layoutMap]);

  const whites = keys.filter((k) => !k.black);

  return (
    <div className={`hidden sm:block ${className}`} aria-label="Computer keyboard guide">
      <div className="relative inline-flex flex-col gap-1 pt-0.5">
        {/* Black keys sit between the white keys they belong to */}
        <div className="relative h-6">
          {keys
            .filter((k) => k.black)
            .map((k) => {
              const leftIndex = whites.findIndex((w) => w.midi > k.midi);
              if (leftIndex <= 0) return null;
              return (
                <div
                  key={k.midi}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `calc(${leftIndex} * 2.25rem - 1.125rem)` }}
                  title={`${k.label} plays ${noteName(k.midi)}`}
                >
                  <span className="flex h-6 w-8 items-center justify-center rounded-md bg-[var(--accent)] font-mono text-[13px] font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]">
                    {k.label}
                  </span>
                </div>
              );
            })}
        </div>
        <div className="flex gap-1">
          {whites.map((k) => (
            <div key={k.midi} className="flex w-8 flex-col items-center" title={`${k.label} plays ${noteName(k.midi)}`}>
              <span className="flex h-6 w-8 items-center justify-center rounded-md bg-[var(--accent-2)] font-mono text-[13px] font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]">
                {k.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
