import type { AlgorithmId, AlgorithmParams, ArmStats, BanditAlgorithm, Decision, Rng } from "./types.ts";

/**
 * A (contextual) Bernoulli bandit. Each turn a context is drawn first (e.g. the
 * weather), then the arm's success probability depends on that context.
 * The classic multi-armed bandit is the special case with a single context.
 */
export interface BanditEnvironment {
  /** probs[context][arm]: true (hidden) success probability. */
  probs: number[][];
  /** Chance of each context appearing on a turn (sums to 1). */
  contextWeights: number[];
}

export function singleContextEnv(probs: readonly number[]): BanditEnvironment {
  return { probs: [probs.slice()], contextWeights: [1] };
}

export interface SimulationState {
  env: BanditEnvironment;
  /** Observations kept per context: arms[context][arm]. */
  arms: ArmStats[][];
  /** Context of the upcoming turn. */
  context: number;
  turn: number;
  totalReward: number;
  /** Expected (pseudo) regret against the best arm *for each turn's context*. */
  cumulativeRegret: number;
  history: SimulationHistory;
}

export interface SimulationHistory {
  /** Arm chosen at each turn. */
  choices: number[];
  /** Context at each turn. */
  contexts: number[];
  /** Cumulative reward after each turn. */
  cumReward: number[];
  /** Cumulative regret after each turn. */
  cumRegret: number[];
  /** Algorithm used at each turn (algorithms can be switched mid-run). */
  algorithms: AlgorithmId[];
  /** Whether the algorithm looked at the context at each turn. */
  aware: boolean[];
}

const emptyArms = (n: number): ArmStats[] => Array.from({ length: n }, () => ({ pulls: 0, successes: 0 }));

export function createSimulation(env: BanditEnvironment, context = 0): SimulationState {
  return {
    env,
    arms: env.probs.map((p) => emptyArms(p.length)),
    context,
    turn: 0,
    totalReward: 0,
    cumulativeRegret: 0,
    history: { choices: [], contexts: [], cumReward: [], cumRegret: [], algorithms: [], aware: [] },
  };
}

/** Draws the next context. A single-context environment consumes no randomness. */
export function drawContext(env: BanditEnvironment, rng: Rng): number {
  const weights = env.contextWeights;
  if (weights.length === 1) return 0;
  let r = rng.next();
  for (let i = 0; i < weights.length - 1; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Observations summed over all contexts (what a context-blind learner sees). */
export function pooledArms(arms: readonly (readonly ArmStats[])[]): ArmStats[] {
  return arms[0].map((_, a) => ({
    pulls: arms.reduce((s, ctx) => s + ctx[a].pulls, 0),
    successes: arms.reduce((s, ctx) => s + ctx[a].successes, 0),
  }));
}

/**
 * What the learner bases its decision on: only this context's records when it
 * is context-aware, or everything pooled together when it ignores the context.
 */
export function observedArms(state: Pick<SimulationState, "arms" | "context">, aware: boolean): ArmStats[] {
  return aware ? state.arms[state.context] : pooledArms(state.arms);
}

export function bestProbability(probs: readonly number[]): number {
  return Math.max(...probs);
}

export function isOptimalArm(env: BanditEnvironment, context: number, arm: number): boolean {
  return env.probs[context][arm] === bestProbability(env.probs[context]);
}

/** Expected reward per turn of an oracle that always picks the best arm for the context. */
export function oracleRewardRate(env: BanditEnvironment): number {
  return env.probs.reduce((s, p, c) => s + env.contextWeights[c] * bestProbability(p), 0);
}

/** Expected regret per turn of uniform random play. */
export function randomRegretRate(env: BanditEnvironment): number {
  return env.probs.reduce((s, p, c) => s + env.contextWeights[c] * (bestProbability(p) - p.reduce((a, b) => a + b, 0) / p.length), 0);
}

/**
 * Expected regret per turn of the best *context-blind* policy (always the arm with the
 * highest average over contexts) — the ceiling for anyone who ignores the weather.
 */
export function blindBestRegretRate(env: BanditEnvironment): number {
  const n = env.probs[0].length;
  const averages = Array.from({ length: n }, (_, a) => env.probs.reduce((s, p, c) => s + env.contextWeights[c] * p[a], 0));
  return oracleRewardRate(env) - Math.max(...averages);
}

/** Bernoulli draw: 1 with probability p, else 0. */
export function drawReward(prob: number, rng: Rng): 0 | 1 {
  return rng.next() < prob ? 1 : 0;
}

/** Copy that can be mutated safely (arrays are copied once). */
export function cloneSimulation(state: SimulationState): SimulationState {
  const h = state.history;
  return {
    ...state,
    arms: state.arms.map((ctx) => ctx.map((arm) => ({ ...arm }))),
    history: {
      choices: h.choices.slice(),
      contexts: h.contexts.slice(),
      cumReward: h.cumReward.slice(),
      cumRegret: h.cumRegret.slice(),
      algorithms: h.algorithms.slice(),
      aware: h.aware.slice(),
    },
  };
}

/**
 * Records one pull in the current context, in place (use on a state from
 * cloneSimulation). Does not move on to the next context — see drawContext.
 */
export function recordPullInPlace(state: SimulationState, arm: number, reward: 0 | 1, algorithm: AlgorithmId, aware: boolean): number {
  const probs = state.env.probs[state.context];
  const regret = bestProbability(probs) - probs[arm];
  const stats = state.arms[state.context][arm];
  stats.pulls += 1;
  stats.successes += reward;
  state.turn += 1;
  state.totalReward += reward;
  state.cumulativeRegret += regret;
  state.history.choices.push(arm);
  state.history.contexts.push(state.context);
  state.history.cumReward.push(state.totalReward);
  state.history.cumRegret.push(state.cumulativeRegret);
  state.history.algorithms.push(algorithm);
  state.history.aware.push(aware);
  return regret;
}

export interface TurnResult {
  decision: Decision;
  context: number;
  reward: 0 | 1;
  regret: number;
}

/**
 * Runs `count` complete turns (observe context → decide → pull → learn → next context)
 * and returns the new state together with the last turn's result.
 */
export function runTurns(
  state: SimulationState,
  algorithm: BanditAlgorithm,
  params: AlgorithmParams,
  rng: Rng,
  count: number,
  aware: boolean,
): { state: SimulationState; last: TurnResult | null } {
  const next = cloneSimulation(state);
  let last: TurnResult | null = null;
  for (let i = 0; i < count; i++) {
    const context = next.context;
    const decision = algorithm.select({ arms: observedArms(next, aware), rng, params });
    const reward = drawReward(next.env.probs[context][decision.arm], rng);
    const regret = recordPullInPlace(next, decision.arm, reward, algorithm.id, aware);
    next.context = drawContext(next.env, rng);
    last = { decision, context, reward, regret };
  }
  return { state: next, last };
}
