"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AlgorithmId } from "@/lib/bandits/types";
import { ALGORITHM_INFO } from "@/lib/explain";
import { CHESTS, chestColor, formatPercent } from "@/lib/island";

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  /** values[k] is the value after turn turns[k]. */
  values: number[];
  dashed?: boolean;
}

interface LineChartProps {
  title: string;
  series: LineSeries[];
  turns: number[];
  height?: number;
  markers?: { turn: number; label: string }[];
  format?: (v: number) => string;
  emptyText?: string;
}

const PAD = { top: 12, right: 12, bottom: 22, left: 40 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / exp;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return nice * exp;
}

/** Small single-axis line chart with a hover crosshair + tooltip. */
export function LineChart({ title, series, turns, height = 150, markers = [], format = (v) => v.toFixed(1), emptyText }: LineChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = turns.length;
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const xMax = n > 0 ? turns[n - 1] : 1;
  const yMax = niceMax(Math.max(1e-9, ...series.flatMap((s) => s.values)));
  const x = (turn: number) => PAD.left + (turn / Math.max(1, xMax)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const paths = series.map((s) => {
    if (n === 0) return "";
    let d = `M${x(0)},${y(0)}`;
    s.values.forEach((v, k) => (d += `L${x(turns[k]).toFixed(1)},${y(v).toFixed(1)}`));
    return d;
  });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const turn = ((e.clientX - rect.left - PAD.left) / innerW) * xMax;
    let best = 0;
    for (let k = 1; k < n; k++) if (Math.abs(turns[k] - turn) < Math.abs(turns[best] - turn)) best = k;
    setHover(best);
  };

  const ticks = [0, 0.5, 1].map((f) => f * yMax);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="f-pop text-[15px] text-ink">{title}</h3>
        {series.length > 1 && (
          <div className="flex flex-wrap gap-3 text-[12px] font-bold text-ink-2">
            {series.map((s) => (
              <span key={s.id} className="flex items-center gap-1">
                <svg width="16" height="6" aria-hidden>
                  <line x1="0" y1="3" x2="16" y2="3" stroke={s.color} strokeWidth="3" strokeDasharray={s.dashed ? "3 3" : undefined} />
                </svg>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={title}
            className="block touch-none"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--panel-3)" strokeWidth="1" />
                <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--ink-3)">
                  {Number.isInteger(t) ? t : t.toFixed(1)}
                </text>
              </g>
            ))}
            <text x={width - PAD.right} y={height - 5} textAnchor="end" fontSize="10" fill="var(--ink-3)">
              {xMax.toLocaleString()} ターン
            </text>
            <text x={PAD.left} y={height - 5} fontSize="10" fill="var(--ink-3)">
              0
            </text>
            {markers.map((m, i) => (
              <g key={i}>
                <line x1={x(m.turn)} x2={x(m.turn)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--ink-3)" strokeDasharray="2 3" strokeWidth="1" />
                <text x={x(m.turn) + 3} y={PAD.top + 9} fontSize="9" fill="var(--ink-3)">
                  {m.label}
                </text>
              </g>
            ))}
            {paths.map((d, i) => (
              <path
                key={series[i].id}
                d={d}
                fill="none"
                stroke={series[i].color}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={series[i].dashed ? "4 4" : undefined}
                opacity={series[i].dashed ? 0.7 : 1}
              />
            ))}
            {hover !== null && (
              <g>
                <line x1={x(turns[hover])} x2={x(turns[hover])} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--ink-3)" strokeWidth="1" />
                {series.map((s) => (
                  <circle key={s.id} cx={x(turns[hover])} cy={y(s.values[hover])} r="5" fill={s.color} stroke="var(--line)" strokeWidth="2.5" />
                ))}
              </g>
            )}
            {n === 0 && emptyText && (
              <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
                {emptyText}
              </text>
            )}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-xl bg-panel px-2.5 py-1.5 text-[12px] shadow-lg border-2 border-line"
            style={{
              left: Math.min(Math.max(0, x(turns[hover]) + 8), width - 150),
            }}
          >
            <div className="font-bold text-ink">ターン {turns[hover].toLocaleString()}</div>
            {series.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-ink-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}: <span className="font-semibold text-ink tabular-nums">{format(s.values[hover])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MAX_POINTS = 240;

/** Downsamples a per-turn history into at most MAX_POINTS (turn, index) pairs. */
export function sampleTurns(length: number): number[] {
  if (length <= MAX_POINTS) return Array.from({ length }, (_, i) => i + 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => Math.round(((i + 1) / MAX_POINTS) * length));
}

export interface ChartReferences {
  /** Expected reward per turn of an oracle that always picks the best chest for the weather. */
  idealRate: number;
  /** Expected regret per turn of Random. */
  randomRegretRate: number;
  /** Expected regret per turn of the best context-blind policy (contextual islands only). */
  blindRegretRate: number | null;
  /** Ceiling of a tabular learner that buckets the context (temperature island only). */
  groupRegretRate: number | null;
  /** Word for the context, e.g. 天気 / 気温. */
  contextWord: string;
}

interface HistoryChartsProps {
  cumReward: number[];
  cumRegret: number[];
  algorithms: AlgorithmId[];
  /** Weather-awareness per turn on the weather island (null on the classic island). */
  aware: boolean[] | null;
  references: ChartReferences;
}

export function HistoryCharts({ cumReward, cumRegret, algorithms, aware, references }: HistoryChartsProps) {
  const length = cumReward.length;
  const turns = useMemo(() => sampleTurns(length), [length]);

  // Mark every turn where the explorer changed or started/stopped reading the weather.
  const markers = useMemo(() => {
    const list: { turn: number; label: string }[] = [];
    for (let i = 1; i < algorithms.length; i++) {
      const parts: string[] = [];
      if (algorithms[i] !== algorithms[i - 1]) parts.push(ALGORITHM_INFO[algorithms[i]].name);
      if (aware && aware[i] !== aware[i - 1]) parts.push(aware[i] ? `${references.contextWord}を見る` : `${references.contextWord}を見ない`);
      if (parts.length > 0) list.push({ turn: i, label: `→ ${parts.join("・")}` });
    }
    return list;
  }, [algorithms, aware, references.contextWord]);

  const rewardSeries: LineSeries[] = [
    { id: "reward", label: "ピコ", color: "var(--reward)", values: turns.map((t) => cumReward[t - 1]) },
    { id: "ideal", label: "いつも最良の箱なら", color: "var(--ink-3)", values: turns.map((t) => t * references.idealRate), dashed: true },
  ];
  const regretSeries: LineSeries[] = [
    { id: "regret", label: "ピコ", color: "var(--regret)", values: turns.map((t) => cumRegret[t - 1]) },
    { id: "random", label: "Random なら", color: "var(--ink-3)", values: turns.map((t) => t * references.randomRegretRate), dashed: true },
  ];
  if (references.blindRegretRate !== null) {
    const rate = references.blindRegretRate;
    regretSeries.push({ id: "blind", label: `${references.contextWord}を見ない限界`, color: "var(--sky)", values: turns.map((t) => t * rate), dashed: true });
  }
  if (references.groupRegretRate !== null) {
    const rate = references.groupRegretRate;
    regretSeries.push({ id: "group", label: "3段階に区切った限界", color: "var(--mint)", values: turns.map((t) => t * rate), dashed: true });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <LineChart
        title="累積報酬"
        series={rewardSeries}
        turns={turns}
        markers={markers}
        format={(v) => v.toFixed(1)}
        emptyText="再生するとグラフが伸びていきます"
      />
      <LineChart
        title="累積後悔"
        series={regretSeries}
        turns={turns}
        markers={markers}
        format={(v) => v.toFixed(1)}
        emptyText="後悔が増えなくなったら、学習できた証拠"
      />
    </div>
  );
}

/** One stacked strip: each bar is a slice of time, coloured by which chests were chosen. */
function TimelineStrip({
  choices,
  height,
  dark,
  emptyText,
  rangeLabel,
}: {
  choices: number[];
  height: number;
  dark: boolean;
  emptyText: string;
  rangeLabel: (from: number, to: number) => string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = choices.length;
  const maxBins = Math.max(1, Math.floor(width / 9));
  const binCount = Math.min(n, maxBins, 80);

  const bins = useMemo(() => {
    const out: { from: number; to: number; counts: number[] }[] = [];
    for (let b = 0; b < binCount; b++) {
      const from = Math.floor((b / binCount) * n);
      const to = Math.floor(((b + 1) / binCount) * n);
      const counts = CHESTS.map(() => 0);
      for (let k = from; k < to; k++) counts[choices[k]] += 1;
      out.push({ from, to, counts });
    }
    return out;
  }, [choices, n, binCount]);

  const gap = binCount > 40 ? 1 : 2;
  const barW = binCount > 0 ? width / binCount : 0;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="選んだ宝箱の割合の時間変化" className="block" onPointerLeave={() => setHover(null)}>
          {n === 0 && (
            <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
              {emptyText}
            </text>
          )}
          {bins.map((bin, b) => {
            const total = bin.to - bin.from || 1;
            let acc = 0;
            return (
              <g key={b} onPointerEnter={() => setHover(b)} opacity={hover === null || hover === b ? 1 : 0.55}>
                <rect x={b * barW} y={0} width={barW} height={height} fill="transparent" />
                {bin.counts.map((count, i) => {
                  if (count === 0) return null;
                  const h = (count / total) * height;
                  const rect = (
                    <rect
                      key={i}
                      x={b * barW + gap / 2}
                      y={acc}
                      width={Math.max(1, barW - gap)}
                      height={Math.max(0, h - 1)}
                      fill={chestColor(i, dark)}
                      rx={barW > 6 ? 3 : 0}
                    />
                  );
                  acc += h;
                  return rect;
                })}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && bins[hover] && (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-xl border-2 border-line bg-panel px-2.5 py-1.5 text-[12px] shadow-lg"
          style={{ left: Math.min(Math.max(0, hover * barW - 40), width - 160) }}
        >
          <div className="font-bold text-ink">{rangeLabel(bins[hover].from + 1, bins[hover].to)}</div>
          {bins[hover].counts.map((count, i) =>
            count > 0 ? (
              <div key={i} className="flex items-center gap-1.5 text-ink-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: chestColor(i, dark) }} />
                {CHESTS[i].name}: <span className="font-semibold text-ink">{formatPercent(count / (bins[hover].to - bins[hover].from))}</span>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Which chest was chosen over time. Mixed colours on the left (exploration)
 * turning into one dominant colour on the right (exploitation) is the core
 * picture of a bandit learning. On the weather island there is one strip per
 * weather, so each can settle on its own best chest.
 */
export interface TimelineRow {
  key: string;
  label: ReactNode;
  /** Chests chosen in this situation, in order. */
  choices: number[];
}

export function ChoiceTimeline({ choices, rows, dark }: { choices: number[]; rows: TimelineRow[] | null; dark: boolean }) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="f-pop text-[15px] text-ink">{rows ? "状況ごとに、ピコが選んだ宝箱" : "ピコが選んだ宝箱の移り変わり"}</h3>
        <div className="flex flex-wrap gap-2.5 text-[12px] font-bold text-ink-2">
          {CHESTS.map((c, i) => (
            <span key={c.name} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-line" style={{ background: chestColor(i, dark) }} />
              {c.name}
            </span>
          ))}
        </div>
      </div>
      {rows ? (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <span className="flex w-20 shrink-0 items-center gap-1 text-[12px] font-extrabold text-ink-2">{row.label}</span>
              <TimelineStrip
                choices={row.choices}
                height={30}
                dark={dark}
                emptyText="まだこの状況の日がありません"
                rangeLabel={(from, to) => `この状況で ${from}–${to}回目`}
              />
            </div>
          ))}
        </div>
      ) : (
        <TimelineStrip
          choices={choices}
          height={76}
          dark={dark}
          emptyText="はじめは色が混ざり、学ぶほど1色に近づいていきます"
          rangeLabel={(from, to) => `ターン ${from}–${to}`}
        />
      )}
      <div className="mt-1 flex justify-between text-[12px] font-bold text-ink-2">
        <span>← はじめ</span>
        <span>最近 →</span>
      </div>
    </div>
  );
}
