"use client";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { audio } from "@/lib/audio";

/**
 * Browsers block audio until the user interacts. The context is created on the first
 * gesture anywhere; this banner only appears if audio is still not running (e.g. iOS
 * "interrupted" state or the context got suspended) so the user knows what to do.
 */
export function AudioBanner() {
  const [state, setState] = useState<string>("uninitialized");
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext));
    setState(audio.state);
    return audio.onStateChange((s) => setState(s));
  }, []);

  if (!supported) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-4 py-2 text-sm flex items-center gap-2 text-bad">
        <VolumeX size={16} /> Your browser does not support the Web Audio API, so KeyFlow can&apos;t make sound.
      </div>
    );
  }
  if (state === "suspended" || state === "interrupted") {
    return (
      <button
        onClick={() => audio.ensure()}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-4 py-2 text-sm flex items-center gap-2 shadow-xl"
      >
        <Volume2 size={16} className="text-accent-2" /> Sound is paused by the browser — tap to enable audio
      </button>
    );
  }
  return null;
}
