// Built-in song library: public-domain compositions (simplified arrangements)
// plus original KeyFlow melodies.
import { parseNote } from "@/lib/music";
import type { Song } from "@/lib/types";
import { buildSong, line, merge, type BeatNote } from "./build";

const R = (s: string) => s; // readability marker for repeated phrases

// ---------------------------------------------------------------- Beginner

const twinkle = buildSong({
  id: "twinkle", title: "Twinkle, Twinkle, Little Star", artist: "Traditional", difficulty: "beginner",
  bpm: 96, beatsPerBar: 4, barsPerSection: 4,
  description: "The classic first song. Right hand only, five-finger position.",
  notes: merge(
    line(
      "C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2 |" +
        "G4 G4 F4 F4 | E4 E4 D4/2 | G4 G4 F4 F4 | E4 E4 D4/2 |" +
        "C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2"
    )
  ),
});

const mary = buildSong({
  id: "mary", title: "Mary Had a Little Lamb", artist: "Traditional", difficulty: "beginner",
  bpm: 100, beatsPerBar: 4,
  description: "Three notes, one happy lamb. Perfect for your first session.",
  notes: merge(line("E4 D4 C4 D4 | E4 E4 E4/2 | D4 D4 D4/2 | E4 G4 G4/2 | E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4/4")),
});

const odeA = "E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/.5 D4/2 |";
const odeA2 = "E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/.5 C4/2 |";
const odeB = "D4 D4 E4 C4 | D4 E4/.5 F4/.5 E4 C4 | D4 E4/.5 F4/.5 E4 D4 | C4 D4 G3/2 |";
const ode = buildSong({
  id: "ode-to-joy", title: "Ode to Joy", artist: "Ludwig van Beethoven", difficulty: "beginner",
  bpm: 108, beatsPerBar: 4,
  description: "The theme from the Ninth Symphony, with a gentle left hand.",
  notes: merge(
    line(odeA + odeA2 + odeB + R(odeA2)),
    line("C3/4 | G2/4 | C3/4 | G2/4 | C3/4 | G2/4 | C3/2 G2/2 | C3/4 | G2/4 | C3/4 | C3/4 | G2/4 | C3/4 | G2/4 | C3/2 G2/2 | C3/4", 1)
  ),
});

const jingle = buildSong({
  id: "jingle-bells", title: "Jingle Bells", artist: "James Lord Pierpont", difficulty: "beginner",
  bpm: 120, beatsPerBar: 4,
  description: "Repeated notes and a bouncy rhythm.",
  notes: merge(
    line(
      "E4 E4 E4/2 | E4 E4 E4/2 | E4 G4 C4/1.5 D4/.5 | E4/4 | F4 F4 F4/1.5 F4/.5 | F4 E4 E4 E4/.5 E4/.5 | E4 D4 D4 E4 | D4/2 G4/2 |" +
        "E4 E4 E4/2 | E4 E4 E4/2 | E4 G4 C4/1.5 D4/.5 | E4/4 | F4 F4 F4/1.5 F4/.5 | F4 E4 E4 E4/.5 E4/.5 | G4 G4 F4 D4 | C4/4"
    )
  ),
});

const neonDrift = buildSong({
  id: "neon-drift", title: "Neon Drift", artist: "KeyFlow Original", difficulty: "beginner",
  bpm: 92, beatsPerBar: 4,
  description: "A dreamy pentatonic melody over slow bass notes.",
  notes: merge(
    line(
      "C4 E4 G4 A4 | G4/2 E4/2 | D4 E4 G4 E4 | D4/2 C4/2 |" +
        "C4 E4 G4 C5 | A4/2 G4/2 | E4 G4 D4 E4 | C4/4 |" +
        "A4 G4 E4 G4 | A4/2 C5/2 | G4 E4 D4 E4 | G4/4 |" +
        "C5 A4 G4 E4 | D4/2 E4/2 | G4 E4 D4/1.5 E4/.5 | C4/4"
    ),
    line("C3/4 | A2/4 | F2/4 | G2/4 | C3/4 | F2/4 | G2/4 | C3/4 | A2/4 | F2/4 | C3/4 | G2/4 | A2/4 | F2/4 | G2/4 | C3/4", 1)
  ),
});

