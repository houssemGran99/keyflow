"use client";
import { pitchClass, octaveOf } from "@/lib/music";

const LETTER_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C C# D D# E F F# G G# A A# B -> letter index
const SHARP = new Set([1, 3, 6, 8, 10]);

/** Diatonic step number (C0 = 0, D0 = 1, ... ) */
const diatonic = (midi: number) => LETTER_OF_PC[pitchClass(midi)] + 7 * octaveOf(midi);

export function Staff({ midi, clef, state }: { midi: number | null; clef: "treble" | "bass"; state?: "good" | "bad" | null }) {
  const gap = 14;
  const top = 40;
  const lines = [0, 1, 2, 3, 4].map((i) => top + i * gap);
  const bottomLineStep = clef === "treble" ? diatonic(64) : diatonic(43); // E4 / G2
  const bottomY = top + 4 * gap;
  const yOf = (dn: number) => bottomY - (dn - bottomLineStep) * (gap / 2);
  const dn = midi !== null ? diatonic(midi) : null;
  const y = dn !== null ? yOf(dn) : 0;
  const ledger: number[] = [];
  if (dn !== null) {
    for (let s = bottomLineStep - 2; s >= dn; s -= 2) ledger.push(yOf(s));
    for (let s = bottomLineStep + 10; s <= dn; s += 2) ledger.push(yOf(s));
  }
  const color = state === "good" ? "var(--good)" : state === "bad" ? "var(--bad)" : "var(--text)";
  const x = 190;
  return (
    <svg viewBox="0 0 300 160" className="w-full max-w-md mx-auto" role="img" aria-label="Musical staff">
      {lines.map((ly) => (
        <line key={ly} x1={20} x2={280} y1={ly} y2={ly} stroke="var(--muted)" strokeWidth={1.4} />
      ))}
      <text
        x={30}
        y={clef === "treble" ? top + 4 * gap + 12 : top + 2 * gap + 4}
        fontSize={clef === "treble" ? 78 : 48}
        fill="var(--text)"
        style={{ fontFamily: "'Segoe UI Symbol','Noto Music','Bravura','Apple Symbols',serif" }}
      >
        {clef === "treble" ? "𝄞" : "𝄢"}
      </text>
      {ledger.map((ly) => (
        <line key={ly} x1={x - 16} x2={x + 16} y1={ly} y2={ly} stroke="var(--muted)" strokeWidth={1.4} />
      ))}
      {midi !== null && (
        <g style={{ transition: "fill .2s" }}>
          {SHARP.has(pitchClass(midi)) && (
            <text x={x - 32} y={y + 7} fontSize={24} fill={color} fontWeight={700}>
              ♯
            </text>
          )}
          <ellipse cx={x} cy={y} rx={9} ry={6.5} transform={`rotate(-20 ${x} ${y})`} fill={color} />
          <line
            x1={dn! >= bottomLineStep + 4 ? x - 8.4 : x + 8.4}
            x2={dn! >= bottomLineStep + 4 ? x - 8.4 : x + 8.4}
            y1={y + (dn! >= bottomLineStep + 4 ? 2 : -2)}
            y2={dn! >= bottomLineStep + 4 ? y + 44 : y - 44}
            stroke={color}
            strokeWidth={1.8}
          />
        </g>
      )}
    </svg>
  );
}
