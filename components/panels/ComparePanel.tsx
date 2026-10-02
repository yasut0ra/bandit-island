"use client";

import { useState } from "react";
import { ALGORITHM_IDS, randomSeed, type AlgorithmId, type BanditEnvironment } from "@/lib/bandits/index.ts";
import { runExperiment, type ExperimentResult } from "@/lib/bandits/experiment.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { formatPercent, type IslandMode } from "@/lib/island";
import { AlgoAvatar, Ribbon, ToggleChip } from "../ui";
import { LineChart } from "./Charts";

/** Player colours: A = sky, B = pink. */
const SIDE = [
  { color: "var(--sky)", label: "1P" },
  { color: "var(--pink)", label: "2P" },
] as const;
const TURN_OPTIONS = [500, 1000, 2000];
const RUNS = 100;

interface Contender {
  algorithm: AlgorithmId;
  aware: boolean;
}

const nameOf = (p: Contender, weather: boolean) =>
  weather ? `${ALGORITHM_INFO[p.algorithm].name}（天気を${p.aware ? "見る" : "見ない"}）` : ALGORITHM_INFO[p.algorithm].name;

function Fighter({
  side,
  value,
  onChange,
  weather,
  result,
  winner,
}: {
  side: 0 | 1;
  value: Contender;
  onChange: (p: Contender) => void;
  weather: boolean;
  result?: ExperimentResult;
  winner: boolean;
}) {
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
        <AlgoAvatar id={value.algorithm} size={72} />
      </div>
      <div className="f-num mt-2 text-[22px] text-ink">{ALGORITHM_INFO[value.algorithm].name}</div>
      <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={`${label} のキャラクター`}>
        {ALGORITHM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === value.algorithm}
            aria-label={ALGORITHM_INFO[id].name}
            onClick={() => onChange({ ...value, algorithm: id })}
            className={`rounded-xl border-[2.5px] p-0.5 transition-transform hover:-translate-y-0.5 ${
              id === value.algorithm ? "border-line bg-sun" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <AlgoAvatar id={id} size={28} />
          </button>
        ))}
      </div>
      {weather && (
        <div className="mt-3">
          <ToggleChip checked={value.aware} onChange={(aware) => onChange({ ...value, aware })}>
            天気を見る
          </ToggleChip>
        </div>
      )}
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
export function ComparePanel({ env, mode, epsilon }: { env: BanditEnvironment; mode: IslandMode; epsilon: number }) {
  const weather = mode === "weather";
  // On the weather island the natural duel is "same explorer, with vs without the weather".
  const [a, setA] = useState<Contender>({ algorithm: weather ? "thompson" : "epsilonGreedy", aware: !weather });
  const [b, setB] = useState<Contender>({ algorithm: "thompson", aware: true });
  const [turns, setTurns] = useState(weather ? 2000 : 1000);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ a: Contender; b: Contender; r: [ExperimentResult, ExperimentResult] } | null>(null);

  const run = () => {
    setRunning(true);
    // Let the button state paint before the (short) synchronous computation.
    setTimeout(() => {
      const seed = randomSeed();
      const common = { env, turns, runs: RUNS, epsilon, seed };
      setResults({
        a,
        b,
        r: [
          runExperiment({ ...common, algorithm: a.algorithm, contextAware: a.aware }),
          runExperiment({ ...common, algorithm: b.algorithm, contextAware: b.aware }),
        ],
      });
      setRunning(false);
    }, 30);
  };

  // Results belong to the pair that was run; picking someone new hides stale numbers.
  const same = (x: Contender, y: Contender) => x.algorithm === y.algorithm && x.aware === y.aware;
  const shown = results && same(results.a, a) && same(results.b, b) ? results.r : null;
  const picks = [a, b] as const;
  const winner =
    shown && Math.abs(shown[0].meanTotalRegret - shown[1].meanTotalRegret) > 1
      ? shown[0].meanTotalRegret < shown[1].meanTotalRegret
        ? 0
        : 1
      : null;

  return (
    <section>
      <Ribbon
        color="var(--pink)"
        sub={
          weather
            ? `Compare Mode：天気の島で2人を${RUNS}回ずつ探検させます。おすすめは「同じキャラで、天気を見る vs 見ない」！`
            : `Compare Mode：この島で2人を${RUNS}回ずつ探検させて、平均の成績をくらべます。`
        }
      >
        VS バトル
      </Ribbon>

      <div className="mt-8 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
        <Fighter side={0} value={a} onChange={setA} weather={weather} result={shown?.[0]} winner={winner === 0} />
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
        <Fighter side={1} value={b} onChange={setB} weather={weather} result={shown?.[1]} winner={winner === 1} />
      </div>

      {shown && (
        <div className="panel mt-6 p-4 sm:p-6">
          <LineChart
            title="平均の累積後悔（低いほどかしこい）"
            turns={shown[0].turnsAxis}
            series={shown.map((r, i) => ({
              id: `${i}-${r.algorithm}`,
              label: `${SIDE[i].label} ${nameOf(picks[i], weather)}`,
              color: SIDE[i].color,
              values: r.regretCurve,
            }))}
            height={200}
          />
          <p className="mt-3 text-[13.5px] leading-relaxed font-bold text-ink-2">
            {winner === null
              ? "ほぼ互角！ 島を変えて、もう一度どうぞ。"
              : `この島では ${nameOf(picks[winner], weather)} の勝ち！ 後悔が少なく、早く本命にたどり着きました。`}
            {weather && picks[0].aware !== picks[1].aware && " 天気を見ないと、どんなにかしこくても「平均して一番の箱」までしか届きません。"}
            「終盤の正解率」は、最後の1割のターンで一番の箱を選んだ割合です。
          </p>
        </div>
      )}
    </section>
  );
}
