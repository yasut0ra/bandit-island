"use client";

import {
  computeUcb,
  credibleInterval,
  posteriorParams,
  sampleMean,
  uncertainty,
  argmaxAll,
  type AlgorithmId,
  type ArmStats,
  type Decision,
} from "@/lib/bandits/index.ts";
import { CHESTS, chestColor, formatPercent } from "@/lib/island";
import { ChestIcon, InfoTip, Meter } from "../ui";

interface ChestCardsProps {
  arms: readonly ArmStats[];
  probs: readonly number[];
  turn: number;
  algorithm: AlgorithmId;
  showTrueProbs: boolean;
  showDetails: boolean;
  estimatedBest: number | null;
  lastArm: number | null;
  lastDecision: Decision | null;
  dark: boolean;
}

function uncertaintyLabel(u: number): string {
  if (u > 0.66) return "とても高い";
  if (u > 0.33) return "高め";
  if (u > 0.15) return "低め";
  return "低い";
}

function fmt(v: number): string {
  return Number.isFinite(v) ? v.toFixed(3) : "∞";
}

/** Estimate bar with the ~95% credible range and (optionally) the true value. */
function EstimateBar({ arm, color, trueProb }: { arm: ArmStats; color: string; trueProb: number | null }) {
  const [lo, hi] = credibleInterval(arm);
  const mean = arm.pulls > 0 ? sampleMean(arm) : null;
  return (
    <div className="relative h-3 w-full rounded-full bg-panel-soft ring-1 ring-line/60" aria-hidden>
      <div
        className="absolute inset-y-0 rounded-full opacity-30 transition-all duration-300"
        style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, background: color }}
      />
      {mean !== null && (
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-all duration-300 dark:border-slate-900"
          style={{ left: `${mean * 100}%`, background: color }}
        />
      )}
      {trueProb !== null && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded bg-emerald-500"
          style={{ left: `${trueProb * 100}%` }}
          title="真の当たり確率"
        />
      )}
    </div>
  );
}

function DetailRows({
  index,
  arms,
  algorithm,
  lastDecision,
}: {
  index: number;
  arms: readonly ArmStats[];
  algorithm: AlgorithmId;
  lastDecision: Decision | null;
}) {
  const row = (label: string, value: string, tip?: string) => (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-muted">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className="font-mono font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );

  if (algorithm === "ucb1") {
    const ucb = computeUcb(arms);
    return (
      <>
        {row("推定値", fmt(ucb.estimates[index]))}
        {row("探索ボーナス", `+${fmt(ucb.bonuses[index])}`, "exploration bonus = √(2·ln t ÷ n)。試した回数 n が少ないほど大きくなります。")}
        {row("UCBスコア", fmt(ucb.scores[index]), "推定値 + 探索ボーナス。次のターンはこれが最大の箱を選びます。")}
      </>
    );
  }
  if (algorithm === "thompson") {
    const { alpha, beta } = posteriorParams(arms[index]);
    const sample =
      lastDecision?.details.kind === "thompson" ? lastDecision.details.samples[index] : null;
    return (
      <>
        {row("α（当たり+1）", String(alpha), "Beta分布のパラメータ。当たるたびに α が1増えます。")}
        {row("β（ハズレ+1）", String(beta), "ハズレるたびに β が1増えます。α と β が大きいほど想像の幅が狭くなります。")}
        {row("事後平均", fmt(alpha / (alpha + beta)))}
        {row("前回の想像値 θ", sample === null ? "—" : fmt(sample), "前のターンでこの箱について想像（サンプリング）した当たり確率。")}
      </>
    );
  }
  if (algorithm === "epsilonGreedy") {
    const estimates = arms.map(sampleMean);
    const greedy = argmaxAll(estimates);
    return (
      <>
        {row("推定値 Q", fmt(estimates[index]))}
        {row("活用するときの候補", greedy.includes(index) ? "✓ 候補" : "—", "ε の確率で探索しないとき、この候補から選びます。")}
      </>
    );
  }
  return <p className="text-muted">Random は推定値を使わず、毎回 1/5 の確率で選びます。</p>;
}

export function ChestCards(props: ChestCardsProps) {
  const { arms, probs, turn, showTrueProbs, showDetails, estimatedBest, lastArm, dark } = props;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      {CHESTS.map((chest, i) => {
        const arm = arms[i];
        const color = chestColor(i, dark);
        const u = uncertainty(arm);
        const share = turn > 0 ? arm.pulls / turn : 0;
        return (
          <div
            key={chest.name}
            className={`glass relative rounded-2xl border p-3 text-xs transition-all ${
              lastArm === i ? "border-(--chest) shadow-[0_8px_20px_-10px_var(--chest)]" : "border-line/80"
            }`}
            style={{ "--chest": color } as React.CSSProperties}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <ChestIcon color={color} />
              <span className="text-sm font-bold">{chest.name}</span>
              {estimatedBest === i && (
                <span className="ml-auto rounded-full bg-exploit-soft px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-exploit" title="推定ベスト">
                  👑 ベスト
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <div className="mb-1 flex justify-between">
                  <span className="whitespace-nowrap text-muted">選択回数</span>
                  <span className="font-semibold whitespace-nowrap tabular-nums">
                    {arm.pulls.toLocaleString()}回 <span className="text-muted">({formatPercent(share)})</span>
                  </span>
                </div>
                <Meter value={share} color={color} />
              </div>

              <div>
                <div className="mb-1 flex justify-between">
                  <span className="flex items-center gap-1 whitespace-nowrap text-muted">
                    推定成功確率
                    <InfoTip text="当たり回数 ÷ 選択回数。薄い帯は「本当の確率はだいたいこの範囲」という目安（95%信用区間）です。" />
                  </span>
                  <span className="font-semibold tabular-nums">
                    {arm.pulls === 0 ? "？" : formatPercent(sampleMean(arm), 1)}
                  </span>
                </div>
                <EstimateBar arm={arm} color={color} trueProb={showTrueProbs ? probs[i] : null} />
                <div className="mt-0.5 text-[10px] text-muted tabular-nums">
                  当たり {arm.successes} / {arm.pulls}
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between">
                  <span className="flex items-center gap-1 whitespace-nowrap text-muted">
                    不確実性
                    <InfoTip text="まだどれくらい分かっていないか。試した回数が少ないほど高く、3Dの島では紫の霧の濃さで表しています。" />
                  </span>
                  <span className="font-semibold text-explore">{uncertaintyLabel(u)}</span>
                </div>
                <Meter value={u} color="var(--explore)" />
              </div>

              {showTrueProbs && (
                <div className="flex justify-between rounded-xl bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
                  <span>真の成功確率</span>
                  <span className="tabular-nums">{formatPercent(probs[i])}</span>
                </div>
              )}

              {showDetails && (
                <div className="space-y-1 border-t border-line pt-2 text-[11px]">
                  <DetailRows index={i} arms={arms} algorithm={props.algorithm} lastDecision={props.lastDecision} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
