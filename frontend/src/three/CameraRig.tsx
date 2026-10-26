import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp } from "@/utils/graph";
import { pointer } from "./pointer";

interface CameraRigProps {
  /** how far the camera drifts with the pointer */
  sway?: number;
  /** base camera position */
  base?: [number, number, number];
  /** distance the camera pulls back as scroll progress grows (0 → 1) */
  dolly?: number;
  /** vertical travel across scroll progress */
  rise?: number;
  /** target looked at */
  target?: [number, number, number];
  /** damping aggressiveness */
  lambda?: number;
  scrollProgress?: number;
  /** live-updated scroll progress, read per frame without re-rendering React */
  progressRef?: { current: number };
  reduced?: boolean;
}

/**
 * Cinematic camera: slow pointer sway + scroll-driven dolly/rise.
 * Nothing snaps — every value is exponentially damped per frame.
 */
export function CameraRig({
  sway = 0.9,
  base = [0, 0, 8],
  dolly = 0,
  rise = 0,
  target = [0, 0, 0],
  lambda = 2.2,
  scrollProgress = 0,
  progressRef,
  reduced = false,
}: CameraRigProps) {
  const pos = useRef(new THREE.Vector3(...base));
  const look = useRef(new THREE.Vector3(...target));
  const tmp = useRef(new THREE.Vector3());

  useFrame((_s, dt) => {
    const d = Math.min(dt, 0.05);
    const progress = progressRef ? progressRef.current : scrollProgress;
    const px = reduced ? 0 : pointer.sx;
    const py = reduced ? 0 : pointer.sy;

    tmp.current.set(
      base[0] + px * sway,
      base[1] + py * sway * 0.55 + rise * progress,
      base[2] + dolly * progress,
    );
    pos.current.x = damp(pos.current.x, tmp.current.x, lambda, d);
    pos.current.y = damp(pos.current.y, tmp.current.y, lambda, d);
    pos.current.z = damp(pos.current.z, tmp.current.z, lambda, d);

    look.current.x = damp(look.current.x, target[0] + px * sway * 0.14, lambda, d);
    look.current.y = damp(look.current.y, target[1] + py * sway * 0.1, lambda, d);
    look.current.z = damp(look.current.z, target[2], lambda, d);

    _s.camera.position.copy(pos.current);
    _s.camera.lookAt(look.current);
  });

  return null;
}
