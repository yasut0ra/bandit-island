import { SeededRng } from "./bandits/rng.ts";
import { singleContextEnv, type BanditEnvironment } from "./bandits/simulation.ts";

export interface ChestInfo {
  name: string;
  /** Identity color (validated categorical order: blue, orange, aqua, yellow, magenta). */
  color: string;
  colorDark: string;
}

export const CHESTS: ChestInfo[] = [
  { name: "ソラ", color: "#2a78d6", colorDark: "#3987e5" },
  { name: "ミカン", color: "#eb6834", colorDark: "#d95926" },
  { name: "ミント", color: "#1baf7a", colorDark: "#199e70" },
  { name: "レモン", color: "#eda100", colorDark: "#c98500" },
  { name: "モモ", color: "#e87ba4", colorDark: "#d55181" },
];

export const CHEST_NAMES = CHESTS.map((c) => c.name);

/** Default hidden success probabilities (Bernoulli). */
export const DEFAULT_PROBS = [0.45, 0.15, 0.75, 0.3, 0.6];

/** Random permutation of 0..n-1 (Fisher–Yates). */
function permutation(n: number, seed: number): number[] {
  const rng = new SeededRng(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Same difficulty, new layout: permutes the default probabilities. */
export function shuffledProbs(seed: number): number[] {
  return permutation(DEFAULT_PROBS.length, seed).map((i) => DEFAULT_PROBS[i]);
}

/* ---------- 天気の島 (contextual bandit) ---------- */

export type IslandMode = "classic" | "weather";

export interface WeatherInfo {
  id: "sunny" | "rainy" | "cloudy";
  name: string;
  color: string;
}

export const WEATHERS: WeatherInfo[] = [
  { id: "sunny", name: "晴れ", color: "#ffc93c" },
  { id: "rainy", name: "雨", color: "#4db5ff" },
  { id: "cloudy", name: "くもり", color: "#a5a6d3" },
];

/**
 * WEATHER_PROBS[weather][chest]. ソラ loves the sun, ミント the rain, モモ the clouds.
 * Averaged over the weather, モモ looks best (50%), but reading the weather earns ~78%:
 * a context-blind learner hits a ceiling that a context-aware one breaks through.
 */
export const WEATHER_PROBS: number[][] = [
  [0.8, 0.55, 0.25, 0.4, 0.3],
  [0.2, 0.3, 0.8, 0.35, 0.45],
  [0.35, 0.4, 0.3, 0.45, 0.75],
];

/** The hidden environment for each mode; a seed shuffles which chest has which profile. */
export function islandEnv(mode: IslandMode, seed?: number): BanditEnvironment {
  if (mode === "classic") return singleContextEnv(seed === undefined ? DEFAULT_PROBS : shuffledProbs(seed));
  const order = seed === undefined ? WEATHER_PROBS[0].map((_, i) => i) : permutation(WEATHER_PROBS[0].length, seed);
  return {
    probs: WEATHER_PROBS.map((row) => order.map((i) => row[i])),
    contextWeights: WEATHERS.map(() => 1 / WEATHERS.length),
  };
}

export function chestColor(index: number, dark: boolean): string {
  return dark ? CHESTS[index].colorDark : CHESTS[index].color;
}

export const EXPLORE_COLOR = "#8a63ff";
export const EXPLOIT_COLOR = "#ffbf2e";

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}
