import { pickRandom } from "./rng.ts";
import { argmaxAll, isExploitChoice, sampleMean, totalPulls } from "./stats.ts";
import type { ArmStats, BanditAlgorithm } from "./types.ts";

export interface UcbValues {
  estimates: number[];
  bonuses: number[];
  scores: number[];
}

/**
 * UCB1 (Auer et al., 2002): score_i = mean_i + sqrt(2 ln t / n_i),
 * where t is the total number of pulls so far. Unpulled arms get +∞.
 */
export function computeUcb(arms: readonly ArmStats[]): UcbValues {
  const t = totalPulls(arms);
  const estimates = arms.map(sampleMean);
  const bonuses = arms.map((arm) =>
    arm.pulls === 0 ? Infinity : Math.sqrt((2 * Math.log(Math.max(t, 1))) / arm.pulls),
  );
  const scores = estimates.map((mean, i) => mean + bonuses[i]);
  return { estimates, bonuses, scores };
}

export const ucb1Algorithm: BanditAlgorithm = {
  id: "ucb1",
  select({ arms, rng }) {
    const { estimates, bonuses, scores } = computeUcb(arms);
    const untried = arms.flatMap((arm, i) => (arm.pulls === 0 ? [i] : []));
    const initialPull = untried.length > 0;
    // Every arm is played once first; afterwards pick the highest upper confidence bound.
    const arm = initialPull ? pickRandom(untried, rng) : pickRandom(argmaxAll(scores), rng);

    return {
      arm,
      mode: !initialPull && isExploitChoice(arm, estimates) ? "exploit" : "explore",
      details: { kind: "ucb1", initialPull, estimates, bonuses, scores },
    };
  },
};
