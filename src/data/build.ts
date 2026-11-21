import { parseNote } from "@/lib/music";
import type { Difficulty, Note, Song, SongSection } from "@/lib/types";

/** A note expressed in beats, before tempo conversion. */
export interface BeatNote {
  midi: number;
  beat: number;
  beats: number;
  track: number;
  velocity: number;
}

/**
 * Compact melody notation:  "C4/1 D4/.5 E4+G4/2 R/1 | ..."
 *  - NOTE/duration-in-beats (duration defaults to 1)
 *  - chords joined with "+"
 *  - R = rest, "|" = bar line (ignored, for readability)
 */
export function line(text: string, track = 0, startBeat = 0, velocity = track === 0 ? 0.78 : 0.6): {
  notes: BeatNote[];
  end: number;
} {
  const notes: BeatNote[] = [];
  let beat = startBeat;
  for (const tok of text.split(/[\s|]+/).filter(Boolean)) {
    const [pitchPart, durPart] = tok.split("/");
    const beats = durPart ? parseFloat(durPart) : 1;
    if (Number.isNaN(beats)) throw new Error(`Bad duration in token ${tok}`);
    if (pitchPart !== "R") {
      for (const p of pitchPart.split("+")) {
        notes.push({ midi: parseNote(p), beat, beats: beats * 0.95, track, velocity });
      }
    }
    beat += beats;
  }
  return { notes, end: beat };
}

export interface SongDef {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  bpm: number;
  beatsPerBar: number;
  description?: string;
  barsPerSection?: number;
  notes: BeatNote[];
}

export function buildSong(def: SongDef): Song {
  const spb = 60 / def.bpm;
  const notes: Note[] = def.notes
    .map((n) => ({
      midi: n.midi,
      startTime: +(n.beat * spb).toFixed(4),
      duration: +(n.beats * spb).toFixed(4),
      velocity: n.velocity,
      track: n.track,
    }))
    .sort((a, b) => a.startTime - b.startTime || a.midi - b.midi);
  const duration = Math.max(...notes.map((n) => n.startTime + n.duration));
  const barSec = spb * def.beatsPerBar;
  const sectionLen = barSec * (def.barsPerSection ?? 4);
  const sections: SongSection[] = [];
  for (let s = 0, i = 1; s < duration - 0.01; s += sectionLen, i++) {
    sections.push({ name: `Section ${i}`, start: +s.toFixed(3), end: +Math.min(duration, s + sectionLen).toFixed(3) });
  }
  // Merge a tiny trailing section into the previous one.
  if (sections.length > 1 && sections[sections.length - 1].end - sections[sections.length - 1].start < barSec) {
    const last = sections.pop()!;
    sections[sections.length - 1].end = last.end;
  }
  const previewStart = notes[0]?.startTime ?? 0;
  return {
    id: def.id,
    title: def.title,
    artist: def.artist,
    difficulty: def.difficulty,
    duration,
    bpm: def.bpm,
    beatsPerBar: def.beatsPerBar,
    notes,
    preview: { start: previewStart, end: Math.min(duration, previewStart + 10) },
    sections,
    description: def.description,
    source: "builtin",
    tracks: new Set(notes.map((n) => n.track)).size,
  };
}

export const merge = (...parts: { notes: BeatNote[] }[]) => parts.flatMap((p) => p.notes);
