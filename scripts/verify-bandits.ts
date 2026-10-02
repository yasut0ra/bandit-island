/**
 * Sanity checks for the bandit algorithms (run: npm run test:bandits).
 * Verifies the samplers and that learning algorithms beat Random on regret.
 */
import { ALGORITHM_IDS, SeededRng, blindBestRegretRate, computeUcb, sampleBeta, singleContextEnv } from "../lib/bandits/index.ts";
import { runExperiment } from "../lib/bandits/experiment.ts";
import { islandEnv } from "../lib/island.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
}

// 1. Beta sampler moments
const rng = new SeededRng(42);
for (const [a, b] of [[1, 1], [3, 7], [20, 5]]) {
  const n = 40000;
  let sum = 0;
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const x = sampleBeta(rng, a, b);
    sum += x;
    sq += x * x;
  }
  const mean = sum / n;
  const variance = sq / n - mean * mean;
  const expMean = a / (a + b);
  const expVar = (a * b) / ((a + b) ** 2 * (a + b + 1));
  check(
    `Beta(${a},${b}) moments`,
    Math.abs(mean - expMean) < 0.01 && Math.abs(variance - expVar) < 0.005,
    `mean ${mean.toFixed(3)} vs ${expMean.toFixed(3)}, var ${variance.toFixed(4)} vs ${expVar.toFixed(4)}`,
  );
}

// 2. UCB1 formula
const ucb = computeUcb([
  { pulls: 4, successes: 2 },
  { pulls: 1, successes: 1 },
  { pulls: 0, successes: 0 },
]);
check("UCB1 bonus = sqrt(2 ln t / n)", Math.abs(ucb.bonuses[0] - Math.sqrt((2 * Math.log(5)) / 4)) < 1e-12);
check("UCB1 unpulled arm has infinite score", ucb.scores[2] === Infinity);

// 3. Learning beats Random
const probs = [0.45, 0.15, 0.75, 0.3, 0.6];
const env = singleContextEnv(probs);
const results = ALGORITHM_IDS.map((algorithm) =>
  runExperiment({ algorithm, env, contextAware: true, turns: 1000, runs: 200, epsilon: 0.1, seed: 7 }),
);
for (const r of results) {
  console.log(
    `  ${r.algorithm.padEnd(14)} regret ${r.meanTotalRegret.toFixed(1).padStart(6)}  reward ${r.meanTotalReward.toFixed(1)}  late-optimal ${(r.lateOptimalRate * 100).toFixed(1)}%`,
  );
}
const random = results[0];
check("Random regret ≈ 1000 × (0.75 − mean(p)) = 300", Math.abs(random.meanTotalRegret - 300) < 10);
for (const r of results.slice(1)) {
  check(`${r.algorithm} regret < Random`, r.meanTotalRegret < random.meanTotalRegret * 0.5);
}
const ts = results.find((r) => r.algorithm === "thompson")!;
check("Thompson converges to best arm", ts.lateOptimalRate > 0.85);

// 4. Contextual bandit (weather island)
console.log("\n  weather island (contextual):");
const weather = islandEnv("weather");
const ceiling = blindBestRegretRate(weather);
check("best context-blind policy has positive regret per turn (≈0.283)", Math.abs(ceiling - (0.7833 - 0.5)) < 0.01, ceiling.toFixed(3));
for (const algorithm of ["epsilonGreedy", "ucb1", "thompson"] as const) {
  const common = { algorithm, env: weather, turns: 2000, runs: 100, epsilon: 0.1, seed: 11 };
  const blind = runExperiment({ ...common, contextAware: false });
  const aware = runExperiment({ ...common, contextAware: true });
  console.log(
    `  ${algorithm.padEnd(14)} blind regret ${blind.meanTotalRegret.toFixed(1).padStart(6)}  aware regret ${aware.meanTotalRegret.toFixed(1).padStart(6)}  aware late-optimal ${(aware.lateOptimalRate * 100).toFixed(1)}%`,
  );
  check(`${algorithm}: blind regret stays near the ceiling (≥ 90% of ${(ceiling * 2000).toFixed(0)})`, blind.meanTotalRegret >= ceiling * 2000 * 0.9);
  check(`${algorithm}: reading the weather cuts regret by more than half`, aware.meanTotalRegret < blind.meanTotalRegret * 0.5);
}
// A single-context environment must behave exactly the same whether "aware" or not.
const a = runExperiment({ algorithm: "thompson", env, contextAware: true, turns: 300, runs: 20, epsilon: 0.1, seed: 3 });
const b = runExperiment({ algorithm: "thompson", env, contextAware: false, turns: 300, runs: 20, epsilon: 0.1, seed: 3 });
check("classic island: aware and blind are identical", a.meanTotalRegret === b.meanTotalRegret);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll bandit checks passed.");
