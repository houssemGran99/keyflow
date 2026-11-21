"use client";
import { memo, useEffect, useMemo, useRef } from "react";
import { keyLayout, noteName, pitchClass } from "@/lib/music";
import { noteOff as inputNoteOff, noteOn as inputNoteOn } from "@/lib/input";
import { usePiano } from "@/store/piano";
import { useSettings } from "@/store/settings";
import { useKeyLabels } from "./useKeyLabels";

export type KeyHint = "target" | "auto";

interface Props {
  low: number;
  high: number;
  hints?: Record<number, KeyHint>;
  showNoteNames?: boolean;
  showKeyLabels?: boolean;
  className?: string;
  onNoteOn?: (midi: number, velocity: number) => void;
  onNoteOff?: (midi: number) => void;
  /** Pixel height; defaults to a responsive height. */
  height?: number | string;
}

export { getLayoutMap } from "./useKeyLabels";

export function PianoKeyboard({
  low, high, hints, showNoteNames, showKeyLabels, className = "", onNoteOn, onNoteOff, height,
}: Props) {
  const settings = useSettings();
  const names = showNoteNames ?? settings.showNoteNames;
  const labels = showKeyLabels ?? settings.showKeyLabels;
  const rects = useMemo(() => keyLayout(low, high), [low, high]);
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, number>());
  const keyLabels = useKeyLabels(labels);

  const on = (midi: number, vel: number) => (onNoteOn ? onNoteOn(midi, vel) : inputNoteOn(midi, vel, "pointer"));
  const off = (midi: number) => (onNoteOff ? onNoteOff(midi) : inputNoteOff(midi, "pointer"));

  // Hit-test from geometry (same layout the keys are drawn with), so overlays can't block it.
  const keyAt = (x: number, y: number): { midi: number; vel: number } | null => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || x < box.left || x > box.right || y < box.top || y > box.bottom) return null;
    const fx = (x - box.left) / box.width;
    const fy = (y - box.top) / box.height;
    if (fy <= 0.62) {
      const b = rects.find((r) => r.black && fx >= r.x && fx <= r.x + r.w);
      if (b) return { midi: b.midi, vel: 0.4 + 0.55 * (fy / 0.62) };
    }
    const w = rects.find((r) => !r.black && fx >= r.x && fx <= r.x + r.w);
    return w ? { midi: w.midi, vel: 0.4 + 0.55 * fy } : null;
  };

  useEffect(() => {
    const ps = pointers.current;
    return () => {
      for (const midi of ps.values()) off(midi);
      ps.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className={`relative select-none overflow-hidden rounded-b-xl rounded-t-md ${className}`}
      style={{
        height: height ?? "clamp(120px, 22vh, 210px)",
        touchAction: "none",
        background: "var(--keybed)",
        boxShadow: "inset 0 8px 12px -6px rgba(0,0,0,.8)",
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        const k = keyAt(e.clientX, e.clientY);
        if (!k) return;
        e.preventDefault();
        ref.current?.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, k.midi);
        on(k.midi, k.vel);
      }}
      onPointerMove={(e) => {
        const cur = pointers.current.get(e.pointerId);
        if (cur === undefined) return;
        const k = keyAt(e.clientX, e.clientY);
        if (!k || k.midi === cur) return;
        off(cur);
        pointers.current.set(e.pointerId, k.midi);
        on(k.midi, k.vel);
      }}
      onPointerUp={(e) => {
        const cur = pointers.current.get(e.pointerId);
        if (cur === undefined) return;
        pointers.current.delete(e.pointerId);
        off(cur);
      }}
      onPointerCancel={(e) => {
        const cur = pointers.current.get(e.pointerId);
        if (cur === undefined) return;
        pointers.current.delete(e.pointerId);
        off(cur);
      }}
      role="group"
      aria-label="Piano keyboard"
    >
      <div className="absolute inset-x-0 top-0 h-[5px] z-10 pointer-events-none bg-gradient-to-b from-[var(--accent)]/50 to-transparent" />
      {rects.map((r) => (
        <PianoKey
          key={r.midi}
          midi={r.midi}
          x={r.x}
          w={r.w}
          black={r.black}
          hint={hints?.[r.midi]}
          name={names ? (pitchClass(r.midi) === 0 ? noteName(r.midi) : r.black ? "" : noteName(r.midi, false)) : ""}
          label={keyLabels[r.midi]}
        />
      ))}
    </div>
  );
}

interface KeyProps {
  midi: number;
  x: number;
  w: number;
  black: boolean;
  hint?: KeyHint;
  name: string;
  label?: string;
}

export const PianoKey = memo(function PianoKey({ midi, x, w, black, hint, name, label }: KeyProps) {
  const down = usePiano((s) => !!s.active[midi] || !!s.playback[midi]);
  return (
    <div
      data-midi={midi}
      data-down={down}
      data-hint={hint}
      className={`pkey ${black ? "pkey-black" : "pkey-white"}`}
      style={{
        left: `calc(${x * 100}% + ${black ? 0 : 1}px)`,
        width: `calc(${w * 100}% - ${black ? 0 : 2}px)`,
      }}
      aria-label={noteName(midi)}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex flex-col items-center gap-1 text-[10px] leading-none font-semibold">
        {label && (
          // Keycap badge: the computer key that plays this note.
          <span
            className={`hidden sm:flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded-md font-mono text-[13px] font-bold shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] ${
              black ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-2)] text-white"
            } ${down ? "scale-90" : ""} transition-transform`}
          >
            {label}
          </span>
        )}
        {name && <span className={black ? "text-white/60" : "text-[#7a7fa8]"}>{name}</span>}
      </div>
    </div>
  );
});
