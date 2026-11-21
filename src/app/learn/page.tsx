"use client";
import { useRef, useState } from "react";
import { Upload, Search, FileMusic } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui";
import { SongCard } from "@/components/SongCard";
import { BUILTIN_SONGS } from "@/data/songs";
import { useLibrary } from "@/store/library";
import { useProgress } from "@/store/progress";
import { parseMidi } from "@/lib/midi-file";
import { makeUserSong } from "@/lib/song-utils";
import { toast } from "@/store/toasts";
import type { Difficulty } from "@/lib/types";

const TABS: { id: Difficulty | "all" | "mine"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "mine", label: "My Songs" },
];

export default function LearnPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const userSongs = useLibrary((s) => s.userSongs);
  const removeSong = useLibrary((s) => s.remove);
  const progress = useProgress((s) => s.progress);
  const fileRef = useRef<HTMLInputElement>(null);

  const source = tab === "mine" ? userSongs : [...BUILTIN_SONGS, ...userSongs];
  const songs = source.filter(
    (s) =>
      (tab === "all" || tab === "mine" || s.difficulty === tab) &&
      (!q || `${s.title} ${s.artist}`.toLowerCase().includes(q.toLowerCase()))
  );

  const onImport = async (file: File) => {
    try {
      if (file.size > 2_000_000) throw new Error("File is larger than 2 MB");
      const parsed = parseMidi(await file.arrayBuffer());
      const song = makeUserSong({
        title: file.name.replace(/\.(mid|midi)$/i, ""),
        artist: "Imported MIDI",
        notes: parsed.notes,
        bpm: parsed.bpm,
        beatsPerBar: parsed.beatsPerBar,
        source: "imported",
      });
      useLibrary.getState().add(song);
      useProgress.getState().unlock("importer");
      toast("MIDI imported", `${song.title} · ${song.notes.length} notes · ${song.difficulty}`);
      setTab("mine");
    } catch (e) {
      toast("Import failed", (e as Error).message, "error");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-10">
      <PageHeader title="Learn Songs" subtitle="Falling-note lessons with wait mode, slow-down, hand selection and section looping.">
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Import MIDI
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".mid,.midi,audio/midi,audio/x-midi"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl bg-surface-2 ring-1 ring-line p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.id ? "bg-accent text-white" : "text-muted hover:text-fg"}`}
            >
              {t.label}
              {t.id === "mine" && userSongs.length > 0 && <span className="ml-1 opacity-70">{userSongs.length}</span>}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-surface-2 ring-1 ring-line px-3 py-2 sm:ml-auto sm:w-64">
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search songs" className="bg-transparent outline-none text-sm flex-1" />
        </label>
      </div>

      {songs.length === 0 ? (
        tab === "mine" ? (
          <EmptyState
            icon={<FileMusic size={36} />}
            title="No songs of your own yet"
            body="Import a .mid file, or record yourself in Free Play and choose “Save as song” to practice it here."
            action={
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Import MIDI
              </button>
            }
          />
        ) : (
          <EmptyState icon={<Search size={36} />} title="No matching songs" body="Try a different search or difficulty." />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {songs.map((s) => (
            <SongCard
              key={s.id}
              song={s}
              stat={progress.songStats[s.id]}
              completed={progress.songsCompleted.includes(s.id)}
              href={`/learn/play?song=${s.id}`}
              onDelete={s.source !== "builtin" ? () => removeSong(s.id) : undefined}
              extra={s.description ? <p className="text-xs text-muted line-clamp-2 relative">{s.description}</p> : undefined}
            />
          ))}
        </div>
      )}
    </main>
  );
}
