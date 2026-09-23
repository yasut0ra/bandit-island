import type { ArmStats } from "./types.ts";

/** Observed success rate. Unpulled arms are treated as 0 (standard Q₀ = 0). */
export function sampleMean(arm: ArmStats): number {
  return arm.pulls === 0 ? 0 : arm.successes / arm.pulls;
}

export function totalPulls(arms: readonly ArmStats[]): number {
  return arms.reduce((sum, arm) => sum + arm.pulls, 0);
}

/** Indices of all maximal values (ties kept so callers can break them randomly). */
export function argmaxAll(values: readonly number[]): number[] {
  let best = -Infinity;
  let indices: number[] = [];
  values.forEach((value, i) => {
    if (value > best + 1e-12) {
      best = value;
      indices = [i];
    } else if (Math.abs(value - best) <= 1e-12 || (value === Infinity && best === Infinity)) {
      indices.push(i);
    }
  });
  return indices;
}

/**
 * A choice counts as "exploit" when the chosen arm is the (possibly tied) leader
 * and the leaders are not simply *every* arm (i.e. there is some knowledge to use).
 */
export function isExploitChoice(arm: number, values: readonly number[]): boolean {
  const leaders = argmaxAll(values);
  return leaders.length < values.length && leaders.includes(arm);
}

/** Posterior Beta(1 + s, 1 + f) under a uniform prior. */
export function posteriorParams(arm: ArmStats): { alpha: number; beta: number } {
  return { alpha: 1 + arm.successes, beta: 1 + arm.pulls - arm.successes };
}

export function posteriorMean(arm: ArmStats): number {
  const { alpha, beta } = posteriorParams(arm);
  return alpha / (alpha + beta);
}

export function posteriorStd(arm: ArmStats): number {
  const { alpha, beta } = posteriorParams(arm);
  const n = alpha + beta;
  return Math.sqrt((alpha * beta) / (n * n * (n + 1)));
}

/** Std of Beta(1, 1): the uncertainty of an arm we know nothing about. */
const MAX_STD = Math.sqrt(1 / 12);

/** Uncertainty in [0, 1]: 1 = never tried, → 0 as evidence accumulates. */
export function uncertainty(arm: ArmStats): number {
  return Math.min(1, posteriorStd(arm) / MAX_STD);
}

/** Approximate 95% credible interval of the true success rate. */
export function credibleInterval(arm: ArmStats): [number, number] {
  const mean = posteriorMean(arm);
  const half = 1.96 * posteriorStd(arm);
  return [Math.max(0, mean - half), Math.min(1, mean + half)];
}
