import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Menu, Moon, Sun, X, Accessibility, Gauge, Contrast, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV_SECTIONS } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { scrollToId } from "@/hooks/useSmoothScroll";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { cn } from "@/utils/cn";
import { easeLumo } from "@/animations/variants";
import { LumoButton } from "./ui";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      data-scroll-to="hero"
      className="group flex items-center gap-2.5"
      aria-label="LUMO — back to top"
    >
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-indigo-deep transition-transform duration-700 group-hover:scale-110" />
        <span className="absolute inset-[3px] rounded-full border border-amber-warm/70" />
        <span className="relative h-2 w-2 rounded-full bg-amber-warm animate-breathe" />
      </span>
      {!compact && (
        <span className="text-[1.02rem] font-semibold tracking-[0.24em] text-slate-ink dark:text-white">
          LUMO
        </span>
      )}
    </button>
  );
}

/* ── Scroll progress ─────────────────────────────────────── */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX: x }}
      className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-indigo-deep via-amber-warm to-teal-muted"
    />
  );
}

/* ── Primary navigation ──────────────────────────────────── */

const PRIMARY = ["problem", "twin", "pathways", "responsible", "impact"];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("hero");
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      const mid = window.innerHeight * 0.4;
      let found = "hero";
      for (const s of NAV_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= mid) found = s.id;
      }
      setActive(found);
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: easeLumo, delay: 0.35 }}
        className={cn(
          "fixed inset-x-0 top-0 z-[60] transition-all duration-700",
          scrolled ? "py-2.5" : "py-4",
        )}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8">
          <div
            className={cn(
              "flex items-center justify-between rounded-full px-4 py-2.5 transition-all duration-700 sm:px-5",
              scrolled
                ? "glass-card"
                : "border border-transparent bg-transparent",
            )}
          >
            <Logo />

            {!isMobile && (
              <nav aria-label="Primary" className="flex items-center gap-1">
                {PRIMARY.map((id) => {
                  const item = NAV_SECTIONS.find((s) => s.id === id)!;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-scroll-to={id}
                      aria-current={active === id ? "true" : undefined}
                      className={cn(
                        "relative rounded-full px-3.5 py-2 text-[0.82rem] font-medium transition-colors duration-500",
                        active === id
                          ? "text-indigo-deep dark:text-white"
                          : "text-slate-ink/55 hover:text-indigo-deep dark:text-white/55 dark:hover:text-white",
                      )}
                    >
                      {active === id && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-full bg-indigo-deep/6 dark:bg-white/10"
                          transition={{ type: "spring", stiffness: 240, damping: 26 }}
                        />
                      )}
                      <span className="relative">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-deep/10 text-slate-ink/70 transition-colors duration-500 hover:border-amber-warm/50 hover:text-amber-warm dark:border-white/12 dark:text-white/70"
              >
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
              </button>
              {!isMobile && (
                <LumoButton
                  size="sm"
                  data-scroll-to="demo"
                  className="hidden md:inline-flex"
                  icon={<ArrowUpRight size={15} />}
                >
                  Try the demo
                </LumoButton>
              )}
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open section index"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-deep/10 text-slate-ink/70 transition-colors duration-500 hover:border-amber-warm/50 hover:text-amber-warm dark:border-white/12 dark:text-white/70"
              >
                <Menu size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && <SectionIndex onClose={() => setOpen(false)} active={active} />}
      </AnimatePresence>
    </>
  );
}

function SectionIndex({ onClose, active }: { onClose: () => void; active: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: easeLumo }}
      className="fixed inset-0 z-[80] flex items-start justify-center px-5 pt-24 pb-10"
      role="dialog"
      aria-modal="true"
      aria-label="All sections"
    >
      <button
        type="button"
        aria-label="Close section index"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-cream/80 backdrop-blur-xl dark:bg-ink/85"
      />
      <motion.div
        initial={{ y: 26, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.8, ease: easeLumo }}
        className="glass-card relative z-10 w-full max-w-3xl overflow-hidden rounded-[28px] p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="eyebrow text-amber-warm">The story</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-deep/10 text-slate-ink/60 transition-colors hover:border-amber-warm/50 dark:border-white/12 dark:text-white/60"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {NAV_SECTIONS.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.035, duration: 0.7, ease: easeLumo }}
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => scrollToId(s.id), 120);
                }}
                className={cn(
                  "group flex w-full items-baseline justify-between gap-4 rounded-2xl px-4 py-3 text-left transition-colors duration-500",
                  active === s.id
                    ? "bg-indigo-deep/6 dark:bg-white/8"
                    : "hover:bg-indigo-deep/4 dark:hover:bg-white/5",
                )}
              >
                <span className="flex items-baseline gap-3">
                  <span className="mono text-[0.68rem] text-amber-warm">{s.index}</span>
                  <span className="text-[0.98rem] font-medium text-slate-ink dark:text-white">
                    {s.label}
                  </span>
                </span>
                <ArrowUpRight
                  size={15}
                  className="translate-y-1 text-slate-ink/25 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 dark:text-white/30"
                />
              </button>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

