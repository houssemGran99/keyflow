import type { ExerciseId } from "./types";

export const EXERCISES: { id: ExerciseId; title: string; description: string; icon: string; skill: string }[] = [
  { id: "notes", title: "Note Recognition", description: "Read notes on treble and bass staves and find them on the keyboard.", icon: "Eye", skill: "Reading" },
  { id: "scales", title: "Scales", description: "Major, minor, pentatonic and blues scales with evenness tracking.", icon: "TrendingUp", skill: "Technique" },
  { id: "chords", title: "Chord Identification", description: "Name chords by ear, or build them from their names.", icon: "Layers", skill: "Harmony" },
  { id: "melody", title: "Melody Reproduction", description: "Listen and echo back melodies that grow every round.", icon: "Ear", skill: "Ear" },
  { id: "rhythm", title: "Rhythm Training", description: "Tap rhythms against a click; get millisecond feedback.", icon: "Drum", skill: "Timing" },
];
