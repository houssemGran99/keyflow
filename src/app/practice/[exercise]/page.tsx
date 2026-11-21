import { notFound } from "next/navigation";
import { ExerciseView } from "./view";

const IDS = ["notes", "scales", "chords", "melody", "rhythm"] as const;

export function generateStaticParams() {
  return IDS.map((exercise) => ({ exercise }));
}

export default async function Page({ params }: { params: Promise<{ exercise: string }> }) {
  const { exercise } = await params;
  if (!(IDS as readonly string[]).includes(exercise)) notFound();
  return <ExerciseView id={exercise as (typeof IDS)[number]} />;
}
