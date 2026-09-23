"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { uncertainty, type ArmStats, type DecisionMode } from "@/lib/bandits/index.ts";
import { CHESTS, chestColor } from "@/lib/island";
import { Agent } from "./Agent";
import { Chest } from "./Chest";
import { MissPuff, RewardBurst, RewardFlash } from "./Effects";
import { SkyEnvironment } from "./Environment";
import { Island } from "./Island";
import { CHEST_POSITIONS, CHEST_ROTATIONS, effectLevel, type EffectLevel } from "./layout";
import { Paths } from "./Paths";
import { HtmlLayerContext } from "./SceneHtml";

export interface IslandSceneProps {
  probs: readonly number[];
  arms: readonly ArmStats[];
  turn: number;
  showTrueProbs: boolean;
  pending: { id: number; arm: number; mode: DecisionMode } | null;
  lastEvent: { id: number; arm: number; reward: 0 | 1; mode: DecisionMode } | null;
  turnMs: number;
  estimatedBest: number | null;
  dark: boolean;
}

interface ActiveEffect {
  id: number;
  arm: number;
  reward: 0 | 1;
  level: EffectLevel;
}

const EFFECT_LIFETIME_MS = 1600;

function Effects({ lastEvent, turnMs }: Pick<IslandSceneProps, "lastEvent" | "turnMs">) {
  const [effects, setEffects] = useState<ActiveEffect[]>([]);

  useEffect(() => {
    if (!lastEvent) return;
    const level = effectLevel(turnMs);
    if (level === "none") return;
    const effect: ActiveEffect = { id: lastEvent.id, arm: lastEvent.arm, reward: lastEvent.reward, level };
    setEffects((list) => [...list.slice(-5), effect]);
    const timer = setTimeout(() => setEffects((list) => list.filter((e) => e.id !== effect.id)), EFFECT_LIFETIME_MS);
    return () => clearTimeout(timer);
    // Only react to new events, not to speed changes.
  }, [lastEvent?.id]);

  return (
    <>
      {effects.map((e) =>
        e.reward === 1 ? (
          <RewardBurst key={e.id} position={CHEST_POSITIONS[e.arm]} level={e.level} seed={e.id} />
        ) : (
          <MissPuff key={e.id} position={CHEST_POSITIONS[e.arm]} level={e.level} />
        ),
      )}
    </>
  );
}

const CAMERA_TARGET = new THREE.Vector3(0, 0.3, -0.4);
const CAMERA_DIRECTION = new THREE.Vector3(0, 6.9, 12.2).normalize();

/** Pulls the camera back on narrow (portrait) screens so the whole island fits. */
function ResponsiveCamera() {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useEffect(() => {
    const distance = 14 * THREE.MathUtils.clamp(1.2 / aspect, 1, 1.9);
    camera.position.copy(CAMERA_TARGET).addScaledVector(CAMERA_DIRECTION, distance);
    camera.lookAt(CAMERA_TARGET);
  }, [aspect, camera]);
  return null;
}

function SceneContents(props: IslandSceneProps) {
  const { arms, turn, dark, pending, lastEvent, turnMs } = props;
  const shares = arms.map((a) => (turn > 0 ? a.pulls / turn : 0));

  return (
    <>
      <fog attach="fog" args={[dark ? "#1b1f45" : "#ffe9d2", 22, 48]} />
      <hemisphereLight args={[dark ? "#6d7fd6" : "#d6ecff", dark ? "#1e293b" : "#86c96a", dark ? 0.55 : 1.15]} />
      <ambientLight intensity={dark ? 0.18 : 0.25} />
      <directionalLight
        position={[5, 10, 6]}
        color={dark ? "#b8c6ff" : "#fff1dc"}
        intensity={dark ? 0.9 : 2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={5}
      />

      <SkyEnvironment dark={dark} />
      <Island dark={dark} />
      <Paths shares={shares} dark={dark} />

      {CHESTS.map((chest, i) => (
        <Chest
          key={i}
          index={i}
          name={chest.name}
          color={chestColor(i, dark)}
          position={CHEST_POSITIONS[i]}
          rotationY={CHEST_ROTATIONS[i]}
          pulls={arms[i].pulls}
          successes={arms[i].successes}
          share={shares[i]}
          uncertainty={uncertainty(arms[i])}
          trueProb={props.probs[i]}
          showTrueProb={props.showTrueProbs}
          isBest={props.estimatedBest === i}
          isTarget={pending?.arm === i}
          lastOpen={lastEvent && lastEvent.arm === i ? lastEvent : null}
          turnMs={turnMs}
        />
      ))}

      <Agent pending={pending} lastEvent={lastEvent} turnMs={turnMs} />
      <Effects lastEvent={lastEvent} turnMs={turnMs} />
      <RewardFlash lastEvent={lastEvent} positions={CHEST_POSITIONS} enabled={effectLevel(turnMs) !== "none"} />

      <ResponsiveCamera />
      <OrbitControls
        makeDefault
        target={CAMERA_TARGET.toArray()}
        enablePan={false}
        enableZoom={false}
        enableDamping
        minPolarAngle={0.55}
        maxPolarAngle={1.3}
        minAzimuthAngle={-1}
        maxAzimuthAngle={1}
      />
    </>
  );
}

export default function IslandScene(props: IslandSceneProps) {
  const htmlLayer = useRef<HTMLDivElement>(null);
  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 7.2, 12.2], fov: 42, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: true }}
        aria-label="宝箱が並ぶ3Dの島。ロボットが宝箱を選んで開けます。"
      >
        <HtmlLayerContext.Provider value={htmlLayer}>
          <SceneContents {...props} />
        </HtmlLayerContext.Provider>
      </Canvas>
      <div ref={htmlLayer} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
