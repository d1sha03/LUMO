import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { AmbientGlow, FloatingParticles } from "./FloatingParticles";
import { InstancedSpheres } from "./Instanced";
import { LumoLights } from "./Scene";
import { pointer } from "./pointer";

export interface RoadPath {
  id: string;
  color: string;
  points: [number, number, number][];
}

/** Builds the three branching life-paths that leave the twin. */
export function useRoadPaths(): RoadPath[] {
  return useMemo(() => {
    const branch = (dir: number, lift: number, length: number): [number, number, number][] => [
      [0, -1.5, 0],
      [dir * 1.1, -1.0, 0.4],
      [dir * 2.3, -0.1, 0.9],
      [dir * 3.1, lift * 0.9, 1.7],
      [dir * 3.9, lift * 1.7, 2.6],
      [dir * 5.0, lift * 2.3, 3.9],
      [dir * 6.4, lift * 2.7, 5.4],
      [dir * 7.9, lift * 2.9 + length * 0.2, 7.2],
    ];
    return [
      { id: "a", color: "#4ECDC4", points: branch(-1, 0.55, 0.6) },
      { id: "b", color: "#F5A623", points: branch(0.02, 1.0, 1) },
      { id: "c", color: "#8B7CF6", points: branch(1, 1.5, 1.4) },
    ];
  }, []);
}

/**
 * The Pathway Explorer. Roads branch out of the twin, one lights up while the
 * others stay quietly visible, and a packet of light travels each route to show
 * time passing.
 */
export function AnimatedRoads({
  paths,
  activeId,
  scrollProgress = 0,
  progressRef,
  reduced = false,
  particleCount = 320,
}: {
  paths: RoadPath[];
  activeId: string | null;
  scrollProgress?: number;
  progressRef?: { current: number };
  reduced?: boolean;
  particleCount?: number;
}) {
  const curves = useMemo(
    () => paths.map((p) => new THREE.CatmullRomCurve3(p.points.map((q) => new THREE.Vector3(...q)), false, "catmullrom", 0.4)),
    [paths],
  );

  const group = useRef<THREE.Group>(null);
  const travellers = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (group.current && !reduced) {
      group.current.rotation.y = Math.sin(t * 0.1) * 0.12 + pointer.sx * 0.1;
      group.current.position.y = Math.sin(t * 0.24) * 0.08;
    }
    travellers.current.forEach((m, i) => {
      if (!m) return;
      const c = curves[i % curves.length];
      const speed = activeId === paths[i % paths.length].id ? 0.16 : 0.05;
      const u = (t * speed + i * 0.33) % 1;
      const p = c.getPointAt(Math.min(0.999, u));
      m.position.copy(p);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(u * Math.PI) * 0.65;
    });
    void dt;
  });

  return (
    <>
      <CameraRig
        base={[0.6, 0.6, 13.5]}
        sway={1.8}
        dolly={-6.2}
        rise={-1.4}
        lambda={1.6}
        scrollProgress={scrollProgress}
        progressRef={progressRef}
        reduced={reduced}
      />
      <LumoLights intensity={0.9} />
      <AmbientGlow color="#1B1F5E" scale={18} position={[2, 1, -10]} opacity={0.22} />
      <AmbientGlow color="#F5A623" scale={8} position={[-5, -2.4, -4]} opacity={0.18} />

      <group ref={group}>
        {/* origin: the twin, small and calm */}
        <mesh>
          <icosahedronGeometry args={[0.44, 2]} />
          <meshStandardMaterial
            color="#F5A623"
            emissive="#F5A623"
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.25}
          />
        </mesh>

        {curves.map((curve, i) => (
          <Road
            key={paths[i].id}
            curve={curve}
            color={paths[i].color}
            isActive={activeId === paths[i].id}
            travellerRef={(el) => {
              travellers.current[i] = el;
            }}
          />
        ))}
      </group>

      <FloatingParticles count={particleCount} radius={13} size={0.045} colorA="#C9CFFF" colorB="#4ECDC4" attract={0.4} reduced={reduced} />
    </>
  );
}

function Road({
  curve,
  color,
  isActive,
  travellerRef,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  isActive: boolean;
  travellerRef: (el: THREE.Mesh | null) => void;
}) {
  const milestones = useMemo(() => curve.getSpacedPoints(5), [curve]);
  const core = useMemo(() => new THREE.TubeGeometry(curve, 90, 0.035, 8, false), [curve]);
  const glow = useMemo(() => new THREE.TubeGeometry(curve, 90, 0.13, 8, false), [curve]);

  return (
    <group>
      <mesh geometry={glow}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.15 : 0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={core}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 1.5 : 0.22}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={isActive ? 1 : 0.42}
        />
      </mesh>
      {/* one instanced mesh for all milestones on this road */}
      <InstancedSpheres
        positions={milestones.map((p) => [p.x, p.y, p.z] as [number, number, number])}
        radius={isActive ? 0.078 : 0.045}
        color={color}
        opacity={isActive ? 0.95 : 0.4}
        pulse={isActive ? 0.6 : 0}
        segments={9}
      />
      <mesh ref={travellerRef}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color="#FFF3DC" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
