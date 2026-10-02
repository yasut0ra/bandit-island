"use client";

import type { ReactNode } from "react";
import type { AlgorithmId, DecisionMode } from "@/lib/bandits/types";

const LINE = "#2b2c63";

/** Game badge for 探索 (grape) / 活用 (sun). */
export function ModeBadge({ mode, className = "" }: { mode: DecisionMode; className?: string }) {
  const explore = mode === "explore";
  return (
    <span className={`badge ${explore ? "badge--explore" : "badge--exploit"} ${className}`}>
      {explore ? "探索" : "活用"}
    </span>
  );
}

/** Ribbon-style section title with an optional subtitle under it. */
export function Ribbon({ children, color = "var(--grape)", sub }: { children: ReactNode; color?: string; sub?: ReactNode }) {
  return (
    <div>
      <h2 className="ribbon text-[20px] sm:text-[22px]" style={{ "--rib": color } as React.CSSProperties}>
        <Sparkle />
        {children}
      </h2>
      {sub && <p className="on-bg-text mt-3 max-w-2xl text-[15px] leading-relaxed font-bold">{sub}</p>}
    </div>
  );
}

export function Sparkle({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 0 C8.8 5 11 7.2 16 8 C11 8.8 8.8 11 8 16 C7.2 11 5 8.8 0 8 C5 7.2 7.2 5 8 0 Z" fill={color} />
    </svg>
  );
}

