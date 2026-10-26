import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { mulberry32 } from "@/utils/graph";
import { CameraRig } from "./CameraRig";
import { AmbientGlow, FloatingParticles } from "./FloatingParticles";
import { LumoLights, getSoftSprite } from "./Scene";
import { pointer } from "./pointer";

export interface CardSpec {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  amount: string;
}

/**
 * A single scheme card living in 3D space. The card body is a real mesh with
 * soft lighting; the text is a canvas texture so it stays crisp at any DPR and
 * costs one draw call instead of a DOM overlay per card.
 */
export function SchemeCard({
  spec,
  position,
  hovered,
  onHover,
  reduced = false,
}: {
  spec: CardSpec;
  position: [number, number, number];
  hovered: boolean;
  onHover?: (id: string | null) => void;
  reduced?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const seed = useMemo(() => mulberry32(spec.id.length * 977)(), [spec.id]);

  /** Pre-rendered card face — avoids DOM-in-3D and keeps text resolution high. */
  const texture = useMemo(() => {
    const w = 512;
    const h = 320;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;

    // card surface
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "rgba(255,253,248,0.98)");
    bg.addColorStop(1, "rgba(246,244,238,0.96)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 40);
    ctx.fill();

    // accent spine
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.roundRect(0, 0, 12, h, 6);
    ctx.fill();

    // eyebrow
    ctx.fillStyle = spec.accent;
    ctx.font = "600 19px Inter, sans-serif";
    ctx.fillText(spec.subtitle.toUpperCase(), 42, 62);

    // title
    ctx.fillStyle = "#23233A";
    ctx.font = "600 46px Inter, sans-serif";
    ctx.fillText(spec.title, 40, 128);

    // rule
    ctx.fillStyle = "rgba(27,31,94,0.10)";
    ctx.fillRect(42, 168, w - 92, 2);

    // amount
    ctx.fillStyle = spec.accent;
    ctx.font = "600 40px Inter, sans-serif";
    ctx.fillText(spec.amount, 40, 232);

    // matching bar
    ctx.fillStyle = "rgba(27,31,94,0.10)";
    ctx.beginPath();
    ctx.roundRect(42, 274, w - 92, 12, 6);
    ctx.fill();
    const fill = ctx.createLinearGradient(42, 0, w - 50, 0);
    fill.addColorStop(0, spec.accent);
    fill.addColorStop(1, "#4ECDC4");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(42, 274, (w - 92) * 0.82, 12, 6);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [spec]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    // each card drifts on its own phase — never in lockstep
    group.current.position.y = position[1] + (reduced ? 0 : Math.sin(t * 0.44 + seed * 6) * 0.18);
    group.current.rotation.z = reduced ? 0 : Math.sin(t * 0.3 + seed * 4) * 0.045;
    const targetRotY = -pointer.sx * 0.16 + (hovered ? 0.1 : 0);
    group.current.rotation.y += (targetRotY - group.current.rotation.y) * 0.05;
    const s = hovered ? 1.09 : 1;
    group.current.scale.lerp(new THREE.Vector3(s, s, s), 0.08);
  });

  return (
    <group ref={group} position={position}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(spec.id);
        }}
        onPointerOut={() => onHover?.(null)}
      >
        <RoundedBox args={[1.9, 1.19, 0.035]} radius={0.045} smoothness={3} castShadow={false}>
          <meshStandardMaterial
            color="#FFFDF8"
            roughness={0.42}
            metalness={0.06}
            emissive={new THREE.Color(spec.accent)}
            emissiveIntensity={hovered ? 0.14 : 0.03}
          />
        </RoundedBox>
        {/* the printed face */}
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[1.82, 1.13]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
        {/* soft contact shadow / glow behind */}
        <sprite position={[0, 0, -0.14]} scale={[2.9, 2.1, 1]}>
          <spriteMaterial
            map={getSoftSprite()}
            color={spec.accent}
            transparent
            opacity={hovered ? 0.3 : 0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
    </group>
  );
}

/**
 * Cards emerge from the twin and float. A filament runs from the origin to each
 * card so the eye reads "these came out of my data".
 */
