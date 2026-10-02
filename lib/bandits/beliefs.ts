import { computeLinUcb } from "./linucb.ts";
import { contextualView, observedArms, pooledArms, type SimulationState } from "./simulation.ts";
import { credibleInterval, sampleMean, uncertainty } from "./stats.ts";
import type { AlgorithmId } from "./types.ts";

/** What the learner currently believes about one arm, in a form the UI can draw. */
export interface Belief {
  /** Estimated success probability in the current context (null = no information yet). */
  estimate: number | null;
  /** Plausible range of the true probability. */
  low: number;
  high: number;
  /** 1 = knows nothing, → 0 as evidence accumulates. */
  uncertainty: number;
  /** Records the learner draws on for this arm. */
  pulls: number;
  successes: number;
}

type StateView = Pick<SimulationState, "env" | "arms" | "context">;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Beliefs about every arm in `state.context`. Tabular learners believe their
 * (pooled or per-group) counts; LinUCB believes its fitted line θ̂ᵀx ± width.
 */
export function computeBeliefs(state: StateView, algorithm: AlgorithmId, aware: boolean, alpha: number): Belief[] {
  if (algorithm === "linucb") {
    const view = contextualView(state, aware);
    const values = computeLinUcb(view, alpha);
    const counts = pooledArms(state.arms);
    const x = values.features;
    const priorWidth = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
    return values.estimates.map((e, a) => {
      const w = values.widths[a];
      const est = counts[a].pulls > 0 ? clamp01(e) : null;
      return {
        estimate: est,
        low: est === null ? 0 : clamp01(e - w),
        high: est === null ? 1 : clamp01(e + w),
        uncertainty: Math.min(1, w / priorWidth),
        pulls: counts[a].pulls,
        successes: counts[a].successes,
      };
    });
  }
  return observedArms(state, aware).map((arm) => {
    const [low, high] = credibleInterval(arm);
    return {
      estimate: arm.pulls > 0 ? sampleMean(arm) : null,
      low,
      high,
      uncertainty: uncertainty(arm),
      pulls: arm.pulls,
      successes: arm.successes,
    };
  });
}

/** The learner's estimate of every arm in every context: curves[arm][context] (e.g. over temperature). */
export function beliefCurves(state: StateView, algorithm: AlgorithmId, aware: boolean, alpha: number): (number | null)[][] {
  const perContext = state.env.probs.map((_, c) => computeBeliefs({ ...state, context: c }, algorithm, aware, alpha));
  return state.env.probs[0].map((_, a) => perContext.map((beliefs) => beliefs[a].estimate));
}
