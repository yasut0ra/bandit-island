"use client";

import { Html } from "@react-three/drei";
import { createContext, useContext, type ComponentProps, type RefObject } from "react";

/**
 * A DOM layer laid over the canvas. Giving drei <Html> a stable portal target
 * avoids it re-creating its React root right after mount (which can race and
 * leave a label empty).
 */
export const HtmlLayerContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function SceneHtml(props: Omit<ComponentProps<typeof Html>, "portal">) {
  const layer = useContext(HtmlLayerContext);
  return <Html {...props} portal={(layer ?? undefined) as RefObject<HTMLElement> | undefined} />;
}
