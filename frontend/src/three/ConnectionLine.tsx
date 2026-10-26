import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface ConnectionLineProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  opacity?: number;
  width?: number;
  /** 0 → 1 draw-on progress */
  progress?: number;
  dashed?: boolean;
  flow?: boolean;
  active?: boolean;
}

/**
 * Connection between twin nodes. Uses Line2 for real width, then animates the
 * material opacity on a phase so the network looks like it is circulating.
 */
export function ConnectionLine({
  from,
  to,
  color = "#8F96FF",
  opacity = 0.32,
  width = 1.1,
  progress = 1,
  dashed = false,
  flow = true,
  active = false,
}: ConnectionLineProps) {
  const matRef = useRef<any>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    // bow outward from origin so links arc around the core instead of slicing it
    const lift = mid.clone().normalize().multiplyScalar(len * 0.16);
    const ctrl = mid.add(lift);
    return new THREE.CatmullRomCurve3([a, ctrl, b]);
  }, [from, to]);

  const points = useMemo(
    () => curve.getPoints(24).map((p) => p.toArray() as [number, number, number]),
    [curve],
  );

  const visible = useMemo(() => {
    const n = Math.max(2, Math.round(points.length * progress));
    return points.slice(0, n);
  }, [points, progress]);

  useFrame(({ clock }) => {
    if (!flow) return;
    const obj = matRef.current as unknown as { material?: THREE.LineBasicMaterial } | null;
    const mat = obj?.material;
    if (!mat) return;
    mat.transparent = true;
    const t = clock.elapsedTime;
    const w = 0.55 + Math.sin(t * 0.7 + phase) * 0.45;
    mat.opacity = active ? 0.55 + w * 0.4 : opacity * (0.55 + w * 0.6);
  });

  return (
    <Line
      ref={matRef as never}
      points={visible}
      color={color}
      lineWidth={active ? width * 2.1 : width}
      transparent
      opacity={opacity}
      dashed={dashed}
      dashSize={0.16}
      gapSize={0.12}
    />
  );
}

interface DataPulseProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  speed?: number;
  size?: number;
  delay?: number;
  bow?: number;
}

/** A packet of meaning travelling along a connection. */
export function DataPulse({
  from,
  to,
  color = "#F5A623",
  speed = 0.32,
  size = 0.05,
  delay = 0,
  bow = 0.16,
}: DataPulseProps) {
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.add(mid.clone().normalize().multiplyScalar(a.distanceTo(b) * bow));
    return new THREE.CatmullRomCurve3([a, mid, b]);
  }, [from, to, bow]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed + delay) % 1;
    const p = curve.getPointAt(Math.min(0.999, Math.max(0.001, t)));
    ref.current.position.copy(p);
    const fade = Math.sin(t * Math.PI);
    ref.current.scale.setScalar(0.6 + fade * 0.9);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = fade * 0.95;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}