/** Pill toggle (aria-checked styles it yellow). */
export function ToggleChip({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="chip">
      <span
        aria-hidden
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-line bg-panel text-[10px] leading-none text-ink"
      >
        {checked ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}

/** Treasure chest sticker in the chest's identity colour. */
export function ChestSticker({ color, size = 30 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M4 15 h24 v10 a3 3 0 0 1 -3 3 h-18 a3 3 0 0 1 -3 -3 z" fill="#b5763f" stroke={LINE} strokeWidth="2" />
      <path d="M4 15 a12 8.5 0 0 1 24 0 z" fill={color} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <rect x="13.2" y="12.8" width="5.6" height="6.4" rx="1.4" fill="#ffd84d" stroke={LINE} strokeWidth="1.8" />
      <path d="M8 11 q2 -3 5 -3.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

/** Pico the robot. */
export function PicoFace({ size = 40, antenna = "#7fe3ff" }: { size?: number; antenna?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <line x1="20" y1="5" x2="20" y2="10" stroke={LINE} strokeWidth="2" />
      <circle cx="20" cy="5" r="3.6" fill={antenna} stroke={LINE} strokeWidth="2" />
      <rect x="5" y="10" width="30" height="24" rx="10" fill="#ffffff" stroke={LINE} strokeWidth="2.4" />
      <rect x="9.5" y="15.5" width="21" height="12" rx="5.5" fill={LINE} />
      <ellipse cx="15.5" cy="21.5" rx="2.4" ry="2.8" fill="#7fe3ff" />
      <ellipse cx="24.5" cy="21.5" rx="2.4" ry="2.8" fill="#7fe3ff" />
      <circle cx="9" cy="30" r="2" fill="#ff9cc6" />
      <circle cx="31" cy="30" r="2" fill="#ff9cc6" />
    </svg>
  );
}

function Eyes({ y = 21, gap = 6, cx = 20 }: { y?: number; gap?: number; cx?: number }) {
  return (
    <>
      <ellipse cx={cx - gap} cy={y} rx="2" ry="2.6" fill={LINE} />
      <ellipse cx={cx + gap} cy={y} rx="2" ry="2.6" fill={LINE} />
      <circle cx={cx - gap + 0.7} cy={y - 1} r="0.7" fill="#fff" />
      <circle cx={cx + gap + 0.7} cy={y - 1} r="0.7" fill="#fff" />
      <path d={`M${cx - 2.2} ${y + 3.5} q2.2 2 4.4 0`} stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx={cx - gap - 3.5} cy={y + 3.6} rx="2.2" ry="1.4" fill="#ff9cc6" opacity="0.9" />
      <ellipse cx={cx + gap + 3.5} cy={y + 3.6} rx="2.2" ry="1.4" fill="#ff9cc6" opacity="0.9" />
    </>
  );
}

/** Each algorithm as a little character: dice, sprout, sun and crystal ball. */
export function AlgoAvatar({ id, size = 44 }: { id: AlgorithmId; size?: number }) {
  const svg = (children: ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="char__face">
      {children}
    </svg>
  );
  switch (id) {
    case "random":
      return svg(
        <>
          <rect x="6" y="7" width="28" height="28" rx="8" fill="#ffffff" stroke={LINE} strokeWidth="2.4" />
          <circle cx="12" cy="13" r="2" fill="#4db5ff" />
          <circle cx="28" cy="13" r="2" fill="#4db5ff" />
          <circle cx="28" cy="30" r="2" fill="#4db5ff" />
          <Eyes y={21} gap={5} />
        </>,
      );
    case "epsilonGreedy":
      return svg(
        <>
          <path d="M20 9 C 20 5 23 3 27 3 C 27 7 24 9 20 9 Z" fill="#7be08e" stroke={LINE} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M20 9 C 20 6 17 4.5 13.5 5 C 14 8 16.5 9.5 20 9 Z" fill="#a7f0b2" stroke={LINE} strokeWidth="1.8" strokeLinejoin="round" />
          <ellipse cx="20" cy="23.5" rx="14" ry="12.5" fill="#2fd3a0" stroke={LINE} strokeWidth="2.4" />
          <Eyes y={23} gap={5.5} />
        </>,
      );
    case "ucb1":
      return svg(
        <>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={20 + Math.cos(a) * 13.5}
                y1={21 + Math.sin(a) * 13.5}
                x2={20 + Math.cos(a) * 18}
                y2={21 + Math.sin(a) * 18}
                stroke="#ffb81c"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
          <circle cx="20" cy="21" r="12" fill="#ffc93c" stroke={LINE} strokeWidth="2.4" />
          <Eyes y={20.5} gap={4.6} />
        </>,
      );
    case "thompson":
      return svg(
        <>
          <path d="M9 34 h22 l-3 -5 h-16 z" fill="#6f4fe0" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="20" cy="18" r="13" fill="#b9a6ff" stroke={LINE} strokeWidth="2.4" />
          <path d="M12 12 q3 -4 7 -4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M29 9 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 z" fill="#fff" />
          <Eyes y={19} gap={5} />
        </>,
      );
  }
}

export function CoinGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="7.5" fill="#ffd84d" stroke={LINE} strokeWidth="2" />
      <path d="M9 5 v8 M6.8 7 h4.4" stroke={LINE} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FlagGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path d="M5 2.5 v13" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
      <path d="M5.5 3 h8 l-2 3 2 3 h-8 z" fill="#ff6fae" stroke={LINE} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Legend glyphs for the island key. */
export function KeyGlyph({ kind }: { kind: "fog" | "trail" | "coins" | "star" | "antenna" }) {
  const common = { width: 44, height: 44, viewBox: "0 0 44 44", "aria-hidden": true } as const;
  const bg = <circle cx="22" cy="22" r="20" fill="#ffffff" stroke={LINE} strokeWidth="2.5" />;
  switch (kind) {
    case "fog":
      return (
        <svg {...common}>
          {bg}
          <circle cx="16" cy="25" r="6.5" fill="#b9a6ff" />
          <circle cx="25" cy="20" r="8" fill="#cbbcff" />
          <circle cx="29" cy="27" r="5" fill="#b9a6ff" />
        </svg>
      );
    case "trail":
      return (
        <svg {...common}>
          {bg}
          {[
            [13, 32],
            [19, 26],
            [24, 19],
            [30, 12],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x + (i % 2 ? 2.5 : -2.5)} cy={y} rx="2.4" ry="3.6" fill="#b5763f" transform={`rotate(40 ${x} ${y})`} />
          ))}
        </svg>
      );
    case "coins":
      return (
        <svg {...common}>
          {bg}
          {[30, 25, 20, 15].map((y) => (
            <ellipse key={y} cx="22" cy={y} rx="8.5" ry="3.3" fill="#ffd84d" stroke={LINE} strokeWidth="1.8" />
          ))}
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          {bg}
          <path
            d="M22 10 l3.4 7.4 8 .8 -6 5.3 1.8 7.9 -7.2 -4.2 -7.2 4.2 1.8 -7.9 -6 -5.3 8 -.8 z"
            fill="#ffd84d"
            stroke={LINE}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "antenna":
      return (
        <svg {...common}>
          {bg}
          <circle cx="15" cy="19" r="5.5" fill="#8a63ff" stroke={LINE} strokeWidth="2" />
          <circle cx="29" cy="19" r="5.5" fill="#ffbf2e" stroke={LINE} strokeWidth="2" />
          <path d="M13 30 h18" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
  }
}

/** Tiny hover/focus note for genuinely technical terms. */
export function Note({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-line bg-panel text-[10px] leading-none font-extrabold text-ink"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="tooltip pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-60 max-w-[70vw] -translate-x-1/2 rounded-2xl px-3 py-2 text-[12px] leading-relaxed font-bold shadow-lg group-focus-within:block group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}
