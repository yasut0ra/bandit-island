"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  ALGORITHMS,
  SeededRng,
  cloneSimulation,
  createSimulation,
  drawReward,
  randomSeed,
  recordPullInPlace,
  runTurns,
  type AlgorithmId,
  type Decision,
  type SimulationState,
} from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO, explainDecision } from "@/lib/explain.ts";
import { CHEST_NAMES, DEFAULT_PROBS, shuffledProbs } from "@/lib/island.ts";

export interface SpeedOption {
  label: string;
  /** Duration of one turn in milliseconds. */
  turnMs: number;
  /** Animated speeds split a turn into "decide → walk → open"; fast speeds run turns instantly. */
  animated: boolean;
  intervalMs: number;
  perTick: number;
}

export const SPEEDS: SpeedOption[] = [
  { label: "1x", turnMs: 2200, animated: true, intervalMs: 2200, perTick: 1 },
  { label: "2x", turnMs: 1100, animated: true, intervalMs: 1100, perTick: 1 },
  { label: "5x", turnMs: 440, animated: true, intervalMs: 440, perTick: 1 },
  { label: "20x", turnMs: 110, animated: false, intervalMs: 110, perTick: 1 },
  { label: "100x", turnMs: 22, animated: false, intervalMs: 44, perTick: 2 },
];

export const MAX_TURNS = 20000;
export const JUMP_TURNS = 1000;
/** Fraction of an animated turn spent walking before the chest opens. */
export const MOVE_FRACTION = 0.42;

export interface TurnEvent {
  id: number;
  turn: number;
  arm: number;
  reward: 0 | 1;
  regret: number;
  algorithm: AlgorithmId;
  decision: Decision;
  reason: string;
}

export interface PendingTurn {
  id: number;
  algorithm: AlgorithmId;
  decision: Decision;
  reason: string;
}

/** A one-off remark (algorithm switch, jump, new island) shown with the robot's latest thought. */
export interface Notice {
  id: number;
  text: string;
}

export interface BanditState {
  sim: SimulationState;
  algorithm: AlgorithmId;
  epsilon: number;
  /** PRNG state (uint32) so the reducer stays pure. */
  seed: number;
  pending: PendingTurn | null;
  lastEvent: TurnEvent | null;
  notice: Notice | null;
  nextId: number;
}

type Action =
  | { type: "decide" }
  | { type: "resolve" }
  | { type: "step"; count: number; note?: string }
  | { type: "reset"; seed: number }
  | { type: "newIsland"; seed: number }
  | { type: "setAlgorithm"; algorithm: AlgorithmId }
  | { type: "setEpsilon"; epsilon: number };

function initialState(probs: readonly number[], seed: number, algorithm: AlgorithmId, epsilon: number): BanditState {
  return {
    sim: createSimulation(probs),
    algorithm,
    epsilon,
    seed,
    pending: null,
    lastEvent: null,
    notice: null,
    nextId: 1,
  };
}

function resolvePending(state: BanditState): BanditState {
  const pending = state.pending;
  if (!pending) return state;
  const rng = new SeededRng(state.seed);
  const arm = pending.decision.arm;
  const reward = drawReward(state.sim.probs[arm], rng);
  const sim = cloneSimulation(state.sim);
  const regret = recordPullInPlace(sim, arm, reward, pending.algorithm);
  const event: TurnEvent = { ...pending, turn: sim.turn, arm, reward, regret };
  return {
    ...state,
    sim,
    seed: rng.state,
    pending: null,
    lastEvent: event,
  };
}

