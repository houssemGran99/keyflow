"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Circle, Square, Play, Trash2, Download, Timer, Save, Pause } from "lucide-react";
import { PianoKeyboard } from "@/components/piano/PianoKeyboard";
import { KeyboardControls } from "@/components/piano/KeyboardControls";
import { KeymapGuide } from "@/components/piano/KeymapGuide";
import { NoteTrail } from "@/components/piano/NoteTrail";
import { useSettings } from "@/store/settings";
import { usePiano } from "@/store/piano";
import { useProgress } from "@/store/progress";
import { useLibrary } from "@/store/library";
import { detectChord, formatTime, noteName } from "@/lib/music";
import { Metronome, Recorder, playNotes, type PlaybackHandle } from "@/lib/playback";
import { writeMidi } from "@/lib/midi-file";
import { downloadBlob, makeUserSong } from "@/lib/song-utils";
import { repository } from "@/lib/repository";
import { toast } from "@/store/toasts";
import type { Note } from "@/lib/types";

const REC_KEY = "recording";

export default function FreePlayPage() {
  const { octaves, startOctave } = useSettings();
  const low = (startOctave + 1) * 12;
  const high = Math.min(108, low + octaves * 12);
  const active = usePiano((s) => s.active);
  const held = useMemo(() => Object.keys(active).map(Number).sort((a, b) => a - b), [active]);
  const chord = detectChord(held);

  const recorder = useRef<Recorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<Note[]>([]);
  const [playing, setPlaying] = useState(false);
  const playback = useRef<PlaybackHandle | null>(null);

  const metro = useRef<Metronome | null>(null);
  const [metroOn, setMetroOn] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [beat, setBeat] = useState(-1);

  // Recently played notes (live log)
  const [log, setLog] = useState<{ id: number; midi: number }[]>([]);
  const logId = useRef(0);
  const prevHeld = useRef<number[]>([]);
  useEffect(() => {
    const newly = held.filter((m) => !prevHeld.current.includes(m));
    prevHeld.current = held;
    if (newly.length) setLog((l) => [...l, ...newly.map((midi) => ({ id: ++logId.current, midi }))].slice(-14));
  }, [held]);

  useEffect(() => {
    const saved = repository.load<Note[]>(REC_KEY);
    if (saved?.length) setTake(saved);
    return () => {
      metro.current?.stop();
      playback.current?.stop();
      if (recorder.current?.recording) recorder.current.end();
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed(recorder.current?.elapsed ?? 0), 200);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (metro.current) metro.current.bpm = bpm;
  }, [bpm]);

  const toggleRecord = () => {
    if (recording) {
      const notes = recorder.current!.end();
      setRecording(false);
      if (notes.length) {
        setTake(notes);
        repository.save(REC_KEY, notes);
        useProgress.getState().unlock("recorder");
        toast("Recording saved", `${notes.length} notes · ${formatTime(Math.max(...notes.map((n) => n.startTime + n.duration)))}`);
      } else toast("Nothing recorded", "Play some notes while recording is on.");
      return;
    }
    stopPlayback();
    recorder.current = new Recorder();
    recorder.current.begin();
    setElapsed(0);
    setRecording(true);
  };

  const stopPlayback = () => {
    playback.current?.stop();
    playback.current = null;
    setPlaying(false);
  };

  const togglePlayback = () => {
    if (playing) return stopPlayback();
    if (!take.length) return;
    const h = playNotes(take);
    playback.current = h;
    setPlaying(true);
    h.done.then(() => {
      if (playback.current === h) {
        playback.current = null;
        setPlaying(false);
      }
    });
  };

  const clearTake = () => {
    stopPlayback();
    setTake([]);
    repository.remove(REC_KEY);
  };

  const exportMidi = () => {
    const bytes = writeMidi(take, 120);
    downloadBlob(bytes, `keyflow-recording-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.mid`, "audio/midi");
  };

  const saveAsSong = () => {
    const name = `My Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    try {
      const song = makeUserSong({ title: name, artist: "You", notes: take, bpm: metroOn ? bpm : 120, source: "recording" });
      useLibrary.getState().add(song);
      toast("Added to your library", "Find it under Learn → My Songs.");
    } catch (e) {
      toast("Could not save", (e as Error).message, "error");
    }
  };

  const toggleMetro = () => {
    if (metroOn) {
      metro.current?.stop();
      setMetroOn(false);
      setBeat(-1);
      return;
    }
    const m = new Metronome();
    m.bpm = bpm;
    m.onBeat = (b) => setBeat(b);
    m.start();
    metro.current = m;
    setMetroOn(true);
  };

  const takeLen = take.length ? Math.max(...take.map((n) => n.startTime + n.duration)) : 0;

  return (
    <main className="mx-auto max-w-7xl px-3 sm:px-4 pt-4 pb-24 md:pb-8 flex flex-col gap-3 min-h-[calc(100dvh-56px)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Free Play</h1>
          <p className="text-xs text-muted">Click, touch, use your computer keyboard or plug in a MIDI keyboard. Hold <kbd className="px-1 rounded bg-surface-3">Space</kbd> for sustain, <kbd className="px-1 rounded bg-surface-3">← →</kbd> to change octave.</p>
        </div>
        <KeyboardControls />
      </div>

      {/* Computer-keyboard cheat sheet */}
      <div className="card p-3 hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="text-xs text-muted max-w-[14rem]">
          <div className="font-semibold text-fg text-sm">Your keys</div>
          Blue letters play white keys, purple letters play black keys. The same letters are shown on the piano below.
        </div>
        <KeymapGuide />
        <div className="text-xs text-muted flex flex-col gap-1">
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-3 font-mono">Space</kbd> hold for sustain</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-3 font-mono">← →</kbd> move up / down an octave</span>
          <span className="text-faint">Change the layout in Profile → Keyboard mapping</span>
        </div>
      </div>

      {/* Studio bar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <button className={`btn ${recording ? "bg-bad text-white" : "btn-ghost"}`} onClick={toggleRecord} disabled={playing}>
          {recording ? <Square size={15} fill="currentColor" /> : <Circle size={15} className="text-bad" fill="currentColor" />}
          {recording ? `Stop · ${formatTime(elapsed)}` : "Record"}
        </button>
        <button className="btn btn-ghost" onClick={togglePlayback} disabled={!take.length || recording}>
          {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "Stop" : "Play back"}
        </button>
        <button className="btn btn-ghost" onClick={clearTake} disabled={!take.length || recording}>
          <Trash2 size={15} /> Clear
        </button>
        <button className="btn btn-ghost" onClick={exportMidi} disabled={!take.length || recording} title="Export as MIDI file">
          <Download size={15} /> <span className="hidden sm:inline">Export</span> .mid
        </button>
        <button className="btn btn-ghost" onClick={saveAsSong} disabled={!take.length || recording} title="Practice your recording in Learn mode">
          <Save size={15} /> <span className="hidden sm:inline">Save as song</span>
        </button>
        <span className="text-xs text-muted ml-1">
          {recording ? (
            <span className="flex items-center gap-1.5 text-bad">
              <span className="h-2 w-2 rounded-full bg-bad animate-pulse" /> Recording…
            </span>
          ) : take.length ? (
            `Take: ${take.length} notes · ${formatTime(takeLen)}`
          ) : (
            "No recording yet"
          )}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-ghost" data-on={metroOn} onClick={toggleMetro}>
            <Timer size={15} /> Metronome
          </button>
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((b) => (
              <span key={b} className={`h-2.5 w-2.5 rounded-full transition-colors ${beat === b ? (b === 0 ? "bg-accent" : "bg-accent-2") : "bg-surface-3"}`} />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-24" aria-label="BPM" />
            <span className="tabular-nums w-14">{bpm} BPM</span>
          </label>
        </div>
      </div>

      {/* Visual stage */}
      <div className="relative flex-1 min-h-[180px] rounded-2xl overflow-hidden ring-1 ring-line" style={{ background: "var(--lane-bg)" }}>
        <NoteTrail low={low} high={high} className="absolute inset-0" />
        <div className="absolute inset-x-0 top-0 p-4 flex items-start justify-between pointer-events-none">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-faint font-semibold">Now playing</div>
            <motion.div
              key={chord ?? held.join("-")}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12 }}
              className="font-display text-4xl sm:text-5xl font-bold min-h-[1.2em]"
            >
              {held.length ? (
                <span className="text-gradient">{chord ?? held.map((m) => noteName(m)).join(" ")}</span>
              ) : (
                <span className="text-faint">—</span>
              )}
            </motion.div>
            {chord && <div className="text-sm text-muted">{held.map((m) => noteName(m)).join(" · ")}</div>}
          </div>
          <div className="hidden sm:flex flex-wrap justify-end gap-1 max-w-[50%]">
            {log.map((l) => (
              <motion.span
                key={l.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-md bg-surface-3/80 px-1.5 py-0.5 text-xs font-mono text-muted"
              >
                {noteName(l.midi)}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-[calc(60px+env(safe-area-inset-bottom))] md:static z-30">
        <PianoKeyboard low={low} high={high} height="clamp(140px, 26vh, 240px)" />
      </div>
    </main>
  );
}
