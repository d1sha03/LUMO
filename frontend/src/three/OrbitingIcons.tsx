import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { AmbientGlow, FloatingParticles } from "./FloatingParticles";
import { LumoLights, getSoftSprite } from "./Scene";
import { pointer } from "./pointer";

export interface OrbitItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * A shield made of light with the principles of responsible AI orbiting it.
 * The orbiting anchors are real DOM buttons rendered through drei's <Html>,
 * so the section is fully keyboard navigable and screen-reader friendly.
 */
export function OrbitingIcons({
  items,
  activeId,
  onSelect,
  reduced = false,
  particleCount = 260,
}: {
  items: OrbitItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  reduced?: boolean;
  particleCount?: number;
}) {
  const shield = useRef<THREE.Group>(null);
  const sprite = getSoftSprite();
  const anchors = useRef<(THREE.Group | null)[]>([]);

  const orbits = useMemo(
    () =>
      items.map((_, i) => ({
        radius: 2.5 + (i % 2) * 0.75,
        speed: 0.16 + (i % 3) * 0.05,
        tilt: (i / items.length) * Math.PI,
        offset: (i / items.length) * Math.PI * 2,
      })),
    [items],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (shield.current) {
      shield.current.rotation.y = reduced ? 0.2 : t * 0.14 + pointer.sx * 0.3;
      shield.current.rotation.x = Math.sin(t * 0.2) * 0.1 + pointer.sy * 0.12;
      const s = 1 + (reduced ? 0 : Math.sin(t * 0.5) * 0.03);
      shield.current.scale.setScalar(s);
    }
    anchors.current.forEach((g, i) => {
      if (!g) return;
      const o = orbits[i];
      const a = reduced ? o.offset : t * o.speed + o.offset;
      const x = Math.cos(a) * o.radius;
      const z = Math.sin(a) * o.radius;
      const y = Math.sin(a * 1.4 + o.tilt) * 0.9;
      g.position.set(x, y, z);
    });
  });

  return (
    <>
      <CameraRig base={[0, 0, 9.4]} sway={1.2} dolly={-1.4} lambda={1.8} reduced={reduced} />
      <LumoLights intensity={1.05} />
      <AmbientGlow color="#F5A623" scale={11} position={[0, 0, -5]} opacity={0.22} />
      <AmbientGlow color="#4ECDC4" scale={7} position={[3, -2.5, -3]} opacity={0.14} />

      <group ref={shield}>
        {/* shield of light */}
        <mesh scale={[1, 1.28, 1]}>
          <sphereGeometry args={[1.5, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial
            color="#242A78"
            emissive="#4ECDC4"
            emissiveIntensity={0.35}
            roughness={0.22}
            metalness={0.5}
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh scale={[1.02, 1.3, 1.02]}>
          <sphereGeometry args={[1.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshBasicMaterial color="#F5A623" wireframe transparent opacity={0.16} side={THREE.DoubleSide} />
        </mesh>
        <sprite scale={[6.4, 6.4, 1]}>
          <spriteMaterial
            map={sprite}
            color="#FFE0A8"
            transparent
            opacity={0.14}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        <mesh>
          <torusGeometry args={[2.1, 0.006, 8, 128]} />
          <meshBasicMaterial color="#8F96FF" transparent opacity={0.34} />
        </mesh>
      </group>

      {items.map((item, i) => (
        <group
          key={item.id}
          ref={(el) => {
            anchors.current[i] = el;
          }}
        >
          <mesh>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshBasicMaterial
              color={activeId === item.id ? "#F5A623" : "#4ECDC4"}
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <Html center distanceFactor={10} zIndexRange={[24, 12]}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={activeId === item.id}
              className={`orbit-chip ${activeId === item.id ? "orbit-chip-active" : ""}`}
            >
              <span className="orbit-chip-icon">{item.icon}</span>
              <span className="orbit-chip-label">{item.label}</span>
            </button>
          </Html>
        </group>
      ))}

      <FloatingParticles count={particleCount} radius={10} size={0.04} colorA="#CBD0FF" colorB="#F5A623" attract={0.35} reduced={reduced} />
    </>
  );
}