// ------------------------------------------------------------ Intermediate

const minuet = buildSong({
  id: "minuet-g", title: "Minuet in G", artist: "Christian Petzold", difficulty: "intermediate",
  bpm: 112, beatsPerBar: 3,
  description: "From the Notebook for Anna Magdalena Bach. Graceful 3/4 with both hands.",
  notes: merge(
    line(
      "D5 G4/.5 A4/.5 B4/.5 C5/.5 | D5 G4 G4 | E5 C5/.5 D5/.5 E5/.5 F#5/.5 | G5 G4 G4 |" +
        "C5 D5/.5 C5/.5 B4/.5 A4/.5 | B4 C5/.5 B4/.5 A4/.5 G4/.5 | F#4 G4/.5 A4/.5 B4/.5 G4/.5 | A4/3 |" +
        "D5 G4/.5 A4/.5 B4/.5 C5/.5 | D5 G4 G4 | E5 C5/.5 D5/.5 E5/.5 F#5/.5 | G5 G4 G4 |" +
        "C5 D5/.5 C5/.5 B4/.5 A4/.5 | B4 C5/.5 B4/.5 A4/.5 G4/.5 | A4 B4/.5 A4/.5 G4/.5 F#4/.5 | G4/3"
    ),
    line(
      "G3+B3/2 A3 | B3/3 | C4/3 | B3/3 | A3/3 | G3/3 | D4 B3 G3 | D4 D3 C4 |" +
        "B3/2 A3 | G3 B3 G3 | C4/3 | B3 C4/.5 B3/.5 A3/.5 G3/.5 | A3/2 F#3 | G3/2 B3 | C4 D4 D3 | G3/2 G2",
      1
    )
  ),
});

const greensleeves = buildSong({
  id: "greensleeves", title: "Greensleeves", artist: "Traditional English", difficulty: "intermediate",
  bpm: 168, beatsPerBar: 6, barsPerSection: 4,
  description: "A lilting 6/8 folk melody in A minor.",
  notes: merge(
    line(
      "R/5 A4 | C5/2 D5 E5/1.5 F5/.5 E5 | D5/2 B4 G4/1.5 A4/.5 B4 | C5/2 A4 A4/1.5 G#4/.5 A4 | B4/2 G#4 E4/2 A4 |" +
        "C5/2 D5 E5/1.5 F5/.5 E5 | D5/2 B4 G4/1.5 A4/.5 B4 | C5/1.5 B4/.5 A4 G#4/1.5 F#4/.5 G#4 | A4/5 R/1 |" +
        "G5/3 G5/1.5 F#5/.5 E5 | D5/2 B4 G4/1.5 A4/.5 B4 | C5/2 A4 A4/1.5 G#4/.5 A4 | B4/2 G#4 E4/3 |" +
        "G5/3 G5/1.5 F#5/.5 E5 | D5/2 B4 G4/1.5 A4/.5 B4 | C5/1.5 B4/.5 A4 G#4/1.5 F#4/.5 G#4 | A4/6"
    ),
    line(
      "R/6 | A2+E3/6 | G2+D3/6 | A2+E3/6 | E2+B2/6 | A2+E3/6 | G2+D3/6 | A2/3 E2/3 | A2+E3/6 |" +
        "C3+G3/6 | G2+D3/6 | A2+E3/6 | E2+B2/6 | C3+G3/6 | G2+D3/6 | A2/3 E2/3 | A2+E3/6",
      1
    )
  ),
});

