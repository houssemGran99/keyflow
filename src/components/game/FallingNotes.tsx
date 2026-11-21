"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { keyLayout, noteName } from "@/lib/music";
import type { GameEngine } from "@/lib/engine";

export interface FallingNotesHandle {
  draw: (t: number) => void;
  burst: (midi: number, color: string, count?: number) => void;
}

interface Props {
  engine: GameEngine | null;
  low: number;
  high: number;
  visibleSeconds: number;
  showNames: boolean;
  /** midi -> computer key letter drawn on each note. */
  keyLabels: Record<number, string>;
  bpm: number;
  beatsPerBar: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const COLORS = {
  rh: ["#38bdf8", "#0ea5e9"],
  lh: ["#a78bfa", "#8b5cf6"],
  auto: ["rgba(148,140,200,0.38)", "rgba(110,100,170,0.38)"],
  hit: "#34d399",
  miss: "rgba(251,113,133,0.55)",
};

export const FallingNotes = forwardRef<FallingNotesHandle, Props>(function FallingNotes(
  { engine, low, high, visibleSeconds, showNames, keyLabels, bpm, beatsPerBar },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const particles = useRef<Particle[]>([]);
  const props = useRef({ engine, low, high, visibleSeconds, showNames, keyLabels, bpm, beatsPerBar });
  props.current = { engine, low, high, visibleSeconds, showNames, keyLabels, bpm, beatsPerBar };
  const layout = useRef(keyLayout(low, high));
  const layoutMap = useRef(new Map(layout.current.map((r) => [r.midi, r])));

  useEffect(() => {
    layout.current = keyLayout(low, high);
    layoutMap.current = new Map(layout.current.map((r) => [r.midi, r]));
  }, [low, high]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: canvas.clientWidth, h: canvas.clientHeight };
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      canvas.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    burst(midi, color, count = 14) {
      const r = layoutMap.current.get(midi);
      if (!r) return;
      const { w, h } = size.current;
      const cx = (r.x + r.w / 2) * w;
      for (let i = 0; i < count; i++) {
        particles.current.push({
          x: cx + (Math.random() - 0.5) * r.w * w,
          y: h - 2,
          vx: (Math.random() - 0.5) * 120,
          vy: -80 - Math.random() * 220,
          life: 0.5 + Math.random() * 0.4,
          color,
        });
      }
    },
    draw(t) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const { w, h } = size.current;
      const { engine, visibleSeconds, showNames, keyLabels, bpm, beatsPerBar } = props.current;
      const pps = h / visibleSeconds;
      ctx.clearRect(0, 0, w, h);

      // Lanes: darker strips for black keys, guides at each C.
      for (const r of layout.current) {
        if (r.black) {
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          ctx.fillRect(r.x * w, 0, r.w * w, h);
        } else if (r.midi % 12 === 0) {
          ctx.fillStyle = "rgba(140,150,255,0.10)";
          ctx.fillRect(Math.round(r.x * w), 0, 1, h);
        }
      }

      // Beat & bar lines
      const spb = 60 / bpm;
      const firstBeat = Math.floor(t / spb);
      const lastBeat = Math.ceil((t + visibleSeconds) / spb);
      for (let b = Math.max(0, firstBeat); b <= lastBeat; b++) {
        const y = h - (b * spb - t) * pps;
        const bar = b % beatsPerBar === 0;
        ctx.fillStyle = bar ? "rgba(140,150,255,0.16)" : "rgba(140,150,255,0.05)";
        ctx.fillRect(0, Math.round(y), w, 1);
      }

      // Notes
      if (engine) {
        const range = engine.options.range;
        const now = engine.clock.time();
        const listen = engine.options.mode === "listen";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.font = "600 10px Inter, Segoe UI, sans-serif";
        for (const n of engine.notes) {
          if (n.startTime > t + visibleSeconds) break;
          if (n.startTime + n.duration < t - 0.6) continue;
          const r = layoutMap.current.get(n.midi);
          if (!r) continue;
          const outOfRange = n.startTime < range.start - 0.001 || n.startTime >= range.end - 0.001;
          const yBottom = h - (n.startTime - t) * pps;
          const len = Math.max(8, n.duration * pps - 2);
          const yTop = yBottom - len;
          const pad = r.black ? 0.5 : 2;
          const x = r.x * w + pad;
          const bw = r.w * w - pad * 2;
          let fill: string;
          let glow = 0;
          if (listen && !outOfRange) {
            // Watch mode: colour by hand and glow while the note sounds.
            const pal = n.track === 0 ? COLORS.rh : COLORS.lh;
            fill = pal[r.black ? 1 : 0];
            glow = n.startTime <= now && n.startTime + n.duration > now ? 18 : 4;
          } else if (!n.player || outOfRange) {
            fill = outOfRange ? "rgba(120,120,160,0.18)" : COLORS.auto[r.black ? 1 : 0];
          } else if (n.state === "hit") {
            fill = COLORS.hit;
            glow = n.startTime + n.duration > now ? 16 : 0;
          } else if (n.state === "missed") {
            fill = COLORS.miss;
          } else {
            const pal = n.track === 0 ? COLORS.rh : COLORS.lh;
            fill = pal[r.black ? 1 : 0];
            glow = yBottom > h - 40 ? 18 : 6;
          }
          if (bw <= 0.5) continue;
          ctx.shadowBlur = glow;
          ctx.shadowColor = fill;
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.roundRect(x, yTop, bw, len, Math.max(0, Math.min(6, bw / 3)));
          ctx.fill();
          if (n.player && !outOfRange && n.state === "pending") {
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.fillRect(x + 2, yBottom - 3, bw - 4, 2);
          }
          if ((n.player || listen) && !outOfRange && bw > 10) {
            ctx.shadowBlur = 0;
            const cx = x + bw / 2;
            const key = keyLabels[n.midi];
            let nameY = yBottom - 4;
            if (key && len > 14) {
              // Keycap with the computer key to press, sitting at the bottom of the note.
              const size = Math.max(12, Math.min(20, bw - 4, len - 4));
              const top = yBottom - size - 3;
              ctx.fillStyle = "rgba(255,255,255,0.92)";
              ctx.beginPath();
              ctx.roundRect(cx - size / 2, top, size, size, 4);
              ctx.fill();
              ctx.fillStyle = "#0b1030";
              ctx.font = `800 ${Math.round(size * 0.62)}px ui-monospace, Consolas, monospace`;
              ctx.textBaseline = "middle";
              ctx.fillText(key, cx, top + size / 2 + 0.5);
              ctx.textBaseline = "bottom";
              ctx.font = "600 10px Inter, Segoe UI, sans-serif";
              nameY = top - 3;
            }
            if (showNames && len > (key ? 40 : 16) && bw > 12) {
              ctx.fillStyle = r.black ? "rgba(255,255,255,0.9)" : "rgba(5,10,30,0.8)";
              ctx.fillText(noteName(n.midi, false), cx, nameY);
            }
          }
        }
        ctx.shadowBlur = 0;
      }

      // Hit line
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(139,92,246,0.9)");
      grad.addColorStop(0.5, "rgba(56,189,248,1)");
      grad.addColorStop(1, "rgba(139,92,246,0.9)");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 14;
      ctx.fillRect(0, h - 3, w, 3);
      ctx.shadowBlur = 0;

      // Particles
      const dt = 1 / 60;
      particles.current = particles.current.filter((p) => (p.life -= dt) > 0);
      for (const p of particles.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 380 * dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;
    },
  }));

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />;
});
