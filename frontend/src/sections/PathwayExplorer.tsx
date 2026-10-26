import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { easeLumo } from "@/animations/variants";
import { PATHWAYS } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { useNearViewport } from "@/hooks/useInteractions";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { TIER_SETTINGS } from "@/hooks/usePerformanceTier";
import { LumoCanvas } from "@/three/Scene";
import { AnimatedRoads, useRoadPaths } from "@/three/AnimatedRoads";
import { Container, FadeUp, SectionHeading } from "@/components/ui";

export function PathwayExplorer() {
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: gateRef, near } = useNearViewport<HTMLElement>("220px");
  const [active, setActive] = useState<string>("a");
  const { tier, reducedMotion } = useSettings();
  const isMobile = useIsMobile();
  const paths = useRoadPaths();
  const activePath = PATHWAYS.find((p) => p.id === active)!;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  /** mirrors scroll progress into a ref so the 3D camera can read it per frame */
  const progressRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
  });
  useEffect(() => {
    progressRef.current = scrollYProgress.get();
  }, [scrollYProgress]);

  const labelY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      id="pathways"
      ref={(el) => {
        sectionRef.current = el;
        gateRef.current = el;
      }}
      aria-label="Pathway explorer"
      className="relative isolate w-full overflow-clip px-5 py-24 sm:px-8 md:py-32 lg:px-12"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        {near && (
          <LumoCanvas
            active={near}
            camera={{ position: [0.6, 0.6, isMobile ? 17 : 13.5], fov: isMobile ? 56 : 44 }}
            ariaLabel="Three branching pathways representing alternative financial futures"
            className="!absolute inset-0"
          >
            <AnimatedRoads
              paths={paths}
              activeId={active}
              progressRef={progressRef}
              reduced={reducedMotion}
              particleCount={Math.round(TIER_SETTINGS[tier].particles * 0.35)}
            />
          </LumoCanvas>
        )}
      </div>

      <Container className="relative z-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="max-w-xl">
            <SectionHeading
              eyebrow="06 · Pathways"
              title="Not a score. A set of directions."
              lede="LUMO simulates routes through your real life — each with a timeline, a confidence level, and an honest list of what could go wrong. You choose. Nothing is decided about you."
            />
          </div>

          {/* pathway selector — swipeable deck on touch, list on desktop */}
          {isMobile ? (
            <PathwayDeck active={active} onChange={setActive} />
          ) : (
          <motion.div style={{ y: labelY }} className="flex flex-col gap-3">
            {PATHWAYS.map((p, i) => {
              const isActive = p.id === active;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p.id)}
                  onMouseEnter={() => !isMobile && setActive(p.id)}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.9, ease: easeLumo, delay: i * 0.1 }}
                  whileHover={{ x: 4 }}
                  aria-pressed={isActive}
                  className={`group relative overflow-hidden rounded-[24px] border p-5 text-left backdrop-blur-md transition-all duration-700 ${
                    isActive
                      ? "border-transparent bg-cream/85 shadow-[0_24px_60px_-30px_rgba(27,31,94,0.5)] dark:bg-white/10"
                      : "border-indigo-deep/8 bg-cream/50 dark:border-white/8 dark:bg-white/4"
                  }`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px] origin-top transition-transform duration-700"
                    style={{
                      background: p.color,
                      transform: `scaleY(${isActive ? 1 : 0.25})`,
                    }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className="mono text-[0.66rem] uppercase tracking-[0.2em]"
                        style={{ color: p.color }}
                      >
                        {p.code}
                      </span>
                      <h3 className="mt-1.5 text-[1.2rem] font-semibold text-slate-ink dark:text-white">
                        {p.title}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="mono text-[1.05rem] text-slate-ink dark:text-white">
                        {Math.round(p.confidence * 100)}%
                      </span>
                      <span className="text-[0.62rem] uppercase tracking-[0.16em] text-slate-ink/40 dark:text-white/40">
                        confidence
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-[0.88rem] leading-relaxed text-slate-ink/65 dark:text-white/60">
                    {p.summary}
                  </p>
                  <div className="mt-4 flex items-center gap-2 overflow-hidden">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-indigo-deep/8 dark:bg-white/10">
                      <motion.span
                        className="block h-full rounded-full"
                        style={{ background: p.color }}
                        animate={{ width: `${(p.confidence * 100).toFixed(0)}%` }}
                        transition={{ duration: 1.1, ease: easeLumo }}
                      />
                    </div>
                    <span className="mono shrink-0 text-[0.68rem] text-slate-ink/45 dark:text-white/45">
                      {p.months} mo
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
          )}
        </div>

        {/* active pathway detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePath.id}
            initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
            transition={{ duration: 0.7, ease: easeLumo }}
            className="glass-card mt-12 overflow-hidden rounded-[28px] p-6 sm:p-8"
          >
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{ background: `${activePath.color}22`, color: activePath.color }}
                  >
                    <Sparkles size={15} />
                  </span>
                  <h3 className="text-[1.25rem] font-semibold text-slate-ink dark:text-white">
                    {activePath.title}
                  </h3>
                </div>

                {/* timeline */}
                <ol className="mt-7 flex flex-col gap-0">
                  {activePath.steps.map((s, i) => (
                    <motion.li
                      key={s.label}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.09, duration: 0.7, ease: easeLumo }}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      <span className="relative flex flex-col items-center">
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full ring-4"
                          style={{
                            background: activePath.color,
                            // @ts-expect-error css var
                            "--tw-ring-color": `${activePath.color}22`,
                          }}
                        />
                        {i < activePath.steps.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-indigo-deep/12 dark:bg-white/12" />
                        )}
                      </span>
                      <div className="flex flex-1 items-baseline justify-between gap-3 pb-1">
                        <span className="text-[0.94rem] text-slate-ink dark:text-white">
                          {s.label}
                        </span>
                        <span className="mono shrink-0 text-[0.72rem] text-slate-ink/40 dark:text-white/40">
                          month {s.month}
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <Detail
                  icon={<TrendingUp size={15} />}
                  label="Outcome"
                  value={activePath.outcome}
                  tone={activePath.color}
                />
                <Detail
                  icon={<ShieldAlert size={15} />}
                  label="Honest risk"
                  value={activePath.risk}
                  tone={activePath.color}
                />
                <Detail
                  icon={<Clock size={15} />}
                  label="Horizon"
                  value={`${activePath.months} months, reviewed every month`}
                  tone={activePath.color}
                />
                <Detail
                  icon={<ArrowRight size={15} />}
                  label="Benefit"
                  value={activePath.benefit}
                  tone={activePath.color}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <FadeUp delay={0.1}>
          <p className="mt-8 max-w-[62ch] text-[0.84rem] leading-relaxed text-slate-ink/45 dark:text-white/40">
            Confidence is not a probability of repayment. It is how much of your situation LUMO can
            actually see — and it is printed on every pathway so you know when to ask a human.
          </p>
        </FadeUp>
      </Container>
    </section>
  );
}

