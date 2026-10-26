import { useEffect, useRef, useState } from "react";

/** Normalised pointer position (-1 → 1 on both axes), damped for parallax rigs. */
export function useMouseNorm(damp = 0.09) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const loop = () => {
      current.current.x += (target.current.x - current.current.x) * damp;
      current.current.y += (target.current.y - current.current.y) * damp;
      setPos({ x: +current.current.x.toFixed(4), y: +current.current.y.toFixed(4) });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [damp]);

  return pos;
}

/**
 * Card tilt driven by pointer position over the element.
 * Returns props to spread on the element plus CSS vars for gradient position.
 */
export function useTilt(strength = 8) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<Record<string, string>>({});

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setStyle({
      transform: `perspective(1000px) rotateX(${(0.5 - py) * strength}deg) rotateY(${
        (px - 0.5) * strength
      }deg) translateZ(0)`,
      "--mx": `${px * 100}%`,
      "--my": `${py * 100}%`,
    });
  };

  const onPointerLeave = () =>
    setStyle({ transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)" });

  return { ref, style, onPointerMove, onPointerLeave };
}

/** Counts from 0 → target with an eased curve once the element is in view. */
export function useCountUp(target: number, active: boolean, duration = 2000, decimals = 0) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(+(target * eased).toFixed(decimals));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, target, duration, decimals]);

  return value;
}

/** True while the element is anywhere near the viewport (used to mount 3D). */
export function useNearViewport<T extends HTMLElement>(rootMargin = "280px") {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, near };
}
