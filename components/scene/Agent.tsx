"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { INK, Toon } from "./materials";
import { SceneHtml } from "./SceneHtml";
import type { DecisionMode } from "@/lib/bandits/types";
import { EXPLOIT_COLOR, EXPLORE_COLOR } from "@/lib/island";
import { MOVE_FRACTION } from "@/hooks/useBanditSimulation";
import { CHEST_FRONTS, CHEST_POSITIONS, HUB } from "./layout";

export interface AgentProps {
  pending: { id: number; arm: number; mode: DecisionMode } | null;
  lastEvent: { id: number; arm: number; reward: 0 | 1; mode: DecisionMode } | null;
  turnMs: number;
}

function shortestAngle(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff;
}

/** A small, round robot that walks to the chosen chest and reacts to the result. */
export function Agent({ pending, lastEvent, turnMs }: AgentProps) {
  const root = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Mesh>(null);
  const footR = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const antenna = useRef<THREE.MeshToonMaterial>(null);

  const pos = useRef(HUB.clone());
  const reaction = useRef({ at: -Infinity, reward: 0 as 0 | 1 });
  const resultAt = useRef(-Infinity);
  const walkPhase = useRef(0);
  const colors = useMemo(
    () => ({
      explore: new THREE.Color(EXPLORE_COLOR),
      exploit: new THREE.Color(EXPLOIT_COLOR),
      idle: new THREE.Color("#67e8f9"),
    }),
    [],
  );

  useEffect(() => {
    if (!lastEvent) return;
    const now = performance.now() / 1000;
    reaction.current = { at: now, reward: lastEvent.reward };
    resultAt.current = now;
  }, [lastEvent]);

  const animated = turnMs >= 400;
  const mode = pending?.mode ?? lastEvent?.mode ?? null;

  useFrame(({ clock }, delta) => {
    const g = root.current;
    if (!g) return;
    const now = performance.now() / 1000;
    const t = clock.elapsedTime;

    // Where should the robot be?
    let target = HUB;
    let lookAt: THREE.Vector3 | null = null;
    if (pending) {
      target = CHEST_FRONTS[pending.arm];
      lookAt = CHEST_POSITIONS[pending.arm];
    } else if (lastEvent) {
      const hold = animated ? (turnMs * (1 - MOVE_FRACTION) * 0.35) / 1000 : Infinity;
      if (now - resultAt.current < hold) {
        target = CHEST_FRONTS[lastEvent.arm];
        lookAt = CHEST_POSITIONS[lastEvent.arm];
      }
    }

    // Move
    const toTarget = new THREE.Vector3().subVectors(target, pos.current).setY(0);
    const dist = toTarget.length();
    let moving = false;
    if (animated) {
      const speed = 3.9 / ((turnMs * MOVE_FRACTION * 0.85) / 1000);
      const stepLen = Math.min(dist, speed * delta);
      if (dist > 0.01) {
        pos.current.addScaledVector(toTarget.normalize(), stepLen);
        moving = dist > 0.04;
      }
    } else {
      pos.current.lerp(target, 1 - Math.exp(-22 * delta));
      moving = dist > 0.15;
    }

    // Face movement direction, the chest, or the camera.
    let desiredYaw = 0;
    if (moving) desiredYaw = Math.atan2(toTarget.x, toTarget.z);
    else if (lookAt) desiredYaw = Math.atan2(lookAt.x - pos.current.x, lookAt.z - pos.current.z);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, shortestAngle(g.rotation.y, desiredYaw), 10, delta);

    // Walk cycle
    if (moving) walkPhase.current += delta * (animated ? 16 : 30);
    const swing = moving ? Math.sin(walkPhase.current) : 0;
    const bob = moving ? Math.abs(Math.sin(walkPhase.current)) * 0.07 : Math.sin(t * 2) * 0.015;

    // Reaction to the result
    const since = now - reaction.current.at;
    let jump = 0;
    let armLift = 0;
    let headTilt = 0;
    if (!moving && since < 0.7 && animated) {
      if (reaction.current.reward === 1) {
        jump = Math.sin(Math.min(1, since / 0.5) * Math.PI) * 0.45;
        armLift = Math.sin(Math.min(1, since / 0.7) * Math.PI) * 2.4;
      } else {
        headTilt = Math.sin(since * 22) * 0.25 * (1 - since / 0.7);
      }
    }

    g.position.set(pos.current.x, bob + jump, pos.current.z);
    if (bodyRef.current) bodyRef.current.rotation.x = moving ? 0.08 : 0;
    if (head.current) {
      head.current.rotation.y = headTilt;
      head.current.rotation.z = Math.sin(t * 1.3) * 0.04;
    }
    if (armL.current) armL.current.rotation.x = swing * 0.7 - armLift;
    if (armR.current) armR.current.rotation.x = -swing * 0.7 - armLift;
    if (footL.current) footL.current.position.z = swing * 0.08;
    if (footR.current) footR.current.position.z = -swing * 0.08;
    if (eyes.current) {
      const blink = t % 3.6 < 0.12 ? 0.15 : 1;
      eyes.current.scale.y = blink;
    }
    if (antenna.current) {
      const c = mode === "explore" ? colors.explore : mode === "exploit" ? colors.exploit : colors.idle;
      antenna.current.color.lerp(c, 1 - Math.exp(-8 * delta));
      antenna.current.emissive.copy(antenna.current.color);
      antenna.current.emissiveIntensity = 1.2 + Math.sin(t * 6) * 0.4;
    }
  });

  return (
    <group ref={root} position={HUB.toArray()} scale={0.9}>
      <group ref={bodyRef}>
        {/* feet */}
        <mesh ref={footL} position={[-0.13, 0.07, 0]} castShadow>
          <sphereGeometry args={[0.1, 12, 8]} />
          <Toon color="#64748b" />
        </mesh>
        <mesh ref={footR} position={[0.13, 0.07, 0]} castShadow>
          <sphereGeometry args={[0.1, 12, 8]} />
          <Toon color="#64748b" />
        </mesh>
        {/* body */}
        <RoundedBox args={[0.5, 0.44, 0.4]} radius={0.14} position={[0, 0.38, 0]} castShadow>
          <Toon color="#f7f1e6" />
          <Outlines thickness={0.02} color={INK} />
        </RoundedBox>
        <mesh position={[0, 0.4, 0.201]}>
          <circleGeometry args={[0.08, 16]} />
          <Toon color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
        </mesh>
        {/* arms */}
        <group ref={armL} position={[-0.3, 0.52, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.16, 4, 8]} />
            <Toon color="#e2e8f0" />
          </mesh>
        </group>
        <group ref={armR} position={[0.3, 0.52, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.16, 4, 8]} />
            <Toon color="#e2e8f0" />
          </mesh>
        </group>
        {/* head */}
        <group ref={head} position={[0, 0.86, 0]}>
          <RoundedBox args={[0.64, 0.48, 0.5]} radius={0.17} castShadow>
            <Toon color="#fbf7ee" />
            <Outlines thickness={0.02} color={INK} />
          </RoundedBox>
          <RoundedBox args={[0.5, 0.3, 0.06]} radius={0.08} position={[0, 0, 0.23]}>
            <Toon color="#1e293b" />
          </RoundedBox>
          <group ref={eyes} position={[0, 0.02, 0.27]}>
            {[-0.11, 0.11].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <sphereGeometry args={[0.055, 12, 10]} />
                <Toon color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={1.6} />
              </mesh>
            ))}
          </group>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, -0.1, 0.262]} scale={[1, 0.6, 0.3]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <Toon color="#fb7185" emissive="#fb7185" emissiveIntensity={0.4} />
            </mesh>
          ))}
          {/* antenna: its light shows explore (violet) / exploit (amber) */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
            <Toon color="#94a3b8" />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <sphereGeometry args={[0.075, 14, 10]} />
            <Toon ref={antenna} color="#67e8f9" emissive="#67e8f9" emissiveIntensity={1.2} />
          </mesh>
        </group>
      </group>

      {/* Always mounted: unmounting drei <Html> every turn triggers React root warnings. */}
      <SceneHtml position={[0, 1.75, 0]} center zIndexRange={[22, 12]} style={{ pointerEvents: "none" }}>
        {pending && animated ? (
          <div
            key={pending.id}
            className={`agent-chip stamp ${pending.mode === "explore" ? "agent-chip--explore" : "agent-chip--exploit"}`}
          >
            {pending.mode === "explore" ? "探索" : "活用"}
          </div>
        ) : null}
      </SceneHtml>
    </group>
  );
}
