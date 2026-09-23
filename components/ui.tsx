"use client";

import type { ReactNode } from "react";
import type { DecisionMode } from "@/lib/bandits/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-3xl border border-line/80 p-4 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.25)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ icon, children, aside }: { icon?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-ink">
        {icon && <span aria-hidden>{icon}</span>}
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function ModeBadge({ mode, size = "md" }: { mode: DecisionMode; size?: "sm" | "md" }) {
  const explore = mode === "explore";
  const sizing = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-bold ${sizing} ${
        explore ? "bg-explore-soft text-explore" : "bg-exploit-soft text-exploit"
      }`}
    >
      <span aria-hidden>{explore ? "🔍" : "💰"}</span>
      {explore ? "探索" : "活用"}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-1 py-1.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-explore ${
          checked ? "bg-explore" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-panel-soft text-[10px] font-bold text-muted ring-1 ring-line"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 max-w-[70vw] -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-[11px] leading-relaxed font-normal text-bg shadow-lg group-focus-within:block group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

/** Horizontal meter; value in [0, 1]. */
export function Meter({ value, color, className = "" }: { value: number; color: string; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-panel-soft ring-1 ring-line/60 ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      />
    </div>
  );
}

export function ChestIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="11" width="18" height="10" rx="2" fill="#9a6035" />
      <path d="M3 12 a9 7 0 0 1 18 0 Z" fill={color} />
      <rect x="6.5" y="6" width="2" height="15" fill="#f5c542" opacity="0.9" />
      <rect x="15.5" y="6" width="2" height="15" fill="#f5c542" opacity="0.9" />
      <rect x="10.5" y="11" width="3" height="4" rx="0.8" fill="#f5c542" />
    </svg>
  );
}
