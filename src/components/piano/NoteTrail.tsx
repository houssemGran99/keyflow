"use client";
import { useEffect, useRef } from "react";
import { keyLayout } from "@/lib/music";
import { subscribeNotes } from "@/lib/input";
import { usePiano } from "@/store/piano";

interface Bar {
  midi: number;
  start: number;
  end: number | null;
  vel: number;
}

/** Free-play visualizer: notes rise from the keyboard like light trails. */
export function NoteTrail({ low, high, className = "" }: { low: number; high: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bars = useRef<Bar[]>([]);
  const range = useRef({ low, high });
  range.current = { low, high };

  useEffect(() => {
    const unsub = subscribeNotes((e) => {
      const now = performance.now() / 1000;
      if (e.type === "on") bars.current.push({ midi: e.midi, start: now, end: null, vel: e.velocity });
      else for (const b of bars.current) if (b.midi === e.midi && b.end === null) b.end = now;
    });
    // Recording playback lights keys through the store; show those too.
    let prev: Record<number, boolean> = {};
    const unsubPb = usePiano.subscribe((s) => {
      if (s.playback === prev) return;
      const now = performance.now() / 1000;
      for (const k of Object.keys(s.playback)) if (!prev[+k]) bars.current.push({ midi: +k, start: now, end: null, vel: 0.6 });
      for (const k of Object.keys(prev)) if (!s.playback[+k]) for (const b of bars.current) if (b.midi === +k && b.end === null) b.end = now;
      prev = s.playback;
    });
    return () => {
      unsub();
      unsubPb();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const speed = 140; // px per second
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const { low, high } = range.current;
      const rects = keyLayout(low, high);
      const byMidi = new Map(rects.map((r) => [r.midi, r]));
      // Octave guide lines
      ctx.strokeStyle = "rgba(140,150,255,0.07)";
      ctx.lineWidth = 1;
      for (const r of rects) {
        if (r.midi % 12 === 0) {
          ctx.beginPath();
          ctx.moveTo(r.x * w + 0.5, 0);
          ctx.lineTo(r.x * w + 0.5, h);
          ctx.stroke();
        }
      }
      const now = performance.now() / 1000;
      bars.current = bars.current.filter((b) => b.end === null || (now - b.end) * speed < h + 20);
      for (const b of bars.current) {
        const r = byMidi.get(b.midi);
        if (!r) continue;
        const bottom = h - (b.end === null ? 0 : (now - b.end) * speed);
        const top = h - (now - b.start) * speed;
        const x = r.x * w + 1.5;
        const bw = r.w * w - 3;
        const grad = ctx.createLinearGradient(0, top, 0, bottom);
        const hue = r.black ? "139,92,246" : "56,189,248";
        grad.addColorStop(0, `rgba(${hue},0)`);
        grad.addColorStop(Math.min(1, 40 / Math.max(1, bottom - top)), `rgba(${hue},${0.5 + b.vel * 0.4})`);
        grad.addColorStop(1, `rgba(${hue},${0.7 + b.vel * 0.3})`);
        ctx.fillStyle = grad;
        ctx.shadowColor = `rgba(${hue},0.8)`;
        ctx.shadowBlur = b.end === null ? 14 : 0;
        ctx.beginPath();
        if (bw <= 0.5) continue;
        ctx.roundRect(x, Math.max(-10, top), bw, Math.max(4, bottom - Math.max(-10, top)), Math.max(0, Math.min(4, bw / 3)));
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />;
}
