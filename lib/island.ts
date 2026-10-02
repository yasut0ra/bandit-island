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

export type IslandMode = "classic" | "weather" | "temperature";

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

/* ---------- 気温の島 (linear contextual bandit) ---------- */

/** Temperatures are 0, 2, …, 30 ℃ (16 levels), each equally likely. */
export const TEMPERATURE_LEVELS = 16;
export const TEMPERATURE_STEP = 2;
export const temperatureOf = (level: number) => level * TEMPERATURE_STEP;
/** Feature value: temperature scaled to 0–1. */
export const temperatureFeature = (level: number) => level / (TEMPERATURE_LEVELS - 1);

/** Buckets a context-aware tabular learner uses: さむい (0–8℃) / ふつう (10–20℃) / あつい (22–30℃). */
export const TEMPERATURE_BANDS = [
  { id: "cold", name: "さむい", color: "#7fc4ff" },
  { id: "mild", name: "ふつう", color: "#7be08e" },
  { id: "hot", name: "あつい", color: "#ff9a6b" },
] as const;
export const temperatureBand = (level: number) => (level <= 4 ? 0 : level <= 10 ? 1 : 2);

/**
 * True success probability = intercept + slope × (temperature 0–1), per chest.
 * ソラ loves the heat, ミント the cold, モモ is steady: the best chest changes twice
 * inside the "ふつう" band, so bucketing hits a floor that a learned line does not.
 */
export const TEMPERATURE_LINES: [number, number][] = [
  [0.05, 0.9],
  [0.45, -0.1],
  [0.95, -0.9],
  [0.25, 0.3],
  [0.58, -0.04],
];

/** The hidden environment for each mode; a seed shuffles which chest has which profile. */
export function islandEnv(mode: IslandMode, seed?: number): BanditEnvironment {
  if (mode === "classic") return singleContextEnv(seed === undefined ? DEFAULT_PROBS : shuffledProbs(seed));
  const n = CHESTS.length;
  const order = seed === undefined ? Array.from({ length: n }, (_, i) => i) : permutation(n, seed);
  if (mode === "weather") {
    return {
      probs: WEATHER_PROBS.map((row) => order.map((i) => row[i])),
      contextWeights: WEATHERS.map(() => 1 / WEATHERS.length),
      // one-hot: a feature-based learner keeps one weight per weather
      features: WEATHERS.map((_, c) => WEATHERS.map((__, j) => (j === c ? 1 : 0))),
      groups: WEATHERS.map((_, c) => c),
    };
  }
  const levels = Array.from({ length: TEMPERATURE_LEVELS }, (_, k) => k);
  return {
    probs: levels.map((k) => order.map((i) => TEMPERATURE_LINES[i][0] + TEMPERATURE_LINES[i][1] * temperatureFeature(k))),
    contextWeights: levels.map(() => 1 / TEMPERATURE_LEVELS),
    features: levels.map((k) => [1, temperatureFeature(k)]),
    groups: levels.map(temperatureBand),
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
