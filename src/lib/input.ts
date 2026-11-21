"use client";
// Unified note input: mouse/touch, computer keyboard and Web MIDI all funnel
// through noteOn/noteOff, which play audio, update the visual keyboard and
// notify subscribers (game engine, recorder, exercises).

import { audio } from "./audio";
import { usePiano } from "@/store/piano";
import { useSettings } from "@/store/settings";
import { useProgress } from "@/store/progress";

export type InputSource = "pointer" | "keyboard" | "midi";
export interface NoteEvent {
  type: "on" | "off";
  midi: number;
  velocity: number;
  source: InputSource;
  /** Smoothed audio-clock time of the event (see audio.now()). */
  time: number;
}
type Listener = (e: NoteEvent) => void;
type SustainListener = (on: boolean, time: number) => void;

const listeners = new Set<Listener>();
const sustainListeners = new Set<SustainListener>();
const holders = new Map<number, number>(); // midi -> number of sources holding it

export function subscribeNotes(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function subscribeSustain(fn: SustainListener) {
  sustainListeners.add(fn);
  return () => {
    sustainListeners.delete(fn);
  };
}

/** When true, notes still notify listeners but are not sounded (e.g. "mute my playing"). */
let silent = false;
export const setSilentInput = (v: boolean) => (silent = v);

// Practice-time accounting: time between notes counts if gaps are < 10s.
let lastActivity = 0;
let pendingSeconds = 0;
let pendingNotes = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
function trackActivity() {
  const now = performance.now() / 1000;
  if (lastActivity && now - lastActivity < 10) pendingSeconds += now - lastActivity;
  lastActivity = now;
  pendingNotes++;
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const s = pendingSeconds;
      const n = pendingNotes;
      pendingSeconds = 0;
      pendingNotes = 0;
      useProgress.getState().addPracticeTime(Math.round(s * 10) / 10, n);
    }, 4000);
  }
}

export function noteOn(midi: number, velocity = 0.75, source: InputSource = "pointer") {
  if (midi < 21 || midi > 108) return;
  const count = holders.get(midi) ?? 0;
  holders.set(midi, count + 1);
  if (!silent) audio.noteOn(midi, velocity);
  else audio.ensure();
  usePiano.getState().setActive(midi, true);
  trackActivity();
  const time = audio.now();
  for (const l of listeners) l({ type: "on", midi, velocity, source, time });
}

export function noteOff(midi: number, source: InputSource = "pointer") {
  const count = holders.get(midi) ?? 0;
  if (count <= 0) return;
  if (count > 1) {
    holders.set(midi, count - 1);
    return;
  }
  holders.delete(midi);
  audio.noteOff(midi);
  usePiano.getState().setActive(midi, false);
  const time = audio.now();
  for (const l of listeners) l({ type: "off", midi, velocity: 0, source, time });
}

export function setSustain(on: boolean) {
  if (usePiano.getState().sustain === on) return;
  audio.setSustain(on);
  usePiano.getState().setSustain(on);
  const t = audio.now();
  for (const l of sustainListeners) l(on, t);
}

export function releaseAll() {
  for (const midi of [...holders.keys()]) {
    holders.set(midi, 1);
    noteOff(midi);
  }
  setSustain(false);
}

// ---------------------------------------------------------------------------
// Computer keyboard

const downCodes = new Map<string, number>(); // code -> midi actually triggered

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/** Set by the key-rebinding UI to capture the next key press instead of playing. */
let captureHandler: ((code: string) => void) | null = null;
export function captureNextKey(fn: ((code: string) => void) | null): void {
  captureHandler = fn;
}

export function installKeyboard(): () => void {
  const onDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (captureHandler) {
      e.preventDefault();
      const h = captureHandler;
      captureHandler = null;
      if (e.code !== "Escape") h(e.code);
      else h("");
      return;
    }
    if (isTypingTarget(e.target)) return;
    if (e.code === "Space") {
      // Don't hijack space on focused buttons (accessibility) unless it's the body.
      e.preventDefault();
      if (!e.repeat) setSustain(true);
      return;
    }
    const s = useSettings.getState();
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      if (!e.repeat) s.shiftOctave(e.code === "ArrowLeft" ? -1 : 1);
      e.preventDefault();
      return;
    }
    if (e.repeat) {
      if (s.keymap.some((b) => b.code === e.code)) e.preventDefault();
      return;
    }
    const binding = s.keymap.find((b) => b.code === e.code);
    if (!binding) return;
    e.preventDefault();
    const midi = (s.keyboardOctave + 1) * 12 + binding.offset;
    downCodes.set(e.code, midi);
    noteOn(midi, 0.75, "keyboard");
  };
  const onUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      setSustain(false);
      return;
    }
    const midi = downCodes.get(e.code);
    if (midi !== undefined) {
      downCodes.delete(e.code);
      noteOff(midi, "keyboard");
    }
  };
  const onBlur = () => {
    for (const [code, midi] of downCodes) {
      downCodes.delete(code);
      noteOff(midi, "keyboard");
    }
    setSustain(false);
  };
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", onBlur);
  };
}

// ---------------------------------------------------------------------------
// Web MIDI

let midiAccess: MIDIAccess | null = null;

function handleMidiMessage(e: MIDIMessageEvent) {
  const d = e.data;
  if (!d || d.length < 2) return;
  const status = d[0] & 0xf0;
  const a = d[1];
  const b = d[2] ?? 0;
  if (status === 0x90 && b > 0) noteOn(a, Math.max(0.08, b / 127), "midi");
  else if (status === 0x80 || (status === 0x90 && b === 0)) noteOff(a, "midi");
  else if (status === 0xb0 && a === 64) setSustain(b >= 64);
}

function refreshMidiInputs() {
  if (!midiAccess) return;
  const names: string[] = [];
  midiAccess.inputs.forEach((input) => {
    input.onmidimessage = handleMidiMessage;
    names.push(input.name ?? "MIDI device");
  });
  usePiano.getState().setMidi(names.length ? "connected" : "no-devices", names);
  if (names.length) useProgress.getState().unlock("midi");
}

export async function connectMidi(): Promise<void> {
  if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
    usePiano.getState().setMidi("unsupported");
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshMidiInputs;
    refreshMidiInputs();
    useSettings.getState().set({ midiEnabled: true });
  } catch {
    usePiano.getState().setMidi("denied");
    useSettings.getState().set({ midiEnabled: false });
  }
}

export function disconnectMidi() {
  midiAccess?.inputs.forEach((i) => (i.onmidimessage = null));
  midiAccess = null;
  usePiano.getState().setMidi("off");
  useSettings.getState().set({ midiEnabled: false });
}

/** Reconnect silently on load if the user enabled MIDI before and permission is granted. */
export async function autoConnectMidi() {
  if (!useSettings.getState().midiEnabled) return;
  try {
    const perm = await navigator.permissions?.query({ name: "midi" as PermissionName });
    if (perm && perm.state !== "granted") return;
  } catch {
    /* permissions API may not know "midi" — try anyway */
  }
  await connectMidi();
}
