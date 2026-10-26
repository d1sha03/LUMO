import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * One InstancedMesh for many identical markers. Used for map dots, road
 * milestones and constellation pips — turns dozens of draw calls into one and
 * keeps the transform work on the GPU.
 */
export function InstancedSpheres({
  positions,
  radius = 0.05,
  color = "#F5A623",
  opacity = 0.9,
  pulse = 0,
  segments = 10,
}: {
  positions: [number, number, number][];
  radius?: number;
  color?: string;
  opacity?: number;
  /** 0 = static, 1 = strong breathing */
  pulse?: number;
  segments?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = positions.length;

  const matrices = useMemo(() => {
    const m = new THREE.Matrix4();
    return positions.map((p, i) => {
      const jitter = ((i * 9301 + 49297) % 233280) / 233280;
      m.makeScale(radius * (0.8 + jitter * 0.5), radius * (0.8 + jitter * 0.5), radius);
      m.setPosition(p[0], p[1], p[2]);
      return m.clone();
    });
  }, [positions, radius]);

  useFrame(({ clock }) => {
    const inst = mesh.current;
    if (!inst || pulse === 0) return;
    const t = clock.elapsedTime;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const base = matrices[i];
      const s = 1 + Math.sin(t * 1.2 + i * 0.7) * 0.28 * pulse;
      m.copy(base);
      m.scale(new THREE.Vector3(s, s, s));
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, Math.max(1, count)]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, segments, segments]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/** Applies the stored matrices once on mount (static markers). */
export function useInstanceMatrices(
  mesh: React.RefObject<THREE.InstancedMesh | null>,
  matrices: THREE.Matrix4[],
) {
  useMemo(() => {
    const inst = mesh.current;
    if (!inst) return;
    matrices.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    return true;
  }, [matrices, mesh]);
}

/** Applies matrices on first paint (static markers, no per-frame cost). */
export function StaticInstancedSpheres(props: Omit<Parameters<typeof InstancedSpheres>[0], "pulse">) {
  return <InstancedSpheres {...props} pulse={0} />;
}
