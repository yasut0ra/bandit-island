"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  ALGORITHMS,
  SeededRng,
  cloneSimulation,
  createSimulation,
  drawContext,
  drawReward,
  observedArms,
  randomSeed,
  recordPullInPlace,
  runTurns,
  type AlgorithmId,
  type BanditEnvironment,
  type Decision,
  type SimulationState,
} from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO, explainContext, explainDecision } from "@/lib/explain.ts";
import { CHEST_NAMES, islandEnv, type IslandMode } from "@/lib/island.ts";

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
  /** Context (weather) of this turn. */
  context: number;
  aware: boolean;
  arm: number;
  reward: 0 | 1;
  regret: number;
  algorithm: AlgorithmId;
  decision: Decision;
  reason: string;
}

export interface PendingTurn {
  id: number;
  context: number;
  aware: boolean;
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
  mode: IslandMode;
  sim: SimulationState;
  algorithm: AlgorithmId;
  /** Whether the learner reads the context (weather). Irrelevant on the classic island. */
  contextAware: boolean;
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
  | { type: "setEpsilon"; epsilon: number }
  | { type: "setMode"; mode: IslandMode; seed: number }
  | { type: "setContextAware"; aware: boolean };

type Settings = Pick<BanditState, "mode" | "algorithm" | "epsilon" | "contextAware">;

function initialState(env: BanditEnvironment, seed: number, settings: Settings): BanditState {
  const rng = new SeededRng(seed);
  const sim = createSimulation(env, drawContext(env, rng));
  return {
    ...settings,
    sim,
    seed: rng.state,
    pending: null,
    lastEvent: null,
    notice: null,
    nextId: 1,
  };
}

const settingsOf = (s: BanditState): Settings => ({
  mode: s.mode,
  algorithm: s.algorithm,
  epsilon: s.epsilon,
  contextAware: s.contextAware,
});

/** Japanese reason text, prefixed with the weather on the weather island. */
function reasonFor(state: BanditState, decision: Decision, context: number): string {
  const body = explainDecision(decision, CHEST_NAMES);
  return state.mode === "weather" ? `${explainContext(context, state.contextAware)}${body}` : body;
}

function resolvePending(state: BanditState): BanditState {
  const pending = state.pending;
  if (!pending) return state;
  const rng = new SeededRng(state.seed);
  const arm = pending.decision.arm;
  const reward = drawReward(state.sim.env.probs[pending.context][arm], rng);
  const sim = cloneSimulation(state.sim);
  const regret = recordPullInPlace(sim, arm, reward, pending.algorithm, pending.aware);
  sim.context = drawContext(sim.env, rng);
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
        arms: observedArms(state.sim, state.contextAware),
        rng,
        params: { epsilon: state.epsilon },
      });
      return {
        ...state,
        seed: rng.state,
        nextId: state.nextId + 1,
        pending: {
          id: state.nextId,
          context: state.sim.context,
          aware: state.contextAware,
          algorithm: state.algorithm,
          decision,
          reason: reasonFor(state, decision, state.sim.context),
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
        base.contextAware,
      );
      if (!last) return base;
      const event: TurnEvent = {
        id: base.nextId,
        turn: sim.turn,
        context: last.context,
        aware: base.contextAware,
        arm: last.decision.arm,
        reward: last.reward,
        regret: last.regret,
        algorithm: base.algorithm,
        decision: last.decision,
        reason: reasonFor(base, last.decision, last.context),
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
      return initialState(state.sim.env, action.seed, settingsOf(state));

    case "newIsland": {
      const next = initialState(islandEnv(state.mode, action.seed), action.seed, settingsOf(state));
      return {
        ...next,
        notice: { id: 0, text: "新しい島に到着。宝箱の当たりやすさが入れ替わりました。" },
      };
    }

    case "setMode": {
      if (action.mode === state.mode) return state;
      const next = initialState(islandEnv(action.mode), action.seed, { ...settingsOf(state), mode: action.mode });
      return {
        ...next,
        notice: {
          id: 0,
          text:
            action.mode === "weather"
              ? "天気の島へようこそ！ ここでは天気によって当たりやすい宝箱が変わるよ。"
              : "ふつうの島に戻ってきました。",
        },
      };
    }

    case "setContextAware": {
      if (action.aware === state.contextAware) return state;
      return {
        ...state,
        contextAware: action.aware,
        nextId: state.nextId + 1,
        notice: {
          id: state.nextId,
          text: action.aware
            ? "ここから天気を見て選ぶよ。天気ごとの記録を分けて使います。"
            : "ここから天気を気にせず選ぶよ。全部の記録をまとめて使います。",
        },
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
    initialState(islandEnv("classic"), 20260924, { mode: "classic", algorithm: "thompson", epsilon: 0.1, contextAware: true }),
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
    setMode: useCallback((mode: IslandMode) => {
      setPlaying(false);
      dispatch({ type: "setMode", mode, seed: randomSeed() });
    }, []),
    setContextAware: useCallback((aware: boolean) => dispatch({ type: "setContextAware", aware }), []),
  };
}

export type BanditController = ReturnType<typeof useBanditSimulation>;
