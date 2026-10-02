"use client";

import { useState } from "react";
import {
  argmaxAll,
  computeUcb,
  credibleInterval,
  posteriorParams,
  sampleMean,
  uncertainty,
  type AlgorithmId,
  type ArmStats,
  type Decision,
} from "@/lib/bandits/index.ts";
import { CHESTS, WEATHERS, chestColor, formatPercent } from "@/lib/island";
import { ChestSticker, Note, Ribbon, ToggleChip, WeatherGlyph } from "../ui";

interface ChestLedgerProps {
  arms: readonly ArmStats[];
  probs: readonly number[];
  algorithm: AlgorithmId;
  showTrueProbs: boolean;
  onShowTrueProbs: (value: boolean) => void;
  estimatedBest: number | null;
  lastArm: number | null;
  lastDecision: Decision | null;
  /** On the weather island: records and truths per weather, and which one is shown. */
  weather: { arms: ArmStats[][]; probs: number[][]; current: number; aware: boolean } | null;
  dark: boolean;
}

/** Per-weather rows: how the same chest looks under each weather. */
function WeatherRows({ index, color, weather, showTrue }: { index: number; color: string; weather: NonNullable<ChestLedgerProps["weather"]>; showTrue: boolean }) {
  return (
    <div className="mt-3 space-y-1.5 border-t-2 border-dashed border-panel-3 pt-2.5">
      <div className="text-[11px] font-extrabold text-ink-2">天気ごとの記録</div>
      {WEATHERS.map((w, c) => {
        const arm = weather.arms[c][index];
        const est = arm.pulls > 0 ? sampleMean(arm) : null;
        const today = c === weather.current;
        return (
          <div key={w.id} className={`flex items-center gap-1.5 rounded-lg px-1 ${today ? "bg-exploit-soft" : ""}`}>
            <WeatherGlyph context={c} size={18} />
            <div className="meter !h-[9px] flex-1 !border-2">
              {est !== null && <i style={{ width: `${est * 100}%`, background: color }} />}
            </div>
            <span className="f-num w-9 text-right text-[13px] text-ink">{est === null ? "？" : formatPercent(est)}</span>
            {showTrue && <span className="f-num w-8 text-right text-[11px] text-ink-3">{formatPercent(weather.probs[c][index])}</span>}
          </div>
        );
      })}
    </div>
  );
}

function fogWord(u: number): string {
  if (u > 0.66) return "もやもや";
  if (u > 0.33) return "うっすら";
  if (u > 0.15) return "ほぼ晴れ";
  return "晴れ！";
}

function fmt(v: number): string {
  return Number.isFinite(v) ? v.toFixed(3) : "∞";
}

/** HP-style bar: plausible range as a soft band, the estimate as a knob, the answer as a flag. */
function EstimateMeter({ arm, color, answer }: { arm: ArmStats; color: string; answer: number | null }) {
  const [lo, hi] = credibleInterval(arm);
  const mean = arm.pulls > 0 ? sampleMean(arm) : null;
  return (
    <div className="relative pt-1 pb-1" aria-hidden>
      <div className="meter">
        <i style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, background: color, opacity: 0.45 }} />
        {mean !== null && <i style={{ width: `${mean * 100}%`, background: color }} />}
      </div>
      {answer !== null && (
        <div className="absolute top-[-3px] bottom-[-3px] w-[4px] -translate-x-1/2 rounded-full border-2 border-line bg-sun" style={{ left: `${answer * 100}%` }} />
      )}
    </div>
  );
}

function DetailRows({ index, arms, algorithm, lastDecision }: { index: number; arms: readonly ArmStats[]; algorithm: AlgorithmId; lastDecision: Decision | null }) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-2">
      <span className="text-ink-2">{label}</span>
      <span className="f-num text-[14px] text-ink">{value}</span>
    </div>
  );

  if (algorithm === "ucb1") {
    const ucb = computeUcb(arms);
    return (
      <>
        {row("推定値", fmt(ucb.estimates[index]))}
        {row("探索ボーナス", `+${fmt(ucb.bonuses[index])}`)}
        {row("UCBスコア", fmt(ucb.scores[index]))}
      </>
    );
  }
  if (algorithm === "thompson") {
    const { alpha, beta } = posteriorParams(arms[index]);
    const sample = lastDecision?.details.kind === "thompson" ? lastDecision.details.samples[index] : null;
    return (
      <>
        {row("α（当たり＋1）", String(alpha))}
        {row("β（ハズレ＋1）", String(beta))}
        {row("前回の想像 θ", sample === null ? "—" : fmt(sample))}
      </>
    );
  }
  if (algorithm === "epsilonGreedy") {
    const estimates = arms.map(sampleMean);
    return (
      <>
        {row("推定値 Q", fmt(estimates[index]))}
        {row("活用の候補", argmaxAll(estimates).includes(index) ? "◯" : "—")}
      </>
    );
  }
  return <p className="text-ink-2">Random は推定値を使いません</p>;
}

