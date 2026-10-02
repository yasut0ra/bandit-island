"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  argmaxAll,
  computeUcb,
  posteriorParams,
  sampleMean,
  type AlgorithmId,
  type ArmStats,
  type Belief,
  type Decision,
} from "@/lib/bandits/index.ts";
import type { LinUcbValues } from "@/lib/bandits/linucb.ts";
import { CHESTS, chestColor, formatPercent, type IslandMode } from "@/lib/island";
import { ChestSticker, Note, Ribbon, ToggleChip } from "../ui";

/** Records split by situation (weather or temperature band), shown under each chest. */
export interface SituationRows {
  title: string;
  rows: { key: string; icon: ReactNode; arms: readonly ArmStats[]; truth: readonly number[]; current: boolean }[];
}

interface ChestLedgerProps {
  /** What Pico believes about each chest in the current situation. */
  beliefs: readonly Belief[];
  /** Tabular records the current algorithm uses (for the details view). */
  arms: readonly ArmStats[];
  /** LinUCB's fitted values in the current situation (when LinUCB is selected). */
  linucb: LinUcbValues | null;
  probs: readonly number[];
  algorithm: AlgorithmId;
  mode: IslandMode;
  estimateLabel: string;
  situations: SituationRows | null;
  showTrueProbs: boolean;
  onShowTrueProbs: (value: boolean) => void;
  estimatedBest: number | null;
  lastArm: number | null;
  lastDecision: Decision | null;
  dark: boolean;
}

/** Per-situation rows: how the same chest has done in each weather / temperature band. */
function SituationRowsView({ index, color, situations, showTrue }: { index: number; color: string; situations: SituationRows; showTrue: boolean }) {
  return (
    <div className="mt-3 space-y-1.5 border-t-2 border-dashed border-panel-3 pt-2.5">
      <div className="text-[11px] font-extrabold text-ink-2">{situations.title}</div>
      {situations.rows.map((r) => {
        const arm = r.arms[index];
        const est = arm.pulls > 0 ? sampleMean(arm) : null;
        return (
          <div key={r.key} className={`flex items-center gap-1.5 rounded-lg px-1 ${r.current ? "bg-exploit-soft" : ""}`}>
            {r.icon}
            <div className="meter !h-[9px] flex-1 !border-2">
              {est !== null && <i style={{ width: `${est * 100}%`, background: color }} />}
            </div>
            <span className="f-num w-9 text-right text-[13px] text-ink">{est === null ? "？" : formatPercent(est)}</span>
            {showTrue && <span className="f-num w-8 text-right text-[11px] text-ink-3">{formatPercent(r.truth[index])}</span>}
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

/** HP-style bar: plausible range as a soft band, the estimate as a fill, the answer as a flag. */
function EstimateMeter({ belief, color, answer }: { belief: Belief; color: string; answer: number | null }) {
  const { low: lo, high: hi, estimate: mean } = belief;
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

function DetailRows({
  index,
  arms,
  algorithm,
  linucb,
  lastDecision,
}: {
  index: number;
  arms: readonly ArmStats[];
  algorithm: AlgorithmId;
  linucb: LinUcbValues | null;
  lastDecision: Decision | null;
}) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-2">
      <span className="text-ink-2">{label}</span>
      <span className="f-num text-[14px] text-ink">{value}</span>
    </div>
  );

  if (algorithm === "linucb" && linucb) {
    const alpha = lastDecision?.details.kind === "linucb" ? lastDecision.details.alpha : null;
    const theta = linucb.thetas[index];
    return (
      <>
        {row("予測 θ̂ᵀx", fmt(linucb.estimates[index]))}
        {row("自信のなさ √(xᵀA⁻¹x)", fmt(linucb.widths[index]))}
        {/* θ̂ is learned around ½, so add it back for the human-readable rule */}
        {theta.length === 2 && row("法則：切片 / 傾き", `${(0.5 + theta[0]).toFixed(2)} / ${theta[1] >= 0 ? "+" : ""}${theta[1].toFixed(2)}`)}
        {theta.length !== 2 && row("天気ごとの予測", theta.map((v) => (0.5 + v).toFixed(2)).join(" / "))}
        {alpha !== null && row("前回の α", alpha.toFixed(2))}
      </>
    );
  }
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
  const { beliefs, probs, showTrueProbs, estimatedBest, lastArm, dark, situations, mode } = props;
  const [details, setDetails] = useState(false);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Ribbon
          color="var(--sky)"
          sub={
            mode === "weather"
              ? "天気の島では、同じ宝箱でも天気で当たりやすさが変わります。下の「天気ごとの記録」に注目！ こたえを見ると、右側の小さな数字が本当の確率です。"
              : mode === "temperature"
                ? "気温の島では、大きな数字が「今の気温」でのピコの見積もりです。気温を区切った記録も見てみよう。"
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
          const belief = beliefs[i];
          const color = chestColor(i, dark);
          const u = belief.uncertainty;
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
                <div className="text-[11px] font-extrabold text-ink-2">{props.estimateLabel}</div>
                <div className="f-num text-[42px] leading-none text-ink">
                  {belief.estimate === null ? <span className="text-ink-3">？</span> : formatPercent(belief.estimate)}
                </div>
                <div className="mt-2">
                  <EstimateMeter belief={belief} color={color} answer={showTrueProbs ? probs[i] : null} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="panel-soft py-1.5">
                    <div className="text-[10.5px] font-extrabold text-ink-2">選択回数</div>
                    <div className="f-num text-[19px] leading-tight text-ink">{belief.pulls.toLocaleString()}</div>
                  </div>
                  <div className="panel-soft py-1.5">
                    <div className="text-[10.5px] font-extrabold text-ink-2">あたり</div>
                    <div className="f-num text-[19px] leading-tight text-ink">{belief.successes.toLocaleString()}</div>
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

                {situations && <SituationRowsView index={i} color={color} situations={situations} showTrue={showTrueProbs} />}

                {showTrueProbs && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-exploit-soft px-2.5 py-1 text-[12px] font-extrabold text-ink">
                    <span>{situations ? "こたえ（今の状況）" : "こたえ"}</span>
                    <span className="f-num text-[17px]">{formatPercent(probs[i])}</span>
                  </div>
                )}

                {details && (
                  <div className="mt-3 space-y-1 border-t-2 border-dashed border-panel-3 pt-2.5 text-[12px] font-bold">
                    <DetailRows index={i} arms={props.arms} algorithm={props.algorithm} linucb={props.linucb} lastDecision={props.lastDecision} />
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
          <Note text="UCBスコア = 推定値 + √(2·ln t ÷ n)。Thompson Sampling は各箱を Beta(α, β) 分布で想像します。LinUCB は各箱の法則 θ̂ を A⁻¹b で求め、予測 θ̂ᵀx に α·√(xᵀA⁻¹x) のボーナスを足します。" />
        </p>
      )}
    </section>
  );
}
