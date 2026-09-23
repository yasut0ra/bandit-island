import * as THREE from "three";

/** Where the robot waits and "thinks" between turns. */
export const HUB = new THREE.Vector3(0, 0, 1.75);
export const CHEST_COUNT = 5;

const ARC_RADIUS = 3.45;
const ARC_CENTER_Z = 0.55;
const ARC_ANGLES = [-64, -32, 0, 32, 64].map((deg) => THREE.MathUtils.degToRad(deg));

export const CHEST_POSITIONS: THREE.Vector3[] = ARC_ANGLES.map(
  (a) => new THREE.Vector3(ARC_RADIUS * Math.sin(a), 0, ARC_CENTER_Z - ARC_RADIUS * Math.cos(a)),
);

/** Y rotation that makes a chest's front (+z) face the hub. */
export const CHEST_ROTATIONS: number[] = CHEST_POSITIONS.map((p) => Math.atan2(HUB.x - p.x, HUB.z - p.z));

/** Spot in front of each chest where the robot stands to open it. */
export const CHEST_FRONTS: THREE.Vector3[] = CHEST_POSITIONS.map((p) => {
  const dir = new THREE.Vector3().subVectors(HUB, p).setY(0).normalize();
  return p.clone().addScaledVector(dir, 0.95);
});

export type EffectLevel = "full" | "lite" | "none";

export function effectLevel(turnMs: number): EffectLevel {
  if (turnMs >= 1000) return "full";
  if (turnMs >= 400) return "lite";
  return "none";
}

