// Pure music-theory helpers. No DOM, no imports beyond types (unit-testable in Node).

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const BLACK = new Set([1, 3, 6, 8, 10]);

export const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;
export const isBlack = (midi: number) => BLACK.has(pitchClass(midi));
export const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;
export const noteName = (midi: number, withOctave = true) =>
  NOTE_NAMES[pitchClass(midi)] + (withOctave ? String(octaveOf(midi)) : "");
export const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Parse "C4", "F#5", "Bb3" -> MIDI number. */
export function parseNote(name: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`Bad note name: ${name}`);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase() as "C"]!;
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return (parseInt(m[3], 10) + 1) * 12 + base + acc;
}

// ---------------------------------------------------------------------------
// Keyboard geometry shared by the DOM keyboard and the canvas renderers.

export interface KeyRect {
  midi: number;
  x: number; // 0..1, left edge
  w: number; // 0..1
  black: boolean;
}

export function keyLayout(low: number, high: number): KeyRect[] {
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
  const ww = 1 / whites.length;
  const rects: KeyRect[] = [];
  let wi = 0;
  for (let m = low; m <= high; m++) {
    if (!isBlack(m)) {
      rects.push({ midi: m, x: wi * ww, w: ww, black: false });
      wi++;
    } else {
      // Slight offsets make the black keys look like a real piano group.
      const pc = pitchClass(m);
      const shift = pc === 1 || pc === 6 ? -0.08 : pc === 3 || pc === 10 ? 0.08 : 0;
      const bw = ww * 0.62;
      rects.push({ midi: m, x: wi * ww - bw / 2 + shift * ww, w: bw, black: true });
    }
  }
  return rects;
}

/** Expand a range so it starts on C and ends on B (or C), spanning at least `minOctaves`. */
export function fitRange(minMidi: number, maxMidi: number, minOctaves = 3): [number, number] {
  let low = Math.floor(minMidi / 12) * 12; // a C
  let high = Math.floor(maxMidi / 12) * 12 + 12; // the C above the top note (inclusive)
  let toggle = false;
  while ((high - low) / 12 < minOctaves) {
    if ((toggle && low > 24) || high >= 108) low -= 12;
    else high += 12;
    toggle = !toggle;
  }
  return [Math.max(21, low), Math.min(108, high)];
}

// ---------------------------------------------------------------------------
// Chords & scales

export const CHORD_TYPES: { name: string; short: string; intervals: number[] }[] = [
  { name: "Major", short: "", intervals: [0, 4, 7] },
  { name: "Minor", short: "m", intervals: [0, 3, 7] },
  { name: "Diminished", short: "dim", intervals: [0, 3, 6] },
  { name: "Augmented", short: "aug", intervals: [0, 4, 8] },
  { name: "Sus2", short: "sus2", intervals: [0, 2, 7] },
  { name: "Sus4", short: "sus4", intervals: [0, 5, 7] },
  { name: "Dominant 7", short: "7", intervals: [0, 4, 7, 10] },
  { name: "Major 7", short: "maj7", intervals: [0, 4, 7, 11] },
  { name: "Minor 7", short: "m7", intervals: [0, 3, 7, 10] },
  { name: "Half-dim 7", short: "m7b5", intervals: [0, 3, 6, 10] },
  { name: "Diminished 7", short: "dim7", intervals: [0, 3, 6, 9] },
];

/** Name a set of held notes, e.g. [60,64,67] -> "C", [57,60,64] -> "Am". */
export function detectChord(midis: number[]): string | null {
  if (midis.length < 2) return null;
  const sorted = [...midis].sort((a, b) => a - b);
  const pcs = Array.from(new Set(sorted.map(pitchClass)));
  if (pcs.length === 2) {
    const iv = (pcs[1] - pcs[0] + 12) % 12;
    const names: Record<number, string> = { 7: "5", 5: "5" };
    if (names[iv]) {
      const root = iv === 7 ? pcs[0] : pcs[1];
      return NOTE_NAMES[root] + "5";
    }
    return null;
  }
  const bass = pitchClass(sorted[0]);
  for (const root of [bass, ...pcs.filter((p) => p !== bass)]) {
    const rel = pcs.map((p) => (p - root + 12) % 12).sort((a, b) => a - b);
    for (const ct of CHORD_TYPES) {
      if (ct.intervals.length === rel.length && ct.intervals.every((v, i) => v === rel[i])) {
        const name = NOTE_NAMES[root] + ct.short;
        return root === bass ? name : `${name}/${NOTE_NAMES[bass]}`;
      }
    }
  }
  return null;
}

