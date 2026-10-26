import type { Transition, Variants } from "framer-motion";

/** Shared spring vocabulary — nothing snappy, nothing linear. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.9,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 70,
  damping: 18,
  mass: 1.1,
};

export const springPop: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 24,
  mass: 0.6,
};

export const easeLumo = [0.16, 1, 0.3, 1] as const;
export const easeCinema = [0.7, 0, 0.2, 1] as const;

export const durationSlow = 1.1;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 34, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.95, ease: easeLumo },
  },
};

export const fadeUpChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { ...springGentle } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.2, ease: easeLumo } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { ...springSoft } },
};

export const staggerParent = (stagger = 0.09, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

export const revealLine: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { duration: 1.3, ease: easeLumo } },
};

export const charReveal: Variants = {
  hidden: { opacity: 0, y: "0.42em", rotateX: -55, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: { duration: 1, ease: easeLumo },
  },
};

export const viewportOnce = { once: true, amount: 0.25 } as const;
export const viewportSoft = { once: false, amount: 0.15 } as const;
