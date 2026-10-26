import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { easeLumo } from "@/animations/variants";
import { LANGUAGES } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { TIER_SETTINGS } from "@/hooks/usePerformanceTier";
import { LumoCanvas, LumoLights } from "@/three/Scene";
import { TwinSphere, FinancialConstellation } from "@/three/TwinSphere";
import { AmbientGlow, FloatingParticles } from "@/three/FloatingParticles";
import { CameraRig } from "@/three/CameraRig";
import { Container, LumoButton, Marquee } from "@/components/ui";

export function Hero() {
  const gateRef = useRef<HTMLElement | null>(null);
  const [near, setNear] = useState(false);
  const { scrollYProgress } = useScroll({ target: gateRef, offset: ["start start", "end start"] });
  const { tier, reducedMotion } = useSettings();
  const isMobile = useIsMobile();
  const settings = TIER_SETTINGS[tier];

  const textY = useTransform(scrollYProgress, [0, 1], [0, isMobile ? 40 : 110]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const textBlur = useTransform(scrollYProgress, [0, 0.8], ["blur(0px)", "blur(9px)"]);

  const handleNear = useCallback((v: boolean) => setNear(v), []);
  useEffect(() => {
    const el = gateRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => handleNear(e.isIntersecting), {
      rootMargin: "140px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [handleNear]);

  return (
    <section
      id="hero"
      ref={(el) => {
        gateRef.current = el;
      }}
      aria-label="LUMO — The Living Financial Twin"
      className="relative isolate flex min-h-[100svh] w-full items-center overflow-clip px-5 pb-28 pt-28 sm:px-8 md:pb-32 md:pt-32 lg:px-12"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        {near && (
          <LumoCanvas
            active={near}
            camera={{ position: [0, 0, isMobile ? 10.5 : 8.6], fov: isMobile ? 52 : 42 }}
            ariaLabel="A breathing sphere of light orbited by financial nodes"
            className="!absolute inset-0"
          >
            <CameraRig
              base={[0, 0, isMobile ? 10.5 : 8.6]}
              sway={isMobile ? 0.35 : 1.1}
              dolly={3.2}
              rise={-0.5}
              lambda={1.8}
              reduced={reducedMotion}
            />
            <LumoLights intensity={1} />
            <AmbientGlow color="#F5A623" scale={isMobile ? 9 : 13} position={[0, 0.6, -7]} opacity={0.2} />
            <AmbientGlow color="#4ECDC4" scale={8} position={[-4.5, -2.4, -6]} opacity={0.12} />
            <AmbientGlow color="#5A5FD6" scale={16} position={[4.6, 2.6, -9]} opacity={0.14} />
            <ScrollScale progress={scrollYProgress} from={1} to={1.3}>
              <TwinSphere
                distort={settings.distort}
                segments={settings.segments}
                reduced={reducedMotion}
                scale={isMobile ? 0.72 : 1}
              />
            </ScrollScale>
            <FinancialConstellation
              count={isMobile ? 22 : 48}
              radius={isMobile ? 7 : 8}
              reduced={reducedMotion}
              opacity={0.55}
            />
            <FloatingParticles
              count={settings.particles}
              radius={isMobile ? 8 : 12}
              size={0.055}
              attract={reducedMotion ? 0 : 0.5}
              reduced={reducedMotion}
            />
          </LumoCanvas>
        )}
      </div>

      <div
        aria-hidden
        className="absolute inset-0 -z-10 dark:hidden"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 8%, rgba(250,250,250,0.84), rgba(250,250,250,0.34) 42%, rgba(250,250,250,0) 74%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 8%, rgba(11,11,17,0.88), rgba(11,11,17,0.44) 42%, rgba(11,11,17,0) 74%)",
        }}
      />

      <Container className="relative">
        <motion.div
          style={{ y: textY, opacity: textOpacity, filter: textBlur }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: easeLumo }}
            className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-indigo-deep/10 bg-cream/60 px-3.5 py-1.5 backdrop-blur-md dark:border-white/12 dark:bg-white/6"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-teal-muted animate-breathe" />
            </span>
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-slate-ink/60 dark:text-white/55">
              Now live in 22 languages
            </span>
          </motion.div>

          <h1 className="display-1 font-display leading-[0.82] text-slate-ink dark:text-white">
            {"LUMO".split("").map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: "0.42em", filter: "blur(18px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.55 + i * 0.085, duration: 1.35, ease: easeLumo }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 1.1, ease: easeLumo }}
            className="mt-6 text-[clamp(1.05rem,2.1vw,1.7rem)] font-light tracking-[-0.02em] text-slate-ink/85 dark:text-white/85"
          >
            The Living Financial Twin
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 1.1, ease: easeLumo }}
            className="mt-5 max-w-[42ch] text-[clamp(0.98rem,1.35vw,1.16rem)] leading-relaxed text-slate-ink/60 sm:max-w-[52ch] dark:text-white/55"
          >
            <span className="text-amber-warm">Google Maps for financial life.</span> LUMO builds a
            continuously evolving twin of your money from plain conversation — and helps you explore
            better pathways instead of assigning you a score.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35, duration: 1.1, ease: easeLumo }}
            className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <LumoButton
              size="lg"
              variant="amber"
              data-scroll-to="demo"
              className="w-full sm:w-auto"
              icon={<ArrowUpRight size={17} />}
            >
              Start a conversation
            </LumoButton>
            <LumoButton
              size="lg"
              variant="secondary"
              data-scroll-to="how"
              className="w-full sm:w-auto"
              icon={<Play size={15} />}
            >
              See how it works
            </LumoButton>
          </motion.div>
        </motion.div>
      </Container>

      <div className="absolute inset-x-0 bottom-0 z-10 pb-[max(6rem,env(safe-area-inset-bottom))] md:pb-8">
        <Container>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7, duration: 1.2 }}
            className="flex flex-col items-center gap-5"
          >
            <Marquee items={LANGUAGES.map((l) => `${l.label} · ${l.english}`)} className="max-w-3xl" />
            <button
              type="button"
              data-scroll-to="how"
              aria-label="Scroll to the next section"
              className="group flex flex-col items-center gap-2 text-[0.66rem] uppercase tracking-[0.3em] text-slate-ink/35 dark:text-white/30"
            >
              Scroll
              <motion.span
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-deep/12 transition-colors duration-500 group-hover:border-amber-warm/60 group-hover:text-amber-warm dark:border-white/12"
              >
                <ArrowDown size={14} />
              </motion.span>
            </button>
          </motion.div>
        </Container>
      </div>
    </section>
  );
}

/* ── helpers ─────────────────────────────────────────────── */

/** Scales a group with scroll progress, read per frame inside the canvas. */
function ScrollScale({
  progress,
  from = 1,
  to = 1.3,
  children,
}: {
  progress: MotionValue<number>;
  from?: number;
  to?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<import("three").Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = progress.get();
    const s = from + (to - from) * t;
    ref.current.scale.setScalar(s);
  });
  return <group ref={ref}>{children}</group>;
}


