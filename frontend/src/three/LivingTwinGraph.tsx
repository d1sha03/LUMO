import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ConnectionLine, DataPulse } from "./ConnectionLine";
import { FinancialNode } from "./FinancialNode";
import { AmbientGlow, FloatingParticles } from "./FloatingParticles";
import { LumoLights } from "./Scene";
import { KIND_COLORS } from "@/utils/graph";
import type { TwinGraphData, TwinNode } from "@/types";

/* ────────────────────────────────────────────────────────────
   The masterpiece: a living graph of a person's financial life.
   Every domain orbits the core, connections breathe, and the
   whole network slowly rotates so no two visits look alike.
   ──────────────────────────────────────────────────────────── */

function GraphNode({
  node,
  revealed,
  hovered,
  dimmed,
  reduced,
  onHover,
  onSelect,
}: {
  node: TwinNode;
  revealed: boolean;
  hovered: boolean;
  dimmed: boolean;
  reduced: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const target = revealed ? 1 : 0.001;

  useFrame((_s, dt) => {
    if (!ref.current) return;
    const s = THREE.MathUtils.damp(ref.current.scale.x, target, 3.2, Math.min(dt, 0.05));
    ref.current.scale.setScalar(s);
    ref.current.visible = s > 0.01;
    if (!reduced) {
      ref.current.position.y = node.position[1] + Math.sin(_s.clock.elapsedTime * 0.5 + node.position[0]) * 0.06;
    }
  });

  return (
    <group ref={ref} position={node.position}>
      <FinancialNode
        node={{ ...node, position: [0, 0, 0] }}
        hovered={hovered}
        dimmed={dimmed}
        reduced={reduced}
        onHover={onHover}
        onSelect={onSelect}
      />
      {hovered && (
        <Html center distanceFactor={9} zIndexRange={[30, 10]} style={{ pointerEvents: "none" }}>
          <div className="tw-tooltip">
            <span className="tw-tooltip-kind" style={{ color: KIND_COLORS[node.kind] }}>
              {node.kind}
            </span>
            <strong>{node.label}</strong>
            <em>{node.detail}</em>
            {node.metric && <span className="tw-tooltip-metric">{node.metric}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

export function LivingTwinGraph({
  data,
  revealedIds,
  hoveredId,
  onHover,
  onSelect,
  scrollProgress = 0,
  reduced = false,
  particleCount = 500,
}: {
  data: TwinGraphData;
  revealedIds?: Set<string> | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  scrollProgress?: number;
  reduced?: boolean;
  particleCount?: number;
}) {
  const group = useRef<THREE.Group>(null);

  const positions = new Map(data.nodes.map((n) => [n.id, n.position as [number, number, number]]));

  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y += (reduced ? 0 : 0.052) * Math.min(dt, 0.05);
    const breathe = 1 + Math.sin(t * 0.38) * (reduced ? 0 : 0.022);
    group.current.scale.setScalar(breathe);
    group.current.rotation.z = Math.sin(t * 0.14) * 0.05;
  });

  const allRevealed = !revealedIds;

  void scrollProgress;

  return (
    <>
      <LumoLights intensity={0.95} />
      <AmbientGlow color="#5A5FD6" scale={13} position={[-3.4, 1.4, -7]} opacity={0.2} />
      <AmbientGlow color="#F5A623" scale={9} position={[3.6, -1.8, -5]} opacity={0.16} />

      <group ref={group}>
        {/* the core: the person */}
        <CoreNode hovered={hoveredId === "core"} onHover={onHover} onSelect={onSelect} reduced={reduced} />

        {data.nodes
          .filter((n) => n.kind !== "core")
          .map((node) => (
            <GraphNode
              key={node.id}
              node={node}
              revealed={allRevealed || revealedIds.has(node.id)}
              hovered={hoveredId === node.id}
              dimmed={!!hoveredId && hoveredId !== node.id}
              reduced={reduced}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))}

        {data.links.map((link, i) => {
          const from = positions.get(link.from);
          const to = positions.get(link.to);
          if (!from || !to) return null;
          const fromVisible = allRevealed || revealedIds.has(link.from) || link.from === "core";
          const toVisible = allRevealed || revealedIds.has(link.to) || link.to === "core";
          if (!fromVisible || !toVisible) return null;
          const active = hoveredId === link.from || hoveredId === link.to;
          return (
            <group key={`${link.from}-${link.to}-${i}`}>
              <ConnectionLine
                from={from}
                to={to}
                color={active ? "#F5A623" : "#8F96FF"}
                opacity={link.strength * 0.4}
                active={active}
                width={link.strength * 1.6}
                flow={!reduced}
              />
              {i % 4 === 0 && !reduced && (
                <DataPulse from={from} to={to} delay={(i % 9) / 9} speed={0.16} size={0.04} />
              )}
            </group>
          );
        })}
      </group>

      <FloatingParticles count={particleCount} radius={12} size={0.05} attract={0.5} reduced={reduced} />
    </>
  );
}

function CoreNode({
  hovered,
  onHover,
  onSelect,
  reduced,
}: {
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  reduced: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    const target = (0.52 + (hovered ? 0.12 : 0)) * (1 + (reduced ? 0 : Math.sin(t * 0.9) * 0.05));
    mesh.current.scale.setScalar(THREE.MathUtils.lerp(mesh.current.scale.x, target, 0.1));
    mesh.current.rotation.y = t * 0.2;
  });
  return (
    <group>
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover("core");
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("core");
        }}
      >
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color="#F5A623"
          emissive="#F5A623"
          emissiveIntensity={hovered ? 0.9 : 0.42}
          roughness={0.28}
          metalness={0.3}
        />
      </mesh>
      {hovered && (
        <Html center distanceFactor={9} zIndexRange={[30, 10]} style={{ pointerEvents: "none" }}>
          <div className="tw-tooltip">
            <span className="tw-tooltip-kind" style={{ color: "#F5A623" }}>
              living twin
            </span>
            <strong>Meena's twin</strong>
            <em>214 signals, refreshed after every conversation.</em>
            <span className="tw-tooltip-metric">Last update 42s ago</span>
          </div>
        </Html>
      )}
    </group>
  );
}
