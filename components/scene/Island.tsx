"use client";

import { Outlines } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { INK, Toon } from "./materials";
import { CHEST_POSITIONS, HUB } from "./layout";

const GRASS_COUNT = 260;

function seeded(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Swaying grass blades (one instanced mesh). */
function Grass({ color }: { color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const blades = useMemo(() => {
    const list: { x: number; z: number; phase: number; scale: number; yaw: number }[] = [];
    let i = 0;
    while (list.length < GRASS_COUNT && i < 5000) {
      i++;
      const r = Math.sqrt(seeded(i)) * 4.9;
      const a = seeded(i + 999) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const nearChest = CHEST_POSITIONS.some((p) => Math.hypot(p.x - x, p.z - z) < 0.75);
      if (nearChest || Math.hypot(HUB.x - x, HUB.z - z) < 0.6) continue;
      list.push({ x, z, phase: seeded(i + 42) * Math.PI * 2, scale: 0.6 + seeded(i + 7) * 0.8, yaw: a });
    }
    return list;
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.05, 0.32, 3);
    g.translate(0, 0.16, 0);
    return g;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    blades.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [blades, dummy]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    blades.forEach((b, i) => {
      const sway = Math.sin(t * 1.7 + b.phase + b.x * 0.4) * 0.22;
      dummy.position.set(b.x, 0, b.z);
      dummy.rotation.set(Math.cos(t * 1.3 + b.phase) * 0.08, b.yaw, sway);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, blades.length]} castShadow={false} receiveShadow>
      <Toon color={color} />
    </instancedMesh>
  );
}

function Tree({ position, scale = 1, kind = "round" }: { position: [number, number, number]; scale?: number; kind?: "round" | "pine" }) {
  const ref = useRef<THREE.Group>(null);
  const phase = position[0] * 1.7 + position[2];
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + phase) * 0.03;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 0.9, 6]} />
        <Toon color="#8a5a3b" />
      </mesh>
      <group ref={ref} position={[0, 0.8, 0]}>
        {kind === "round" ? (
          <>
            <mesh position={[0, 0.45, 0]} castShadow>
              <icosahedronGeometry args={[0.62, 0]} />
              <Toon color="#7fb563" />
              <Outlines thickness={0.02} color={INK} />
            </mesh>
            <mesh position={[0.32, 0.25, 0.1]} castShadow>
              <icosahedronGeometry args={[0.38, 0]} />
              <Toon color="#6aa257" />
              <Outlines thickness={0.02} color={INK} />
            </mesh>
            <mesh position={[-0.28, 0.3, -0.12]} castShadow>
              <icosahedronGeometry args={[0.34, 0]} />
              <Toon color="#8cc26b" />
              <Outlines thickness={0.02} color={INK} />
            </mesh>
          </>
        ) : (
          <>
            {[0, 0.42, 0.78].map((y, i) => (
              <mesh key={y} position={[0, y + 0.2, 0]} castShadow>
                <coneGeometry args={[0.62 - i * 0.16, 0.7, 7]} />
                <Toon color={i === 1 ? "#4f8f64" : "#5c9d6c"} />
                <Outlines thickness={0.02} color={INK} />
              </mesh>
            ))}
          </>
        )}
      </group>
    </group>
  );
}

function Rock({ position, scale = 1, rotation = 0 }: { position: [number, number, number]; scale?: number; rotation?: number }) {
  return (
    <mesh position={position} scale={scale} rotation={[0.3, rotation, 0.2]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.28, 0]} />
      <Toon color="#a8a29e" />
    </mesh>
  );
}

function Mushroom({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.18, 6]} />
        <Toon color="#fef3c7" />
      </mesh>
      <mesh position={[0, 0.19, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Toon color="#ef4444" />
      </mesh>
      <mesh position={[0.05, 0.27, 0.04]}>
        <sphereGeometry args={[0.022, 6, 4]} />
        <Toon color="#ffffff" />
      </mesh>
    </group>
  );
}

const FLOWER_COLORS = ["#f4b8b0", "#f7e2a0", "#fffaf0", "#f4b8b0", "#fffaf0"];

