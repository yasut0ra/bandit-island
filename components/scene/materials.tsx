"use client";

import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

let gradient: THREE.DataTexture | null = null;

/** Three-band ramp for a soft, hand-painted toon look. */
function toonGradient(): THREE.DataTexture {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

export function Toon(props: ThreeElements["meshToonMaterial"]) {
  return <meshToonMaterial gradientMap={toonGradient()} {...props} />;
}

/** Ink colour used for outlines, matching the UI's --ink. */
export const INK = "#2e2620";
