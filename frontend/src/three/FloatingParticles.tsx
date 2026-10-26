import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/utils/graph";
import { getSoftSprite } from "./Scene";
import { pointer } from "./pointer";

interface FloatingParticlesProps {
  count?: number;
  radius?: number;
  size?: number;
  colorA?: string;
  colorB?: string;
  /** how strongly particles lean toward the cursor */
  attract?: number;
  speed?: number;
  opacity?: number;
  reduced?: boolean;
}

/**
 * Ambient dust of tiny financial nodes. Two interleaved point clouds
 * (indigo + amber) drifting on independent sine phases so the field never
 * looks like a loop. Positions are written into a single buffer — one draw
 * call per cloud.
 */
export function FloatingParticles({
  count = 700,
  radius = 9,
  size = 0.055,
  colorA = "#8F96FF",
  colorB = "#F5A623",
  attract = 0.35,
  speed = 0.06,
  opacity = 0.85,
  reduced = false,
}: FloatingParticlesProps) {
  const groupA = useRef<THREE.Points>(null);
  const groupB = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const rand = mulberry32(1337);
    const make = (n: number, spread: number) => {
      const pos = new Float32Array(n * 3);
      const phase = new Float32Array(n);
      const amp = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const r = spread * (0.32 + rand() * 0.68);
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi) * 0.72;
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        phase[i] = rand() * Math.PI * 2;
        amp[i] = 0.08 + rand() * 0.34;
      }
      return { pos, phase, amp, n };
    };
    return { a: make(Math.round(count * 0.66), radius), b: make(Math.round(count * 0.34), radius * 0.78) };
  }, [count, radius]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    const apply = (points: THREE.Points | null, cloud: typeof data.a, k: number) => {
      if (!points) return;
      const geo = points.geometry;
      const arr = geo.getAttribute("position") as THREE.BufferAttribute;
      if (arr) {
        const a = arr.array as Float32Array;
        for (let i = 0; i < cloud.n; i++) {
          const p = cloud.phase[i];
          a[i * 3 + 1] += Math.sin(t * speed * k + p) * 0.0016;
          a[i * 3] += Math.cos(t * speed * k * 0.8 + p) * 0.0012;
        }
        arr.needsUpdate = true;
      }
      points.rotation.y = t * 0.016 * k;
      points.rotation.x = Math.sin(t * 0.05) * 0.06;
      if (!reduced && attract > 0) {
        points.position.x += (pointer.sx * attract - points.position.x) * 0.02;
        points.position.y += (pointer.sy * attract * 0.6 - points.position.y) * 0.02;
      }
    };

    apply(groupA.current, data.a, 1);
    apply(groupB.current, data.b, 1.42);
  });

  const sprite = getSoftSprite();

  return (
    <group>
      <points ref={groupA} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.a.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={size}
          map={sprite}
          color={colorA}
          transparent
          opacity={opacity * 0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <points ref={groupB} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.b.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={size * 1.5}
          map={sprite}
          color={colorB}
          transparent
          opacity={opacity * 0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/**
 * Large soft light blooms placed behind a scene to fake volumetric depth
 * without a single post-processing pass.
 */
export function AmbientGlow({
  color = "#F5A623",
  scale = 8,
  position = [0, 0, -6] as [number, number, number],
  opacity = 0.28,
  breathe = true,
}: {
  color?: string;
  scale?: number;
  position?: [number, number, number];
  opacity?: number;
  breathe?: boolean;
}) {
  const ref = useRef<THREE.Sprite>(null);
  const sprite = getSoftSprite();
  const base = useRef(opacity);

  useFrame(({ clock }) => {
    if (!ref.current || !breathe) return;
    const t = clock.elapsedTime;
    const s = scale * (1 + Math.sin(t * 0.42) * 0.05);
    ref.current.scale.set(s, s, 1);
    const mat = ref.current.material as THREE.SpriteMaterial;
    mat.opacity = base.current * (0.82 + Math.sin(t * 0.32) * 0.18);
  });

  return (
    <sprite ref={ref} position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={sprite}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
