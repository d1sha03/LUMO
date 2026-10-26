import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { AmbientGlow } from "./FloatingParticles";
import { getSoftSprite } from "./Scene";
import { INDIA_MASK } from "@/utils/format";
import { mulberry32 } from "@/utils/graph";
import { pointer } from "./pointer";

/**
 * The impact map: one dot for every household whose life LUMO has modelled.
 * Dots illuminate progressively over the life of the section, then the whole
 * country breathes together. Single draw call, per-vertex colours.
 */
export function WorldMap({
  reduced = false,
  revealSeconds = 4.5,
  hotspots = [],
}: {
  reduced?: boolean;
  revealSeconds?: number;
  hotspots?: { name: string; col: number; row: number }[];
}) {
  const points = useRef<THREE.Points>(null);
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const done = useRef(false);
  const sprite = getSoftSprite();

  const { positions, colors, baseColors, count } = useMemo(() => {
    const rand = mulberry32(2024);
    const pts: number[] = [];
    const cols: number[] = [];
    const base: number[] = [];
    const dim = new THREE.Color("#2A3078");
    const bright = new THREE.Color("#F5A623");
    INDIA_MASK.forEach((row, ry) => {
      row.split("").forEach((cell, cx) => {
        if (cell !== "#") return;
        pts.push(
          (cx - 13.5) * 0.5 + (rand() - 0.5) * 0.12,
          -(ry - 14.5) * 0.5 + (rand() - 0.5) * 0.12,
          (rand() - 0.5) * 0.35,
        );
        base.push(dim.r, dim.g, dim.b);
        cols.push(dim.r, dim.g, dim.b);
      });
    });
    void bright;
    return {
      positions: new Float32Array(pts),
      colors: new Float32Array(cols),
      baseColors: base,
      count: pts.length / 3,
    };
  }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps

  const cities = useMemo(
    () =>
      hotspots.map((h) => {
        const p: [number, number, number] = [(h.col - 13.5) * 0.5, -(h.row - 14.5) * 0.5, 0.3];
        return { ...h, position: p };
      }),
    [hotspots],
  );

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05);
    if (!done.current) {
      progress.current = Math.min(1, progress.current + d / revealSeconds);
      const lit = Math.floor(count * progress.current);
      const arr = (points.current?.geometry.getAttribute("color") as THREE.BufferAttribute)
        ?.array as Float32Array | undefined;
      if (arr) {
        for (let i = 0; i < count; i++) {
          const t = i < lit ? 1 : 0;
          const mix = i / count;
          arr[i * 3] = THREE.MathUtils.lerp(baseColors[i * 3], 1, t * (0.72 + mix * 0.28));
          arr[i * 3 + 1] = THREE.MathUtils.lerp(baseColors[i * 3 + 1], 0.72 - mix * 0.28, t);
          arr[i * 3 + 2] = THREE.MathUtils.lerp(baseColors[i * 3 + 2], 0.2, t);
        }
        (points.current?.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
      }
      if (progress.current >= 1) done.current = true;
    }

    if (group.current && !reduced) {
      const t = clock.elapsedTime;
      group.current.rotation.y = -0.28 + pointer.sx * 0.14 + Math.sin(t * 0.08) * 0.03;
      group.current.rotation.x = 0.16 + pointer.sy * 0.06;
      group.current.position.y = Math.sin(t * 0.22) * 0.12;
    }
  });

  return (
    <>
      <CameraRig base={[0, 0, 12]} sway={1.4} lambda={1.6} reduced={reduced} />
      <AmbientGlow color="#F5A623" scale={14} position={[0, 0, -6]} opacity={0.18} />
      <ambientLight intensity={1} />
      <group ref={group}>
        <points ref={points} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.19}
            map={sprite}
            vertexColors
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>

        {cities.map((c) => (
          <CityGlow key={c.name} position={c.position} reduced={reduced} />
        ))}
      </group>
    </>
  );
}

function CityGlow({
  position,
  reduced,
}: {
  position: [number, number, number];
  reduced: boolean;
}) {
  const ref = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const s = reduced ? 1.1 : 1.1 + Math.sin(t * 1.4 + position[0]) * 0.35;
    ref.current.scale.set(s, s, 1);
  });
  return (
    <sprite ref={ref} position={position} scale={[1.1, 1.1, 1]}>
      <spriteMaterial
        map={getSoftSprite()}
        color="#FFD08A"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
