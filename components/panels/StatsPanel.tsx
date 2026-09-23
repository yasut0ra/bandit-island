"use client";

import type { AlgorithmId } from "@/lib/bandits/types";
import { ALGORITHM_INFO } from "@/lib/explain";
import { CHESTS, formatPercent } from "@/lib/island";
import { Card, InfoTip, Meter, SectionTitle } from "../ui";

interface StatsPanelProps {
  algorithm: AlgorithmId;
  turn: number;
  totalReward: number;
  cumulativeRegret: number;
  estimatedBest: number | null;
  /** Share of the last 100 turns spent on the truly best chest. */
  recentOptimalRate: number | null;
}

function Stat({ label, value, sub, tip, accent }: { label: string; value: React.ReactNode; sub?: string; tip?: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-panel-soft/80 p-3 ring-1 ring-line/70">
      <div className="flex items-center gap-1 text-[11px] font-semibold text-muted">
        {label}
        {tip && <InfoTip text={tip} />}
      </div>
      <div className="mt-0.5 font-display text-2xl leading-tight font-semibold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

export function StatsPanel(props: StatsPanelProps) {
  const { turn, totalReward, cumulativeRegret, estimatedBest, recentOptimalRate } = props;
  const info = ALGORITHM_INFO[props.algorithm];
  const best = estimatedBest === null ? null : CHESTS[estimatedBest];

  return (
    <Card>
      <SectionTitle icon="📊">冒険の記録</SectionTitle>
      <div className="mb-2 flex items-center justify-between rounded-2xl bg-panel-soft/80 px-3 py-2 ring-1 ring-line/70">
        <span className="text-[11px] font-semibold text-muted">現在のアルゴリズム</span>
        <span className="font-display text-base font-semibold">
          {info.emoji} {info.name}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="ターン数" value={turn.toLocaleString()} />
        <Stat
          label="累積報酬"
          value={<>🪙 {totalReward.toLocaleString()}</>}
          sub="当たりの合計回数"
          accent="var(--reward)"
        />
        <Stat
          label="平均報酬"
          value={turn === 0 ? "—" : (totalReward / turn).toFixed(3)}
          sub="1ターンあたりの当たり"
        />
        <Stat
          label="累積後悔"
          value={cumulativeRegret.toFixed(1)}
          sub="Cumulative Regret · 小さいほど良い"
          tip="もし最初から一番当たりやすい箱だけを開けていたら得られたはずの期待報酬と、実際に選んだ箱の期待報酬の差の合計です。探索のコストとも言えます。"
          accent="var(--regret)"
        />
      </div>
      <div className="mt-2 rounded-2xl bg-panel-soft/80 p-3 ring-1 ring-line/70">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
          <span className="flex items-center gap-1">
            現在もっとも良いと推定している宝箱
            <InfoTip text="これまでの実績（当たり回数 ÷ 選択回数）が一番高い宝箱です。まだ試した回数が少ないうちは、運で入れ替わることもあります。" />
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-base font-bold">
          {best ? (
            <>
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: best.color }} />
              {best.name} <span aria-hidden>👑</span>
            </>
          ) : (
            <span className="text-sm font-medium text-muted">まだ分かりません</span>
          )}
        </div>
        {recentOptimalRate !== null && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[10px] text-muted">
              <span>直近100ターンで本当に一番良い箱を選んだ割合</span>
              <span className="font-bold text-ink tabular-nums">{formatPercent(recentOptimalRate)}</span>
            </div>
            <Meter value={recentOptimalRate} color="var(--exploit)" />
          </div>
        )}
      </div>
    </Card>
  );
}