/** Party-lineup of the five chests, like a status screen in a game. */
export function ChestLedger(props: ChestLedgerProps) {
  const { arms, probs, showTrueProbs, estimatedBest, lastArm, dark, weather } = props;
  const viewLabel = weather
    ? weather.aware
      ? `推定成功確率（${WEATHERS[weather.current].name}の日）`
      : "推定成功確率（天気を気にしない）"
    : "推定成功確率";
  const [details, setDetails] = useState(false);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Ribbon
          color="var(--sky)"
          sub={
            weather
              ? "天気の島では、同じ宝箱でも天気で当たりやすさが変わります。下の「天気ごとの記録」に注目！ こたえを見ると、右側の小さな数字が本当の確率です。"
              : "大きな数字がピコの見積もり（推定成功確率）。バーの薄い部分は「本当はこのあたりかも」という範囲です。"
          }
        >
          宝箱ステータス
        </Ribbon>
        <div className="flex gap-2">
          <ToggleChip checked={showTrueProbs} onChange={props.onShowTrueProbs}>
            こたえを見る
          </ToggleChip>
          <ToggleChip checked={details} onChange={setDetails}>
            くわしく
          </ToggleChip>
        </div>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-2 pb-3 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {CHESTS.map((chest, i) => {
          const arm = arms[i];
          const color = chestColor(i, dark);
          const u = uncertainty(arm);
          const best = estimatedBest === i;
          return (
            <div
              key={chest.name}
              className={`panel relative min-w-[64%] shrink-0 snap-start overflow-hidden transition-transform sm:min-w-[38%] lg:min-w-0 ${
                lastArm === i ? "-translate-y-1" : ""
              }`}
            >
              {/* coloured name plate */}
              <div className="flex items-center gap-2 border-b-[3px] border-line px-3 py-2" style={{ background: color }}>
                <span className="rounded-full border-[2.5px] border-line bg-panel p-0.5">
                  <ChestSticker color={color} size={26} />
                </span>
                <span className="f-pop on-bg-text text-[16px]">{chest.name}</span>
                {best && <span className="badge badge--exploit ml-auto">★ 本命</span>}
              </div>

              <div className="px-3.5 pt-3 pb-4">
                <div className="text-[11px] font-extrabold text-ink-2">{viewLabel}</div>
                <div className="f-num text-[42px] leading-none text-ink">
                  {arm.pulls === 0 ? <span className="text-ink-3">？</span> : formatPercent(sampleMean(arm))}
                </div>
                <div className="mt-2">
                  <EstimateMeter arm={arm} color={color} answer={showTrueProbs ? probs[i] : null} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="panel-soft py-1.5">
                    <div className="text-[10.5px] font-extrabold text-ink-2">選択回数</div>
                    <div className="f-num text-[19px] leading-tight text-ink">{arm.pulls.toLocaleString()}</div>
                  </div>
                  <div className="panel-soft py-1.5">
                    <div className="text-[10.5px] font-extrabold text-ink-2">あたり</div>
                    <div className="f-num text-[19px] leading-tight text-ink">{arm.successes.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold text-ink-2">
                    <span>不確実性</span>
                    <span className="text-explore">{fogWord(u)}</span>
                  </div>
                  <div className="meter !h-[11px]">
                    <i style={{ width: `${u * 100}%`, background: "var(--fog)" }} />
                  </div>
                </div>

                {weather && <WeatherRows index={i} color={color} weather={weather} showTrue={showTrueProbs} />}

                {showTrueProbs && !weather && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-exploit-soft px-2.5 py-1 text-[12px] font-extrabold text-ink">
                    <span>こたえ</span>
                    <span className="f-num text-[17px]">{formatPercent(probs[i])}</span>
                  </div>
                )}

                {details && (
                  <div className="mt-3 space-y-1 border-t-2 border-dashed border-panel-3 pt-2.5 text-[12px] font-bold">
                    <DetailRows index={i} arms={arms} algorithm={props.algorithm} lastDecision={props.lastDecision} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {details && (
        <p className="on-bg-text mt-2 flex items-center gap-1.5 text-[12.5px] font-bold">
          数値の意味
          <Note text="UCBスコア = 推定値 + √(2·ln t ÷ n)。Thompson Sampling は各箱を Beta(α, β) 分布で想像します。不確実性のバーは Beta 分布の広がりです。" />
        </p>
      )}
    </section>
  );
}
