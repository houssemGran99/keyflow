"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Pause, Play, RotateCcw, Settings, Hand, Hourglass, Repeat, Headphones, Gauge, Flame,
} from "lucide-react";
import { GameEngine, type EngineStats, type JudgeEvent } from "@/lib/engine";
import { subscribeNotes, releaseAll } from "@/lib/input";
import { fitRange, formatTime, noteName } from "@/lib/music";
import { songRange } from "@/lib/song-utils";
import { CHALLENGE_LEVELS, comboMultiplier, gradeFor, type LevelConfig } from "@/lib/scoring";
import type { ChallengeLevel, Song } from "@/lib/types";
import { useSettings } from "@/store/settings";
import { useKeyLabels } from "@/components/piano/useKeyLabels";
import { useProgress } from "@/store/progress";
import { toast } from "@/store/toasts";
import { PianoKeyboard, type KeyHint } from "@/components/piano/PianoKeyboard";
import { FallingNotes, type FallingNotesHandle } from "./FallingNotes";
import { GameResults } from "./GameResults";
import { Modal, Slider, Toggle } from "@/components/ui";
import type { DailyChallenge } from "@/data/daily";

type Hands = "right" | "left" | "both";

interface Props {
  song: Song;
  mode: "learn" | "challenge";
  level?: ChallengeLevel;
  daily?: DailyChallenge | null;
  nextSong?: Song | null;
  backHref: string;
}

const JUDGE_STYLE: Record<string, { text: string; cls: string; color: string }> = {
  perfect: { text: "PERFECT", cls: "from-amber-200 to-yellow-400", color: "#fde68a" },
  great: { text: "GREAT", cls: "from-emerald-200 to-emerald-400", color: "#6ee7b7" },
  good: { text: "GOOD", cls: "from-sky-200 to-sky-400", color: "#7dd3fc" },
  miss: { text: "MISS", cls: "from-rose-300 to-rose-500", color: "#fb7185" },
  wrong: { text: "WRONG KEY", cls: "from-zinc-300 to-zinc-500", color: "#a1a1aa" },
};

const freshStats = (): EngineStats => ({
  score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 }, wrongNotes: 0,
  accuracy: 0, judged: 0, totalPlayerNotes: 0, progress: 0, loops: 0,
});

