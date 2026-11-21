"use client";
import { ChevronLeft, ChevronRight, Footprints, Type, Keyboard, Volume2, Cable } from "lucide-react";
import { useSettings } from "@/store/settings";
import { usePiano } from "@/store/piano";
import { connectMidi, setSustain } from "@/lib/input";
import { toast } from "@/store/toasts";

export function KeyboardControls({ compact = false }: { compact?: boolean }) {
  const s = useSettings();
  const sustain = usePiano((p) => p.sustain);
  const midiStatus = usePiano((p) => p.midiStatus);
  const midiDevices = usePiano((p) => p.midiDevices);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <div className="flex items-center gap-1 rounded-xl bg-surface-2 ring-1 ring-line p-1">
        <button className="btn btn-icon hover:bg-surface-3" onClick={() => s.shiftOctave(-1)} aria-label="Octave down (←)" title="Octave down (←)">
          <ChevronLeft size={16} />
        </button>
        <span className="px-1 tabular-nums text-xs text-muted w-[68px] text-center">Keys: C{s.keyboardOctave}</span>
        <button className="btn btn-icon hover:bg-surface-3" onClick={() => s.shiftOctave(1)} aria-label="Octave up (→)" title="Octave up (→)">
          <ChevronRight size={16} />
        </button>
      </div>
      {!compact && (
        <>
          <div className="flex items-center gap-1 rounded-xl bg-surface-2 ring-1 ring-line p-1">
            <button
              className="btn btn-icon hover:bg-surface-3"
              onClick={() => s.set({ startOctave: Math.max(0, s.startOctave - 1) })}
              aria-label="Scroll keyboard left"
            >
              <ChevronLeft size={16} />
            </button>
            <select
              value={s.octaves}
              onChange={(e) => {
                const octaves = Number(e.target.value);
                s.set({ octaves, startOctave: Math.max(0, Math.min(s.startOctave, 8 - octaves)) });
              }}
              className="bg-transparent text-xs px-1 outline-none"
              aria-label="Number of octaves"
            >
              {[2, 3, 4, 5, 6, 7].map((o) => (
                <option key={o} value={o} className="bg-surface">
                  {o} octaves
                </option>
              ))}
            </select>
            <button
              className="btn btn-icon hover:bg-surface-3"
              onClick={() => s.set({ startOctave: Math.min(8 - s.octaves, s.startOctave + 1) })}
              aria-label="Scroll keyboard right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
      <button
        className="btn btn-ghost"
        data-on={sustain}
        onClick={() => setSustain(!sustain)}
        title="Sustain pedal (hold Space)"
      >
        <Footprints size={16} /> Sustain
      </button>
      <button className="btn btn-ghost btn-icon" data-on={s.showNoteNames} onClick={() => s.set({ showNoteNames: !s.showNoteNames })} title="Show note names" aria-label="Show note names">
        <Type size={16} />
      </button>
      <button className="btn btn-ghost btn-icon hidden sm:inline-flex" data-on={s.showKeyLabels} onClick={() => s.set({ showKeyLabels: !s.showKeyLabels })} title="Show computer key bindings" aria-label="Show key bindings">
        <Keyboard size={16} />
      </button>
      <label className="flex items-center gap-2 rounded-xl bg-surface-2 ring-1 ring-line px-3 py-2" title="Volume">
        <Volume2 size={16} className="text-muted" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={s.volume}
          onChange={(e) => s.set({ volume: Number(e.target.value) })}
          className="w-20 sm:w-24"
          aria-label="Volume"
        />
      </label>
      {!compact && (
        <button
          className="btn btn-ghost"
          data-on={midiStatus === "connected"}
          onClick={async () => {
            await connectMidi();
            const st = usePiano.getState().midiStatus;
            if (st === "unsupported") toast("Web MIDI not supported", "Try Chrome or Edge on desktop to use a MIDI keyboard.", "error");
            else if (st === "denied") toast("MIDI access denied", "Allow MIDI access in your browser's site settings.", "error");
            else if (st === "no-devices") toast("No MIDI devices found", "Plug in a keyboard — it will be detected automatically.");
            else toast("MIDI connected", usePiano.getState().midiDevices.join(", "));
          }}
          title={midiDevices.join(", ") || "Connect a MIDI keyboard"}
        >
          <Cable size={16} />
          <span className="hidden lg:inline">{midiStatus === "connected" ? midiDevices[0] ?? "MIDI" : "MIDI"}</span>
        </button>
      )}
    </div>
  );
}
