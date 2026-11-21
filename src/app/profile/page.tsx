"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Clock, Download, Flame, Keyboard, Moon, Music, RotateCcw, Sun, Trophy, Upload, Cable, Lock } from "lucide-react";
import { PageHeader, Stat, Slider, Toggle, Modal } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";
import { usePiano } from "@/store/piano";
import { ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { currentStreak, skillFromXp, CHALLENGE_LEVELS } from "@/lib/scoring";
import { KEYMAP_PRESETS, codeLabel, noteName } from "@/lib/music";
import { captureNextKey, connectMidi, disconnectMidi } from "@/lib/input";
import { downloadBlob } from "@/lib/song-utils";
import { BUILTIN_SONGS } from "@/data/songs";
import { EXERCISES } from "@/lib/exercises";
import { toast } from "@/store/toasts";
import type { UserProgress } from "@/lib/types";

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function ProfilePage() {
  const progress = useProgress((s) => s.progress);
  const settings = useSettings();
  const midiStatus = usePiano((s) => s.midiStatus);
  const midiDevices = usePiano((s) => s.midiDevices);
  const skill = skillFromXp(progress.xp);
  const streak = currentStreak(progress.activeDays);
  const [confirmReset, setConfirmReset] = useState(false);
  const [rebinding, setRebinding] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => captureNextKey(null), []);

  const activity = useMemo(() => {
    const items: { date: number; title: string; detail: string }[] = [];
    for (const c of progress.challengeScores.slice(-10))
      items.push({ date: c.date, title: `${c.songTitle} — ${CHALLENGE_LEVELS[c.level].name}`, detail: `${c.score.toLocaleString()} pts · ${c.accuracy.toFixed(1)}% · ${c.grade}` });
    for (const p of progress.practiceHistory.slice(-10))
      items.push({ date: p.date, title: EXERCISES.find((e) => e.id === p.exercise)?.title ?? p.exercise, detail: `${p.accuracy.toFixed(0)}% accuracy · score ${p.score}` });
    for (const [id, s] of Object.entries(progress.songStats))
      items.push({ date: s.lastPlayed, title: BUILTIN_SONGS.find((b) => b.id === id)?.title ?? "Custom song", detail: `Learn · best ${s.bestAccuracy.toFixed(0)}% · ${s.completions} completion${s.completions === 1 ? "" : "s"}` });
    return items.sort((a, b) => b.date - a.date).slice(0, 8);
  }, [progress]);

  const bindings = useMemo(() => {
    const byOffset = new Map<number, string[]>();
    for (const b of settings.keymap) byOffset.set(b.offset, [...(byOffset.get(b.offset) ?? []), b.code]);
    const minOff = Math.min(0, ...settings.keymap.map((b) => b.offset));
    const maxOff = Math.max(24, ...settings.keymap.map((b) => b.offset));
    return Array.from({ length: maxOff - minOff + 1 }, (_, i) => ({ off: minOff + i, codes: byOffset.get(minOff + i) ?? [] }));
  }, [settings.keymap]);

  const rebind = (offset: number) => {
    setRebinding(offset);
    captureNextKey((code) => {
      setRebinding(null);
      if (!code) return;
      if (code === "Space" || code.startsWith("Arrow")) {
        toast("Reserved key", "Space (sustain) and arrow keys (octave) can't be used for notes.", "error");
        return;
      }
      const keymap = [...settings.keymap.filter((b) => b.code !== code && b.offset !== offset), { code, offset }];
      useSettings.getState().set({ keymap, keymapPreset: "custom" });
    });
  };

  const exportData = () => downloadBlob(JSON.stringify(progress, null, 2), "keyflow-progress.json", "application/json");
  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as UserProgress;
      if (typeof data !== "object" || !Array.isArray(data.achievements)) throw new Error("This doesn't look like a KeyFlow progress file");
      useProgress.getState().importData(data);
      toast("Progress imported");
    } catch (e) {
      toast("Import failed", (e as Error).message, "error");
    }
  };

  const pct = skill.next ? ((progress.xp - skill.floor) / (skill.next - skill.floor)) * 100 : 100;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-10">
      <PageHeader title="Profile" subtitle="Your stats, achievements and settings. Progress is saved in this browser." />

      <div className="card p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center font-display text-2xl font-black text-white shrink-0">
          {skill.level[0]}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.2em] text-muted font-semibold">Skill level</div>
          <div className="font-display text-2xl font-bold">{skill.level}</div>
          <div className="mt-2 h-2 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-muted mt-1">
            {progress.xp.toLocaleString()} XP{skill.next ? ` · ${(skill.next - progress.xp).toLocaleString()} XP to next level` : " · max level"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat label="Songs completed" value={progress.songsCompleted.length} sub={`of ${BUILTIN_SONGS.length} built-in`} icon={<Music size={13} />} />
        <Stat label="Highest score" value={progress.highestScore.toLocaleString()} icon={<Trophy size={13} />} />
        <Stat label="Practice time" value={fmtDuration(progress.totalPracticeTime)} sub={`${progress.notesPlayed.toLocaleString()} notes played`} icon={<Clock size={13} />} />
        <Stat label="Day streak" value={streak} sub={`${progress.activeDays.length} active days`} icon={<Flame size={13} />} />
      </div>

      <section className="mb-8">
        <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
          <Award size={18} className="text-warn" /> Achievements
          <span className="text-sm text-muted font-normal">
            {progress.achievements.length}/{ALL_ACHIEVEMENTS.length}
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_ACHIEVEMENTS.map((a) => {
            const got = progress.achievements.includes(a.id);
            return (
              <div key={a.id} className={`card p-3 flex items-center gap-3 ${got ? "" : "opacity-50"}`}>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${got ? "bg-warn/20 text-warn" : "bg-surface-3 text-faint"}`}>
                  {got ? <Icon name={a.icon} /> : <Lock size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{a.title}</div>
                  <div className="text-xs text-muted">{a.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold mb-3">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet — play a song, a challenge or an exercise and it will show up here.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm rounded-lg bg-surface-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted">{a.detail}</div>
                  </div>
                  <div className="text-xs text-faint shrink-0">{new Date(a.date).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Settings</h2>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button key={t} className="btn btn-ghost flex-1 capitalize" data-on={settings.theme === t} onClick={() => settings.set({ theme: t })}>
                {t === "dark" ? <Moon size={15} /> : <Sun size={15} />} {t}
              </button>
            ))}
          </div>
          <Slider label="Master volume" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => settings.set({ volume: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Reverb" value={settings.reverb} min={0} max={0.8} step={0.01} onChange={(v) => settings.set({ reverb: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Song accompaniment" value={settings.accompanimentVolume} min={0} max={1} step={0.05} onChange={(v) => settings.set({ accompanimentVolume: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Falling-note window" value={settings.noteSpeed} min={1.5} max={6} step={0.25} onChange={(v) => settings.set({ noteSpeed: v })} format={(v) => `${v}s`} />
          <Toggle label="Show note names" on={settings.showNoteNames} onChange={(v) => settings.set({ showNoteNames: v })} />
          <Toggle label="Show computer key labels" on={settings.showKeyLabels} onChange={(v) => settings.set({ showKeyLabels: v })} />
          <div className="flex items-center justify-between text-sm py-1">
            <span className="flex items-center gap-2">
              <Cable size={15} /> MIDI keyboard
              <span className="text-xs text-muted">{midiStatus === "connected" ? midiDevices.join(", ") : midiStatus === "off" ? "not connected" : midiStatus.replace("-", " ")}</span>
            </span>
            {midiStatus === "connected" || midiStatus === "no-devices" ? (
              <button className="btn btn-ghost py-1" onClick={disconnectMidi}>
                Disconnect
              </button>
            ) : (
              <button className="btn btn-ghost py-1" onClick={() => connectMidi()}>
                Connect
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="card p-5 mt-6">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Keyboard size={18} /> Keyboard mapping
          </h2>
          <span className="text-xs text-muted">Click a note, then press the computer key you want. Esc cancels.</span>
          <div className="ml-auto flex gap-2">
            {Object.entries(KEYMAP_PRESETS).map(([id, p]) => (
              <button key={id} className="btn btn-ghost py-1 text-xs" data-on={settings.keymapPreset === id} onClick={() => settings.resetKeymap(id)}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-11 gap-1.5">
          {bindings.map(({ off, codes }) => {
            const midi = (settings.keyboardOctave + 1) * 12 + off;
            return (
              <button
                key={off}
                onClick={() => rebind(off)}
                className={`rounded-lg px-2 py-2 text-left ring-1 transition-colors ${
                  rebinding === off ? "ring-accent bg-accent/20 animate-pulse" : "ring-line bg-surface-2 hover:bg-surface-3"
                }`}
              >
                <div className="text-[10px] text-muted">{noteName(midi)}</div>
                <div className="font-mono text-sm font-semibold">{rebinding === off ? "…" : codes.map((c) => codeLabel(c)).join(" ") || "—"}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5 mt-6 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold mr-auto">Your data</h2>
        <button className="btn btn-ghost" onClick={exportData}>
          <Download size={15} /> Export progress
        </button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Import progress
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = "";
          }}
        />
        <button className="btn btn-ghost text-bad" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={15} /> Reset progress
        </button>
      </section>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all progress?">
        <p className="text-sm text-muted">This erases your XP, scores, achievements and practice history in this browser. It cannot be undone — export first if you want a backup.</p>
        <div className="flex gap-2 justify-end mt-5">
          <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </button>
          <button
            className="btn bg-bad text-white"
            onClick={() => {
              useProgress.getState().reset();
              setConfirmReset(false);
              toast("Progress reset");
            }}
          >
            Reset
          </button>
        </div>
      </Modal>
    </main>
  );
}
