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
import { CHESTS, chestColor, formatPercent } from "@/lib/island";
import { CheckChip, ChestSticker, Note } from "../ui";

interface ChestLedgerProps {
  arms: readonly ArmStats[];
  probs: readonly number[];
  algorithm: AlgorithmId;
  showTrueProbs: boolean;
  onShowTrueProbs: (value: boolean) => void;
  estimatedBest: number | null;
  lastArm: number | null;
  lastDecision: Decision | null;
  dark: boolean;
}

function fogWord(u: number): string {
  if (u > 0.66) return "もやが濃い";
  if (u > 0.33) return "うっすら";
  if (u > 0.15) return "ほぼ晴れ";
  return "晴れ";
}

function fmt(v: number): string {
  return Number.isFinite(v) ? v.toFixed(3) : "∞";
}

/** Estimate dot on a thin track, with the plausible range as a soft band. */
function EstimateTrack({ arm, color, answer }: { arm: ArmStats; color: string; answer: number | null }) {
  const [lo, hi] = credibleInterval(arm);
  const mean = arm.pulls > 0 ? sampleMean(arm) : null;
  return (
    <div className="relative h-4" aria-hidden>
      <div className="absolute top-1/2 right-0 left-0 h-px bg-rule" />
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full opacity-35 transition-all duration-300"
        style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, background: color }}
      />
      {mean !== null && (
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-ink transition-all duration-300"
          style={{ left: `${mean * 100}%`, background: color }}
        />
      )}
      {answer !== null && (
        <div className="absolute -top-0.5 -bottom-0.5 w-0 border-l-[1.5px] border-dashed border-ink" style={{ left: `${answer * 100}%` }} />
      )}
    </div>
  );
}

function DetailRows({ index, arms, algorithm, lastDecision }: { index: number; arms: readonly ArmStats[]; algorithm: AlgorithmId; lastDecision: Decision | null }) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-2">
      <span className="text-ink-2">{label}</span>
      <span className="t-num text-ink">{value}</span>
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
        {row("活用の候補", argmaxAll(estimates).includes(index) ? "はい" : "—")}
      </>
    );
  }
  return <p className="text-ink-2">Random は推定値を使いません</p>;
}

/** One sheet of paper listing what Pico believes about each chest. */
export function ChestLedger(props: ChestLedgerProps) {
  const { arms, probs, showTrueProbs, estimatedBest, lastArm, dark } = props;
  const [details, setDetails] = useState(false);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-xl">
          <h2 className="text-[19px] font-bold text-ink">宝箱の帳面</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
            大きな数字はピコが見積もった当たりやすさ（推定成功確率）。色の帯は「本当はこのあたりかも」という範囲、紫のバーは不確実性で、どちらも試すほど縮んでいきます。
          </p>
        </div>
        <div className="flex gap-2">
          <CheckChip checked={showTrueProbs} onChange={props.onShowTrueProbs}>
            答えをのぞく
          </CheckChip>
          <CheckChip checked={details} onChange={setDetails}>
            くわしく
          </CheckChip>
        </div>
      </div>

      <div className="sheet -mx-4 flex snap-x snap-mandatory overflow-x-auto rounded-none px-2 py-2 sm:mx-0 sm:rounded-[14px] lg:grid lg:grid-cols-5 lg:overflow-visible">
        {CHESTS.map((chest, i) => {
          const arm = arms[i];
          const color = chestColor(i, dark);
          const u = uncertainty(arm);
          return (
            <div
              key={chest.name}
              className={`relative min-w-[62%] shrink-0 snap-start rounded-[10px] px-4 py-4 transition-colors sm:min-w-[40%] lg:min-w-0 ${
                i > 0 ? "lg:border-l lg:border-dashed lg:border-rule lg:rounded-none" : ""
              } ${lastArm === i ? "bg-paper-2/70" : ""}`}
            >
              <div className="flex items-center gap-2">
                <ChestSticker color={color} />
                <span className="text-[16px] font-bold text-ink">{chest.name}</span>
                {estimatedBest === i && <span className="ml-auto text-[12px] font-bold text-exploit">★ 本命</span>}
              </div>

              <div className="t-num mt-3 text-[40px] leading-none font-semibold text-ink">
                {arm.pulls === 0 ? <span className="text-ink-3">？</span> : formatPercent(sampleMean(arm))}
              </div>

              <div className="mt-3">
                <EstimateTrack arm={arm} color={color} answer={showTrueProbs ? probs[i] : null} />
              </div>

              <div className="mt-2 text-[13px] text-ink-2">
                <span className="t-num text-ink">{arm.pulls.toLocaleString()}</span>回開けて、当たり
                <span className="t-num text-ink">{arm.successes.toLocaleString()}</span>
              </div>

              <div className="mt-2.5 flex items-center gap-2 text-[12px] text-ink-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${u * 100}%`, background: "var(--fog)" }}
                  />
                </div>
                <span className="w-16 text-right">{fogWord(u)}</span>
              </div>

              {showTrueProbs && (
                <div className="mt-2 text-[13px] text-ink">
                  答え <span className="t-num font-semibold">{formatPercent(probs[i])}</span>
                </div>
              )}

              {details && (
                <div className="mt-3 space-y-1 border-t border-dashed border-rule pt-2.5 text-[12px]">
                  <DetailRows index={i} arms={arms} algorithm={props.algorithm} lastDecision={props.lastDecision} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {details && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-2">
          数値の意味
          <Note text="UCBスコア = 推定値 + √(2·ln t ÷ n)。Thompson Sampling は各箱を Beta(α, β) 分布で想像します。もやのバーは Beta 分布の広がり（不確実性）です。" />
        </p>
      )}
    </section>
  );
}
