/**
 * Global pointer store shared by every 3D scene. Updated by a single window
 * listener and read inside useFrame — zero React re-renders, so parallax stays
 * cheap even with several canvases alive.
 */
export const pointer = {
  x: 0,
  y: 0,
  sx: 0,
  sy: 0,
  down: false,
  energy: 0,
};

let listening = false;

export function initPointerStore() {
  if (listening || typeof window === "undefined") return () => {};
  listening = true;

  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.energy = Math.min(1, pointer.energy + 0.08);
  };
  const onDown = () => (pointer.down = true);
  const onUp = () => (pointer.down = false);
  const onLeave = () => {
    pointer.x = 0;
    pointer.y = 0;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointerleave", onLeave);

  return () => {
    listening = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointerleave", onLeave);
  };
}

/** Eases the stored pointer toward its target; call once per frame. */
export function updatePointerDamp(dt: number) {
  const k = 1 - Math.exp(-3.2 * dt);
  pointer.sx += (pointer.x - pointer.sx) * k;
  pointer.sy += (pointer.y - pointer.sy) * k;
  pointer.energy *= 0.985;
}
