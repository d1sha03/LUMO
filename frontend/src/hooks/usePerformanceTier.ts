import { useEffect, useMemo, useRef, useState } from "react";
import type { PerformanceTier } from "@/types";
import { useIsMobile, useMediaQuery, usePrefersReducedMotion } from "./useMediaQueries";

/**
 * Chooses a rendering budget from device signals, then adapts live using a
 * rolling FPS sample. Everything downstream (particle counts, DPR, shadow
 * quality) reads from this so a weak phone never gets a desktop scene.
 */
export function usePerformanceTier(): PerformanceTier {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const coarse = useMediaQuery("(pointer: coarse)");
  const lowMem =
    typeof navigator !== "undefined" &&
    "deviceMemory" in navigator &&
    (navigator as unknown as { deviceMemory: number }).deviceMemory <= 4;

  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4;
  const [fps, setFps] = useState(60);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      frames.current++;
      if (now - last.current >= 2000) {
        setFps(Math.round((frames.current * 1000) / (now - last.current)));
        frames.current = 0;
        last.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return useMemo(() => {
    let tier: PerformanceTier = "high";
    if (isMobile || coarse) tier = lowMem || cores <= 4 ? "low" : "mid";
    if (fps < 42 && tier === "high") tier = "mid";
    if (fps < 30) tier = "low";
    if (reduced) tier = "low";
    return tier;
  }, [isMobile, coarse, lowMem, cores, fps, reduced]);
}

export const TIER_SETTINGS: Record<
  PerformanceTier,
  { dpr: [number, number]; particles: number; sparkles: number; distort: boolean; segments: number }
> = {
  high: { dpr: [1, 2], particles: 1400, sparkles: 90, distort: true, segments: 96 },
  mid: { dpr: [1, 1.6], particles: 750, sparkles: 48, distort: true, segments: 56 },
  low: { dpr: [0.8, 1.15], particles: 260, sparkles: 18, distort: false, segments: 28 },
};
