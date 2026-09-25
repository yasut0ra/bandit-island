"use client";

import type { ReactNode } from "react";
import type { DecisionMode } from "@/lib/bandits/types";

/** Rubber-stamp mark for 探索 (plum ink) / 活用 (ochre ink). */
export function Stamp({ mode, className = "" }: { mode: DecisionMode; className?: string }) {
  const explore = mode === "explore";
  return (
    <span className={`stamp text-[12px] ${explore ? "text-explore" : "text-exploit"} ${className}`}>
      {explore ? "探索" : "活用"}
    </span>
  );
}

/** A section heading: Latin kicker in italic serif + Japanese heading. */
export function Heading({ kicker, children, className = "" }: { kicker: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="t-display text-[15px] font-medium text-ink-3 italic">{kicker}</div>
      <h2 className="mt-1 text-[26px] leading-tight font-bold tracking-tight text-ink sm:text-[30px]">{children}</h2>
    </div>
  );
}

/** Small check-sticker toggle (used instead of generic switches). */
export function CheckChip({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition-colors ${
        checked ? "border-ink bg-ink text-paper" : "border-rule text-ink-2 hover:border-ink-3 hover:text-ink"
      }`}
    >
      <span
        aria-hidden
        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] leading-none ${
          checked ? "border-paper" : "border-ink-3"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}

/** Treasure chest sticker in the chest's identity colour. */
export function ChestSticker({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M4 15 h24 v11 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2 z" fill="#9a6035" stroke="#2e2620" strokeWidth="1.5" />
      <path d="M4 15 a12 8 0 0 1 24 0 z" fill={color} stroke="#2e2620" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="13.5" y="13" width="5" height="6" rx="1" fill="#e5b64a" stroke="#2e2620" strokeWidth="1.2" />
    </svg>
  );
}

/** Pico the robot, as a tiny inked portrait. */
export function PicoFace({ size = 34, antenna = "#9fd8e6" }: { size?: number; antenna?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <line x1="18" y1="4" x2="18" y2="9" stroke="#2e2620" strokeWidth="1.5" />
      <circle cx="18" cy="4" r="3" fill={antenna} stroke="#2e2620" strokeWidth="1.3" />
      <rect x="5" y="9" width="26" height="21" rx="8" fill="#fbf7ee" stroke="#2e2620" strokeWidth="1.5" />
      <rect x="9" y="14" width="18" height="10" rx="4" fill="#2e2620" />
      <circle cx="14" cy="19" r="2" fill="#9fd8e6" />
      <circle cx="22" cy="19" r="2" fill="#9fd8e6" />
      <circle cx="8.5" cy="26" r="1.4" fill="#f2a6bf" />
      <circle cx="27.5" cy="26" r="1.4" fill="#f2a6bf" />
    </svg>
  );
}

export function CoinGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="#e5b64a" stroke="#8a5c14" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="3.6" fill="none" stroke="#8a5c14" strokeWidth="0.9" />
    </svg>
  );
}

/** Legend glyphs for the island key. */
export function KeyGlyph({ kind }: { kind: "fog" | "trail" | "coins" | "star" | "antenna" }) {
  const common = { width: 40, height: 40, viewBox: "0 0 40 40", "aria-hidden": true } as const;
  switch (kind) {
    case "fog":
      return (
        <svg {...common}>
          <circle cx="14" cy="22" r="8" fill="var(--fog)" opacity="0.55" />
          <circle cx="24" cy="18" r="9" fill="var(--fog)" opacity="0.45" />
          <circle cx="27" cy="26" r="6" fill="var(--fog)" opacity="0.6" />
        </svg>
      );
    case "trail":
      return (
        <svg {...common}>
          {[
            [10, 32],
            [17, 26],
            [22, 19],
            [29, 12],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x + (i % 2 ? 3 : -3)} cy={y} rx="2.6" ry="4" fill="var(--ink-2)" transform={`rotate(38 ${x} ${y})`} />
          ))}
        </svg>
      );
    case "coins":
      return (
        <svg {...common}>
          {[30, 25, 20, 15].map((y, i) => (
            <ellipse key={y} cx={20 + (i % 2) * 1.5} cy={y} rx="9" ry="3.4" fill="#e5b64a" stroke="#8a5c14" strokeWidth="1.1" />
          ))}
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path
            d="M20 7 l3.6 8 8.4 .8 -6.3 5.6 1.9 8.3 -7.6 -4.4 -7.6 4.4 1.9 -8.3 -6.3 -5.6 8.4 -.8 z"
            fill="#f2cf5b"
            stroke="#8a5c14"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "antenna":
      return (
        <svg {...common}>
          <line x1="20" y1="14" x2="20" y2="26" stroke="var(--ink)" strokeWidth="1.5" />
          <circle cx="13" cy="12" r="5" fill="var(--explore)" />
          <circle cx="27" cy="12" r="5" fill="var(--exploit)" />
          <rect x="11" y="25" width="18" height="10" rx="4" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        </svg>
      );
  }
}

/** Tiny hover/focus note — used sparingly for genuinely technical terms. */
export function Note({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink-3 text-[10px] leading-none text-ink-2"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-60 max-w-[70vw] -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-[12px] leading-relaxed font-normal text-paper shadow-lg group-focus-within:block group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}
