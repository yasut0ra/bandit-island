import { ALGORITHMS } from "./index.ts";
import { SeededRng } from "./rng.ts";
import { bestProbability, drawReward } from "./simulation.ts";
import type { AlgorithmId, ArmStats } from "./types.ts";

export interface ExperimentConfig {
  algorithm: AlgorithmId;
  probs: readonly number[];
  turns: number;
  runs: number;
  epsilon: number;
  seed: number;
  /** Number of points kept for the averaged regret curve. */
  samplePoints?: number;
}

export interface ExperimentResult {
  algorithm: AlgorithmId;
  /** Turn numbers (1-based) of each point in `regretCurve`. */
  turnsAxis: number[];
  /** Mean cumulative regret over all runs at each sampled turn. */
  regretCurve: number[];
  meanTotalReward: number;
  meanTotalRegret: number;
  /** Fraction of the final 10% of turns spent on the truly best arm. */
  lateOptimalRate: number;
}

/** Headless Monte-Carlo experiment used by Compare Mode. */
export function runExperiment(config: ExperimentConfig): ExperimentResult {
  const { probs, turns, runs, epsilon, seed } = config;
  const algorithm = ALGORITHMS[config.algorithm];
  const samplePoints = Math.min(config.samplePoints ?? 120, turns);
  const turnsAxis = Array.from({ length: samplePoints }, (_, i) =>
    Math.max(1, Math.round(((i + 1) / samplePoints) * turns)),
  );
  const regretSums = new Array<number>(samplePoints).fill(0);
  const best = bestProbability(probs);
  const bestArms = probs.flatMap((p, i) => (p === best ? [i] : []));
  const lateStart = Math.floor(turns * 0.9);
  let rewardSum = 0;
  let lateOptimal = 0;

  const rng = new SeededRng(seed);
  for (let run = 0; run < runs; run++) {
    const arms: ArmStats[] = probs.map(() => ({ pulls: 0, successes: 0 }));
    let regret = 0;
    let point = 0;
    for (let t = 1; t <= turns; t++) {
      const { arm } = algorithm.select({ arms, rng, params: { epsilon } });
      const reward = drawReward(probs[arm], rng);
      arms[arm].pulls += 1;
      arms[arm].successes += reward;
      rewardSum += reward;
      regret += best - probs[arm];
      if (t > lateStart && bestArms.includes(arm)) lateOptimal += 1;
      while (point < samplePoints && turnsAxis[point] === t) {
        regretSums[point] += regret;
        point += 1;
      }
    }
  }

  return {
    algorithm: config.algorithm,
    turnsAxis,
    regretCurve: regretSums.map((sum) => sum / runs),
    meanTotalReward: rewardSum / runs,
    meanTotalRegret: regretSums[samplePoints - 1] / runs,
    lateOptimalRate: lateOptimal / (runs * (turns - lateStart)),
  };
}
