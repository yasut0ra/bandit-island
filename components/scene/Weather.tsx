"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const DROPS = 520;
const RADIUS = 7.5;
const TOP = 9;
const BOTTOM = -2;

function seeded(i: number): number {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Rain streaks or snowflakes. Always mounted (no material churn); fades in and out,
 * and switches look by kind.
 */
export function Precipitation({ kind }: { kind: "rain" | "snow" | null }) {
  const active = kind !== null;
  const snow = kind === "snow";
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#d9efff", transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const geometry = useMemo(() => new THREE.BoxGeometry(0.018, 0.42, 0.018), []);
  const drops = useMemo(
    () =>
      Array.from({ length: DROPS }, (_, i) => {
        const r = Math.sqrt(seeded(i)) * RADIUS;
        const a = seeded(i + 500) * Math.PI * 2;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: BOTTOM + seeded(i + 900) * (TOP - BOTTOM), speed: 9 + seeded(i + 77) * 4 };
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    material.opacity = THREE.MathUtils.damp(material.opacity, active ? (snow ? 0.9 : 0.55) : 0, 4, delta);
    m.visible = material.opacity > 0.01;
    if (!m.visible) return;
    const t = performance.now() / 1000;
    drops.forEach((d, i) => {
      d.y -= d.speed * delta * (snow ? 0.12 : 1);
      if (d.y < BOTTOM) d.y = TOP;
      // Drops landing on the island stop at its surface.
      const onIsland = Math.hypot(d.x, d.z) < 5.3 && d.y < 0;
      const sway = snow ? Math.sin(t * 1.3 + i) * 0.25 : 0.12 * (d.y / TOP);
      dummy.position.set(d.x + sway, onIsland ? 0.2 : d.y, d.z);
      dummy.rotation.set(0, 0, snow ? t + i : 0.12);
      // snowflakes: small chunky cubes; rain: thin streaks
      if (snow) dummy.scale.set(4.5, 0.2, 4.5);
      else dummy.scale.set(1, 1, 1);
      if (onIsland) dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, DROPS]} frustumCulled={false} />;
}

export type Climate = { kind: "weather"; context: number } | { kind: "temperature"; level: number; feature: number };

export interface WeatherLook {
  precipitation: "rain" | "snow" | null;
  sunMul: number;
  hemiMul: number;
  sunColor: string;
  fog: string;
  cloud: string;
}

/** How the climate tints the light (null = the classic island). */
export function climateLook(climate: Climate | null, dark: boolean): WeatherLook {
  const base: WeatherLook = {
    precipitation: null,
    sunMul: 1,
    hemiMul: 1,
    sunColor: dark ? "#c3c8ff" : "#fff6e8",
    fog: dark ? "#3c2f6e" : "#ffe6f2",
    cloud: dark ? "#575c9e" : "#ffffff",
  };
  if (climate?.kind === "temperature") {
    // cold → cool blue light and snow; hot → strong warm sun
    const t = climate.feature;
    const cold = new THREE.Color(dark ? "#a9c4ff" : "#d6e8ff");
    const hot = new THREE.Color(dark ? "#ffd2a8" : "#ffd08a");
    return {
      ...base,
      precipitation: t <= 0.27 ? "snow" : null,
      sunMul: 0.75 + 0.55 * t,
      sunColor: `#${cold.lerp(hot, t).getHexString()}`,
      fog: dark ? base.fog : `#${new THREE.Color("#e3eeff").lerp(new THREE.Color("#ffe7cf"), t).getHexString()}`,
    };
  }
  const weather = climate?.kind === "weather" ? climate.context : null;
  if (weather === 0) return { ...base, sunMul: 1.2, sunColor: dark ? "#d8d2ff" : "#fff1cc", fog: dark ? base.fog : "#fff1d6" };
  if (weather === 1) return { ...base, precipitation: "rain", sunMul: 0.45, hemiMul: 0.85, fog: dark ? "#2f3060" : "#cfdaee", cloud: dark ? "#4a4e86" : "#c9d1e6" };
  if (weather === 2) return { ...base, sunMul: 0.6, hemiMul: 0.95, fog: dark ? "#363466" : "#e7e3f2", cloud: dark ? "#525690" : "#e3e1ef" };
  return base;
}
