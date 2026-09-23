"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { CHEST_FRONTS, HUB } from "./layout";

const STEPS = 9;

/**
 * Dirt trails from the hub to each chest. Frequently chosen chests get a
 * clearer path and more footprints, so convergence is visible at a glance.
 */
export function Paths({ shares, dark }: { shares: number[]; dark: boolean }) {
  const geometry = useMemo(() => {
    return CHEST_FRONTS.map((front) => {
      const dir = new THREE.Vector3().subVectors(front, HUB).setY(0);
      const length = dir.length();
      const angle = Math.atan2(dir.x, dir.z);
      const mid = HUB.clone().addScaledVector(dir, 0.5);
      return { length, angle, mid, dir: dir.normalize() };
    });
  }, []);

  return (
    <group>
      {geometry.map((g, i) => {
        const share = shares[i] ?? 0;
        const visibleSteps = Math.round(Math.min(1, share * 1.8) * STEPS);
        return (
          <group key={i}>
            <mesh position={[g.mid.x, 0.006, g.mid.z]} rotation={[-Math.PI / 2, 0, g.angle]}>
              <planeGeometry args={[0.46, g.length]} />
              <meshStandardMaterial
                color={dark ? "#b89a6a" : "#e9d5a6"}
                transparent
                opacity={0.08 + Math.min(1, share * 1.6) * 0.72}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-1}
                roughness={1}
              />
            </mesh>
            {Array.from({ length: visibleSteps }, (_, s) => {
              const t = (s + 0.7) / (STEPS + 0.5);
              const side = s % 2 === 0 ? 1 : -1;
              const px = HUB.x + g.dir.x * g.length * t + g.dir.z * 0.09 * side;
              const pz = HUB.z + g.dir.z * g.length * t - g.dir.x * 0.09 * side;
              return (
                <mesh key={s} position={[px, 0.012, pz]} rotation={[-Math.PI / 2, 0, g.angle]} scale={[0.6, 1, 1]}>
                  <circleGeometry args={[0.065, 10]} />
                  <meshBasicMaterial color="#7c5a3a" transparent opacity={0.55} depthWrite={false} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