export function FloatingCards({
  specs,
  hoveredId,
  onHover,
  reduced = false,
  particleCount = 180,
  layout = "arc",
}: {
  specs: CardSpec[];
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  reduced?: boolean;
  particleCount?: number;
  layout?: "arc" | "grid";
}) {
  const origin = useRef<THREE.Mesh>(null);
  const filaments = useRef<THREE.Group>(null);

  const positions = useMemo<[number, number, number][]>(() => {
    if (layout === "grid") {
      const cols = Math.min(2, specs.length);
      return specs.map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return [
          (col - (cols - 1) / 2) * 2.6,
          (row - (specs.length - 1) / cols / 2) * 1.9,
          -0.3 - row * 0.4,
        ] as [number, number, number];
      });
    }
    // arc: cards fan out to the right of the twin, receding in depth
    return specs.map((_, i) => {
      const t = i / Math.max(1, specs.length - 1);
      const angle = -0.5 + t * 1.0;
      const radius = 4.1 + Math.sin(t * Math.PI) * 0.5;
      return [
        Math.sin(angle) * radius,
        Math.cos(angle * 1.6) * 1.85,
        -1.1 + Math.cos(angle) * radius * 0.32,
      ] as [number, number, number];
    });
  }, [specs, layout]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (origin.current) {
      origin.current.rotation.y = t * 0.24;
      origin.current.rotation.x = Math.sin(t * 0.3) * 0.2;
      const s = 0.36 + Math.sin(t * 0.9) * 0.02;
      origin.current.scale.setScalar(s);
    }
    if (filaments.current && !reduced) {
      filaments.current.rotation.z = Math.sin(t * 0.24) * 0.02;
    }
  });

  return (
    <>
      <CameraRig base={[-0.6, 0, 10.4]} sway={1.6} dolly={-1.6} lambda={1.7} reduced={reduced} />
      <LumoLights intensity={1} />
      <AmbientGlow color="#F5A623" scale={9} position={[-2.4, 0.6, -5]} opacity={0.16} />
      <AmbientGlow color="#4ECDC4" scale={7} position={[3.4, -2, -6]} opacity={0.12} />

      {/* the twin the cards came from */}
      <mesh ref={origin} position={[-3.6, 0.1, 0]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color="#242A78"
          emissive="#4ECDC4"
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.35}
          wireframe
        />
      </mesh>
      <sprite position={[-3.6, 0.1, 0]} scale={[3.2, 3.2, 1]}>
        <spriteMaterial
          map={getSoftSprite()}
          color="#5A5FD6"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* filaments twin → card */}
      <group ref={filaments}>
        {positions.map((p, i) => (
          <Filament
            key={`f-${i}`}
            to={p}
            color={specs[i].accent}
            active={hoveredId === specs[i].id}
          />
        ))}
      </group>

      {specs.map((spec, i) => (
        <SchemeCard
          key={spec.id}
          spec={spec}
          position={positions[i]}
          hovered={hoveredId === spec.id}
          onHover={onHover}
          reduced={reduced}
        />
      ))}

      <FloatingParticles
        count={particleCount}
        radius={9}
        size={0.04}
        colorA="#CBD0FF"
        colorB="#F5A623"
        attract={0.3}
        reduced={reduced}
      />
    </>
  );
}

/** A curved thread running from the twin out to an emerging card. */
function Filament({
  to,
  color,
  active,
}: {
  to: [number, number, number];
  color: string;
  active: boolean;
}) {
  const mat = useRef<THREE.LineBasicMaterial>(null);

  const points = useMemo(() => {
    const a = new THREE.Vector3(-3.6, 0.1, 0);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += 0.28;
    mid.z -= 0.32;
    return new THREE.QuadraticBezierCurve3(a, mid, b)
      .getPoints(20)
      .map((p) => p.toArray() as [number, number, number]);
  }, [to]);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const w = 0.55 + Math.sin(clock.elapsedTime * 0.9 + to[0]) * 0.45;
    mat.current.opacity = (active ? 0.7 : 0.2) * (0.6 + w * 0.4);
  });

  return (
    <Line points={points} color={color} lineWidth={active ? 1.6 : 0.8} transparent opacity={0.24}>
      <primitive object={new THREE.LineBasicMaterial()} ref={mat} attach="material" />
    </Line>
  );
}
