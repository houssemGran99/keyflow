"use client";
import { useEffect } from "react";
import { audio } from "@/lib/audio";
import { autoConnectMidi, installKeyboard, releaseAll } from "@/lib/input";
import { useSettings } from "@/store/settings";
import { useProgress } from "@/store/progress";
import { useLibrary } from "@/store/library";

/** Global side effects: hydration, keyboard + MIDI input, audio unlock, theme. */
export function AppInit() {
  const theme = useSettings((s) => s.theme);
  const volume = useSettings((s) => s.volume);
  const reverb = useSettings((s) => s.reverb);

  useEffect(() => {
    useSettings.persist.rehydrate();
    useProgress.getState().hydrate();
    useLibrary.getState().hydrate();
    const uninstall = installKeyboard();
    // Autoplay policy: create/resume the AudioContext on the first gesture.
    const unlock = () => audio.ensure();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    const onVis = () => {
      if (document.hidden) releaseAll();
    };
    document.addEventListener("visibilitychange", onVis);
    autoConnectMidi();
    if (process.env.NODE_ENV === "development") (window as unknown as { __keyflow: unknown }).__keyflow = { audio };
    return () => {
      uninstall();
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => audio.setVolume(volume), [volume]);
  useEffect(() => audio.setReverb(reverb), [reverb]);

  return null;
}
