"use client";

import { JUMP_TURNS, SPEEDS, type BanditController } from "@/hooks/useBanditSimulation";
import { ALGORITHM_IDS, type AlgorithmId } from "@/lib/bandits/index.ts";
import type { IslandMode } from "@/lib/island";
import { ALGORITHM_INFO } from "@/lib/explain";
import { AlgoAvatar, ToggleChip } from "../ui";

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="30" height="30" viewBox="0 0 22 22" aria-hidden>
      <rect x="5" y="4" width="4.4" height="14" rx="1.6" fill="currentColor" />
      <rect x="12.6" y="4" width="4.4" height="14" rx="1.6" fill="currentColor" />
    </svg>
  ) : (
    <svg width="30" height="30" viewBox="0 0 22 22" aria-hidden>
      <path d="M7.5 4.5 L18 11 L7.5 17.5 Z" fill="currentColor" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

function StepIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 3 L10 8 L3 13 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="11" y="3" width="2.6" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M3.5 8 a4.5 4.5 0 1 0 1.4 -3.3" />
      <path d="M3 2.3 v3.3 h3.3" strokeLinejoin="round" />
    </svg>
  );
}

function RoundButton({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="f-pop text-[11px] text-ink-2">{caption}</span>
    </div>
  );
}

function awareHint(mode: IslandMode, algorithm: AlgorithmId, aware: boolean): string {
  const what = mode === "weather" ? "天気" : "気温";
  if (!aware) return `${what}を無視して、全部まとめて学ぶ`;
  if (algorithm === "linucb") return mode === "weather" ? "天気ごとの重みを学ぶ（特徴量）" : "気温と当たりやすさの法則（直線）を学ぶ";
  return mode === "weather" ? "天気ごとに記録を分けて学ぶ（文脈付き）" : "「さむい・ふつう・あつい」に区切って学ぶ";
}

/**
 * The game controller tray under the island: character select, big candy
 * buttons and speed. Feels like part of a game rather than a settings panel.
 */
export function ControlDeck({ controller, onUserGesture }: { controller: BanditController; onUserGesture: () => void }) {
  const { state, playing, atLimit, speedIndex } = controller;
  const info = ALGORITHM_INFO[state.algorithm];

  return (
    <div className="panel px-4 py-4 sm:px-6 sm:py-5">
      <div className="grid items-center gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1.5fr)_auto_minmax(0,1fr)]">
        {/* character select */}
        <div>
          <div className="f-pop mb-2 text-[13px] text-ink-2">だれが探検する？</div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label="アルゴリズム選択">
            {ALGORITHM_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={id === state.algorithm}
                onClick={() => controller.setAlgorithm(id)}
                className="char flex flex-col items-center px-1 pt-1.5 pb-1"
              >
                <AlgoAvatar id={id} size={34} />
                <span className="mt-0.5 text-[11px] leading-tight font-extrabold whitespace-nowrap text-ink">{ALGORITHM_INFO[id].name === "Thompson Sampling" ? "Thompson" : ALGORITHM_INFO[id].name}</span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[12.5px] font-bold text-ink-2">
            <span className="text-ink">{info.name}</span>：{info.tagline}
          </p>
          {state.mode !== "classic" && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <ToggleChip checked={state.contextAware} onChange={controller.setContextAware}>
                {state.mode === "weather" ? "天気を見て選ぶ" : "気温を見て選ぶ"}
              </ToggleChip>
              <span className="text-[12px] font-bold text-ink-2">{awareHint(state.mode, state.algorithm, state.contextAware)}</span>
            </div>
          )}
          {state.algorithm === "linucb" && (
            <label className="mt-2 flex items-center gap-3 text-[12.5px] font-bold text-ink-2">
              <span className="shrink-0">自信のなさボーナス α</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={state.alpha}
                onChange={(e) => controller.setAlpha(Number(e.target.value))}
                className="w-full max-w-44"
              />
              <span className="f-num w-10 text-[17px] text-ink">{state.alpha.toFixed(2)}</span>
            </label>
          )}
          {state.algorithm === "epsilonGreedy" && (
            <label className="mt-2 flex items-center gap-3 text-[12.5px] font-bold text-ink-2">
              <span className="shrink-0">寄り道の確率 ε</span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={state.epsilon}
                onChange={(e) => controller.setEpsilon(Number(e.target.value))}
                className="w-full max-w-44"
              />
              <span className="f-num w-10 text-[17px] text-ink">{state.epsilon.toFixed(2)}</span>
            </label>
          )}
        </div>

        {/* big candy buttons */}
        <div className="flex items-start justify-center gap-4">
          <RoundButton caption="1歩">
            <button
              type="button"
              aria-label="1ターン進める"
              title="1ターン進める"
              onClick={() => {
                onUserGesture();
                controller.step();
              }}
              disabled={playing || !!state.pending || atLimit}
              className="candy candy--sky mt-3 h-14 w-14"
            >
              <StepIcon />
            </button>
          </RoundButton>
          <RoundButton caption={playing ? "ストップ" : "スタート"}>
            <button
              type="button"
              aria-label={playing ? "一時停止" : "再生"}
              onClick={() => {
                onUserGesture();
                if (playing) controller.pause();
                else controller.play();
              }}
              disabled={atLimit}
              className={`candy h-[84px] w-[84px] ${playing ? "candy--sun" : ""}`}
            >
              <PlayIcon playing={playing} />
            </button>
          </RoundButton>
          <RoundButton caption="もう一度">
            <button type="button" aria-label="リセット" title="リセット" onClick={controller.reset} className="candy candy--grape mt-3 h-14 w-14">
              <ResetIcon />
            </button>
          </RoundButton>
        </div>

        {/* speed & jumps */}
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="f-pop text-[13px] text-ink-2">はやさ</div>
          <div className="seg f-num text-[15px]" role="radiogroup" aria-label="シミュレーション速度">
            {SPEEDS.map((s, i) => (
              <button key={s.label} type="button" role="radio" aria-checked={i === speedIndex} onClick={() => controller.setSpeedIndex(i)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={controller.jump} disabled={atLimit} className="candy candy--mint px-4 py-1.5 text-[13px]">
              {JUMP_TURNS.toLocaleString()}ターン先へ
            </button>
            <button type="button" onClick={controller.newIsland} className="candy candy--white px-4 py-1.5 text-[13px]">
              新しい島へ
            </button>
          </div>
          {atLimit && <p className="text-[12px] font-bold text-ink-2">上限まで遊びました。「もう一度」でリセット！</p>}
        </div>
      </div>
    </div>
  );
}
