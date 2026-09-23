import { pickRandom, sampleBeta } from "./rng.ts";
import { argmaxAll, isExploitChoice, posteriorParams } from "./stats.ts";
import type { BanditAlgorithm } from "./types.ts";

/**
 * Thompson Sampling for Bernoulli rewards with a uniform Beta(1, 1) prior.
 * Posterior of arm i is Beta(1 + successes, 1 + failures); draw one sample
 * per arm and play the arm with the largest sample.
 */
export const thompsonSamplingAlgorithm: BanditAlgorithm = {
  id: "thompson",
  select({ arms, rng }) {
    const params = arms.map(posteriorParams);
    const alphas = params.map((p) => p.alpha);
    const betas = params.map((p) => p.beta);
    const samples = params.map((p) => sampleBeta(rng, p.alpha, p.beta));
    const arm = pickRandom(argmaxAll(samples), rng);
    const posteriorMeans = params.map((p) => p.alpha / (p.alpha + p.beta));

    return {
      arm,
      mode: isExploitChoice(arm, posteriorMeans) ? "exploit" : "explore",
      details: { kind: "thompson", alphas, betas, samples },
    };
  },
};