export const SCALES: { id: string; name: string; root: number; steps: number[] }[] = [
  { id: "c-major", name: "C Major", root: 60, steps: [2, 2, 1, 2, 2, 2, 1] },
  { id: "g-major", name: "G Major", root: 67, steps: [2, 2, 1, 2, 2, 2, 1] },
  { id: "d-major", name: "D Major", root: 62, steps: [2, 2, 1, 2, 2, 2, 1] },
  { id: "f-major", name: "F Major", root: 65, steps: [2, 2, 1, 2, 2, 2, 1] },
  { id: "a-minor", name: "A Natural Minor", root: 57, steps: [2, 1, 2, 2, 1, 2, 2] },
  { id: "a-harmonic", name: "A Harmonic Minor", root: 57, steps: [2, 1, 2, 2, 1, 3, 1] },
  { id: "e-minor", name: "E Natural Minor", root: 64, steps: [2, 1, 2, 2, 1, 2, 2] },
  { id: "c-pentatonic", name: "C Major Pentatonic", root: 60, steps: [2, 2, 3, 2, 3] },
  { id: "a-blues", name: "A Blues", root: 57, steps: [3, 2, 1, 1, 3, 2] },
  { id: "chromatic", name: "Chromatic from C", root: 60, steps: Array(12).fill(1) },
];

export function scaleNotes(root: number, steps: number[], descending = false): number[] {
  const up = [root];
  for (const s of steps) up.push(up[up.length - 1] + s);
  if (!descending) return up;
  return [...up, ...up.slice(0, -1).reverse()];
}

// ---------------------------------------------------------------------------
// Computer keyboard mapping (uses KeyboardEvent.code = physical key positions)

export interface KeyBinding {
  code: string;
  /** Semitone offset from the mapping's base C. */
  offset: number;
}

export const KEYMAP_PRESETS: Record<string, { name: string; bindings: KeyBinding[] }> = {
  homerow: {
    name: "Easy: home row (A S D F…)",
    bindings: [
      ["KeyA", 0], ["KeyW", 1], ["KeyS", 2], ["KeyE", 3], ["KeyD", 4], ["KeyF", 5], ["KeyT", 6],
      ["KeyG", 7], ["KeyY", 8], ["KeyH", 9], ["KeyU", 10], ["KeyJ", 11], ["KeyK", 12],
      ["KeyO", 13], ["KeyL", 14], ["KeyP", 15], ["Semicolon", 16], ["Quote", 17],
      // Bottom row = white keys of the octave below (Z X C V B N M on QWERTY).
      ["KeyZ", -12], ["KeyX", -10], ["KeyC", -8], ["KeyV", -7], ["KeyB", -5], ["KeyN", -3], ["KeyM", -1],
    ].map(([code, offset]) => ({ code: code as string, offset: offset as number })),
  },
  tracker: {
    name: "Advanced: two rows (2½ octaves)",
    bindings: [
      ["KeyZ", 0], ["KeyS", 1], ["KeyX", 2], ["KeyD", 3], ["KeyC", 4], ["KeyV", 5], ["KeyG", 6],
      ["KeyB", 7], ["KeyH", 8], ["KeyN", 9], ["KeyJ", 10], ["KeyM", 11], ["Comma", 12],
      ["KeyL", 13], ["Period", 14], ["Semicolon", 15], ["Slash", 16],
      ["KeyQ", 12], ["Digit2", 13], ["KeyW", 14], ["Digit3", 15], ["KeyE", 16], ["KeyR", 17],
      ["Digit5", 18], ["KeyT", 19], ["Digit6", 20], ["KeyY", 21], ["Digit7", 22], ["KeyU", 23],
      ["KeyI", 24], ["Digit9", 25], ["KeyO", 26], ["Digit0", 27], ["KeyP", 28],
      ["BracketLeft", 29], ["Equal", 30], ["BracketRight", 31],
    ].map(([code, offset]) => ({ code: code as string, offset: offset as number })),
  },
};

const CODE_LABELS: Record<string, string> = {
  Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", BracketLeft: "[",
  BracketRight: "]", Equal: "=", Minus: "-", Backquote: "`", Backslash: "\\", Space: "␣",
};

export function codeLabel(code: string, layoutMap?: Map<string, string> | null): string {
  const fromLayout = layoutMap?.get(code);
  if (fromLayout) return fromLayout.toUpperCase();
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "N" + code.slice(6);
  return CODE_LABELS[code] ?? code;
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
