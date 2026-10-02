/** Identifier of each implemented bandit algorithm. */
export type AlgorithmId = "random" | "epsilonGreedy" | "ucb1" | "thompson" | "linucb";

/** Everything an algorithm is allowed to know about one arm (treasure chest). */
export interface ArmStats {
  pulls: number;
  successes: number;
}

/** Source of uniform random numbers in [0, 1). */
export interface Rng {
  next(): number;
}

export interface AlgorithmParams {
  /** Exploration probability for ε-Greedy (0–1). */
  epsilon: number;
  /** Width of LinUCB's confidence bonus (α). */
  alpha: number;
}

/**
 * What a feature-based (contextual) algorithm sees. Tabular algorithms ignore it.
 * Because every context has a fixed feature vector, LinUCB's sufficient statistics
 * can be rebuilt from the per-context counts — no extra state is needed.
 */
export interface ContextualView {
  /** Observations per context: armsByContext[context][arm]. */
  armsByContext: readonly (readonly ArmStats[])[];
  /** Feature vector of each context. */
  features: readonly (readonly number[])[];
  /** The context of this turn. */
  context: number;
}

export interface SelectionContext {
  arms: readonly ArmStats[];
  rng: Rng;
  params: AlgorithmParams;
  contextual: ContextualView;
}

/** Whether the choice was made to gather information or to cash in on knowledge. */
export type DecisionMode = "explore" | "exploit";

export type DecisionDetails =
  | { kind: "random" }
  | {
      kind: "epsilonGreedy";
      epsilon: number;
      roll: number;
      explored: boolean;
      estimates: number[];
      greedyArms: number[];
    }
  | {
      kind: "ucb1";
      initialPull: boolean;
      estimates: number[];
      /** Exploration bonus; Infinity for arms that were never pulled. */
      bonuses: number[];
      /** estimate + bonus; Infinity for arms that were never pulled. */
      scores: number[];
    }
  | {
      kind: "thompson";
      alphas: number[];
      betas: number[];
      samples: number[];
    }
  | {
      kind: "linucb";
      alpha: number;
      /** The feature vector x of this turn. */
      features: number[];
      /** Predicted success probability θ̂ᵀx per arm. */
      estimates: number[];
      /** Uncertainty √(xᵀA⁻¹x) per arm. */
      widths: number[];
      /** estimate + α · width per arm. */
      scores: number[];
      /** Learned weights θ̂ per arm. */
      thetas: number[][];
    };

export interface Decision {
  arm: number;
  mode: DecisionMode;
  details: DecisionDetails;
}

export interface BanditAlgorithm {
  id: AlgorithmId;
  select(context: SelectionContext): Decision;
}
