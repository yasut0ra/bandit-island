"use client";

import { Float, Sparkles, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

function Cloud({ position, scale = 1, dark }: { position: [number, number, number]; scale?: number; dark: boolean }) {
  const color = dark ? "#8b95c9" : "#ffffff";
  return (
    <group position={position} scale={scale}>
      {[
        [0, 0, 0, 0.9],
        [0.9, -0.1, 0.1, 0.7],
        [-0.85, -0.15, -0.05, 0.65],
        [0.35, 0.35, -0.1, 0.6],
        [-0.3, 0.3, 0.2, 0.5],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={color} flatShading roughness={1} emissive={color} emissiveIntensity={dark ? 0.05 : 0.18} />
        </mesh>
      ))}
    </group>
  );
}

function MiniIsland({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <Float speed={1.2} floatIntensity={1.2} rotationIntensity={0.3}>
      <group position={position} scale={scale}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.62, 0.2, 7]} />
          <meshStandardMaterial color="#8bd46e" flatShading />
        </mesh>
        <mesh position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.62, 0.9, 7]} />
          <meshStandardMaterial color="#a86f45" flatShading />
        </mesh>
        <mesh position={[0.15, 0.3, 0]}>
          <icosahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial color="#5fbf5a" flatShading />
        </mesh>
      </group>
    </Float>
  );
}

export function SkyEnvironment({ dark }: { dark: boolean }) {
  const clouds = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (clouds.current) clouds.current.rotation.y += delta * 0.015;
  });

  return (
    <>
      <group ref={clouds}>
        <Cloud position={[-9, 1.8, -6]} scale={1.3} dark={dark} />
        <Cloud position={[8.5, 2.6, -7]} scale={1.1} dark={dark} />
        <Cloud position={[10, -2.5, 2]} scale={1.5} dark={dark} />
        <Cloud position={[-10.5, -3, 3]} scale={1.6} dark={dark} />
        <Cloud position={[2, -4.5, -9]} scale={1.8} dark={dark} />
        <Cloud position={[-4, 3.8, -11]} scale={1.2} dark={dark} />
        <Cloud position={[5, -5, 6]} scale={1.4} dark={dark} />
      </group>
      <MiniIsland position={[-7.2, -0.8, -2.5]} scale={0.9} />
      <MiniIsland position={[7, 0.6, -3.8]} scale={0.7} />
      <MiniIsland position={[5.8, -2.4, 4.2]} scale={0.55} />
      <Sparkles
        count={dark ? 60 : 36}
        scale={[11, 3.5, 9]}
        position={[0, 1.6, -0.5]}
        size={dark ? 4 : 2.5}
        speed={0.35}
        opacity={dark ? 0.9 : 0.6}
        color={dark ? "#d9f99d" : "#fff7cc"}
      />
      {dark && <Stars radius={70} depth={30} count={1800} factor={3.5} saturation={0} fade speed={0.6} />}
    </>
  );
}
