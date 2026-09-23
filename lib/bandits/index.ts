import { epsilonGreedyAlgorithm } from "./epsilonGreedy.ts";
import { randomAlgorithm } from "./random.ts";
import { thompsonSamplingAlgorithm } from "./thompsonSampling.ts";
import { ucb1Algorithm } from "./ucb.ts";
import type { AlgorithmId, BanditAlgorithm } from "./types.ts";

export const ALGORITHMS: Record<AlgorithmId, BanditAlgorithm> = {
  random: randomAlgorithm,
  epsilonGreedy: epsilonGreedyAlgorithm,
  ucb1: ucb1Algorithm,
  thompson: thompsonSamplingAlgorithm,
};

export const ALGORITHM_IDS: AlgorithmId[] = ["random", "epsilonGreedy", "ucb1", "thompson"];

export * from "./types.ts";
export * from "./stats.ts";
export * from "./rng.ts";
export { computeUcb } from "./ucb.ts";
export * from "./simulation.ts";