/* ── Accessibility dock ──────────────────────────────────── */

export function A11yDock() {
  const [open, setOpen] = useState(false);
  const { reducedMotion, toggleReduced, highContrast, toggleContrast, tier, setTier } = useSettings();

  return (
    <div className="fixed bottom-5 left-5 z-[65] hidden md:flex flex-col items-start gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.55, ease: easeLumo }}
            className="glass-card w-64 rounded-[22px] p-4"
            role="dialog"
            aria-label="Experience settings"
          >
            <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-ink/40 dark:text-white/40">
              Experience
            </p>
            <DockToggle
              icon={<Gauge size={14} />}
              label="Reduced motion"
              checked={reducedMotion}
              onChange={toggleReduced}
            />
            <DockToggle
              icon={<Contrast size={14} />}
              label="High contrast"
              checked={highContrast}
              onChange={toggleContrast}
            />
            <div className="mt-3 flex items-center justify-between rounded-full border border-indigo-deep/10 px-3 py-2 dark:border-white/12">
              <span className="text-[0.78rem] text-slate-ink/70 dark:text-white/65">Quality</span>
              <div className="flex gap-1">
                {(["low", "mid", "high"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[0.68rem] font-medium capitalize transition-colors",
                      tier === t
                        ? "bg-indigo-deep text-cream dark:bg-white dark:text-ink"
                        : "text-slate-ink/50 hover:text-indigo-deep dark:text-white/50",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Accessibility and performance settings"
        className="glass-card flex h-11 w-11 items-center justify-center rounded-full text-slate-ink/70 transition-colors duration-500 hover:text-amber-warm dark:text-white/70"
      >
        <Accessibility size={17} />
      </button>
    </div>
  );
}

function DockToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-center justify-between rounded-full px-1 py-2 text-left"
    >
      <span className="flex items-center gap-2.5 text-[0.82rem] text-slate-ink/75 dark:text-white/70">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors duration-500",
          checked ? "bg-amber-warm" : "bg-indigo-deep/15 dark:bg-white/15",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm",
            checked ? "left-[1.15rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

/* ── Mobile bottom bar ───────────────────────────────────── */

export function MobileBar() {
  const [active, setActive] = useState("hero");
  const isMobile = useIsMobile();

  useEffect(() => {
    let raf = 0;
    const check = () => {
      const mid = window.innerHeight * 0.4;
      let found = "hero";
      for (const s of NAV_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= mid) found = s.id;
      }
      setActive(found);
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!isMobile) return null;

  return (
    <motion.div
      initial={{ y: 90 }}
      animate={{ y: 0 }}
      transition={{ duration: 1, ease: easeLumo, delay: 1.1 }}
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass-card flex items-center gap-2 rounded-full p-1.5">
        <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_SECTIONS.slice(0, 6).map((s) => (
            <button
              key={s.id}
              type="button"
              data-scroll-to={s.id}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-[0.72rem] font-medium transition-colors duration-500",
                active === s.id
                  ? "bg-indigo-deep text-cream dark:bg-white dark:text-ink"
                  : "text-slate-ink/55 dark:text-white/55",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <LumoButton size="sm" variant="amber" data-scroll-to="demo" className="shrink-0">
          Talk to LUMO
        </LumoButton>
      </div>
    </motion.div>
  );
}