function reducer(state: BanditState, action: Action): BanditState {
  switch (action.type) {
    case "decide": {
      if (state.pending || state.sim.turn >= MAX_TURNS) return state;
      const rng = new SeededRng(state.seed);
      const decision = ALGORITHMS[state.algorithm].select({
        arms: state.sim.arms,
        rng,
        params: { epsilon: state.epsilon },
      });
      return {
        ...state,
        seed: rng.state,
        nextId: state.nextId + 1,
        pending: {
          id: state.nextId,
          algorithm: state.algorithm,
          decision,
          reason: explainDecision(decision, CHEST_NAMES),
        },
      };
    }

    case "resolve":
      return resolvePending(state);

    case "step": {
      // Finish a half-done animated turn first so no decision is lost.
      const base = resolvePending(state);
      const count = Math.min(action.count, MAX_TURNS - base.sim.turn);
      if (count <= 0) return base;
      const rng = new SeededRng(base.seed);
      const { state: sim, last } = runTurns(
        base.sim,
        ALGORITHMS[base.algorithm],
        { epsilon: base.epsilon },
        rng,
        count,
      );
      if (!last) return base;
      const event: TurnEvent = {
        id: base.nextId,
        turn: sim.turn,
        arm: last.decision.arm,
        reward: last.reward,
        regret: last.regret,
        algorithm: base.algorithm,
        decision: last.decision,
        reason: explainDecision(last.decision, CHEST_NAMES),
      };
      return {
        ...base,
        sim,
        seed: rng.state,
        nextId: base.nextId + 2,
        lastEvent: event,
        notice: action.note ? { id: base.nextId + 1, text: action.note } : base.notice,
      };
    }

    case "reset":
      return initialState(state.sim.probs, action.seed, state.algorithm, state.epsilon);

    case "newIsland": {
      const next = initialState(shuffledProbs(action.seed), action.seed, state.algorithm, state.epsilon);
      return {
        ...next,
        notice: { id: 0, text: "新しい島に到着。宝箱の当たりやすさが入れ替わりました。" },
      };
    }

    case "setAlgorithm": {
      if (action.algorithm === state.algorithm) return state;
      const text =
        state.sim.turn > 0
          ? `ここから ${ALGORITHM_INFO[action.algorithm].name} に交代。これまでの記録（開けた回数・当たり回数）は引き継ぎます。`
          : `今日の探検家は ${ALGORITHM_INFO[action.algorithm].name}。`;
      return {
        ...state,
        algorithm: action.algorithm,
        nextId: state.nextId + 1,
        notice: { id: state.nextId, text },
      };
    }

    case "setEpsilon":
      return { ...state, epsilon: action.epsilon };
  }
}

export function useBanditSimulation() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(DEFAULT_PROBS, 20260924, "thompson", 0.1),
  );
  const [playingRequested, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const speed = SPEEDS[speedIndex];
  const atLimit = state.sim.turn >= MAX_TURNS;
  const playing = playingRequested && !atLimit;

  // Second half of an animated turn: open the chest once the agent has arrived.
  useEffect(() => {
    if (!state.pending) return;
    const delay = speed.animated ? speed.turnMs * MOVE_FRACTION : 0;
    const timer = setTimeout(() => dispatch({ type: "resolve" }), delay);
    return () => clearTimeout(timer);
  }, [state.pending, speed]);

  // Animated play loop: wait for the result to be enjoyed, then decide the next chest.
  useEffect(() => {
    if (!playing || !speed.animated || state.pending) return;
    const wait = state.lastEvent ? speed.turnMs * (1 - MOVE_FRACTION) : 250;
    const timer = setTimeout(() => dispatch({ type: "decide" }), wait);
    return () => clearTimeout(timer);
  }, [playing, speed, state.pending, state.lastEvent]);

  // Fast play loop: whole turns at a fixed rate.
  useEffect(() => {
    if (!playing || speed.animated) return;
    const timer = setInterval(() => dispatch({ type: "step", count: speed.perTick }), speed.intervalMs);
    return () => clearInterval(timer);
  }, [playing, speed]);

  const step = useCallback(() => {
    if (state.pending || atLimit) return;
    dispatch(speed.animated ? { type: "decide" } : { type: "step", count: 1 });
  }, [state.pending, atLimit, speed]);

  const jump = useCallback(() => {
    dispatch({
      type: "step",
      count: JUMP_TURNS,
      note: `${JUMP_TURNS}ターン分、一気に進めました。`,
    });
  }, []);

  return {
    state,
    playing,
    atLimit,
    speed,
    speedIndex,
    setSpeedIndex,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    step,
    jump,
    reset: useCallback(() => {
      setPlaying(false);
      dispatch({ type: "reset", seed: randomSeed() });
    }, []),
    newIsland: useCallback(() => {
      setPlaying(false);
      dispatch({ type: "newIsland", seed: randomSeed() });
    }, []),
    setAlgorithm: useCallback((algorithm: AlgorithmId) => dispatch({ type: "setAlgorithm", algorithm }), []),
    setEpsilon: useCallback((epsilon: number) => dispatch({ type: "setEpsilon", epsilon }), []),
  };
}

export type BanditController = ReturnType<typeof useBanditSimulation>;
