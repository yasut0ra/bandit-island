/**
 * Sanity checks for the bandit algorithms (run: npm run test:bandits).
 * Verifies the samplers and that learning algorithms beat Random on regret.
 */
import { ALGORITHM_IDS, SeededRng, sampleBeta, computeUcb } from "../lib/bandits/index.ts";
import { runExperiment } from "../lib/bandits/experiment.ts";

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
const results = ALGORITHM_IDS.map((algorithm) =>
  runExperiment({ algorithm, probs, turns: 1000, runs: 200, epsilon: 0.1, seed: 7 }),
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

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll bandit checks passed.");
