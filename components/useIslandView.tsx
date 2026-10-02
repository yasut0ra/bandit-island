"use client";

import { useMemo } from "react";
import type { BanditState } from "@/hooks/useBanditSimulation";
import {
  argmaxAll,
  beliefCurves,
  blindBestRegretRate,
  computeBeliefs,
  computeLinUcb,
  contextualView,
  groupBestRegretRate,
  isOptimalArm,
  observedArms,
  oracleRewardRate,
  pooledArms,
  randomRegretRate,
} from "@/lib/bandits/index.ts";
import { TEMPERATURE_BANDS, WEATHERS, temperatureBand, temperatureFeature, temperatureOf } from "@/lib/island";
import type { SituationRows } from "./panels/ChestLedger";
import type { ChartReferences, TimelineRow } from "./panels/Charts";
import type { Climate } from "./scene/Weather";
import { ThermoGlyph, WeatherGlyph } from "./ui";

function BandDot({ band }: { band: number }) {
  return (
    <span
      className="inline-block h-[14px] w-[14px] shrink-0 rounded-full border-2 border-line"
      style={{ background: TEMPERATURE_BANDS[band].color }}
      aria-hidden
    />
  );
}

/**
 * Everything the page shows about the island right now, derived from the
 * simulation state: what Pico believes, how records split by situation,
 * chart reference lines and the climate effects for the 3D scene.
 */
export function useIslandView(state: BanditState) {
  const { sim, pending, lastEvent, mode, algorithm, contextAware: aware, alpha } = state;
  const env = sim.env;
  // The situation on screen: the turn being played, or the last one until the next decision.
  const context = pending?.context ?? lastEvent?.context ?? sim.context;

  return useMemo(() => {
    const view = { env, arms: sim.arms, context };
    const beliefs = computeBeliefs(view, algorithm, aware, alpha);
    const tabularArms = observedArms(view, aware);
    const linucb = algorithm === "linucb" ? computeLinUcb(contextualView(view, aware), alpha) : null;

    // Pico's current favourite: highest estimate (ties → more records).
    let estimatedBest: number | null = null;
    if (beliefs.some((b) => b.estimate !== null)) {
      const leaders = argmaxAll(beliefs.map((b) => b.estimate ?? -1));
      estimatedBest = leaders.reduce((best, i) => (beliefs[i].pulls > beliefs[best].pulls ? i : best), leaders[0]);
    }

    const { choices, contexts } = sim.history;
    let recentOptimalRate: number | null = null;
    if (choices.length > 0) {
      const from = Math.max(0, choices.length - 100);
      let hits = 0;
      for (let t = from; t < choices.length; t++) if (isOptimalArm(env, contexts[t], choices[t])) hits += 1;
      recentOptimalRate = hits / (choices.length - from);
    }

    const contextWord = mode === "temperature" ? "気温" : "天気";
    const references: ChartReferences = {
      idealRate: oracleRewardRate(env),
      randomRegretRate: randomRegretRate(env),
      blindRegretRate: mode === "classic" ? null : blindBestRegretRate(env),
      groupRegretRate: mode === "temperature" ? groupBestRegretRate(env) : null,
      contextWord,
    };

    let situations: SituationRows | null = null;
    let timelineRows: TimelineRow[] | null = null;
    let climate: Climate | null = null;
    let stageTag: string | undefined;
    let estimateLabel = "推定成功確率";
    let pill: { icon: React.ReactNode; label: string; value: string; color: string } | null = null;

    if (mode === "weather") {
      const w = WEATHERS[context];
      situations = {
        title: "天気ごとの記録",
        rows: WEATHERS.map((wi, c) => ({
          key: wi.id,
          icon: <WeatherGlyph context={c} size={18} />,
          arms: sim.arms[c],
          truth: env.probs[c],
          current: c === context,
        })),
      };
      timelineRows = WEATHERS.map((wi, c) => ({
        key: wi.id,
        label: (
          <>
            <WeatherGlyph context={c} size={20} />
            {wi.name}
          </>
        ),
        choices: choices.filter((_, t) => contexts[t] === c),
      }));
      climate = { kind: "weather", context };
      stageTag = w.id;
      estimateLabel = !aware ? "推定成功確率（天気を気にしない）" : algorithm === "linucb" ? `推定成功確率（${w.name}の日の予測）` : `推定成功確率（${w.name}の日）`;
      pill = { icon: <WeatherGlyph context={context} />, label: "今日は", value: w.name, color: w.color };
    } else if (mode === "temperature") {
      const band = temperatureBand(context);
      const bandOf = env.groups;
      situations = {
        title: "気温ごとの記録",
        rows: TEMPERATURE_BANDS.map((b, g) => {
          const members = bandOf.flatMap((gg, c) => (gg === g ? [c] : []));
          return {
            key: b.id,
            icon: <BandDot band={g} />,
            arms: pooledArms(members.map((c) => sim.arms[c])),
            truth: env.probs[0].map((_, a) => members.reduce((s, c) => s + env.probs[c][a], 0) / members.length),
            current: g === band,
          };
        }),
      };
      timelineRows = TEMPERATURE_BANDS.map((b, g) => ({
        key: b.id,
        label: (
          <>
            <BandDot band={g} />
            {b.name}
          </>
        ),
        choices: choices.filter((_, t) => bandOf[contexts[t]] === g),
      }));
      climate = { kind: "temperature", level: context, feature: temperatureFeature(context) };
      stageTag = TEMPERATURE_BANDS[band].id;
      estimateLabel = !aware
        ? "推定成功確率（気温を気にしない）"
        : algorithm === "linucb"
          ? `推定成功確率（${temperatureOf(context)}℃での予測）`
          : `推定成功確率（${TEMPERATURE_BANDS[band].name}日）`;
      pill = { icon: <ThermoGlyph value={temperatureFeature(context)} />, label: "気温", value: `${temperatureOf(context)}℃`, color: TEMPERATURE_BANDS[band].color };
    }

    const curves = mode === "temperature" ? beliefCurves(view, algorithm, aware, alpha) : null;

    return {
      context,
      beliefs,
      tabularArms,
      linucb,
      estimatedBest,
      recentOptimalRate,
      references,
      situations,
      timelineRows,
      climate,
      stageTag,
      estimateLabel,
      pill,
      curves,
    };
  }, [env, sim.arms, sim.history, context, mode, algorithm, aware, alpha]);
}
