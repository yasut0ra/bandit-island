"use client";

import { JUMP_TURNS, SPEEDS, type BanditController } from "@/hooks/useBanditSimulation";
import { ALGORITHM_IDS, type AlgorithmId } from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { Card, SectionTitle, Toggle } from "../ui";

export function AlgorithmPicker({
  value,
  onChange,
  epsilon,
  onEpsilonChange,
}: {
  value: AlgorithmId;
  onChange: (id: AlgorithmId) => void;
  epsilon: number;
  onEpsilonChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="アルゴリズム選択">
        {ALGORITHM_IDS.map((id) => {
          const info = ALGORITHM_INFO[id];
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id)}
              className={`rounded-2xl border px-3 py-2.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-explore ${
                active
                  ? "border-explore bg-explore-soft shadow-[0_6px_18px_-8px_var(--explore)]"
                  : "border-line bg-panel-solid/60 hover:-translate-y-0.5 hover:border-explore/50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden>{info.emoji}</span>
                <span className="font-display text-[15px] font-semibold text-ink">{info.name}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted">{info.tagline}</div>
            </button>
          );
        })}
      </div>
      {value === "epsilonGreedy" && (
        <div className="mt-3 rounded-2xl bg-panel-soft p-3 ring-1 ring-line">
          <label className="flex items-center justify-between text-xs font-semibold text-ink" htmlFor="epsilon">
            <span>探索率 ε（イプシロン）</span>
            <span className="font-display text-sm text-explore">{epsilon.toFixed(2)}</span>
          </label>
          <input
            id="epsilon"
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={epsilon}
            onChange={(e) => onEpsilonChange(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="mt-1 text-[11px] text-muted">
            {epsilon === 0
              ? "ε = 0 は探索なし。一度良さそうに見えた箱に固執します。"
              : `だいたい ${Math.round(1 / epsilon)} 回に 1 回、ランダムに探索します。`}
          </p>
        </div>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  children,
  label,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-panel-solid/70 px-3 py-2 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-explore/50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${className}`}
    >
      {children}
    </button>
  );
}

interface ControlPanelProps {
  controller: BanditController;
  showTrueProbs: boolean;
  onShowTrueProbs: (value: boolean) => void;
  showDetails: boolean;
  onShowDetails: (value: boolean) => void;
  onUserGesture: () => void;
}

export function ControlPanel({
  controller,
  showTrueProbs,
  onShowTrueProbs,
  showDetails,
  onShowDetails,
  onUserGesture,
}: ControlPanelProps) {
  const { state, playing, atLimit, speedIndex } = controller;

  return (
    <Card>
      <SectionTitle icon="🧠">アルゴリズム</SectionTitle>
      <AlgorithmPicker
        value={state.algorithm}
        onChange={controller.setAlgorithm}
        epsilon={state.epsilon}
        onEpsilonChange={controller.setEpsilon}
      />
      {state.sim.turn > 0 && (
        <p className="mt-2 text-[11px] leading-snug text-muted">
          途中で切り替えても、それまでの観測結果は引き継がれます。最初からやり直すなら「リセット」。
        </p>
      )}

      <div className="my-4 h-px bg-line" />

      <SectionTitle icon="🎮">操作</SectionTitle>
      <button
        type="button"
        onClick={() => {
          onUserGesture();
          if (playing) controller.pause();
          else controller.play();
        }}
        disabled={atLimit}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
          playing
            ? "bg-linear-to-r from-slate-500 to-slate-600 shadow-slate-500/30"
            : "bg-linear-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/30"
        }`}
      >
        <span aria-hidden>{playing ? "⏸" : "▶"}</span>
        {playing ? "一時停止" : state.sim.turn === 0 ? "再生（冒険スタート）" : "再生"}
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <IconButton
          label="1ターン進める"
          onClick={() => {
            onUserGesture();
            controller.step();
          }}
          disabled={playing || !!state.pending || atLimit}
        >
          <span aria-hidden>⏭</span> 1ターン進める
        </IconButton>
        <IconButton label="リセット" onClick={controller.reset}>
          <span aria-hidden>↺</span> リセット
        </IconButton>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted">
          <span>シミュレーション速度</span>
          <span>{SPEEDS[speedIndex].animated ? "アニメーションあり" : "高速（演出を省略）"}</span>
        </div>
        <div className="grid grid-cols-5 gap-1 rounded-2xl bg-panel-soft p-1 ring-1 ring-line" role="radiogroup" aria-label="速度">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              role="radio"
              aria-checked={i === speedIndex}
              onClick={() => controller.setSpeedIndex(i)}
              className={`rounded-xl py-1.5 font-display text-sm font-semibold transition-colors ${
                i === speedIndex ? "bg-panel-solid text-explore shadow" : "text-muted hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <IconButton label={`${JUMP_TURNS}ターン一気に進める`} onClick={controller.jump} disabled={atLimit}>
          <span aria-hidden>⏩</span> {JUMP_TURNS}ターン後へ
        </IconButton>
        <IconButton label="新しい島（当たり確率を入れ替え）" onClick={controller.newIsland}>
          <span aria-hidden>🏝️</span> 新しい島
        </IconButton>
      </div>
      {atLimit && <p className="mt-2 text-xs text-regret">上限ターン数に達しました。リセットしてもう一度どうぞ。</p>}

      <div className="my-4 h-px bg-line" />

      <Toggle
        checked={showTrueProbs}
        onChange={onShowTrueProbs}
        label="真の当たり確率を表示"
        hint="ロボットには見えない「答え」をこっそり見る"
      />
      <Toggle
        checked={showDetails}
        onChange={onShowDetails}
        label="詳しい数値を表示"
        hint="UCBスコアや α・β などアルゴリズムの内部"
      />
      <p className="mt-2 text-[11px] text-muted">
        ショートカット：<kbd className="rounded bg-panel-soft px-1 ring-1 ring-line">Space</kbd> 再生/停止 ·{" "}
        <kbd className="rounded bg-panel-soft px-1 ring-1 ring-line">→</kbd> 1ターン ·{" "}
        <kbd className="rounded bg-panel-soft px-1 ring-1 ring-line">R</kbd> リセット
      </p>
    </Card>
  );
}

/** Compact play controls shown under the scene on small screens (the full panel sits further down). */
export function QuickControls({ controller, onUserGesture }: { controller: BanditController; onUserGesture: () => void }) {
  const { state, playing, atLimit, speedIndex } = controller;
  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-2xl border border-line/80 p-2 lg:hidden">
      <button
        type="button"
        onClick={() => {
          onUserGesture();
          if (playing) controller.pause();
          else controller.play();
        }}
        disabled={atLimit}
        className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white ${
          playing ? "bg-slate-500" : "bg-linear-to-r from-violet-500 to-fuchsia-500"
        }`}
      >
        {playing ? "⏸ 一時停止" : "▶ 再生"}
      </button>
      <IconButton
        label="1ターン進める"
        onClick={() => {
          onUserGesture();
          controller.step();
        }}
        disabled={playing || !!state.pending || atLimit}
      >
        ⏭
      </IconButton>
      <IconButton label="リセット" onClick={controller.reset}>
        ↺
      </IconButton>
      <select
        aria-label="シミュレーション速度"
        value={speedIndex}
        onChange={(e) => controller.setSpeedIndex(Number(e.target.value))}
        className="rounded-xl border border-line bg-panel-solid px-2 py-2 font-display text-sm"
      >
        {SPEEDS.map((s, i) => (
          <option key={s.label} value={i}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
