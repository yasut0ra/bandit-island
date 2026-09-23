import { randomInt } from "./rng.ts";
import type { BanditAlgorithm } from "./types.ts";

/** Baseline: ignores all observations and picks uniformly at random. */
export const randomAlgorithm: BanditAlgorithm = {
  id: "random",
  select({ arms, rng }) {
    return {
      arm: randomInt(rng, arms.length),
      mode: "explore",
      details: { kind: "random" },
    };
  },
};