/* ── mobile: swipeable pathway deck ──────────────────────── */

function PathwayDeck({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  const index = PATHWAYS.findIndex((p) => p.id === active);
  const [dir, setDir] = useState(1);

  const go = (next: number) => {
    const clamped = (next + PATHWAYS.length) % PATHWAYS.length;
    setDir(clamped > index ? 1 : -1);
    onChange(PATHWAYS[clamped].id);
  };

  const p = PATHWAYS[index];

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.x < -55) go(index + 1);
          else if (info.offset.x > 55) go(index - 1);
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={p.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: dir * -60, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: easeLumo }}
            className="glass-card relative overflow-hidden rounded-[26px] p-5"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ background: p.color }}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className="mono text-[0.66rem] uppercase tracking-[0.2em]"
                  style={{ color: p.color }}
                >
                  {p.code}
                </span>
                <h3 className="mt-1.5 text-[1.3rem] font-semibold text-slate-ink dark:text-white">
                  {p.title}
                </h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="mono text-[1.15rem] text-slate-ink dark:text-white">
                  {Math.round(p.confidence * 100)}%
                </span>
                <span className="text-[0.6rem] uppercase tracking-[0.14em] text-slate-ink/40 dark:text-white/40">
                  conf.
                </span>
              </div>
            </div>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-slate-ink/65 dark:text-white/60">
              {p.summary}
            </p>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-indigo-deep/8 dark:bg-white/10">
              <motion.span
                className="block h-full rounded-full"
                style={{ background: p.color }}
                initial={{ width: 0 }}
                animate={{ width: `${p.confidence * 100}%` }}
                transition={{ duration: 1, ease: easeLumo }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {PATHWAYS.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`${q.code}: ${q.title}`}
              aria-current={i === index}
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: i === index ? 28 : 8,
                background: i === index ? p.color : "rgba(120,120,140,0.28)",
              }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous pathway"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-deep/12 text-slate-ink/60 transition-colors duration-500 active:bg-amber-warm/15 dark:border-white/12 dark:text-white/60"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next pathway"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-deep/12 text-slate-ink/60 transition-colors duration-500 active:bg-amber-warm/15 dark:border-white/12 dark:text-white/60"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className="text-center text-[0.68rem] uppercase tracking-[0.24em] text-slate-ink/30 dark:text-white/30">
        swipe to compare
      </p>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[20px] border border-indigo-deep/8 p-4 dark:border-white/8">
      <div className="flex items-center gap-2" style={{ color: tone }}>
        {icon}
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-[0.92rem] leading-relaxed text-slate-ink/75 dark:text-white/70">
        {value}
      </p>
    </div>
  );
}
