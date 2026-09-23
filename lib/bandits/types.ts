/** Identifier of each implemented bandit algorithm. */
export type AlgorithmId = "random" | "epsilonGreedy" | "ucb1" | "thompson";

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
}

export interface SelectionContext {
  arms: readonly ArmStats[];
  rng: Rng;
  params: AlgorithmParams;
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
