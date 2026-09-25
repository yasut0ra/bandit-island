"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { INK, Toon } from "./materials";
import { SceneHtml } from "./SceneHtml";
import { formatPercent } from "@/lib/island";

const LID_OPEN = -1.95;
/** Small, fixed tilts so the paper tags look pinned by hand. */
const LABEL_TILTS = [-4, 2.5, -1.5, 3, -2.5];
const GOLD = "#f5c542";

export interface ChestProps {
  index: number;
  name: string;
  color: string;
  position: THREE.Vector3;
  rotationY: number;
  pulls: number;
  successes: number;
  /** Share of all turns spent on this chest (0–1). */
  share: number;
  uncertainty: number;
  trueProb: number;
  showTrueProb: boolean;
  isBest: boolean;
  isTarget: boolean;
  lastOpen: { id: number; reward: 0 | 1 } | null;
  turnMs: number;
}

/** Lavender fog around a chest: thick when unknown, clears as evidence accumulates. */
function UncertaintyMist({ uncertainty }: { uncertainty: number }) {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c9bfee",
        emissive: "#9d8fd8",
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        flatShading: true,
        roughness: 1,
      }),
    [],
  );
  const puffs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        angle: (i / 8) * Math.PI * 2,
        radius: 0.78 + (i % 3) * 0.08,
        y: 0.2 + (i % 4) * 0.16,
        size: 0.16 + (i % 3) * 0.05,
        phase: i * 1.3,
      })),
    [],
  );
  const current = useRef({ opacity: 0.5, scale: 1 });

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const u = uncertainty;
    const c = current.current;
    c.opacity = THREE.MathUtils.damp(c.opacity, 0.4 * Math.pow(u, 1.4), 3, delta);
    c.scale = THREE.MathUtils.damp(c.scale, 0.55 + 0.5 * u, 3, delta);
    material.opacity = c.opacity;
    g.visible = c.opacity > 0.015;
    g.rotation.y = clock.elapsedTime * 0.25;
    g.scale.setScalar(c.scale);
    g.children.forEach((child, i) => {
      const p = puffs[i];
      child.position.y = p.y + Math.sin(clock.elapsedTime * 1.2 + p.phase) * 0.08;
    });
  });

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh
          key={i}
          position={[Math.cos(p.angle) * p.radius, p.y, Math.sin(p.angle) * p.radius]}
          material={material}
        >
          <icosahedronGeometry args={[p.size, 0]} />
        </mesh>
      ))}
    </group>
  );
}

/** Pile of coins that grows (log-scale) with the successes collected from this chest. */
function CoinPile({ successes }: { successes: number }) {
  const count = successes === 0 ? 0 : Math.min(14, 1 + Math.floor(Math.log2(successes + 1) * 1.8));
  const coins = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const stack = i % 3;
        const level = Math.floor(i / 3);
        return {
          x: 0.68 + stack * 0.2 + Math.sin(i * 7.1) * 0.02,
          z: 0.12 - stack * 0.12 + Math.cos(i * 3.3) * 0.02,
          y: 0.03 + level * 0.055,
          rot: i * 0.9,
        };
      }),
    [],
  );
  return (
    <group>
      {coins.slice(0, count).map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} rotation={[0, c.rot, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.045, 12]} />
          <Toon color={GOLD} emissive="#b45309" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function BestStar() {
  const ref = useRef<THREE.Mesh>(null);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.2 : 0.09;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 1.6;
    ref.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 2.2) * 0.06;
  });
  return (
    <mesh ref={ref} position={[0, 1.2, 0]} castShadow>
      <extrudeGeometry args={[shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }]} />
      <Toon color="#fde047" emissive="#facc15" emissiveIntensity={0.7} />
    </mesh>
  );
}

