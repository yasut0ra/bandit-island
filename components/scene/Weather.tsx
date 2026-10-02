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

/** Rain streaks for the 雨 weather. Always mounted; fades in and out. */
export function Rain({ active }: { active: boolean }) {
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
    material.opacity = THREE.MathUtils.damp(material.opacity, active ? 0.55 : 0, 4, delta);
    m.visible = material.opacity > 0.01;
    if (!m.visible) return;
    drops.forEach((d, i) => {
      d.y -= d.speed * delta;
      if (d.y < BOTTOM) d.y = TOP;
      // Drops landing on the island stop at its surface.
      const onIsland = Math.hypot(d.x, d.z) < 5.3 && d.y < 0;
      dummy.position.set(d.x + 0.12 * (d.y / TOP), onIsland ? 0.2 : d.y, d.z);
      dummy.rotation.set(0, 0, 0.12);
      dummy.scale.set(1, onIsland ? 0.001 : 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, DROPS]} frustumCulled={false} />;
}

export interface WeatherLook {
  sunMul: number;
  hemiMul: number;
  sunColor: string;
  fog: string;
  cloud: string;
}

/** How each weather tints the light (null = the classic island). */
export function weatherLook(weather: number | null, dark: boolean): WeatherLook {
  const base: WeatherLook = {
    sunMul: 1,
    hemiMul: 1,
    sunColor: dark ? "#c3c8ff" : "#fff6e8",
    fog: dark ? "#3c2f6e" : "#ffe6f2",
    cloud: dark ? "#575c9e" : "#ffffff",
  };
  if (weather === 0) return { ...base, sunMul: 1.2, sunColor: dark ? "#d8d2ff" : "#fff1cc", fog: dark ? base.fog : "#fff1d6" };
  if (weather === 1) return { ...base, sunMul: 0.45, hemiMul: 0.85, fog: dark ? "#2f3060" : "#cfdaee", cloud: dark ? "#4a4e86" : "#c9d1e6" };
  if (weather === 2) return { ...base, sunMul: 0.6, hemiMul: 0.95, fog: dark ? "#363466" : "#e7e3f2", cloud: dark ? "#525690" : "#e3e1ef" };
  return base;
}
