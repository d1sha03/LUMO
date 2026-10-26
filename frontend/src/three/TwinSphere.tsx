import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { mulberry32 } from "@/utils/graph";
import { pointer } from "./pointer";
import { getSoftSprite } from "./Scene";

/**
 * The Living Financial Twin, as seen before it has any data:
 * a calm, breathing orb of light with an orbiting family of nodes.
 * It reacts to the cursor — leaning, brightening, tightening its rings.
 */
export function TwinSphere({
  distort = true,
  segments = 96,
  reduced = false,
  scale = 1,
}: {
  distort?: boolean;
  segments?: number;
  reduced?: boolean;
  scale?: number;
}) {
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const halo = useRef<THREE.Sprite>(null);
  const sprite = getSoftSprite();


  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const energy = reduced ? 0 : Math.min(1, Math.abs(pointer.sx) + Math.abs(pointer.sy));

    if (core.current) {
      core.current.rotation.y = t * 0.08 + pointer.sx * 0.35;
      core.current.rotation.x = Math.sin(t * 0.16) * 0.12 + pointer.sy * 0.2;
    }
    if (shell.current) {
      shell.current.rotation.y = -t * 0.05 + pointer.sx * 0.2;
      shell.current.rotation.z = t * 0.03;
      const mat = shell.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + energy * 0.12 + Math.sin(t * 0.5) * 0.03;
    }
    if (ringA.current) {
      ringA.current.rotation.z = t * 0.14;
      ringA.current.rotation.x = Math.PI / 2.4 + pointer.sy * 0.25;
    }
    if (ringB.current) {
      ringB.current.rotation.z = -t * 0.1;
      ringB.current.rotation.y = Math.PI / 3 + pointer.sx * 0.3;
    }
    if (inner.current) {
      const s = 0.44 + Math.sin(t * 1.1) * 0.02 + energy * 0.05;
      inner.current.scale.setScalar(s);
      const mat = inner.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 + Math.sin(t * 1.6) * 0.2;
    }
    if (glow.current) {
      const s = 7.4 + Math.sin(t * 0.42) * 0.28 + energy * 0.6;
      glow.current.scale.set(s, s, 1);
    }
    if (halo.current) {
      const s = 4.2 + Math.sin(t * 0.3 + 1) * 0.2;
      halo.current.scale.set(s, s, 1);
    }

  });

  return (
    <group scale={scale}>
      <sprite ref={glow} scale={[7.4, 7.4, 1]}>
        <spriteMaterial
          map={sprite}
          color="#F5A623"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={halo} scale={[4.2, 4.2, 1]} position={[0, 0, -0.6]}>
        <spriteMaterial
          map={sprite}
          color="#5A5FD6"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <Float speed={reduced ? 0 : 0.9} rotationIntensity={reduced ? 0 : 0.28} floatIntensity={reduced ? 0 : 0.7}>
        {/* living core */}
        <mesh ref={core}>
          <icosahedronGeometry args={[1.28, distort ? Math.max(4, Math.round(segments / 12)) : 3]} />
          {distort ? (
            <MeshDistortMaterial
              color="#242A78"
              emissive="#1B1F5E"
              emissiveIntensity={0.42}
              roughness={0.26}
              metalness={0.42}
              distort={0.34}
              speed={1.15}
            />
          ) : (
            <meshStandardMaterial
              color="#242A78"
              emissive="#1B1F5E"
              emissiveIntensity={0.4}
              roughness={0.32}
              metalness={0.36}
              flatShading
            />
          )}
        </mesh>

        {/* inner light */}
        <mesh ref={inner}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color="#FFE7BE" transparent opacity={0.85} blending={THREE.AdditiveBlending} />
        </mesh>

        {/* outer lattice */}
        <mesh ref={shell}>
          <icosahedronGeometry args={[1.86, 1]} />
          <meshBasicMaterial color="#4ECDC4" wireframe transparent opacity={0.14} />
        </mesh>

        <mesh ref={ringA}>
          <torusGeometry args={[2.16, 0.006, 8, 128]} />
          <meshBasicMaterial color="#F5A623" transparent opacity={0.5} />
        </mesh>
        <mesh ref={ringB}>
          <torusGeometry args={[2.5, 0.004, 8, 128]} />
          <meshBasicMaterial color="#8F96FF" transparent opacity={0.32} />
        </mesh>
      </Float>

      {/* the nine orbiting satellites, drawn as one instanced mesh */}
      <OrbitingSatellites reduced={reduced} />
    </group>
  );
}

/**
 * The nine satellites around the twin. Their geometry is shared and their
 * transforms are written per frame into a single InstancedMesh.
 */
function OrbitingSatellites({ reduced }: { reduced: boolean }) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);

  const orbiters = useMemo(() => {
    const rand = mulberry32(88);
    return Array.from({ length: 9 }, (_, i) => ({
      r: 1.9 + rand() * 0.85,
      speed: 0.1 + rand() * 0.2,
      tilt: rand() * Math.PI,
      offset: rand() * Math.PI * 2,
      size: 0.045 + rand() * 0.05,
      color: i % 3 === 0 ? "#F5A623" : i % 3 === 1 ? "#4ECDC4" : "#8F96FF",
    }));
  }, []);

  useFrame(({ clock }) => {
    const mesh = inst.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < orbiters.length; i++) {
      const o = orbiters[i];
      const a = t * (reduced ? 0.02 : o.speed) + o.offset;
      pos.set(
        Math.cos(a) * o.r,
        Math.sin(a * 1.3 + o.tilt) * o.r * 0.22,
        Math.sin(a) * o.r,
      );
      const s = o.size * (1 + Math.sin(a * 2) * 0.18);
      scale.set(s, s, s);
      m.compose(pos, q, scale);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={inst}
      args={[undefined, undefined, orbiters.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color="#FFE7BE" transparent opacity={0.72} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

/**
 * A slow constellation of financial nodes with faint threads between
 * neighbours — the "world before LUMO": sparse, disconnected, alive.
 */
export function FinancialConstellation({
  count = 46,
  radius = 6.4,
  color = "#8F96FF",
  reduced = false,
  opacity = 0.5,
}: {
  count?: number;
  radius?: number;
  color?: string;
  reduced?: boolean;
  opacity?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const sprite = getSoftSprite();

  const { positions, lineVerts } = useMemo(() => {
    const rand = mulberry32(4242);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const r = radius * (0.45 + rand() * 0.55);
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      pts.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi) * 0.7,
          r * Math.sin(phi) * Math.sin(theta),
        ),
      );
    }
    const verts: number[] = [];
    pts.forEach((p, i) => {
      const near = pts
        .map((q, j) => ({ q, j, d: p.distanceTo(q) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      near.forEach(({ q, d }) => {
        if (d < radius * 0.62) verts.push(p.x, p.y, p.z, q.x, q.y, q.z);
      });
    });
    const nodePos = new Float32Array(count * 3);
    pts.forEach((p, i) => {
      nodePos[i * 3] = p.x;
      nodePos[i * 3 + 1] = p.y;
      nodePos[i * 3 + 2] = p.z;
    });
    return { positions: nodePos, lineVerts: new Float32Array(verts) };
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = t * (reduced ? 0 : 0.03) + pointer.sx * 0.12;
    group.current.rotation.x = pointer.sy * 0.06 + Math.sin(t * 0.1) * 0.04;
  });

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.075}
          map={sprite}
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lineVerts, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={opacity * 0.32} />
      </lineSegments>
    </group>
  );
}