export function GameScreen({ song, mode, level = "normal", daily, nextSong, backHref }: Props) {
  const router = useRouter();
  const settings = useSettings();
  const levelCfg: LevelConfig = CHALLENGE_LEVELS[level];
  const isLearn = mode === "learn";

  // Learn-mode options
  const [hands, setHands] = useState<Hands>(song.tracks > 1 ? "right" : "both");
  const [waitMode, setWaitMode] = useState(true);
  const [speed, setSpeed] = useState(isLearn ? 0.75 : levelCfg.rate);
  const [listen, setListen] = useState(false);
  const [sectionFrom, setSectionFrom] = useState(0);
  const [sectionTo, setSectionTo] = useState(song.sections.length - 1);
  const [loop, setLoop] = useState(false);

  const [stats, setStats] = useState<EngineStats>(freshStats);
  const [hints, setHints] = useState<Record<number, KeyHint>>({});
  const [judgeFx, setJudgeFx] = useState<JudgeEvent | null>(null);
  const [phase, setPhase] = useState<"ready" | "countdown" | "playing" | "paused" | "done">("ready");
  const [countdown, setCountdown] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<null | { stats: EngineStats; newBest: boolean; extra?: string; completed: boolean }>(null);
  const [engineVersion, setEngineVersion] = useState(0);

  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<FallingNotesHandle>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const finishRef = useRef<(s: EngineStats) => void>(() => {});

  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 639px)");
    const f = () => setNarrow(q.matches);
    f();
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  const [low, high] = useMemo(() => {
    const [lo, hi] = songRange(song);
    return fitRange(lo, hi, narrow ? 2 : 3);
  }, [song, narrow]);

  const range = useMemo(() => {
    if (!isLearn) return { start: 0, end: song.duration + 0.01 };
    const a = song.sections[Math.min(sectionFrom, sectionTo)];
    const b = song.sections[Math.max(sectionFrom, sectionTo)];
    return { start: a?.start ?? 0, end: (b?.end ?? song.duration) + 0.01 };
  }, [isLearn, song, sectionFrom, sectionTo]);
  const fullSong = range.start <= 0.001 && range.end >= song.duration;

  const playerTracks = useMemo(() => {
    if (!isLearn) return levelCfg.tracks;
    if (song.tracks < 2) return [0, 1];
    return hands === "right" ? [0] : hands === "left" ? [1] : [0, 1];
  }, [isLearn, hands, song.tracks, levelCfg.tracks]);

  // Letters on falling notes + keys. Shift the computer-key octave so the letters cover
  // as many of this song's notes as possible; restore the user's octave when leaving.
  const keyLabels = useKeyLabels(settings.showKeyLabels);
  const [userOctave] = useState(() => useSettings.getState().keyboardOctave);
  useEffect(() => {
    const st = useSettings.getState();
    const offsets = new Set(st.keymap.map((b) => b.offset));
    const notes = song.notes.filter((n) => (listen ? true : playerTracks.includes(n.track)));
    let best = st.keyboardOctave;
    let bestCount = -1;
    for (let o = 1; o <= 6; o++) {
      const base = (o + 1) * 12;
      const count = notes.reduce((c, n) => c + (offsets.has(n.midi - base) ? 1 : 0), 0);
      // Prefer the user's current octave on ties.
      if (count > bestCount || (count === bestCount && o === st.keyboardOctave)) {
        best = o;
        bestCount = count;
      }
    }
    if (best !== st.keyboardOctave) st.set({ keyboardOctave: best });
  }, [song, playerTracks, listen]);
  useEffect(() => () => useSettings.getState().set({ keyboardOctave: userOctave }), [userOctave]);

  // ---- engine lifecycle (rebuilt when structural options change)
  useEffect(() => {
    const engine = new GameEngine(
      {
        song,
        mode: listen ? "listen" : mode,
        playerTracks,
        accompaniment: settings.accompanimentVolume,
        waitMode: isLearn && waitMode && !listen,
        rate: speed,
        range,
        loop: isLearn && loop,
        windows: isLearn ? { perfect: 0.06, great: 0.12, good: 0.22 } : levelCfg.windows,
        reduceChords: !isLearn && levelCfg.reduceChords,
        leadIn: settings.noteSpeed,
      },
      {
        onFrame: (t) => rendererRef.current?.draw(t),
        onStats: setStats,
        onHints: setHints,
        onWaiting: setWaiting,
        onJudge: (e) => {
          setJudgeFx(e);
          const st = JUDGE_STYLE[e.judgement];
          if (e.judgement !== "miss" && e.judgement !== "wrong") rendererRef.current?.burst(e.midi, st.color, e.judgement === "perfect" ? 18 : 10);
        },
        onEnd: (s) => finishRef.current(s),
      }
    );
    engineRef.current = engine;
    engine.attach();
    setStats({ ...engine.stats });
    setPhase("ready");
    setWaiting(false);
    setEngineVersion((v) => v + 1);
    return () => {
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, mode, listen, playerTracks, range, isLearn, level]);

  // Live-adjustable options
  useEffect(() => engineRef.current?.setRate(speed), [speed]);
  useEffect(() => engineRef.current?.setWaitMode(isLearn && waitMode && !listen), [waitMode, isLearn, listen]);
  useEffect(() => engineRef.current?.setLoop(isLearn && loop), [loop, isLearn]);
  useEffect(() => engineRef.current?.setAccompaniment(settings.accompanimentVolume), [settings.accompanimentVolume]);

  // Player input -> engine
  useEffect(() => {
    return subscribeNotes((e) => {
      if (e.type === "on") engineRef.current?.handleNoteOn(e.midi);
    });
  }, []);

  // Record unfinished learn sessions when leaving.
  useEffect(() => {
    return () => {
      const eng = engineRef.current;
      if (isLearn && eng?.isStarted && phaseRef.current !== "done" && !listen) {
        useProgress.getState().recordSongPlay(song.id, eng.stats.progress, eng.stats.accuracy, false);
      }
      releaseAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(
    (s: EngineStats) => {
      setPhase("done");
      const acc = s.accuracy;
      const grade = gradeFor(acc);
      const prog = useProgress.getState();
      if (listen) {
        setResult(null);
        setPhase("ready");
        engineRef.current?.restart();
        return;
      }
      if (isLearn) {
        const completed = fullSong;
        prog.recordSongPlay(song.id, 1, acc, completed);
        setResult({
          stats: s,
          newBest: completed && acc > (prog.progress.songStats[song.id]?.bestAccuracy ?? 0),
          completed,
          extra: completed ? "Song completed — progress saved." : "Section practiced. Play the full song to complete it.",
        });
      } else {
        const entry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          songId: song.id,
          songTitle: song.title,
          level,
          score: s.score,
          accuracy: +acc.toFixed(2),
          maxCombo: s.maxCombo,
          grade,
          counts: { ...s.counts },
          wrongNotes: s.wrongNotes,
          totalNotes: s.totalPlayerNotes,
          date: Date.now(),
          daily: daily ? daily.day : undefined,
        };
        const { newBest } = prog.recordChallenge(entry);
        let extra: string | undefined;
        if (daily) {
          if (acc >= daily.targetAccuracy) {
            const first = prog.completeDaily(daily.day);
            extra = first ? "Daily challenge complete! +100 XP" : "Daily challenge already completed today.";
            if (first) toast("Daily challenge complete!", "+100 XP bonus");
          } else extra = `Daily target: ${daily.targetAccuracy}% accuracy — so close, try again!`;
        }
        setResult({ stats: s, newBest, extra, completed: true });
      }
    },
    [isLearn, listen, fullSong, song, level, daily]
  );
  finishRef.current = finish;

  // ---- controls
  const begin = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    if (!isLearn) {
      setPhase("countdown");
      setCountdown(3);
    } else {
      eng.start();
      setPhase("playing");
    }
  }, [isLearn]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      const eng = engineRef.current;
      if (eng) {
        if (eng.isStarted) eng.resume();
        else eng.start();
      }
      setPhase("playing");
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    engineRef.current?.pause();
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    if (!isLearn) {
      setPhase("countdown");
      setCountdown(3);
    } else {
      engineRef.current?.resume();
      setPhase("playing");
    }
  }, [isLearn]);

  const restart = useCallback(() => {
    engineRef.current?.restart();
    setResult(null);
    setJudgeFx(null);
    setStats({ ...(engineRef.current?.stats ?? freshStats()) });
    setPhase("ready");
  }, []);

  // Keyboard shortcuts & auto-pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (phaseRef.current === "playing") pause();
        else if (phaseRef.current === "paused") resume();
      } else if (e.code === "Enter" && phaseRef.current === "ready" && !showSettings) {
        e.preventDefault();
        begin();
      }
    };
    const onVis = () => document.hidden && pause();
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pause, resume, begin, showSettings]);

  const openSettings = () => {
    pause();
    setShowSettings(true);
  };

  const t = stats.progress * (range.end - range.start);
  const waitingNotes = Object.entries(hints)
    .filter(([, v]) => v === "target")
    .map(([k]) => noteName(Number(k)));
  const mult = comboMultiplier(stats.combo);

  return (
    <div className="fixed inset-0 flex flex-col bg-bg select-none">
      {/* HUD */}
      <div className="relative z-20 glass border-x-0 border-t-0 px-3 py-2 flex items-center gap-3">
        <button className="btn btn-ghost btn-icon" onClick={() => router.push(backHref)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold truncate">{song.title}</div>
            <span className="chip text-muted hidden sm:inline-flex">{isLearn ? (listen ? "Watch" : "Learn") : `${levelCfg.name}${daily ? " · Daily" : ""}`}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${stats.progress * 100}%` }} />
            </div>
            <span className="text-[11px] text-muted tabular-nums w-20 text-right">
              {formatTime(t)} / {formatTime(range.end - range.start)}
            </span>
          </div>
        </div>
        {!isLearn && (
          <div className="flex items-center gap-4 sm:gap-6 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Score</div>
              <motion.div key={stats.score} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="font-display text-xl font-bold tabular-nums leading-tight">
                {stats.score.toLocaleString()}
              </motion.div>
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Accuracy</div>
              <div className="font-display text-xl font-bold tabular-nums leading-tight">{stats.judged ? stats.accuracy.toFixed(1) : "—"}%</div>
            </div>
            <div className="hidden md:block">
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Best combo</div>
              <div className="font-display text-xl font-bold tabular-nums leading-tight">{stats.maxCombo}</div>
            </div>
          </div>
        )}
        {isLearn && !listen && (
          <div className="hidden sm:flex items-center gap-4 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Notes</div>
              <div className="font-display text-lg font-bold tabular-nums leading-tight">
                {stats.judged - stats.counts.miss}/{stats.totalPlayerNotes}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Accuracy</div>
              <div className="font-display text-lg font-bold tabular-nums leading-tight">{stats.judged ? stats.accuracy.toFixed(0) : "—"}%</div>
            </div>
          </div>
        )}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => (phase === "playing" ? pause() : phase === "paused" ? resume() : begin())}
          aria-label={phase === "playing" ? "Pause" : "Play"}
          disabled={phase === "countdown" || phase === "done"}
        >
          {phase === "playing" ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="btn btn-ghost btn-icon" onClick={restart} aria-label="Restart" title="Restart">
          <RotateCcw size={18} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={openSettings} aria-label="Settings">
          <Settings size={18} />
        </button>
      </div>

      {/* Learn controls */}
      {isLearn && (
        <div className="relative z-10 flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar border-b border-line bg-bg-2/70 text-sm">
          {song.tracks > 1 && (
            <div className="flex rounded-xl bg-surface-2 ring-1 ring-line p-0.5 shrink-0">
              {(["left", "both", "right"] as Hands[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setHands(h)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize flex items-center gap-1 ${hands === h ? "bg-accent text-white" : "text-muted"}`}
                >
                  <Hand size={12} className={h === "left" ? "-scale-x-100" : ""} />
                  {h === "both" ? "Both" : h === "left" ? "Left" : "Right"}
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-ghost py-1.5 shrink-0" data-on={waitMode && !listen} onClick={() => setWaitMode((w) => !w)} disabled={listen} title="The song waits until you press the right keys">
            <Hourglass size={14} /> Wait for me
          </button>
          <label className="flex items-center gap-2 rounded-xl bg-surface-2 ring-1 ring-line px-3 py-1.5 shrink-0">
            <Gauge size={14} className="text-muted" />
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="bg-transparent outline-none text-xs" aria-label="Playback speed">
              {[0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25].map((s) => (
                <option key={s} value={s} className="bg-surface">
                  {Math.round(s * 100)}% speed
                </option>
              ))}
            </select>
          </label>
          {song.sections.length > 1 && (
            <div className="flex items-center gap-1 rounded-xl bg-surface-2 ring-1 ring-line px-2 py-1 shrink-0 text-xs">
              <span className="text-muted">Section</span>
              <select value={sectionFrom} onChange={(e) => setSectionFrom(Number(e.target.value))} className="bg-transparent outline-none" aria-label="From section" disabled={phase === "playing"}>
                {song.sections.map((s, i) => (
                  <option key={i} value={i} className="bg-surface">{i + 1}</option>
                ))}
              </select>
              <span className="text-muted">to</span>
              <select value={sectionTo} onChange={(e) => setSectionTo(Number(e.target.value))} className="bg-transparent outline-none" aria-label="To section" disabled={phase === "playing"}>
                {song.sections.map((s, i) => (
                  <option key={i} value={i} className="bg-surface">{i + 1}</option>
                ))}
              </select>
              <span className="text-faint">/ {song.sections.length}</span>
            </div>
          )}
          <button className="btn btn-ghost py-1.5 shrink-0" data-on={loop} onClick={() => setLoop((l) => !l)} title="Loop the selected sections">
            <Repeat size={14} /> Loop{stats.loops ? ` ×${stats.loops}` : ""}
          </button>
          <button className="btn btn-ghost py-1.5 shrink-0" data-on={listen} onClick={() => setListen((l) => !l)} title="Watch & listen: the song plays itself">
            <Headphones size={14} /> Watch
          </button>
        </div>
      )}

      {/* Lane */}
      <div className="relative flex-1 min-h-0" style={{ background: "var(--lane-bg)" }}>
        <FallingNotes
          key={engineVersion}
          ref={rendererRef}
          engine={engineRef.current}
          low={low}
          high={high}
          visibleSeconds={settings.noteSpeed}
          showNames={settings.showNoteNames}
          keyLabels={keyLabels}
          bpm={song.bpm}
          beatsPerBar={song.beatsPerBar}
        />

        {/* Combo + judgement */}
        <div className="pointer-events-none absolute inset-x-0 top-[18%] flex flex-col items-center">
          <AnimatePresence mode="popLayout">
            {judgeFx && phase === "playing" && (
              <motion.div
                key={judgeFx.id}
                initial={{ scale: 0.6, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: "spring", stiffness: 600, damping: 26 }}
                className={`font-display text-3xl sm:text-4xl font-black tracking-wider bg-gradient-to-b ${JUDGE_STYLE[judgeFx.judgement].cls} bg-clip-text text-transparent drop-shadow`}
              >
                {JUDGE_STYLE[judgeFx.judgement].text}
              </motion.div>
            )}
          </AnimatePresence>
          {!isLearn && stats.combo >= 3 && (
            <motion.div key={stats.combo} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="mt-1 flex items-center gap-2 text-fg/90">
              <Flame size={18} className="text-warn" />
              <span className="font-display text-2xl font-bold tabular-nums">{stats.combo}</span>
              <span className="text-xs text-muted uppercase tracking-wider">combo</span>
              {mult > 1 && <span className="chip text-accent-2">×{mult}</span>}
            </motion.div>
          )}
        </div>

        {isLearn && waiting && waitingNotes.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-1.5 text-sm">
            Play <span className="font-bold text-accent-2">{waitingNotes.join(" + ")}</span>
          </div>
        )}

        {/* Overlays */}
        <AnimatePresence>
          {phase === "ready" && !result && (
            <motion.div key="ready" className="absolute inset-0 flex items-center justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="card p-6 text-center max-w-sm mx-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted font-semibold">{isLearn ? (listen ? "Watch mode" : "Learn") : `${levelCfg.name} challenge`}</div>
                <h2 className="font-display text-2xl font-bold mt-1">{song.title}</h2>
                <p className="text-sm text-muted mt-1">{song.artist}</p>
                <p className="text-sm text-muted mt-3">
                  {listen
                    ? "Sit back and watch the notes. Toggle Watch off to play along."
                    : isLearn
                      ? waitMode
                        ? "Notes wait for you — press the highlighted keys to move on."
                        : "Play the notes as they reach the glowing line."
                      : `${levelCfg.description}. Hit notes as they cross the line — wrong keys cost ${25} points.`}
                </p>
                {daily && <p className="text-sm text-accent-2 mt-2">Daily goal: {daily.targetAccuracy}% accuracy</p>}
                <button className="btn btn-primary mt-5 w-full" onClick={begin} autoFocus>
                  <Play size={16} /> {listen ? "Play song" : "Start"} <kbd className="ml-1 text-[10px] opacity-70">Enter</kbd>
                </button>
              </div>
            </motion.div>
          )}
          {phase === "countdown" && (
            <motion.div key="cd" className="absolute inset-0 flex items-center justify-center pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-8xl font-black text-gradient">
                {countdown > 0 ? countdown : "GO"}
              </motion.div>
            </motion.div>
          )}
          {phase === "paused" && !showSettings && (
            <motion.div key="paused" className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="card p-6 text-center w-72">
                <h2 className="font-display text-2xl font-bold mb-4">Paused</h2>
                <div className="flex flex-col gap-2">
                  <button className="btn btn-primary" onClick={resume} autoFocus>
                    <Play size={16} /> Resume
                  </button>
                  <button className="btn btn-ghost" onClick={restart}>
                    <RotateCcw size={16} /> Restart
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
                    <Settings size={16} /> Settings
                  </button>
                  <button className="btn btn-ghost" onClick={() => router.push(backHref)}>
                    <ArrowLeft size={16} /> Quit
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {result && (
          <GameResults
            mode={mode}
            title={song.title}
            subtitle={isLearn ? (result.completed ? "Song complete" : "Section complete") : `${levelCfg.name} · Results`}
            score={isLearn ? undefined : result.stats.score}
            accuracy={result.stats.accuracy}
            maxCombo={result.stats.maxCombo}
            grade={gradeFor(result.stats.accuracy)}
            counts={result.stats.counts}
            wrongNotes={result.stats.wrongNotes}
            newBest={result.newBest}
            extra={result.extra}
            onReplay={restart}
            onNext={nextSong ? () => router.push(isLearn ? `/learn/play?song=${nextSong.id}` : `/challenges/play?song=${nextSong.id}&level=${level}`) : undefined}
            nextLabel={isLearn ? "Next song" : "Next challenge"}
            onBack={() => router.push(backHref)}
          />
        )}
      </div>

      <PianoKeyboard low={low} high={high} hints={hints} height="clamp(110px, 22vh, 200px)" className="rounded-none" />

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div className="flex flex-col gap-4">
          <Slider label="Master volume" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => settings.set({ volume: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Accompaniment volume" value={settings.accompanimentVolume} min={0} max={1} step={0.05} onChange={(v) => settings.set({ accompanimentVolume: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Note fall window (zoom)" value={settings.noteSpeed} min={1.5} max={6} step={0.25} onChange={(v) => settings.set({ noteSpeed: v })} format={(v) => `${v}s`} />
          {isLearn && (
            <Slider label="Playback speed" value={speed} min={0.25} max={1.25} step={0.05} onChange={setSpeed} format={(v) => `${Math.round(v * 100)}%`} />
          )}
          <Toggle label="Show note names" on={settings.showNoteNames} onChange={(v) => settings.set({ showNoteNames: v })} />
          <Toggle label="Show computer key labels" on={settings.showKeyLabels} onChange={(v) => settings.set({ showKeyLabels: v })} />
          <p className="text-xs text-muted">Computer keys are mapped from C{settings.keyboardOctave}; use ← → to shift octaves. Remap keys in Profile → Settings.</p>
          <button className="btn btn-primary" onClick={() => setShowSettings(false)}>
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}
