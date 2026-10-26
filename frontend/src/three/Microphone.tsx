import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { AmbientGlow, FloatingParticles } from "./FloatingParticles";
import { LumoLights, getSoftSprite } from "./Scene";

/**
 * The conversation object: a microphone that listens. Expanding rings carry
 * speech away as light, and packets of meaning travel toward the structured
 * twin forming on the right.
 */
export function Microphone({
  listening = true,
  reduced = false,
  particleCount = 220,
}: {
  listening?: boolean;
  reduced?: boolean;
  particleCount?: number;
}) {
  const body = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const packets = useRef<(THREE.Mesh | null)[]>([]);
  const sprite = getSoftSprite();

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.6, 0, 0),
      new THREE.Vector3(2.0, 0.9, -0.4),
      new THREE.Vector3(3.4, 0.4, -0.8),
      new THREE.Vector3(4.6, -0.4, -1.1),
      new THREE.Vector3(5.6, -1.2, -1.4),
    ]);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (body.current) {
      body.current.rotation.z = Math.sin(t * 0.6) * 0.06;
      body.current.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.1;
    }
    rings.current.forEach((r, i) => {
      if (!r) return;
      const u = ((t * (listening ? 0.42 : 0.14) + i / rings.current.length) % 1);
      const s = 0.6 + u * 3.1;
      r.scale.set(s, s, s);
      const mat = r.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - u) * (listening ? 0.42 : 0.16);
    });
    packets.current.forEach((p, i) => {
      if (!p) return;
      const u = (t * 0.24 + i / packets.current.length) % 1;
      p.position.copy(curve.getPointAt(u));
      const mat = p.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(u * Math.PI) * 0.9;
    });
  });

  return (
    <>
      <CameraRig base={[0.4, 0, 10.5]} sway={1.5} dolly={-2.2} lambda={1.8} reduced={reduced} />
      <LumoLights intensity={1} />
      <AmbientGlow color="#F5A623" scale={9} position={[0, 0, -4]} opacity={0.2} />

      <group ref={body} position={[-1.6, 0, 0]}>
        <mesh>
          <capsuleGeometry args={[0.34, 0.5, 8, 32]} />
          <meshStandardMaterial
            color="#242A78"
            emissive="#4ECDC4"
            emissiveIntensity={listening ? 0.5 : 0.18}
            roughness={0.24}
            metalness={0.55}
          />
        </mesh>
        <mesh position={[0, -0.72, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.9, 20]} />
          <meshStandardMaterial color="#F5A623" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, -1.18, 0]}>
          <torusGeometry args={[0.32, 0.035, 10, 40]} />
          <meshStandardMaterial color="#F5A623" roughness={0.3} metalness={0.6} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              rings.current[i] = el;
            }}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.62, 0.012, 8, 64]} />
            <meshBasicMaterial color="#4ECDC4" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
        <sprite scale={[4.2, 4.2, 1]}>
          <spriteMaterial
            map={sprite}
            color="#4ECDC4"
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>

      {/* speech → structure */}
      <mesh>
        <tubeGeometry args={[curve, 60, 0.012, 6, false]} />
        <meshBasicMaterial color="#F5A623" transparent opacity={0.28} blending={THREE.AdditiveBlending} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            packets.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color="#FFF0D2" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      {/* structured twin forming */}
      <group position={[5.9, -1.3, -1.6]}>
        <mesh>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial
            color="#4ECDC4"
            emissive="#4ECDC4"
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.4}
            wireframe
          />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshBasicMaterial color="#8F96FF" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
            </mesh>
          );
        })}
      </group>

      <FloatingParticles count={particleCount} radius={9} size={0.04} colorA="#CBD0FF" colorB="#4ECDC4" attract={0.3} reduced={reduced} />
    </>
  );
}
