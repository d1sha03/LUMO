import { useEffect } from "react";
import Lenis from "lenis";

let instance: Lenis | null = null;
let started = false;

export function getLenis() {
  return instance;
}

/** Boots one Lenis instance for the whole document with an inertial feel. */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      instance?.destroy();
      instance = null;
      started = false;
      return;
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    instance = new Lenis({
      duration: reduce ? 0.1 : 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduce,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
      syncTouch: false,
      gestureOrientation: "vertical",
    });

    let rafId = 0;
    const raf = (time: number) => {
      instance?.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    if (!started) {
      started = true;
      rafId = requestAnimationFrame(raf);
    }

    return () => {
      cancelAnimationFrame(rafId);
      started = false;
      instance?.destroy();
      instance = null;
    };
  }, [enabled]);

  useEffect(() => {
    const onAnchor = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(
        "[data-scroll-to]",
      ) as HTMLElement | null;
      if (!el) return;
      const id = el.dataset.scrollTo;
      if (!id) return;
      e.preventDefault();
      scrollToId(id);
    };
    window.addEventListener("click", onAnchor);
    return () => window.removeEventListener("click", onAnchor);
  }, []);
}

export function scrollToId(id: string, offset = 0) {
  const target = document.getElementById(id);
  if (!target) return;
  if (instance) {
    instance.scrollTo(target, { offset, duration: 1.5 });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (typeof history !== "undefined") {
    history.replaceState(null, "", `#${id}`);
  }
}

/** Tracks which section owns the viewport centre. */
export function useActiveSection(ids: readonly string[], onChange: (id: string) => void) {
  useEffect(() => {
    let raf = 0;
    let current = "";
    const check = () => {
      const mid = window.innerHeight * 0.42;
      let found = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= mid) {
          found = id;
          break;
        }
      }
      if (found && found !== current) {
        current = found;
        onChange(found);
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [ids, onChange]);
}
