import type { Rng } from "./types.ts";

/**
 * Small seeded PRNG (mulberry32). The state is a plain uint32 so the simulation
 * can store it and stay reproducible / pure.
 */
export class SeededRng implements Rng {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}

export function randomInt(rng: Rng, n: number): number {
  return Math.min(n - 1, Math.floor(rng.next() * n));
}

export function pickRandom<T>(items: readonly T[], rng: Rng): T {
  return items[randomInt(rng, items.length)];
}

/** Standard normal sample via Box–Muller. */
export function sampleStandardNormal(rng: Rng): number {
  const u1 = 1 - rng.next(); // (0, 1]
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Gamma(shape, 1) sample using Marsaglia & Tsang (2000). */
export function sampleGamma(rng: Rng, shape: number): number {
  if (shape < 1) {
    // Boost: Gamma(a) = Gamma(a + 1) * U^(1/a)
    const u = 1 - rng.next();
    return sampleGamma(rng, shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = sampleStandardNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = 1 - rng.next();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Beta(alpha, beta) sample as X / (X + Y) with X ~ Gamma(alpha), Y ~ Gamma(beta). */
export function sampleBeta(rng: Rng, alpha: number, beta: number): number {
  const x = sampleGamma(rng, alpha);
  const y = sampleGamma(rng, beta);
  return x / (x + y);
}
