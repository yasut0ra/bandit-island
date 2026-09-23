"use client";

import { useState } from "react";
import { ALGORITHM_IDS, randomSeed, type AlgorithmId } from "@/lib/bandits/index.ts";
import { runExperiment, type ExperimentResult } from "@/lib/bandits/experiment.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { formatPercent } from "@/lib/island";
import { Card } from "../ui";
import { LineChart } from "./Charts";

const SIDE_COLORS = ["#2a78d6", "#eb6834"] as const;
const TURN_OPTIONS = [500, 1000, 2000];
const RUNS = 100;

function Picker({ value, onChange, color, label }: { value: AlgorithmId; onChange: (id: AlgorithmId) => void; color: string; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold" style={{ color }}>
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALGORITHM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={id === value}
            className={`rounded-full border px-3 py-1.5 font-display text-sm font-semibold transition-colors ${
              id === value ? "text-white" : "border-line bg-panel-solid/60 text-muted hover:text-ink"
            }`}
            style={id === value ? { background: color, borderColor: color } : undefined}
          >
            {ALGORITHM_INFO[id].emoji} {ALGORITHM_INFO[id].name}
          </button>
        ))}
      </div>
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
    // Let the spinner paint before the (short) synchronous computation.
    setTimeout(() => {
      const seed = randomSeed();
      const common = { probs, turns, runs: RUNS, epsilon, seed };
      setResults([runExperiment({ ...common, algorithm: a }), runExperiment({ ...common, algorithm: b })]);
      setRunning(false);
    }, 30);
  };

  const winner =
    results && Math.abs(results[0].meanTotalRegret - results[1].meanTotalRegret) > 1
      ? results[0].meanTotalRegret < results[1].meanTotalRegret
        ? 0
        : 1
      : null;

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">⚔️ アルゴリズム対決</h2>
          <p className="mt-1 text-sm text-muted">
            Compare Mode：今の島（同じ当たり確率）で2つのアルゴリズムをそれぞれ {RUNS} 回ずつ遊ばせ、平均を比べます。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Picker value={a} onChange={setA} color={SIDE_COLORS[0]} label="チャレンジャー A" />
        <Picker value={b} onChange={setB} color={SIDE_COLORS[1]} label="チャレンジャー B" />
        <div className="flex items-center gap-2">
          <select
            value={turns}
            onChange={(e) => setTurns(Number(e.target.value))}
            aria-label="ターン数"
            className="rounded-2xl border border-line bg-panel-solid px-3 py-2 text-sm"
          >
            {TURN_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.toLocaleString()} ターン
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-violet-500/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {running ? "計算中…" : "対決スタート！"}
          </button>
        </div>
      </div>

      {results ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <LineChart
            title="平均の累積後悔（低いほど賢い）"
            turns={results[0].turnsAxis}
            series={results.map((r, i) => ({
              id: `${i}-${r.algorithm}`,
              label: `${i === 0 ? "A" : "B"}: ${ALGORITHM_INFO[r.algorithm].name}`,
              color: SIDE_COLORS[i],
              values: r.regretCurve,
            }))}
            height={190}
          />
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-2xl p-3 ring-1 ${winner === i ? "bg-exploit-soft ring-exploit/40" : "bg-panel-soft ring-line"}`}
              >
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SIDE_COLORS[i] }} />
                  {i === 0 ? "A" : "B"}: {ALGORITHM_INFO[r.algorithm].name}
                  {winner === i && <span className="ml-auto text-xs">🏆 勝ち</span>}
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] text-muted">
                  <div>
                    <dt>平均累積報酬</dt>
                    <dd className="font-display text-lg font-semibold text-ink tabular-nums">{r.meanTotalReward.toFixed(0)}</dd>
                  </div>
                  <div>
                    <dt>平均累積後悔</dt>
                    <dd className="font-display text-lg font-semibold text-ink tabular-nums">{r.meanTotalRegret.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>終盤の最良箱率</dt>
                    <dd className="font-display text-lg font-semibold text-ink tabular-nums">{formatPercent(r.lateOptimalRate)}</dd>
                  </div>
                </dl>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-muted">
              {winner === null
                ? "ほぼ互角でした！ 設定や島を変えて、もう一度試してみましょう。"
                : `この島では ${ALGORITHM_INFO[results[winner].algorithm].name} の方が後悔が少なく、効率よく一番の宝箱を見つけられました。`}
              「終盤の最良箱率」は最後の10%のターンで本当に一番良い箱を選んだ割合です。
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          2つのアルゴリズムを選んで「対決スタート！」を押すと、結果のグラフが表示されます。
        </div>
      )}
    </Card>
  );
}