function canon(): BeatNote[] {
  const bass = ["D3", "A2", "B2", "F#2", "G2", "D2", "G2", "A2"];
  const v1 = ["F#5", "E5", "D5", "C#5", "B4", "A4", "B4", "C#5"];
  const v2 = ["D5", "C#5", "B4", "A4", "G4", "F#4", "G4", "E4"];
  const v3 =
    "D4/.5 F#4/.5 A4/.5 G4/.5 F#4/.5 D4/.5 F#4/.5 E4/.5 | D4/.5 B3/.5 D4/.5 A4/.5 G4/.5 B4/.5 A4/.5 G4/.5 |" +
    "F#4/.5 D4/.5 E4/.5 C#5/.5 D5/.5 F#5/.5 A5/.5 A4/.5 | B4/.5 G4/.5 A4/.5 F#4/.5 D4/.5 D5/.5 D5/1";
  const notes: BeatNote[] = [];
  for (let rep = 0; rep < 4; rep++) {
    bass.forEach((b, i) => notes.push({ midi: parseNote(b), beat: rep * 16 + i * 2, beats: 1.9, track: 1, velocity: 0.55 }));
  }
  v1.forEach((n, i) => notes.push({ midi: parseNote(n), beat: 16 + i * 2, beats: 1.9, track: 0, velocity: 0.75 }));
  v2.forEach((n, i) => notes.push({ midi: parseNote(n), beat: 32 + i * 2, beats: 1.9, track: 0, velocity: 0.75 }));
  notes.push(...line(v3, 0, 48).notes);
  notes.push({ midi: parseNote("D3"), beat: 64, beats: 4, track: 1, velocity: 0.55 });
  notes.push({ midi: parseNote("D4"), beat: 64, beats: 4, track: 0, velocity: 0.7 });
  notes.push({ midi: parseNote("F#4"), beat: 64, beats: 4, track: 0, velocity: 0.7 });
  notes.push({ midi: parseNote("A4"), beat: 64, beats: 4, track: 0, velocity: 0.7 });
  return notes;
}
const canonD = buildSong({
  id: "canon-d", title: "Canon in D", artist: "Johann Pachelbel", difficulty: "intermediate",
  bpm: 76, beatsPerBar: 4, barsPerSection: 4,
  description: "The famous ground bass with three melodic variations.",
  notes: canon(),
});

function gymnopedie(): BeatNote[] {
  const notes: BeatNote[] = [];
  // Left hand: bass on 1, chord on 2 (held), alternating G and D.
  const bars = 21;
  for (let b = 0; b < bars; b++) {
    const g = b % 2 === 0;
    const beat = b * 3;
    notes.push({ midi: parseNote(g ? "G2" : "D2"), beat, beats: 1, track: 1, velocity: 0.5 });
    for (const c of g ? ["B3", "D4", "F#4"] : ["A3", "C#4", "F#4"]) {
      notes.push({ midi: parseNote(c), beat: beat + 1, beats: 1.9, track: 1, velocity: 0.42 });
    }
  }
  notes.push(
    ...line(
      "R/1 F#5 A5 | G5 F#5 C#5 | B4 C#5 D5 | A4/3 | F#4/6 | F#4/3 |" +
        "R/1 F#5 A5 | G5 F#5 C#5 | B4 C#5 D5 | A4/3 | C#5/3 | F#5/3 | E5/6 |",
      0,
      12,
      0.62
    ).notes
  );
  return notes;
}
const gymno = buildSong({
  id: "gymnopedie-1", title: "Gymnopédie No. 1", artist: "Erik Satie", difficulty: "intermediate",
  bpm: 80, beatsPerBar: 3, barsPerSection: 4,
  description: "Slow and floating. Focus on the swaying left-hand pattern.",
  notes: gymnopedie(),
});

