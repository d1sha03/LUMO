import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, Sparkles, Mic, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { easeLumo } from "@/animations/variants";
import { useSettings } from "@/hooks/useAppSettings";
import { useIsMobile, useIsTouch } from "@/hooks/useMediaQueries";
import { LumoButton } from "./ui";

/* ── Preloader ───────────────────────────────────────────── */

export function Preloader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(100, v + 6 + Math.random() * 9);
      setProgress(v);
      if (v >= 100) {
        clearInterval(id);
        setTimeout(() => setLeaving(true), 320);
        setTimeout(onDone, 1180);
      }
    }, 90);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          exit={{ opacity: 0, filter: "blur(14px)" }}
          transition={{ duration: 0.95, ease: easeLumo }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream dark:bg-ink"
          aria-label="Loading LUMO"
          role="status"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: easeLumo }}
            className="relative flex h-24 w-24 items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full bg-indigo-deep/8 animate-breathe" />
            <span className="absolute inset-3 rounded-full border border-amber-warm/50" />
            <span className="absolute inset-6 rounded-full border border-teal-muted/30" />
            <span className="h-3 w-3 rounded-full bg-amber-warm animate-breathe" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.9, ease: easeLumo }}
            className="mt-8 text-[0.7rem] font-semibold uppercase tracking-[0.42em] text-slate-ink/50 dark:text-white/45"
          >
            LUMO
          </motion.p>
          <div className="mt-5 h-px w-40 overflow-hidden bg-indigo-deep/10 dark:bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-deep via-amber-warm to-teal-muted"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="mono mt-3 text-[0.68rem] text-slate-ink/40 dark:text-white/35">
            building your twin · {Math.round(progress)}%
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Ambient cursor ──────────────────────────────────────── */

export function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 180, damping: 22, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 180, damping: 22, mass: 0.5 });
  const [hovering, setHovering] = useState(false);
  const isTouch = useIsTouch();

  useEffect(() => {
    if (isTouch) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as HTMLElement;
      setHovering(!!el?.closest?.("button, a, [data-cursor='hover']"));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isTouch, x, y]);

  if (isTouch) return null;

  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-[90] hidden md:block"
    >
      <motion.div
        animate={{ scale: hovering ? 1.9 : 1, opacity: hovering ? 0.85 : 0.45 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="-ml-4 -mt-4 h-8 w-8 rounded-full border border-amber-warm/70 bg-amber-warm/8"
      />
    </motion.div>
  );
}

/* ── Mobile onboarding ───────────────────────────────────── */

const STEPS = [
  {
    icon: <Mic size={20} />,
    title: "Speak, don't fill forms",
    body: "Talk in Hindi, Tamil, Bengali or any of 22 languages. LUMO listens and does the paperwork.",
  },
  {
    icon: <Sparkles size={20} />,
    title: "Watch your twin form",
    body: "Every sentence becomes a node: income, debt, seasons, family, dreams. Yours alone, and alive.",
  },
  {
    icon: <Route size={20} />,
    title: "Explore your pathways",
    body: "Swipe between routes through your financial life. No score. No judgement. Just directions.",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const isMobile = useIsMobile();
  const { reducedMotion } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    setLeaving(true);
    try {
      localStorage.setItem("lumo:onboarded", "true");
    } catch {
      /* private mode */
    }
    setTimeout(onDone, 700);
  };

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -30 }}
          transition={{ duration: 0.7, ease: easeLumo }}
          className="fixed inset-0 z-[95] flex flex-col justify-end bg-cream/95 backdrop-blur-2xl dark:bg-ink/95 sm:justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to LUMO"
        >
          <div className="w-full max-w-lg px-6 pb-10 pt-16 sm:pb-6">
            <motion.div
              drag={isMobile ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) setStep((s) => Math.min(STEPS.length - 1, s + 1));
                if (info.offset.x > 60) setStep((s) => Math.max(0, s - 1));
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -40, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: easeLumo }}
                  className="glass-card rounded-[28px] p-7"
                >
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-warm/12 text-amber-warm">
                    {STEPS[step].icon}
                  </span>
                  <h3 className="display-3 font-display text-slate-ink dark:text-white">
                    {STEPS[step].title}
                  </h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-slate-ink/65 dark:text-white/60">
                    {STEPS[step].body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <div className="mt-7 flex items-center justify-between">
              <div className="flex gap-2">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Step ${i + 1}`}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === step ? "w-7 bg-amber-warm" : "w-1.5 bg-slate-ink/20 dark:bg-white/20"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <LumoButton variant="ghost" size="sm" onClick={finish}>
                  Skip
                </LumoButton>
                {step < STEPS.length - 1 ? (
                  <LumoButton size="sm" variant="amber" onClick={() => setStep((s) => s + 1)} icon={<ArrowRight size={15} />}>
                    Next
                  </LumoButton>
                ) : (
                  <LumoButton size="sm" variant="amber" onClick={finish}>
                    Begin
                  </LumoButton>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
