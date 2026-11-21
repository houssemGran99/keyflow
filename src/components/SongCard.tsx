"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Play, Square, Clock, Music2, Trash2, CheckCircle2 } from "lucide-react";
import type { Song, SongStat } from "@/lib/types";
import { DIFFICULTY_META } from "@/lib/song-utils";
import { formatTime } from "@/lib/music";
import { playNotes, type PlaybackHandle } from "@/lib/playback";

// Only one preview plays at a time across all cards.
let activePreview: { handle: PlaybackHandle; stop: () => void } | null = null;

export function usePreview(song: Song) {
  const [playing, setPlaying] = useState(false);
  const self = useRef<{ handle: PlaybackHandle; stop: () => void } | null>(null);
  useEffect(
    () => () => {
      if (self.current) self.current.stop();
    },
    []
  );
  const toggle = () => {
    if (playing && self.current) {
      self.current.stop();
      return;
    }
    activePreview?.stop();
    const handle = playNotes(song.notes, { offset: song.preview.start, until: song.preview.end, highlight: false });
    const entry = {
      handle,
      stop: () => {
        handle.stop();
        setPlaying(false);
        if (activePreview === entry) activePreview = null;
        self.current = null;
      },
    };
    activePreview = entry;
    self.current = entry;
    setPlaying(true);
    handle.done.then(() => {
      if (self.current === entry) entry.stop();
    });
  };
  return { playing, toggle };
}

export function SongCard({
  song, stat, href, cta = "Learn", onDelete, completed, extra,
}: {
  song: Song;
  stat?: SongStat;
  href: string;
  cta?: string;
  onDelete?: () => void;
  completed?: boolean;
  extra?: React.ReactNode;
}) {
  const meta = DIFFICULTY_META[song.difficulty];
  const { playing, toggle } = usePreview(song);
  return (
    <div className="card p-4 flex flex-col gap-3 group hover:ring-1 hover:ring-accent/40 transition-shadow relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent/10 blur-2xl group-hover:bg-accent/20 transition-colors" />
      <div className="flex items-start gap-3 relative">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-accent/30 to-accent-2/30 ring-1 ring-line flex items-center justify-center">
          <Music2 size={18} className="text-accent-2" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate flex items-center gap-1.5">
            {song.title}
            {completed && <CheckCircle2 size={14} className="text-good shrink-0" aria-label="Completed" />}
          </div>
          <div className="text-xs text-muted truncate">{song.artist}</div>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-faint hover:text-bad" aria-label={`Delete ${song.title}`}>
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs relative">
        <span className={`chip ${meta.color}`}>{meta.label}</span>
        <span className="text-muted flex items-center gap-1">
          <Clock size={12} /> {formatTime(song.duration)}
        </span>
        <span className="text-muted">{song.bpm} BPM</span>
        <span className="text-muted">{song.notes.length} notes</span>
      </div>
      {stat && stat.bestProgress > 0 && (
        <div className="relative">
          <div className="flex justify-between text-[11px] text-muted mb-1">
            <span>Progress</span>
            <span>{stat.bestAccuracy ? `Best ${stat.bestAccuracy.toFixed(0)}%` : `${Math.round(stat.bestProgress * 100)}%`}</span>
          </div>
          <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${Math.round(stat.bestProgress * 100)}%` }} />
          </div>
        </div>
      )}
      {extra}
      <div className="flex gap-2 mt-auto relative">
        <button className="btn btn-ghost flex-1" onClick={toggle} aria-label={playing ? "Stop preview" : "Preview song"}>
          {playing ? <Square size={14} fill="currentColor" /> : <Play size={14} />} {playing ? "Stop" : "Preview"}
        </button>
        <Link href={href} className="btn btn-primary flex-1">
          {cta}
        </Link>
      </div>
    </div>
  );
}
