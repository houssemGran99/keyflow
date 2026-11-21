import type { Difficulty, Note, Song, SongSection } from "./types";

/** Turn arbitrary notes (from a MIDI import or a recording) into a playable Song. */
export function makeUserSong(opts: {
  id?: string;
  title: string;
  artist: string;
  notes: Note[];
  bpm: number;
  beatsPerBar?: number;
  source: Song["source"];
}): Song {
  let notes = opts.notes
    .filter((n) => n.midi >= 21 && n.midi <= 108)
    .map((n) => ({ ...n }))
    .sort((a, b) => a.startTime - b.startTime);
  if (!notes.length) throw new Error("No playable notes found");

  // Normalise to two hands: 0 = right (higher), 1 = left (lower).
  const trackIds = [...new Set(notes.map((n) => n.track))];
  if (trackIds.length === 1) {
    for (const n of notes) n.track = n.midi >= 60 ? 0 : 1;
  } else {
    const avg = (t: number) => {
      const ns = notes.filter((n) => n.track === t);
      return ns.reduce((s, n) => s + n.midi, 0) / ns.length;
    };
    const top = trackIds.reduce((a, b) => (avg(a) >= avg(b) ? a : b));
    for (const n of notes) n.track = n.track === top ? 0 : 1;
  }

  // Shift so the first note starts at 0.5s.
  const offset = notes[0].startTime - 0.5;
  notes = notes.map((n) => ({ ...n, startTime: +(n.startTime - offset).toFixed(4), duration: +n.duration.toFixed(4) }));
  const duration = Math.max(...notes.map((n) => n.startTime + n.duration));

  const nps = notes.length / Math.max(1, duration);
  const difficulty: Difficulty = nps < 2 ? "beginner" : nps < 4.5 ? "intermediate" : "advanced";
  const bpm = Math.max(30, Math.min(300, opts.bpm || 120));
  const beatsPerBar = opts.beatsPerBar ?? 4;
  const sectionLen = (60 / bpm) * beatsPerBar * 4;
  const sections: SongSection[] = [];
  for (let s = 0, i = 1; s < duration - 0.01; s += sectionLen, i++) {
    sections.push({ name: `Section ${i}`, start: +s.toFixed(3), end: +Math.min(duration, s + sectionLen).toFixed(3) });
  }
  return {
    id: opts.id ?? `user-${Date.now().toString(36)}`,
    title: opts.title,
    artist: opts.artist,
    difficulty,
    duration,
    bpm,
    beatsPerBar,
    notes: notes.slice(0, 6000),
    preview: { start: notes[0].startTime, end: Math.min(duration, notes[0].startTime + 10) },
    sections,
    source: opts.source,
    tracks: new Set(notes.map((n) => n.track)).size,
  };
}

export function songRange(song: Song): [number, number] {
  let lo = 127;
  let hi = 0;
  for (const n of song.notes) {
    lo = Math.min(lo, n.midi);
    hi = Math.max(hi, n.midi);
  }
  return [lo, hi];
}

export function downloadBlob(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string; ring: string }> = {
  beginner: { label: "Beginner", color: "text-emerald-400", ring: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30" },
  intermediate: { label: "Intermediate", color: "text-sky-400", ring: "bg-sky-400/15 text-sky-300 ring-sky-400/30" },
  advanced: { label: "Advanced", color: "text-fuchsia-400", ring: "bg-fuchsia-400/15 text-fuchsia-300 ring-fuchsia-400/30" },
};
