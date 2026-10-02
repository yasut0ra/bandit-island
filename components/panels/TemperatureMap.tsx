"use client";

import { useState } from "react";
import type { AlgorithmId } from "@/lib/bandits/types";
import { ALGORITHM_INFO } from "@/lib/explain";
import { CHESTS, TEMPERATURE_BANDS, TEMPERATURE_LEVELS, chestColor, formatPercent, temperatureBand, temperatureOf } from "@/lib/island";
import { Ribbon, ThermoGlyph, ToggleChip } from "../ui";
import { useElementWidth } from "./Charts";

interface TemperatureMapProps {
  /** Pico's estimate for each chest at each temperature: curves[chest][level]. */
  curves: (number | null)[][];
  /** True success probability: truth[level][chest]. */
  truth: number[][];
  currentLevel: number;
  algorithm: AlgorithmId;
  aware: boolean;
  dark: boolean;
}

const PAD = { top: 26, right: 16, bottom: 30, left: 44 };

function describe(algorithm: AlgorithmId, aware: boolean): string {
  if (!aware) return "気温を見ていないので、どの気温でも同じ見積もり（水平な線）になります。";
  if (algorithm === "linucb") return "気温と当たりやすさの関係を直線で学ぶので、まだあまり来ていない気温でも予測できます。";
  return "「さむい・ふつう・あつい」の区切りごとに数えているので、見積もりは階段の形。区切りの中の違いは見えません。";
}

/**
 * "What Pico has in mind": estimated success probability against temperature,
 * one line per chest, next to the hidden truth when the answer is revealed.
 */
export function TemperatureMap({ curves, truth, currentLevel, algorithm, aware, dark }: TemperatureMapProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [showTruth, setShowTruth] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const height = 300;
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (level: number) => PAD.left + (level / (TEMPERATURE_LEVELS - 1)) * innerW;
  const y = (p: number) => PAD.top + (1 - p) * innerH;

  // Polyline through the known points, broken where Pico has no estimate yet.
  const path = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, k) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const bandEdges = TEMPERATURE_BANDS.map((_, b) => {
    const levels = Array.from({ length: TEMPERATURE_LEVELS }, (_, k) => k).filter((k) => temperatureBand(k) === b);
    return { from: levels[0], to: levels[levels.length - 1] };
  });

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Ribbon color="var(--grape)" sub={`${ALGORITHM_INFO[algorithm].name}：${describe(algorithm, aware)}`}>
          ピコの頭の中
        </Ribbon>
        <ToggleChip checked={showTruth} onChange={setShowTruth}>
          本当の線を見る
        </ToggleChip>
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="f-pop text-[15px] text-ink">気温と当たりやすさ</h3>
          <div className="flex flex-wrap gap-2.5 text-[12px] font-bold text-ink-2">
            {CHESTS.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onPointerEnter={() => setFocus(i)}
                onPointerLeave={() => setFocus(null)}
                onFocus={() => setFocus(i)}
                onBlur={() => setFocus(null)}
                className="flex items-center gap-1"
              >
                <span className="inline-block h-3 w-3 rounded-full border-2 border-line" style={{ background: chestColor(i, dark) }} />
                {c.name}
              </button>
            ))}
            {showTruth && <span className="text-ink-3">点線＝本当の線</span>}
          </div>
        </div>
        <div ref={ref}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label="気温ごとの当たりやすさの見積もり" className="block">
              {/* temperature bands */}
              {bandEdges.map((band, b) => {
                const x0 = b === 0 ? PAD.left : (x(bandEdges[b - 1].to) + x(band.from)) / 2;
                const x1 = b === bandEdges.length - 1 ? PAD.left + innerW : (x(band.to) + x(bandEdges[b + 1].from)) / 2;
                return (
                  <g key={b}>
                    <rect x={x0} y={PAD.top} width={x1 - x0} height={innerH} fill={TEMPERATURE_BANDS[b].color} opacity={0.12} />
                    <text x={(x0 + x1) / 2} y={PAD.top - 9} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink-2)">
                      {TEMPERATURE_BANDS[b].name}
                    </text>
                  </g>
                );
              })}
              {[0, 0.5, 1].map((p) => (
                <g key={p}>
                  <line x1={PAD.left} x2={PAD.left + innerW} y1={y(p)} y2={y(p)} stroke="var(--panel-3)" />
                  <text x={PAD.left - 8} y={y(p) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
                    {formatPercent(p)}
                  </text>
                </g>
              ))}
              {[0, 5, 10, 15].map((k) => (
                <text key={k} x={x(k)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
                  {temperatureOf(k)}℃
                </text>
              ))}

              {/* truth (dashed) */}
              {showTruth &&
                CHESTS.map((_, i) => (
                  <path
                    key={`t${i}`}
                    d={path(truth.map((row) => row[i]))}
                    fill="none"
                    stroke={chestColor(i, dark)}
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    opacity={focus === null || focus === i ? 0.75 : 0.15}
                  />
                ))}

              {/* Pico's estimates */}
              {curves.map((values, i) => (
                <g key={`e${i}`} opacity={focus === null || focus === i ? 1 : 0.18}>
                  <path d={path(values)} fill="none" stroke="var(--line)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
                  <path d={path(values)} fill="none" stroke={chestColor(i, dark)} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                </g>
              ))}

              {/* today's temperature */}
              <line x1={x(currentLevel)} x2={x(currentLevel)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--line)" strokeWidth="2" strokeDasharray="3 4" />
              {curves.map((values, i) => {
                const v = values[currentLevel];
                return v === null ? null : (
                  <circle key={`c${i}`} cx={x(currentLevel)} cy={y(v)} r="5.5" fill={chestColor(i, dark)} stroke="var(--line)" strokeWidth="2.5" opacity={focus === null || focus === i ? 1 : 0.2} />
                );
              })}
            </svg>
          )}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold text-ink-2">
          <ThermoGlyph value={currentLevel / (TEMPERATURE_LEVELS - 1)} size={18} />
          点線の縦線が今日の気温（{temperatureOf(currentLevel)}℃）。ここで一番高い線の宝箱が、ピコの本命です。
        </p>
      </div>
    </section>
  );
}
