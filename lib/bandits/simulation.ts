import type { AlgorithmId, AlgorithmParams, ArmStats, BanditAlgorithm, Decision, Rng } from "./types.ts";

/** Bernoulli bandit environment + the learner's observations. */
export interface SimulationState {
  /** True (hidden) success probability of each arm. */
  probs: readonly number[];
  arms: ArmStats[];
  turn: number;
  totalReward: number;
  /** Expected (pseudo) regret: Σ (p* − p_chosen). */
  cumulativeRegret: number;
  history: SimulationHistory;
}

export interface SimulationHistory {
  /** Arm chosen at each turn. */
  choices: number[];
  /** Cumulative reward after each turn. */
  cumReward: number[];
  /** Cumulative regret after each turn. */
  cumRegret: number[];
  /** Algorithm used at each turn (algorithms can be switched mid-run). */
  algorithms: AlgorithmId[];
}

export function createSimulation(probs: readonly number[]): SimulationState {
  return {
    probs,
    arms: probs.map(() => ({ pulls: 0, successes: 0 })),
    turn: 0,
    totalReward: 0,
    cumulativeRegret: 0,
    history: { choices: [], cumReward: [], cumRegret: [], algorithms: [] },
  };
}

export function bestProbability(probs: readonly number[]): number {
  return Math.max(...probs);
}

/** Bernoulli draw: 1 with probability p, else 0. */
export function drawReward(prob: number, rng: Rng): 0 | 1 {
  return rng.next() < prob ? 1 : 0;
}

/** Copy that can be mutated safely (arrays are copied once). */
export function cloneSimulation(state: SimulationState): SimulationState {
  return {
    ...state,
    arms: state.arms.map((arm) => ({ ...arm })),
    history: {
      choices: state.history.choices.slice(),
      cumReward: state.history.cumReward.slice(),
      cumRegret: state.history.cumRegret.slice(),
      algorithms: state.history.algorithms.slice(),
    },
  };
}

/** Records one pull in place. Only use on a state obtained from cloneSimulation. */
export function recordPullInPlace(
  state: SimulationState,
  arm: number,
  reward: 0 | 1,
  algorithm: AlgorithmId,
): number {
  const regret = bestProbability(state.probs) - state.probs[arm];
  state.arms[arm].pulls += 1;
  state.arms[arm].successes += reward;
  state.turn += 1;
  state.totalReward += reward;
  state.cumulativeRegret += regret;
  state.history.choices.push(arm);
  state.history.cumReward.push(state.totalReward);
  state.history.cumRegret.push(state.cumulativeRegret);
  state.history.algorithms.push(algorithm);
  return regret;
}

export interface TurnResult {
  decision: Decision;
  reward: 0 | 1;
  regret: number;
}

/**
 * Runs `count` complete turns (decide → pull → learn) and returns the new state
 * together with the last turn's result.
 */
export function runTurns(
  state: SimulationState,
  algorithm: BanditAlgorithm,
  params: AlgorithmParams,
  rng: Rng,
  count: number,
): { state: SimulationState; last: TurnResult | null } {
  const next = cloneSimulation(state);
  let last: TurnResult | null = null;
  for (let i = 0; i < count; i++) {
    const decision = algorithm.select({ arms: next.arms, rng, params });
    const reward = drawReward(next.probs[decision.arm], rng);
    const regret = recordPullInPlace(next, decision.arm, reward, algorithm.id);
    last = { decision, reward, regret };
  }
  return { state: next, last };
}