const midnight = buildSong({
  id: "midnight-arcade", title: "Midnight Arcade", artist: "KeyFlow Original", difficulty: "intermediate",
  bpm: 112, beatsPerBar: 4,
  description: "Syncopated synth-pop hook in A minor with driving bass.",
  notes: merge(
    line(
      "A4/.5 C5/.5 E5 D5/.5 C5/.5 A4 | G4/.5 A4/.5 C5 A4/2 | F4/.5 A4/.5 C5 B4/.5 A4/.5 G4 | E4/.5 G4/.5 A4/3 |" +
        "A4/.5 C5/.5 E5 D5/.5 C5/.5 A4 | G4/.5 A4/.5 C5 D5/2 | E5/.5 D5/.5 C5 B4/.5 C5/.5 D5 | E5/4 |" +
        "C5/.5 C5/.5 D5 E5/.5 G5/.5 E5 | D5/.5 C5/.5 A4 C5/2 | B4/.5 B4/.5 C5 D5/.5 E5/.5 D5 | B4/.5 G4/.5 E4/3 |" +
        "A4/.5 C5/.5 E5 D5/.5 C5/.5 A4 | G4/.5 A4/.5 C5 D5/2 | E5/.5 D5/.5 C5 B4/.5 G4/.5 B4 | A4/4"
    ),
    line(
      "A2/1.5 A2/.5 E3 A2 | F2/1.5 F2/.5 C3 F2 | D3/1.5 D3/.5 A2 D3 | E2/1.5 E2/.5 B2 E2 |" +
        "A2/1.5 A2/.5 E3 A2 | F2/1.5 F2/.5 C3 F2 | G2/1.5 G2/.5 D3 G2 | C3/1.5 C3/.5 G2 C3 |" +
        "A2/1.5 A2/.5 E3 A2 | F2/1.5 F2/.5 C3 F2 | G2/1.5 G2/.5 D3 G2 | E2/1.5 E2/.5 B2 E2 |" +
        "A2/1.5 A2/.5 E3 A2 | F2/1.5 F2/.5 C3 F2 | E2/1.5 E2/.5 B2 E2 | A2+E3/4",
      1
    )
  ),
});

// ---------------------------------------------------------------- Advanced

function furEliseLH(): BeatNote[] {
  // Beat = eighth note, 3 beats per bar. Bar 1 is the 1-beat pickup, so bar k (k >= 2) starts at 1 + 3 * (k - 2).
  const plan: [number, "A" | "E"][] = [
    [3, "A"], [4, "E"], [5, "A"], [7, "A"], [8, "E"], [9, "A"],
    [11, "A"], [12, "E"], [13, "A"], [15, "A"], [16, "E"], [17, "A"],
  ];
  const out: BeatNote[] = [];
  for (const [bar, chord] of plan) {
    const start = 1 + 3 * (bar - 2);
    out.push(...line(chord === "A" ? "A2/.5 E3/.5 A3/.5" : "E2/.5 E3/.5 G#3/.5", 1, start, 0.55).notes);
  }
  return out;
}
const furElise = buildSong({
  id: "fur-elise", title: "Für Elise (Opening)", artist: "Ludwig van Beethoven", difficulty: "advanced",
  bpm: 132, beatsPerBar: 3, barsPerSection: 4,
  description: "The iconic opening theme: fast alternating notes and hand-to-hand handoffs. (Beat = eighth note.)",
  notes: merge(
    line(
      "E5/.5 D#5/.5 | E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5 | A4/1 R/.5 C4/.5 E4/.5 A4/.5 | B4/1 R/.5 E4/.5 G#4/.5 B4/.5 |" +
        "C5/1 R/.5 E4/.5 E5/.5 D#5/.5 | E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5 | A4/1 R/.5 C4/.5 E4/.5 A4/.5 |" +
        "B4/1 R/.5 E4/.5 C5/.5 B4/.5 | A4/1 R/1 E5/.5 D#5/.5 | E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5 |" +
        "A4/1 R/.5 C4/.5 E4/.5 A4/.5 | B4/1 R/.5 E4/.5 G#4/.5 B4/.5 | C5/1 R/.5 E4/.5 E5/.5 D#5/.5 |" +
        "E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5 | A4/1 R/.5 C4/.5 E4/.5 A4/.5 | B4/1 R/.5 E4/.5 C5/.5 B4/.5 | A4/3"
    ),
    { notes: furEliseLH() }
  ),
});

