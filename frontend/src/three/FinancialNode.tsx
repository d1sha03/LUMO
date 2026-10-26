import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { KIND_COLORS } from "@/utils/graph";
import type { TwinNode } from "@/types";
import { getSoftSprite } from "./Scene";

interface FinancialNodeProps {
  node: TwinNode;
  hovered: boolean;
  dimmed: boolean;
  radius?: number;
  reduced?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

/**
 * A single life-domain inside the twin. Breathes on its own phase, brightens
 * on hover, and never stops moving — even when the graph is idle.
 */
export function FinancialNode({
  node,
  hovered,
  dimmed,
  radius = 1,
  reduced = false,
  onHover,
  onSelect,
}: FinancialNodeProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  const color = KIND_COLORS[node.kind] ?? "#F5A623";

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.32,
        metalness: 0.22,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.28,
      }),
    [color],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mesh.current) {
      const pulse = reduced ? 1 : 1 + Math.sin(t * 0.9 + node.position[0] * 2.4) * 0.05;
      const target = (0.19 * node.weight * radius) * pulse * (hovered ? 1.35 : 1);
      mesh.current.scale.setScalar(THREE.MathUtils.lerp(mesh.current.scale.x, target, 0.12));
      mesh.current.rotation.y = t * 0.2;
      mesh.current.rotation.x = Math.sin(t * 0.3) * 0.3;
    }
    if (halo.current) {
      const s = (0.9 + (hovered ? 1.5 : 0) + Math.sin(t * 0.8 + node.position[2]) * 0.08) * node.weight * radius;
      halo.current.scale.set(s, s, 1);
      const mat = halo.current.material as THREE.SpriteMaterial;
      mat.opacity = dimmed ? 0.05 : hovered ? 0.55 : 0.16;
    }
    material.emissiveIntensity = THREE.MathUtils.lerp(
      material.emissiveIntensity,
      hovered ? 1.5 : dimmed ? 0.06 : 0.3,
      0.1,
    );
  });

  return (
    <group position={node.position}>
      <mesh
        ref={mesh}
        material={material}
        scale={0.19 * node.weight * radius}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(node.id);
        }}
        onPointerOut={() => onHover?.(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(node.id);
        }}
      >
        <icosahedronGeometry args={[1, 2]} />
      </mesh>
      <sprite ref={halo} scale={[1, 1, 1]}>
        <spriteMaterial
          color={color}
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={getSoftSprite()}
        />
      </sprite>
    </group>
  );
}

/** A glow sprite that needs a texture injected from the parent renderer. */
export function NodeHalo({ texture, color, scale = 1 }: { texture?: THREE.Texture; color: string; scale?: number }) {
  return (
    <sprite scale={[scale, scale, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