export function Chest(props: ChestProps) {
  const { color, position, rotationY, pulls, successes, share, uncertainty, isBest, isTarget, lastOpen, turnMs } = props;
  const lid = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const openState = useRef({ openedAt: -Infinity, reward: 0 as 0 | 1 });

  useEffect(() => {
    if (lastOpen) openState.current = { openedAt: performance.now() / 1000, reward: lastOpen.reward };
  }, [lastOpen]);

  useFrame(({ clock }, delta) => {
    const now = performance.now() / 1000;
    const { openedAt, reward } = openState.current;
    const elapsed = now - openedAt;
    const hold = THREE.MathUtils.clamp((turnMs * 0.36) / 1000, 0.06, 0.9);
    const fast = turnMs < 400;

    if (lid.current) {
      const target = elapsed < hold ? LID_OPEN : 0;
      lid.current.rotation.x = THREE.MathUtils.damp(lid.current.rotation.x, target, fast ? 30 : 9, delta);
    }
    if (body.current) {
      const wobbleT = fast ? 0.2 : 0.6;
      if (reward === 0 && elapsed < wobbleT) {
        body.current.rotation.z = Math.sin(elapsed * 38) * 0.07 * (1 - elapsed / wobbleT);
        body.current.scale.setScalar(1);
      } else if (reward === 1 && elapsed < 0.35) {
        body.current.rotation.z = 0;
        body.current.scale.setScalar(1 + Math.sin((elapsed / 0.35) * Math.PI) * 0.08);
      } else {
        body.current.rotation.z = 0;
        body.current.scale.setScalar(1);
      }
    }
    if (ring.current && glow.current) {
      const pulse = isTarget ? 0.25 + Math.sin(clock.elapsedTime * 8) * 0.12 : 0;
      glow.current.opacity = Math.min(0.95, 0.12 + share * 0.8 + pulse);
      const s = 1 + (isTarget ? Math.sin(clock.elapsedTime * 8) * 0.05 : 0);
      ring.current.scale.set(s, s, s);
    }
  });

  const estimate = pulls > 0 ? successes / pulls : null;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* popularity glow on the ground */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.78, 0.98, 32]} />
        <meshBasicMaterial ref={glow} color={color} transparent opacity={0.2} depthWrite={false} />
      </mesh>

      <group ref={body}>
        {/* base */}
        <RoundedBox args={[1, 0.52, 0.7]} radius={0.05} position={[0, 0.26, 0]} castShadow receiveShadow>
          <Toon color="#9a6035" />
          <Outlines thickness={0.022} color={INK} />
        </RoundedBox>
        {/* inside (visible when open) */}
        <mesh position={[0, 0.521, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.6]} />
          <Toon color="#3b2412" emissive={GOLD} emissiveIntensity={0.25} />
        </mesh>
        {/* gold bands */}
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0.26, 0]} castShadow>
            <boxGeometry args={[0.09, 0.54, 0.72]} />
            <Toon color={GOLD} />
          </mesh>
        ))}
        {/* lock */}
        <mesh position={[0, 0.42, 0.36]} castShadow>
          <boxGeometry args={[0.16, 0.18, 0.05]} />
          <Toon color={GOLD} />
        </mesh>

        {/* lid, hinged at the back edge */}
        <group ref={lid} position={[0, 0.52, -0.35]}>
          <mesh position={[0, 0, 0.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 1, 14, 1, false, 0, Math.PI]} />
            <Toon color={color} side={THREE.DoubleSide} />
            <Outlines thickness={0.022} color={INK} />
          </mesh>
          {[-0.34, 0.34].map((x) => (
            <mesh key={x} position={[x, 0, 0.35]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.365, 0.365, 0.09, 14, 1, false, 0, Math.PI]} />
              <Toon color={GOLD} side={THREE.DoubleSide} />
            </mesh>
          ))}
          <mesh position={[0, 0.02, 0.71]}>
            <boxGeometry args={[0.12, 0.12, 0.04]} />
            <Toon color={GOLD} />
          </mesh>
        </group>
      </group>

      <UncertaintyMist uncertainty={uncertainty} />
      <CoinPile successes={successes} />
      {isBest && <BestStar />}

      <SceneHtml position={[0, 1.62, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
        <div
          className={`chest-label ${isTarget ? "chest-label--target" : ""}`}
          style={{ "--chest": color, "--tilt": `${LABEL_TILTS[props.index]}deg` } as React.CSSProperties}
        >
          <div className="font-bold whitespace-nowrap">
            {props.name}
            {isBest && <span className="ml-0.5 text-[#c07a1e]">★</span>}
          </div>
          <div className="t-num text-[15px] leading-tight font-semibold whitespace-nowrap">
            {estimate === null ? "？" : formatPercent(estimate)}
          </div>
          <div className="text-[9px] whitespace-nowrap text-[#8a7b68]">{pulls}回</div>
          {props.showTrueProb && (
            <div className="mt-0.5 border-t border-dashed border-[#d8cab2] pt-0.5 text-[10px] font-bold whitespace-nowrap text-[#2e2620]">
              答え {formatPercent(props.trueProb)}
            </div>
          )}
          {lastOpen && turnMs >= 1000 && (
            <div key={lastOpen.id} className={`float-text ${lastOpen.reward ? "float-text--win" : "float-text--miss"}`}>
              {lastOpen.reward ? "当たり！" : "ハズレ…"}
            </div>
          )}
        </div>
      </SceneHtml>
    </group>
  );
}
