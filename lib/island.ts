import { SeededRng } from "./bandits/rng.ts";

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

/** Same difficulty, new layout: permutes the default probabilities. */
export function shuffledProbs(seed: number): number[] {
  const rng = new SeededRng(seed);
  const probs = DEFAULT_PROBS.slice();
  for (let i = probs.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [probs[i], probs[j]] = [probs[j], probs[i]];
  }
  return probs;
}

export function chestColor(index: number, dark: boolean): string {
  return dark ? CHESTS[index].colorDark : CHESTS[index].color;
}

export const EXPLORE_COLOR = "#8b5cf6";
export const EXPLOIT_COLOR = "#f59e0b";

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}
