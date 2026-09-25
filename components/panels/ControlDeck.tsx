"use client";

import { JUMP_TURNS, SPEEDS, type BanditController } from "@/hooks/useBanditSimulation";
import { ALGORITHM_IDS } from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO } from "@/lib/explain";

const TAG_TILTS = [-2.5, 1.5, -1, 2];

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect x="5" y="4" width="4.2" height="14" rx="1.2" fill="currentColor" />
      <rect x="12.8" y="4" width="4.2" height="14" rx="1.2" fill="currentColor" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <path d="M7 4.5 L18 11 L7 17.5 Z" fill="currentColor" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function StepIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 3 L10 8 L3 13 Z" fill="currentColor" />
      <rect x="11" y="3" width="2.2" height="10" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3.5 8 a4.5 4.5 0 1 0 1.4 -3.3" />
      <path d="M3 2.5 v3 h3" strokeLinejoin="round" />
    </svg>
  );
}

function BrassButton({
  onClick,
  disabled,
  label,
  caption,
  size,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  caption: string;
  size: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className="brass flex items-center justify-center rounded-full"
        style={{ width: size, height: size }}
      >
        {children}
      </button>
      <span className="carved text-[11px] tracking-widest">{caption}</span>
    </div>
  );
}

/**
 * The wooden board under the island: who explores, how fast, and the brass buttons.
 * Styled as part of the world rather than a generic control panel.
 */
export function ControlDeck({ controller, onUserGesture }: { controller: BanditController; onUserGesture: () => void }) {
  const { state, playing, atLimit, speedIndex } = controller;
  const info = ALGORITHM_INFO[state.algorithm];

  return (
    <div className="wood relative rounded-[20px] px-5 pt-5 pb-5 sm:px-7">
      {[
        "top-2.5 left-2.5",
        "top-2.5 right-2.5",
        "bottom-2.5 left-2.5",
        "bottom-2.5 right-2.5",
      ].map((pos) => (
        <span key={pos} className={`nail absolute ${pos}`} aria-hidden />
      ))}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_auto_minmax(0,1fr)] lg:gap-8">
        {/* who explores */}
        <div>
          <div className="carved mb-2.5 text-[12px] tracking-[0.2em]">今日の探検家</div>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="アルゴリズム選択">
            {ALGORITHM_IDS.map((id, i) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={id === state.algorithm}
                onClick={() => controller.setAlgorithm(id)}
                className="tag py-1.5 pr-3 pl-5.5 text-left"
                style={{ transform: `rotate(${TAG_TILTS[i]}deg)` }}
              >
                <span className="t-display block text-[15px] leading-tight">{ALGORITHM_INFO[id].name}</span>
              </button>
            ))}
          </div>
          <p className="carved mt-3 text-[13px] leading-relaxed">
            <span className="t-display italic">{info.name}</span> ── {info.tagline}
          </p>
          {state.algorithm === "epsilonGreedy" && (
            <label className="carved mt-2 flex items-center gap-3 text-[12px]">
              <span className="shrink-0">寄り道の確率 ε</span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={state.epsilon}
                onChange={(e) => controller.setEpsilon(Number(e.target.value))}
                className="w-full max-w-44 accent-[#f8efdc]"
              />
              <span className="t-num w-9 text-[15px]">{state.epsilon.toFixed(2)}</span>
            </label>
          )}
        </div>

        {/* brass buttons */}
        <div className="flex items-end justify-center gap-5 lg:pt-3">
          <BrassButton
            size={44}
            label="1ターン進める"
            caption="1歩"
            onClick={() => {
              onUserGesture();
              controller.step();
            }}
            disabled={playing || !!state.pending || atLimit}
          >
            <StepIcon />
          </BrassButton>
          <BrassButton
            size={68}
            label={playing ? "一時停止" : "再生"}
            caption={playing ? "ひと休み" : "再生"}
            onClick={() => {
              onUserGesture();
              if (playing) controller.pause();
              else controller.play();
            }}
            disabled={atLimit}
          >
            <PlayIcon playing={playing} />
          </BrassButton>
          <BrassButton size={44} label="リセット" caption="やり直し" onClick={controller.reset}>
            <ResetIcon />
          </BrassButton>
        </div>

        {/* speed & shortcuts */}
        <div className="lg:justify-self-end">
          <div className="carved mb-2.5 text-[12px] tracking-[0.2em]">はやさ</div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="シミュレーション速度">
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={i === speedIndex}
                onClick={() => controller.setSpeedIndex(i)}
                className="notch t-num rounded-md px-2.5 py-1 text-[14px]"
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            <button type="button" onClick={controller.jump} disabled={atLimit} className="carved underline-offset-4 hover:underline disabled:opacity-50">
              {JUMP_TURNS.toLocaleString()}ターン先へ →
            </button>
            <button type="button" onClick={controller.newIsland} className="carved underline-offset-4 hover:underline">
              新しい島へ →
            </button>
          </div>
          {atLimit && <p className="carved mt-2 text-[12px]">航海の上限に着きました。やり直しでもう一度。</p>}
        </div>
      </div>
    </div>
  );
}
