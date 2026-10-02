"use client";

import type { AlgorithmId } from "@/lib/bandits/types";
import { CHESTS, formatPercent } from "@/lib/island";
import { Note, Ribbon } from "../ui";
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

function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: string }) {
  return (
    <div className="panel-soft px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-ink-2">
        {label}
        {note && <Note text={note} />}
      </div>
      <div className="f-num mt-0.5 text-[26px] leading-none" style={{ color: tone ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

/** The secondary layer: numbers and charts, one panel, quieter than the island. */
export function Logbook(props: LogbookProps) {
  const { turn, totalReward, cumulativeRegret, estimatedBest, recentOptimalRate } = props;

  return (
    <section>
      <Ribbon color="var(--mint)" sub="はじめはいろいろな箱を試すので帯の色がまざります。いい箱が分かると色がそろって、後悔の線がねていきます。">
        冒険のきろく
      </Ribbon>

      <div className="panel mt-5 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="ターン数" value={turn.toLocaleString()} />
          <Stat label="累積報酬" value={totalReward.toLocaleString()} />
          <Stat label="平均報酬" value={turn === 0 ? "—" : (totalReward / turn).toFixed(3)} />
          <Stat
            label="累積後悔"
            value={cumulativeRegret.toFixed(1)}
            note="Cumulative Regret。最初から一番当たりやすい箱だけを開けていた場合との、期待報酬の差の合計。探索にかかったコストです。"
          />
          <Stat label="いまの本命" value={estimatedBest === null ? "—" : <span className="f-pop text-[20px]">{CHESTS[estimatedBest].name}</span>} />
          <Stat
            label="直近100の正解率"
            value={recentOptimalRate === null ? "—" : formatPercent(recentOptimalRate)}
            note="直近100ターンのうち、本当に一番当たりやすい箱を選んだ割合。"
          />
        </div>

        <div className="mt-7 space-y-8">
          <ChoiceTimeline choices={props.choices} dark={props.dark} />
          <HistoryCharts cumReward={props.cumReward} cumRegret={props.cumRegret} algorithms={props.algorithms} probs={props.probs} />
        </div>
      </div>
    </section>
  );
}
