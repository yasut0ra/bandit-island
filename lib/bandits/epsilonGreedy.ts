import { pickRandom, randomInt } from "./rng.ts";
import { argmaxAll, sampleMean } from "./stats.ts";
import type { BanditAlgorithm } from "./types.ts";

/**
 * ε-Greedy: with probability ε pick a uniformly random arm (explore),
 * otherwise pick the arm with the highest observed mean (exploit).
 * Ties between equally good arms are broken at random.
 */
export const epsilonGreedyAlgorithm: BanditAlgorithm = {
  id: "epsilonGreedy",
  select({ arms, rng, params }) {
    const estimates = arms.map(sampleMean);
    const greedyArms = argmaxAll(estimates);
    const roll = rng.next();
    const explored = roll < params.epsilon;
    const arm = explored ? randomInt(rng, arms.length) : pickRandom(greedyArms, rng);

    return {
      arm,
      mode: explored ? "explore" : "exploit",
      details: { kind: "epsilonGreedy", epsilon: params.epsilon, roll, explored, estimates, greedyArms },
    };
  },
};
