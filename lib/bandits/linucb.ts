import { dot, identity, invert, matVec } from "./linalg.ts";
import { pickRandom } from "./rng.ts";
import { argmaxAll, isExploitChoice } from "./stats.ts";
import type { BanditAlgorithm, ContextualView } from "./types.ts";

/** Prior guess of the success probability before any data. */
const PRIOR_MEAN = 0.5;

export interface LinUcbValues {
  features: number[];
  estimates: number[];
  widths: number[];
  scores: number[];
  thetas: number[][];
}

/**
 * Disjoint LinUCB (Li et al., 2010). For each arm a, with features x of each past turn:
 *   A_a = I + Σ x xᵀ,  b_a = Σ (r − ½) x,  θ̂_a = A_a⁻¹ b_a
 *   score_a(x) = ½ + θ̂_aᵀx + α √(xᵀ A_a⁻¹ x)
 * Rewards are centred on ½ so the ridge prior means "50%, no idea" instead of "0%".
 * The sums are rebuilt from per-context counts since each context has a fixed x.
 */
export function computeLinUcb(view: ContextualView, alpha: number): LinUcbValues {
  const x = view.features[view.context].slice();
  const d = x.length;
  const armCount = view.armsByContext[0].length;
  const estimates: number[] = [];
  const widths: number[] = [];
  const thetas: number[][] = [];

  for (let a = 0; a < armCount; a++) {
    const A = identity(d);
    const b = new Array<number>(d).fill(0);
    view.armsByContext.forEach((ctxArms, c) => {
      const { pulls, successes } = ctxArms[a];
      if (pulls === 0) return;
      const xc = view.features[c];
      for (let i = 0; i < d; i++) {
        // Centre the reward on 0.5 so an untried chest starts at "50%, no idea" rather than "0%".
        b[i] += (successes - PRIOR_MEAN * pulls) * xc[i];
        for (let j = 0; j < d; j++) A[i][j] += pulls * xc[i] * xc[j];
      }
    });
    const Ainv = invert(A);
    const theta = matVec(Ainv, b);
    thetas.push(theta);
    estimates.push(PRIOR_MEAN + dot(theta, x));
    widths.push(Math.sqrt(Math.max(0, dot(x, matVec(Ainv, x)))));
  }
  const scores = estimates.map((e, a) => e + alpha * widths[a]);
  return { features: x, estimates, widths, scores, thetas };
}

export const linUcbAlgorithm: BanditAlgorithm = {
  id: "linucb",
  select({ rng, params, contextual }) {
    const values = computeLinUcb(contextual, params.alpha);
    const arm = pickRandom(argmaxAll(values.scores), rng);
    return {
      arm,
      mode: isExploitChoice(arm, values.estimates) ? "exploit" : "explore",
      details: { kind: "linucb", alpha: params.alpha, ...values },
    };
  },
};
