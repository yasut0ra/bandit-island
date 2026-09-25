"use client";

import { useState } from "react";
import { ALGORITHM_IDS, randomSeed, type AlgorithmId } from "@/lib/bandits/index.ts";
import { runExperiment, type ExperimentResult } from "@/lib/bandits/experiment.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { formatPercent } from "@/lib/island";
import { Heading } from "../ui";
import { LineChart } from "./Charts";

/** A: plum ink, B: ochre — the two inks already used throughout the page. */
const SIDE_COLORS = ["var(--explore)", "var(--exploit)"] as const;
const TURN_OPTIONS = [500, 1000, 2000];
const RUNS = 100;

function InlineSelect<T extends string | number>({
  value,
  onChange,
  options,
  label,
  color,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  color?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        onChange((typeof value === "number" ? Number(raw) : raw) as T);
      }}
      className="t-display mx-1 cursor-pointer appearance-none border-b-2 border-dashed bg-transparent px-1 text-center text-[22px] italic focus:outline-none sm:text-[26px]"
      // Size to the chosen option (a native select would otherwise be as wide as its longest option).
      style={{
        color: color ?? "var(--ink)",
        borderColor: color ?? "var(--ink-3)",
        width: `${(options.find((o) => o.value === value)?.label.length ?? 4) * 0.56 + 0.9}em`,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-sheet text-[15px] text-ink not-italic">
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Compare Mode: headless Monte-Carlo runs of two algorithms on the current island. */
export function ComparePanel({ probs, epsilon }: { probs: readonly number[]; epsilon: number }) {
  const [a, setA] = useState<AlgorithmId>("epsilonGreedy");
  const [b, setB] = useState<AlgorithmId>("thompson");
  const [turns, setTurns] = useState(1000);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<[ExperimentResult, ExperimentResult] | null>(null);

  const algorithmOptions = ALGORITHM_IDS.map((id) => ({ value: id, label: ALGORITHM_INFO[id].name }));

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

  const winner =
    results && Math.abs(results[0].meanTotalRegret - results[1].meanTotalRegret) > 1
      ? results[0].meanTotalRegret < results[1].meanTotalRegret
        ? 0
        : 1
      : null;

  return (
    <section>
      <Heading kicker="iv.">ふたりを競わせる（Compare Mode）</Heading>

      <p className="mt-6 text-[20px] leading-[2.2] text-ink sm:text-[22px]">
        この島で
        <InlineSelect label="探検家A" value={a} onChange={setA} options={algorithmOptions} color={SIDE_COLORS[0]} />
        と
        <InlineSelect label="探検家B" value={b} onChange={setB} options={algorithmOptions} color={SIDE_COLORS[1]} />
        に、
        <InlineSelect
          label="ターン数"
          value={turns}
          onChange={setTurns}
          options={TURN_OPTIONS.map((t) => ({ value: t, label: t.toLocaleString() }))}
        />
        ターンずつ、{RUNS}回探検してもらう。
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="brass ml-3 inline-flex -translate-y-1 items-center rounded-full px-5 py-1.5 align-middle text-[15px] font-bold disabled:opacity-60"
        >
          {running ? "探検中…" : "くらべる"}
        </button>
      </p>

      {results && (
        <div className="mt-10 grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <LineChart
            title="平均の累積後悔（低いほど賢い）"
            turns={results[0].turnsAxis}
            series={results.map((r, i) => ({
              id: `${i}-${r.algorithm}`,
              label: `${i === 0 ? "A" : "B"} ${ALGORITHM_INFO[r.algorithm].name}`,
              color: SIDE_COLORS[i],
              values: r.regretCurve,
            }))}
            height={200}
          />
          <div>
            {results.map((r, i) => (
              <div key={i} className="border-b border-rule py-4 first:pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="t-display text-[20px] italic" style={{ color: SIDE_COLORS[i] }}>
                    {i === 0 ? "A" : "B"}. {ALGORITHM_INFO[r.algorithm].name}
                  </span>
                  {winner === i && <span className="stamp ml-auto text-[12px] text-exploit">勝ち</span>}
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-[12px] text-ink-2">
                  <div>
                    <dt>平均報酬の合計</dt>
                    <dd className="t-num text-[22px] text-ink">{r.meanTotalReward.toFixed(0)}</dd>
                  </div>
                  <div>
                    <dt>平均累積後悔</dt>
                    <dd className="t-num text-[22px] text-ink">{r.meanTotalRegret.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>終盤の正解率</dt>
                    <dd className="t-num text-[22px] text-ink">{formatPercent(r.lateOptimalRate)}</dd>
                  </div>
                </dl>
              </div>
            ))}
            <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
              {winner === null
                ? "ほぼ互角でした。島を変えて、もう一度どうぞ。"
                : `この島では ${ALGORITHM_INFO[results[winner].algorithm].name} のほうが後悔が少なく、早く本命にたどり着きました。`}
              「終盤の正解率」は、最後の1割のターンで一番の箱を選んだ割合です。
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
