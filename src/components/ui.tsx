"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, X, AlertTriangle, Info } from "lucide-react";
import { useToasts } from "@/store/toasts";
import type { ReactNode } from "react";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="kf-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#kf-g)" />
        <rect x="7" y="8" width="4" height="16" rx="1.5" fill="white" />
        <rect x="14" y="8" width="4" height="16" rx="1.5" fill="white" opacity=".9" />
        <rect x="21" y="8" width="4" height="16" rx="1.5" fill="white" opacity=".8" />
        <rect x="10" y="8" width="3" height="9" rx="1" fill="#0b0d1a" />
        <rect x="19" y="8" width="3" height="9" rx="1" fill="#0b0d1a" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">
        Key<span className="text-gradient">Flow</span>
      </span>
    </span>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="fixed z-[100] bottom-20 md:bottom-6 right-4 left-4 sm:left-auto flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto glass rounded-xl px-4 py-3 shadow-2xl w-full sm:w-80 flex gap-3 items-start"
          >
            <div
              className={`mt-0.5 rounded-lg p-1.5 ${
                t.kind === "achievement" ? "bg-warn/20 text-warn" : t.kind === "error" ? "bg-bad/20 text-bad" : "bg-accent-2/20 text-accent-2"
              }`}
            >
              {t.kind === "achievement" ? <Trophy size={16} /> : t.kind === "error" ? <AlertTriangle size={16} /> : <Info size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.body && <div className="text-xs text-muted mt-0.5">{t.body}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-fg" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between mb-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-3 w-full text-sm py-1.5"
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-accent" : "bg-surface-3 ring-1 ring-line-strong"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-muted tabular-nums">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs text-muted uppercase tracking-wider font-semibold">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums font-display">{value}</div>
      {sub && <div className="text-xs text-faint mt-0.5">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-2">
      <div className="text-faint">{icon}</div>
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-muted max-w-sm">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose?: () => void; children: ReactNode; title?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="card w-full max-w-md max-h-[90dvh] overflow-y-auto p-6 shadow-2xl"
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">{title}</h2>
                {onClose && (
                  <button onClick={onClose} className="text-muted hover:text-fg" aria-label="Close">
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