function Flowers() {
  const flowers = useMemo(() => {
    const list: { pos: [number, number, number]; color: string }[] = [];
    for (let i = 0; list.length < 26 && i < 400; i++) {
      const r = 1.2 + seeded(i + 300) * 3.6;
      const a = seeded(i + 600) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (CHEST_POSITIONS.some((p) => Math.hypot(p.x - x, p.z - z) < 0.9)) continue;
      if (Math.hypot(HUB.x - x, HUB.z - z) < 0.8) continue;
      list.push({ pos: [x, 0.1, z], color: FLOWER_COLORS[i % FLOWER_COLORS.length] });
    }
    return list;
  }, []);
  return (
    <>
      {flowers.map((f, i) => (
        <mesh key={i} position={f.pos} castShadow>
          <icosahedronGeometry args={[0.065, 0]} />
          <Toon color={f.color} emissive={f.color} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </>
  );
}

/** Wooden signpost + lantern where the robot waits. */
function Signpost({ dark }: { dark: boolean }) {
  return (
    <group position={[HUB.x - 0.85, 0, HUB.z + 0.35]} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1, 6]} />
        <Toon color="#8a5a3b" />
      </mesh>
      <mesh position={[0.18, 0.82, 0]} rotation={[0, 0, -0.08]} castShadow>
        <boxGeometry args={[0.5, 0.18, 0.05]} />
        <Toon color="#c08552" />
      </mesh>
      <mesh position={[0, 1.07, 0]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <Toon color="#fde68a" emissive="#fbbf24" emissiveIntensity={dark ? 2.5 : 0.6} />
      </mesh>
      {/* Always mounted: changing the number of lights forces every shader to recompile. */}
      <pointLight position={[0, 1.1, 0.1]} color="#fbbf24" intensity={dark ? 3 : 0} distance={4.5} decay={2} />
    </group>
  );
}

export function Island({ dark }: { dark: boolean }) {
  return (
    <group>
      {/* grass top */}
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <cylinderGeometry args={[5.4, 5.25, 0.44, 16]} />
        <Toon color={dark ? "#4f8a5c" : "#a3cf7d"} />
      </mesh>
      {/* grass lip */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[5.3, 5.05, 0.22, 16]} />
        <Toon color={dark ? "#3f7450" : "#8bbd68"} />
      </mesh>
      {/* earth layers */}
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[5.05, 4.4, 0.9, 12]} />
        <Toon color="#c98d5a" />
      </mesh>
      <mesh position={[0, -3.1, 0]} rotation={[Math.PI, 0.2, 0]}>
        <coneGeometry args={[4.4, 3.2, 10]} />
        <Toon color="#a86f45" />
      </mesh>
      <mesh position={[1.4, -2.6, 0.8]} rotation={[Math.PI, 0, 0.1]}>
        <coneGeometry args={[1.4, 2.2, 7]} />
        <Toon color="#94603c" />
      </mesh>
      <mesh position={[-1.8, -2.3, -0.6]} rotation={[Math.PI, 0, -0.1]}>
        <coneGeometry args={[1.2, 1.8, 7]} />
        <Toon color="#b77b4e" />
      </mesh>

      <Grass color={dark ? "#487f57" : "#86b965"} />
      <Flowers />

      <Tree position={[-4.1, 0, -1.6]} scale={1.15} />
      <Tree position={[-3.2, 0, -3.3]} scale={0.9} kind="pine" />
      <Tree position={[3.9, 0, -2.2]} scale={1.05} kind="pine" />
      <Tree position={[4.3, 0, 0.9]} scale={0.85} />
      <Tree position={[-4.4, 0, 1.4]} scale={0.8} kind="pine" />
      <Tree position={[1.3, 0, -4.4]} scale={0.75} />

      <Rock position={[2.6, 0.08, 2.6]} scale={1.3} rotation={0.4} />
      <Rock position={[2.95, 0.05, 2.35]} scale={0.7} rotation={1.2} />
      <Rock position={[-2.6, 0.06, 2.9]} scale={1} rotation={2} />
      <Rock position={[-1.1, 0.05, -4.3]} scale={0.9} />
      <Rock position={[4.6, 0.05, -0.6]} scale={0.8} />

      <Mushroom position={[-2.2, 0, 2.4]} />
      <Mushroom position={[-2.0, 0, 2.6]} />
      <Mushroom position={[3.4, 0, 1.7]} />

      <Signpost dark={dark} />
    </group>
  );
}
