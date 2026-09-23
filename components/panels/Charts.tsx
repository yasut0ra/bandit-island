"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AlgorithmId } from "@/lib/bandits/types";
import { ALGORITHM_INFO } from "@/lib/explain";
import { CHESTS, chestColor, formatPercent } from "@/lib/island";

function useElementWidth<T extends HTMLElement>() {
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
        <h3 className="text-xs font-bold text-ink">{title}</h3>
        {series.length > 1 && (
          <div className="flex flex-wrap gap-3 text-[10px] text-muted">
            {series.map((s) => (
              <span key={s.id} className="flex items-center gap-1">
                <svg width="16" height="6" aria-hidden>
                  <line x1="0" y1="3" x2="16" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "3 3" : undefined} />
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
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
                <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
                  {Number.isInteger(t) ? t : t.toFixed(1)}
                </text>
              </g>
            ))}
            <text x={width - PAD.right} y={height - 5} textAnchor="end" fontSize="10" fill="var(--muted)">
              {xMax.toLocaleString()} ターン
            </text>
            <text x={PAD.left} y={height - 5} fontSize="10" fill="var(--muted)">
              0
            </text>
            {markers.map((m, i) => (
              <g key={i}>
                <line x1={x(m.turn)} x2={x(m.turn)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted)" strokeDasharray="2 3" strokeWidth="1" />
                <text x={x(m.turn) + 3} y={PAD.top + 9} fontSize="9" fill="var(--muted)">
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
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={series[i].dashed ? "4 4" : undefined}
                opacity={series[i].dashed ? 0.7 : 1}
              />
            ))}
            {hover !== null && (
              <g>
                <line x1={x(turns[hover])} x2={x(turns[hover])} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted)" strokeWidth="1" />
                {series.map((s) => (
                  <circle key={s.id} cx={x(turns[hover])} cy={y(s.values[hover])} r="4" fill={s.color} stroke="var(--panel-solid)" strokeWidth="2" />
                ))}
              </g>
            )}
            {n === 0 && emptyText && (
              <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {emptyText}
              </text>
            )}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-xl bg-panel-solid px-2.5 py-1.5 text-[11px] shadow-lg ring-1 ring-line"
            style={{
              left: Math.min(Math.max(0, x(turns[hover]) + 8), width - 150),
            }}
          >
            <div className="font-bold text-ink">ターン {turns[hover].toLocaleString()}</div>
            {series.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-muted">
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

interface HistoryChartsProps {
  cumReward: number[];
  cumRegret: number[];
  algorithms: AlgorithmId[];
  probs: readonly number[];
}

export function HistoryCharts({ cumReward, cumRegret, algorithms, probs }: HistoryChartsProps) {
  const length = cumReward.length;
  const turns = useMemo(() => sampleTurns(length), [length]);
  const best = Math.max(...probs);
  const meanP = probs.reduce((a, b) => a + b, 0) / probs.length;

  const markers = useMemo(() => {
    const list: { turn: number; label: string }[] = [];
    for (let i = 1; i < algorithms.length; i++) {
      if (algorithms[i] !== algorithms[i - 1]) list.push({ turn: i, label: `→ ${ALGORITHM_INFO[algorithms[i]].name}` });
    }
    return list;
  }, [algorithms]);

  const rewardSeries: LineSeries[] = [
    { id: "reward", label: "実際の累積報酬", color: "var(--reward)", values: turns.map((t) => cumReward[t - 1]) },
    { id: "ideal", label: "理想（常に最良の箱）", color: "var(--muted)", values: turns.map((t) => t * best), dashed: true },
  ];
  const regretSeries: LineSeries[] = [
    { id: "regret", label: "累積後悔", color: "var(--regret)", values: turns.map((t) => cumRegret[t - 1]) },
    { id: "random", label: "参考：Random の期待値", color: "var(--muted)", values: turns.map((t) => t * (best - meanP)), dashed: true },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <LineChart
        title="🪙 累積報酬（Cumulative Reward）"
        series={rewardSeries}
        turns={turns}
        markers={markers}
        format={(v) => v.toFixed(1)}
        emptyText="再生するとグラフが伸びていきます"
      />
      <LineChart
        title="😣 累積後悔（Cumulative Regret）"
        series={regretSeries}
        turns={turns}
        markers={markers}
        format={(v) => v.toFixed(1)}
        emptyText="後悔が増えなくなったら、学習できた証拠"
      />
    </div>
  );
}

/**
 * Stacked strip of which chest was chosen over time. Mixed colours on the left
 * (exploration) turning into one dominant colour on the right (exploitation)
 * is the core picture of a bandit learning.
 */
export function ChoiceTimeline({ choices, dark }: { choices: number[]; dark: boolean }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 64;
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
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">🧭 選んだ宝箱の移り変わり</h3>
        <div className="flex flex-wrap gap-2.5 text-[10px] text-muted">
          {CHESTS.map((c, i) => (
            <span key={c.name} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: chestColor(i, dark) }} />
              {c.name}
            </span>
          ))}
        </div>
      </div>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="選んだ宝箱の割合の時間変化" className="block" onPointerLeave={() => setHover(null)}>
            {n === 0 && (
              <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize="11" fill="var(--muted)">
                はじめはいろいろな色が混ざり、学習が進むと1色に近づきます
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
                        rx={barW > 6 ? 2 : 0}
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
            className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-xl bg-panel-solid px-2.5 py-1.5 text-[11px] shadow-lg ring-1 ring-line"
            style={{ left: Math.min(Math.max(0, hover * barW - 40), width - 160) }}
          >
            <div className="font-bold text-ink">
              ターン {bins[hover].from + 1}–{bins[hover].to}
            </div>
            {bins[hover].counts.map((count, i) =>
              count > 0 ? (
                <div key={i} className="flex items-center gap-1.5 text-muted">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: chestColor(i, dark) }} />
                  {CHESTS[i].name}: <span className="font-semibold text-ink">{formatPercent(count / (bins[hover].to - bins[hover].from))}</span>
                </div>
              ) : null,
            )}
          </div>
        )}
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>← はじめ</span>
          <span>最近 →</span>
        </div>
      </div>
    </div>
  );
}
