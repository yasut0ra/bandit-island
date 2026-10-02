"use client";

import { useState } from "react";
import { ALGORITHM_IDS, randomSeed, type AlgorithmId } from "@/lib/bandits/index.ts";
import { runExperiment, type ExperimentResult } from "@/lib/bandits/experiment.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { formatPercent } from "@/lib/island";
import { AlgoAvatar, Ribbon } from "../ui";
import { LineChart } from "./Charts";

/** Player colours: A = sky, B = pink. */
const SIDE = [
  { color: "var(--sky)", label: "1P" },
  { color: "var(--pink)", label: "2P" },
] as const;
const TURN_OPTIONS = [500, 1000, 2000];
const RUNS = 100;

function Fighter({ side, value, onChange, result, winner }: { side: 0 | 1; value: AlgorithmId; onChange: (id: AlgorithmId) => void; result?: ExperimentResult; winner: boolean }) {
  const { color, label } = SIDE[side];
  return (
    <div className={`panel relative flex flex-col items-center px-4 pt-6 pb-4 text-center ${winner ? "ring-4 ring-sun" : ""}`}>
      <span
        className="f-num absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-line px-3 text-[16px] text-white shadow-[0_3px_0_var(--drop)]"
        style={{ background: color, textShadow: "0 2px 0 rgba(43,44,99,.3)" }}
      >
        {label}
      </span>
      {winner && <span className="badge badge--exploit absolute top-3 right-3">👑 WIN</span>}
      <div className="rounded-3xl border-[3px] border-line bg-panel-2 p-2">
        <AlgoAvatar id={value} size={72} />
      </div>
      <div className="f-num mt-2 text-[22px] text-ink">{ALGORITHM_INFO[value].name}</div>
      <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={`${label} のキャラクター`}>
        {ALGORITHM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === value}
            aria-label={ALGORITHM_INFO[id].name}
            onClick={() => onChange(id)}
            className={`rounded-xl border-[2.5px] p-0.5 transition-transform hover:-translate-y-0.5 ${
              id === value ? "border-line bg-sun" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <AlgoAvatar id={id} size={28} />
          </button>
        ))}
      </div>
      {result && (
        <dl className="mt-4 grid w-full grid-cols-3 gap-1.5 text-[10.5px] font-extrabold text-ink-2">
          <div className="panel-soft py-1.5">
            <dt>合計報酬</dt>
            <dd className="f-num text-[19px] text-ink">{result.meanTotalReward.toFixed(0)}</dd>
          </div>
          <div className="panel-soft py-1.5">
            <dt>累積後悔</dt>
            <dd className="f-num text-[19px] text-ink">{result.meanTotalRegret.toFixed(1)}</dd>
          </div>
          <div className="panel-soft py-1.5">
            <dt>終盤の正解率</dt>
            <dd className="f-num text-[19px] text-ink">{formatPercent(result.lateOptimalRate)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** Compare Mode: headless Monte-Carlo runs of two algorithms on the current island. */
export function ComparePanel({ probs, epsilon }: { probs: readonly number[]; epsilon: number }) {
  const [a, setA] = useState<AlgorithmId>("epsilonGreedy");
  const [b, setB] = useState<AlgorithmId>("thompson");
  const [turns, setTurns] = useState(1000);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<[ExperimentResult, ExperimentResult] | null>(null);

  const run = () => {
    setRunning(true);
    // Let the button state paint before the (short) synchronous computation.
    setTimeout(() => {
      const seed = randomSeed();
      const common = { probs, turns, runs: RUNS, epsilon, seed };
      setResults([runExperiment({ ...common, algorithm: a }), runExperiment({ ...common, algorithm: b })]);
      setRunning(false);
    }, 30);
  };

  // Results belong to the pair that was run; picking someone new hides stale numbers.
  const shown = results && results[0].algorithm === a && results[1].algorithm === b ? results : null;
  const winner =
    shown && Math.abs(shown[0].meanTotalRegret - shown[1].meanTotalRegret) > 1
      ? shown[0].meanTotalRegret < shown[1].meanTotalRegret
        ? 0
        : 1
      : null;

  return (
    <section>
      <Ribbon color="var(--pink)" sub={`Compare Mode：この島で2人を${RUNS}回ずつ探検させて、平均の成績をくらべます。`}>
        VS バトル
      </Ribbon>

      <div className="mt-8 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
        <Fighter side={0} value={a} onChange={setA} result={shown?.[0]} winner={winner === 0} />
        <div className="flex flex-col items-center gap-3">
          <div className="f-num flex h-16 w-16 rotate-[-8deg] items-center justify-center rounded-full border-[3px] border-line bg-sun text-[30px] text-white shadow-[0_4px_0_var(--drop)] [-webkit-text-stroke:5px_#2b2c63] [paint-order:stroke_fill]">
            VS
          </div>
          <div className="seg f-num text-[14px]" role="radiogroup" aria-label="ターン数">
            {TURN_OPTIONS.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={t === turns} onClick={() => setTurns(t)}>
                {t.toLocaleString()}
              </button>
            ))}
          </div>
          <span className="on-bg-text text-[12px] font-extrabold">ターンずつ</span>
          <button type="button" onClick={run} disabled={running} className="candy px-7 py-2.5 text-[16px]">
            {running ? "バトル中…" : "バトル開始！"}
          </button>
        </div>
        <Fighter side={1} value={b} onChange={setB} result={shown?.[1]} winner={winner === 1} />
      </div>

      {shown && (
        <div className="panel mt-6 p-4 sm:p-6">
          <LineChart
            title="平均の累積後悔（低いほどかしこい）"
            turns={shown[0].turnsAxis}
            series={shown.map((r, i) => ({
              id: `${i}-${r.algorithm}`,
              label: `${SIDE[i].label} ${ALGORITHM_INFO[r.algorithm].name}`,
              color: SIDE[i].color,
              values: r.regretCurve,
            }))}
            height={200}
          />
          <p className="mt-3 text-[13.5px] leading-relaxed font-bold text-ink-2">
            {winner === null
              ? "ほぼ互角！ 島を変えて、もう一度どうぞ。"
              : `この島では ${ALGORITHM_INFO[shown[winner].algorithm].name} の勝ち！ 後悔が少なく、早く本命にたどり着きました。`}
            「終盤の正解率」は、最後の1割のターンで一番の箱を選んだ割合です。
          </p>
        </div>
      )}
    </section>
  );
}