function preludeC(): BeatNote[] {
  const bars = [
    "C4 E4 G4 C5 E5", "C4 D4 A4 D5 F5", "B3 D4 G4 D5 F5", "C4 E4 G4 C5 E5",
    "C4 E4 A4 E5 A5", "C4 D4 F#4 A4 D5", "B3 D4 G4 D5 G5", "B3 C4 E4 G4 C5",
    "A3 C4 E4 G4 C5", "D3 A3 D4 F#4 C5", "G3 B3 D4 G4 B4", "G3 Bb3 E4 G4 C#5",
    "F3 A3 D4 A4 D5", "F3 Ab3 D4 F4 B4", "E3 G3 C4 G4 C5", "E3 F3 A3 C4 F4",
  ];
  const notes: BeatNote[] = [];
  bars.forEach((bar, b) => {
    const p = bar.split(" ").map(parseNote);
    for (let half = 0; half < 2; half++) {
      const base = b * 4 + half * 2;
      // n1 and n2 are held (left hand), n3..n5 arpeggiated (right hand).
      notes.push({ midi: p[0], beat: base, beats: 1.95, track: 1, velocity: 0.55 });
      notes.push({ midi: p[1], beat: base + 0.25, beats: 1.7, track: 1, velocity: 0.5 });
      const seq = [p[2], p[3], p[4], p[2], p[3], p[4]];
      seq.forEach((m, i) => notes.push({ midi: m, beat: base + 0.5 + i * 0.25, beats: 0.24, track: 0, velocity: 0.62 }));
    }
  });
  notes.push(
    { midi: parseNote("C3"), beat: 64, beats: 4, track: 1, velocity: 0.55 },
    { midi: parseNote("C4"), beat: 64, beats: 4, track: 1, velocity: 0.5 },
    { midi: parseNote("E4"), beat: 64, beats: 4, track: 0, velocity: 0.55 },
    { midi: parseNote("G4"), beat: 64, beats: 4, track: 0, velocity: 0.55 },
    { midi: parseNote("C5"), beat: 64, beats: 4, track: 0, velocity: 0.55 }
  );
  return notes;
}
const prelude = buildSong({
  id: "prelude-c", title: "Prelude in C Major", artist: "Johann Sebastian Bach", difficulty: "advanced",
  bpm: 66, beatsPerBar: 4, barsPerSection: 4,
  description: "BWV 846 — flowing sixteenth-note arpeggios across shifting harmonies.",
  notes: preludeC(),
});

const turkish = buildSong({
  id: "turkish-march", title: "Rondo alla Turca (Opening)", artist: "Wolfgang Amadeus Mozart", difficulty: "advanced",
  bpm: 112, beatsPerBar: 2, barsPerSection: 4,
  description: "Quick sixteenth-note turns from the Sonata K. 331.",
  notes: merge(
    line(
      "B4/.25 A4/.25 G#4/.25 A4/.25 | C5/.5 R/.5 D5/.25 C5/.25 B4/.25 C5/.25 | E5/.5 R/.5 F5/.25 E5/.25 D#5/.25 E5/.25 |" +
        "B5/.25 A5/.25 G#5/.25 A5/.25 B5/.25 A5/.25 G#5/.25 A5/.25 | C6/1 A5/.5 C6/.5 | B5/.5 A5/.5 G5/.5 A5/.5 |" +
        "B5/.5 A5/.5 G5/.5 A5/.5 | B5/.5 A5/.5 G5/.5 F#5/.5 | E5/1 B4/.25 A4/.25 G#4/.25 A4/.25 |" +
        "C5/.5 R/.5 D5/.25 C5/.25 B4/.25 C5/.25 | E5/.5 R/.5 F5/.25 E5/.25 D#5/.25 E5/.25 |" +
        "B5/.25 A5/.25 G#5/.25 A5/.25 B5/.25 A5/.25 G#5/.25 A5/.25 | C6/1 A5/.5 B5/.5 | C6/.5 B5/.5 A5/.5 G#5/.5 |" +
        "A5/.5 E5/.5 F5/.5 D5/.5 | C5/1 B4/.75 A4/.25 | A4/2"
    ),
    line(
      "R/1 | A3/.5 C4+E4/.5 C4+E4/.5 C4+E4/.5 | A3/.5 C4+E4/.5 C4+E4/.5 C4+E4/.5 | A3/.5 C4+E4/.5 A3/.5 C4+E4/.5 |" +
        "A3/.5 C4+E4/.5 A3/.5 C4+E4/.5 | E3/.5 B3+E4/.5 E3/.5 B3+E4/.5 | A3/.5 C4+E4/.5 A3/.5 C4+E4/.5 | E3/.5 B3+E4/.5 E3/.5 B3+E4/.5 |" +
        "E3/1 R/1 | A3/.5 C4+E4/.5 C4+E4/.5 C4+E4/.5 | A3/.5 C4+E4/.5 C4+E4/.5 C4+E4/.5 | A3/.5 C4+E4/.5 A3/.5 C4+E4/.5 |" +
        "A3/.5 C4+E4/.5 A3/.5 C4+E4/.5 | A3/.5 C4+E4/.5 E3/.5 B3+E4/.5 | C4/.5 A3/.5 D3/.5 F3/.5 | E3/1 E2/1 | A2/2",
      1
    )
  ),
});

