import { ALGORITHMS } from "./index.ts";
import { SeededRng } from "./rng.ts";
import { bestProbability, createSimulation, drawContext, drawReward, isOptimalArm, observedArms, type BanditEnvironment } from "./simulation.ts";
import type { AlgorithmId } from "./types.ts";

export interface ExperimentConfig {
  algorithm: AlgorithmId;
  env: BanditEnvironment;
  /** Whether the learner uses the context (only matters with more than one context). */
  contextAware: boolean;
  turns: number;
  runs: number;
  epsilon: number;
  seed: number;
  /** Number of points kept for the averaged regret curve. */
  samplePoints?: number;
}

export interface ExperimentResult {
  algorithm: AlgorithmId;
  contextAware: boolean;
  /** Turn numbers (1-based) of each point in `regretCurve`. */
  turnsAxis: number[];
  /** Mean cumulative regret over all runs at each sampled turn. */
  regretCurve: number[];
  meanTotalReward: number;
  meanTotalRegret: number;
  /** Fraction of the final 10% of turns spent on the best arm for that turn's context. */
  lateOptimalRate: number;
}

/** Headless Monte-Carlo experiment used by Compare Mode and the verification script. */
export function runExperiment(config: ExperimentConfig): ExperimentResult {
  const { env, contextAware, turns, runs, epsilon, seed } = config;
  const algorithm = ALGORITHMS[config.algorithm];
  const samplePoints = Math.min(config.samplePoints ?? 120, turns);
  const turnsAxis = Array.from({ length: samplePoints }, (_, i) => Math.max(1, Math.round(((i + 1) / samplePoints) * turns)));
  const regretSums = new Array<number>(samplePoints).fill(0);
  const lateStart = Math.floor(turns * 0.9);
  let rewardSum = 0;
  let lateOptimal = 0;

  const rng = new SeededRng(seed);
  for (let run = 0; run < runs; run++) {
    const sim = createSimulation(env, drawContext(env, rng));
    let regret = 0;
    let point = 0;
    for (let t = 1; t <= turns; t++) {
      const ctx = sim.context;
      const { arm } = algorithm.select({ arms: observedArms(sim, contextAware), rng, params: { epsilon } });
      const reward = drawReward(env.probs[ctx][arm], rng);
      sim.arms[ctx][arm].pulls += 1;
      sim.arms[ctx][arm].successes += reward;
      rewardSum += reward;
      regret += bestProbability(env.probs[ctx]) - env.probs[ctx][arm];
      if (t > lateStart && isOptimalArm(env, ctx, arm)) lateOptimal += 1;
      while (point < samplePoints && turnsAxis[point] === t) {
        regretSums[point] += regret;
        point += 1;
      }
      sim.context = drawContext(env, rng);
    }
  }

  return {
    algorithm: config.algorithm,
    contextAware,
    turnsAxis,
    regretCurve: regretSums.map((sum) => sum / runs),
    meanTotalReward: rewardSum / runs,
    meanTotalRegret: regretSums[samplePoints - 1] / runs,
    lateOptimalRate: lateOptimal / (runs * (turns - lateStart)),
  };
}
