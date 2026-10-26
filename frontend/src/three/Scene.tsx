import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { useSettings } from "@/hooks/useAppSettings";
import { TIER_SETTINGS } from "@/hooks/usePerformanceTier";
import { updatePointerDamp } from "./pointer";

/**
 * The single canvas recipe used across the site.
 * - Respects the performance tier & reduced-motion setting
 * - Suspends its render loop entirely when scrolled away
 * - Shadows off, antialiasing only where the tier allows
 */
export function LumoCanvas({
  children,
  className,
  camera = { position: [0, 0, 8] as [number, number, number], fov: 42 },
  active = true,
  seedPointer = true,
  interactive = false,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov: number };
  active?: boolean;
  seedPointer?: boolean;
  interactive?: boolean;
  ariaLabel?: string;
}) {
  const { tier, reducedMotion } = useSettings();
  const settings = TIER_SETTINGS[tier];
  const dprRef = useRef(settings.dpr[1]);

  useEffect(() => {
    dprRef.current = settings.dpr[1];
  }, [settings.dpr]);

  return (
    <Canvas
      className={className}
      aria-label={ariaLabel}
      role="img"
      dpr={settings.dpr}
      camera={camera}
      frameloop={active && !reducedMotion ? "always" : "demand"}
      gl={{
        antialias: tier !== "low",
        alpha: true,
        powerPreference: tier === "low" ? "low-power" : "high-performance",
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.06;
      }}
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    >
      <PerformanceMonitor
        onIncline={() => (dprRef.current = settings.dpr[1])}
        onDecline={() => (dprRef.current = settings.dpr[0])}
      >
        <AdaptiveDpr pixelated={false} />
        <PointerTicker enabled={seedPointer} />
        <Suspense fallback={null}>{children}</Suspense>
      </PerformanceMonitor>
    </Canvas>
  );
}

function PointerTicker({ enabled }: { enabled: boolean }) {
  const last = useRef(0);
  useFrame(() => {
    if (!enabled) return;
    const now = performance.now();
    if (now - last.current > 16) {
      last.current = now;
      updatePointerDamp(0.016);
    }
  });
  return null;
}

let spriteTexture: THREE.Texture | null = null;

/** Shared soft sprite texture — generated once, reused by every particle field. */
export function getSoftSprite() {
  if (spriteTexture) return spriteTexture;
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.74)");
  g.addColorStop(0.62, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  spriteTexture = new THREE.CanvasTexture(canvas);
  spriteTexture.needsUpdate = true;
  return spriteTexture;
}

/** Warm indigo / amber lighting kit shared by all scenes. */
export function LumoLights({ intensity = 1 }: { intensity?: number }) {
  const colors = useMemo(
    () => ({
      warm: new THREE.Color("#F5A623"),
      indigo: new THREE.Color("#5A5FD6"),
      teal: new THREE.Color("#4ECDC4"),
    }),
    [],
  );
  return (
    <>
      <ambientLight intensity={0.7 * intensity} color="#FFF6E8" />
      <directionalLight position={[4, 6, 5]} intensity={1.3 * intensity} color={colors.warm} />
      <directionalLight position={[-6, -2, -4]} intensity={0.8 * intensity} color={colors.indigo} />
      <pointLight position={[0, 0, 3.5]} intensity={8 * intensity} color={colors.teal} distance={14} />
    </>
  );
}
