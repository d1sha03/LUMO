import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ────────────────────────────────────────────────────────────
   Shared motion primitives for the LUMO product surface.
   All of them respect prefers-reduced-motion and never block
   interaction — they only add perceptible feedback.
   ──────────────────────────────────────────────────────────── */

/** Counts up to a value once it scrolls into view. Null stays "unknown". */
export function AnimatedNumber({
  value,
  format,
  className,
  duration = 0.9,
}: {
  value: number | null;
  format: (n: number | null) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState<number | null>(value === null ? null : 0);
  const lastTarget = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplay(null);
      lastTarget.current = null;
      return;
    }
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      lastTarget.current = value;
      return;
    }
    const from = lastTarget.current ?? 0;
    lastTarget.current = value;
    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, inView, reduced, duration]);

  return (
    <span ref={ref} className={className}>
      {format(display === null ? null : Math.round(display))}
    </span>
  );
}

/** Highlights the nav item for the section currently in view. */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/** Reading progress (0–1) for the whole document. */
export function useReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return progress;
}

/** Gentle rise-and-fade reveal for dashboard sections. */
export function Reveal({
  children,
  className,
  delay = 0,
  id,
  ariaLabelledBy,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
  ariaLabelledBy?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  );
}