function starfall(): BeatNote[] {
  // Original étude: right-hand sixteenth arpeggios over a I–vi–IV–V loop.
  const chords = [
    ["C4", "E4", "G4"], ["A3", "C4", "E4"], ["F3", "A3", "C4"], ["G3", "B3", "D4"],
    ["C4", "E4", "G4"], ["A3", "C4", "E4"], ["D4", "F4", "A4"], ["G3", "B3", "D4"],
  ];
  const roots = ["C3", "A2", "F2", "G2", "C3", "A2", "D3", "G2"];
  const notes: BeatNote[] = [];
  for (let rep = 0; rep < 2; rep++) {
    chords.forEach((ch, i) => {
      const bar = rep * 8 + i;
      const base = bar * 4;
      const tones = ch.map(parseNote);
      const up = [...tones, ...tones.map((t) => t + 12), tones[0] + 24];
      const pattern = rep === 0 ? [...up, ...up.slice(1, -1).reverse(), up[1], up[2]] : [...up.slice().reverse(), ...up.slice(1, -1), up[5], up[4], up[3]];
      pattern.slice(0, 16).forEach((m, k) =>
        notes.push({ midi: m, beat: base + k * 0.25, beats: 0.24, track: 0, velocity: k % 4 === 0 ? 0.8 : 0.62 })
      );
      notes.push({ midi: parseNote(roots[i]), beat: base, beats: 1.9, track: 1, velocity: 0.6 });
      notes.push({ midi: parseNote(roots[i]) + 7, beat: base + 2, beats: 1.9, track: 1, velocity: 0.52 });
    });
  }
  notes.push({ midi: parseNote("C3"), beat: 64, beats: 4, track: 1, velocity: 0.6 });
  for (const n of ["C4", "E4", "G4", "C5"]) notes.push({ midi: parseNote(n), beat: 64, beats: 4, track: 0, velocity: 0.7 });
  return notes;
}
const starfallEtude = buildSong({
  id: "starfall-etude", title: "Starfall Étude", artist: "KeyFlow Original", difficulty: "advanced",
  bpm: 96, beatsPerBar: 4, barsPerSection: 4,
  description: "Cascading two-octave arpeggios. A workout for hand position shifts.",
  notes: starfall(),
});

export const BUILTIN_SONGS: Song[] = [
  twinkle, mary, ode, jingle, neonDrift,
  minuet, greensleeves, canonD, gymno, midnight,
  furElise, prelude, turkish, starfallEtude,
];

export const POPULAR_IDS = ["ode-to-joy", "fur-elise", "canon-d", "neon-drift", "minuet-g", "midnight-arcade"];
