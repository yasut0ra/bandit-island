"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { EffectLevel } from "./layout";

const GRAVITY = -9.5;
const BURST_LIFE = 1.5;
const GEM_COLORS = ["#67e8f9", "#f472b6", "#a78bfa", "#4ade80"];

interface Particle {
  kind: "coin" | "gem" | "star";
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  color: string;
}

function makeParticles(count: number, seed: number): Particle[] {
  const rand = (i: number) => {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => {
    const angle = rand(i) * Math.PI * 2;
    const spread = 0.8 + rand(i + 50) * 1.3;
    const kind: Particle["kind"] = i % 3 === 0 ? "gem" : i % 5 === 1 ? "star" : "coin";
    return {
      kind,
      velocity: new THREE.Vector3(Math.cos(angle) * spread, 4.2 + rand(i + 99) * 2.2, Math.sin(angle) * spread),
      spin: new THREE.Vector3(rand(i + 3) * 10, rand(i + 4) * 10, rand(i + 5) * 10),
      color: GEM_COLORS[i % GEM_COLORS.length],
    };
  });
}

/** Coins, gems and sparkles bursting out of a winning chest, plus a pillar of light. */
export function RewardBurst({ position, level, seed }: { position: THREE.Vector3; level: EffectLevel; seed: number }) {
  const particles = useMemo(() => makeParticles(level === "full" ? 18 : 8, seed), [level, seed]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const born = useRef(performance.now() / 1000);
  const materials = useMemo(
    () => ({
      coin: new THREE.MeshStandardMaterial({ color: "#fcd34d", metalness: 0.7, roughness: 0.25, emissive: "#f59e0b", emissiveIntensity: 0.5, transparent: true }),
      star: new THREE.MeshStandardMaterial({ color: "#fff7ae", emissive: "#fde047", emissiveIntensity: 1.8, transparent: true }),
      gems: GEM_COLORS.map(
        (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.15, transparent: true, flatShading: true }),
      ),
    }),
    [],
  );

  useFrame(() => {
    const age = performance.now() / 1000 - born.current;
    const fade = THREE.MathUtils.clamp((BURST_LIFE - age) / 0.45, 0, 1);
    materials.coin.opacity = fade;
    materials.star.opacity = fade;
    materials.gems.forEach((m) => (m.opacity = fade));
    particles.forEach((p, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const t = Math.min(age, 1.2);
      const y = 0.55 + p.velocity.y * t + 0.5 * GRAVITY * t * t;
      mesh.position.set(p.velocity.x * t, Math.max(0.06, y), p.velocity.z * t);
      mesh.rotation.set(p.spin.x * age, p.spin.y * age, p.spin.z * age);
    });
    if (beam.current) beam.current.opacity = 0.45 * Math.max(0, 1 - age / 0.9);
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.28, 0.5, 3.2, 16, 1, true]} />
        <meshBasicMaterial ref={beam} color="#fff3b0" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          material={p.kind === "coin" ? materials.coin : p.kind === "star" ? materials.star : materials.gems[i % GEM_COLORS.length]}
          castShadow
        >
          {p.kind === "coin" && <cylinderGeometry args={[0.11, 0.11, 0.04, 12]} />}
          {p.kind === "gem" && <octahedronGeometry args={[0.11, 0]} />}
          {p.kind === "star" && <tetrahedronGeometry args={[0.08, 0]} />}
        </mesh>
      ))}
    </group>
  );
}

/** Small grey puffs and a "ハズレ" when the chest was empty. */
export function MissPuff({ position, level }: { position: THREE.Vector3; level: EffectLevel }) {
  const group = useRef<THREE.Group>(null);
  const born = useRef(performance.now() / 1000);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#cbd5e1", transparent: true, opacity: 0.8, depthWrite: false, flatShading: true }),
    [],
  );
  const puffs = useMemo(
    () => Array.from({ length: level === "full" ? 7 : 4 }, (_, i) => ({ angle: (i / 7) * Math.PI * 2 + 0.3, lift: 0.3 + (i % 3) * 0.15 })),
    [level],
  );

  useFrame(() => {
    const age = performance.now() / 1000 - born.current;
    const k = Math.min(1, age / 1.1);
    material.opacity = 0.75 * (1 - k);
    group.current?.children.forEach((child, i) => {
      const p = puffs[i];
      child.position.set(Math.cos(p.angle) * 0.5 * k, 0.6 + p.lift * k, Math.sin(p.angle) * 0.5 * k);
      child.scale.setScalar(0.5 + k * 0.9);
    });
  });

  return (
    <group position={position}>
      <group ref={group}>
        {puffs.map((_, i) => (
          <mesh key={i} material={material}>
            <icosahedronGeometry args={[0.13, 0]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** One persistent point light that flashes gold at the chest on every win. */
export function RewardFlash({
  lastEvent,
  positions,
  enabled,
}: {
  lastEvent: { id: number; arm: number; reward: 0 | 1 } | null;
  positions: THREE.Vector3[];
  enabled: boolean;
}) {
  const light = useRef<THREE.PointLight>(null);
  const flashAt = useRef(-Infinity);
  const lastId = useRef<number | null>(null);

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    if (lastEvent && lastEvent.id !== lastId.current) {
      lastId.current = lastEvent.id;
      if (lastEvent.reward === 1 && enabled) {
        flashAt.current = performance.now() / 1000;
        l.position.set(positions[lastEvent.arm].x, 1.1, positions[lastEvent.arm].z);
      }
    }
    const age = performance.now() / 1000 - flashAt.current;
    l.intensity = 9 * Math.pow(Math.max(0, 1 - age / 0.8), 2);
  });

  return <pointLight ref={light} color="#fde68a" intensity={0} distance={5} decay={2} />;
}
