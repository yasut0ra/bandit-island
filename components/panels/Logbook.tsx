"use client";

import type { AlgorithmId } from "@/lib/bandits/types";
import { CHESTS, formatPercent } from "@/lib/island";
import { Heading, Note } from "../ui";
import { ChoiceTimeline, HistoryCharts } from "./Charts";

interface LogbookProps {
  turn: number;
  totalReward: number;
  cumulativeRegret: number;
  estimatedBest: number | null;
  recentOptimalRate: number | null;
  choices: number[];
  cumReward: number[];
  cumRegret: number[];
  algorithms: AlgorithmId[];
  probs: readonly number[];
  dark: boolean;
}

function Figure({ label, value, note }: { label: React.ReactNode; value: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5">
      <dt className="flex items-center gap-1.5 text-[14px] text-ink-2">
        {label}
        {note && <Note text={note} />}
      </dt>
      <dd className="t-num text-[22px] leading-none text-ink">{value}</dd>
    </div>
  );
}

/** The secondary layer: numbers and charts, deliberately quieter than the island. */
export function Logbook(props: LogbookProps) {
  const { turn, totalReward, cumulativeRegret, estimatedBest, recentOptimalRate } = props;

  return (
    <section className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
      <div>
        <Heading kicker="i.">航海日誌</Heading>
        <p className="mt-3 text-[15px] leading-[1.9] text-ink-2">
          はじめはいろいろな箱を試すので、帯の色がまざります。良い箱が分かってくると、色がそろい、後悔の線が寝ていきます。
        </p>
        <dl className="mt-5">
          <Figure label="ターン数" value={turn.toLocaleString()} />
          <Figure label="累積報酬" value={totalReward.toLocaleString()} />
          <Figure label="平均報酬" value={turn === 0 ? "—" : (totalReward / turn).toFixed(3)} />
          <Figure
            label="累積後悔"
            value={cumulativeRegret.toFixed(1)}
            note="Cumulative Regret。最初から一番当たりやすい箱だけを開けていた場合との、期待報酬の差の合計。探索にかかったコストです。"
          />
          <Figure label="いまの本命" value={estimatedBest === null ? "—" : <span className="font-sans text-[17px] font-bold">{CHESTS[estimatedBest].name}</span>} />
          {recentOptimalRate !== null && (
            <Figure
              label="直近100ターンの正解率"
              value={formatPercent(recentOptimalRate)}
              note="直近100ターンのうち、本当に一番当たりやすい箱を選んだ割合。"
            />
          )}
        </dl>
      </div>

      <div className="space-y-10 lg:pt-2">
        <ChoiceTimeline choices={props.choices} dark={props.dark} />
        <HistoryCharts cumReward={props.cumReward} cumRegret={props.cumRegret} algorithms={props.algorithms} probs={props.probs} />
      </div>
    </section>
  );
}
