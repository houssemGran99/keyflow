"use client";
import { NoteRecognition } from "@/components/practice/NoteRecognition";
import { Scales } from "@/components/practice/Scales";
import { Chords } from "@/components/practice/Chords";
import { Melody } from "@/components/practice/Melody";
import { Rhythm } from "@/components/practice/Rhythm";
import type { ExerciseId } from "@/lib/types";

export function ExerciseView({ id }: { id: ExerciseId }) {
  switch (id) {
    case "notes":
      return <NoteRecognition />;
    case "scales":
      return <Scales />;
    case "chords":
      return <Chords />;
    case "melody":
      return <Melody />;
    case "rhythm":
      return <Rhythm />;
  }
}
