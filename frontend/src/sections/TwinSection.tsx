import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Activity, Info, Radar, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type * as THREE from "three";
import { easeLumo } from "@/animations/variants";
import { useSettings } from "@/hooks/useAppSettings";
import { useNearViewport } from "@/hooks/useInteractions";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { TIER_SETTINGS } from "@/hooks/usePerformanceTier";
import { buildTwinGraph, KIND_COLORS } from "@/utils/graph";
import { LumoCanvas, LumoLights } from "@/three/Scene";
import { LivingTwinGraph } from "@/three/LivingTwinGraph";
import { Container, FadeUp, Pill } from "@/components/ui";

const KIND_ORDER = [
  "income",
  "expense",
  "debt",
  "goal",
  "risk",
  "scheme",
  "season",
  "family",
  "asset",
  "savings",
  "insurance",
];

/** The pinned narrative: what the twin knows at each point in the scroll. */
const CHAPTERS = [
  {
    id: "c1",
    index: "Chapter I",
    title: "It begins with one sentence.",
    body: "A single conversation gives LUMO its first honest signals — what you earn, and how it arrives.",
    kinds: ["income", "family"],
  },
  {
    id: "c2",
    index: "Chapter II",
    title: "It learns how your money actually behaves.",
    body: "Seasons appear. Debts with no paperwork appear. Goals you have never written down appear.",
    kinds: ["income", "family", "expense", "debt", "season", "asset"],
  },
  {
    id: "c3",
    index: "Chapter III",
    title: "Then it starts working for you.",
    body: "Risks are named, entitlements matched, and the whole structure keeps breathing as your life changes.",
    kinds: ["income", "family", "expense", "debt", "season", "asset", "goal", "risk", "scheme"],
  },
] as const;

export function TwinSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: gateRef, near } = useNearViewport<HTMLElement>("200px");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [signals, setSignals] = useState(214);
  const [chapter, setChapter] = useState(0);
  const { tier, reducedMotion } = useSettings();
  const isMobile = useIsMobile();
  const graph = useMemo(() => buildTwinGraph(7), []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const progressRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    const next = v < 0.34 ? 0 : v < 0.68 ? 1 : 2;
    setChapter((prev) => (prev === next ? prev : next));
  });

  /** which nodes exist at this chapter */
  const revealedIds = useMemo(() => {
    const kinds = new Set<string>(CHAPTERS[chapter].kinds);
    return new Set(graph.nodes.filter((n) => n.kind === "core" || kinds.has(n.kind)).map((n) => n.id));
  }, [chapter, graph.nodes]);

  const nodes = graph.nodes;
  const focus = nodes.find((n) => n.id === (selected ?? hovered)) ?? null;

  /* the twin keeps living while you read */
  useEffect(() => {
    if (!near) return;
    const id = setInterval(() => {
      setSignals((s) => (s >= 228 ? 214 : s + 1));
    }, 2600);
    return () => clearInterval(id);
  }, [near]);

  const headingOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const headingY = useTransform(scrollYProgress, [0, 0.1], [0, -30]);

  return (
    <section
      id="twin"
      ref={(el) => {
        sectionRef.current = el;
        gateRef.current = el;
      }}
      aria-label="The living financial twin"
      className="relative isolate w-full"
      style={{ height: isMobile ? "260svh" : "320svh" }}
    >
      {/* pinned stage */}
      <div className="sticky top-0 h-[100svh] w-full overflow-clip">
        <div className="absolute inset-0 z-0">
          {near && (
            <LumoCanvas
              active={near}
              interactive
              camera={{ position: [0, 0.2, isMobile ? 15 : 11.4], fov: isMobile ? 58 : 44 }}
              ariaLabel="An interactive three-dimensional graph of a person's financial life, growing as you scroll"
              className="!absolute inset-0"
            >
              <LumoLights intensity={0.95} />
              <GraphGroup
                graph={graph}
                revealedIds={revealedIds}
                hoveredId={hovered}
                onHover={setHovered}
                onSelect={(id) => setSelected(id)}
                reduced={reducedMotion}
                particleCount={Math.round(TIER_SETTINGS[tier].particles * 0.6)}
                progressRef={progressRef}
                isMobile={isMobile}
              />
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                autoRotate={!reducedMotion}
                autoRotateSpeed={0.32}
                rotateSpeed={0.5}
                minPolarAngle={Math.PI * 0.24}
                maxPolarAngle={Math.PI * 0.72}
                dampingFactor={0.08}
              />
            </LumoCanvas>
          )}
        </div>

        {/* section title — exits as the chapters take over */}
        <motion.div
          style={{ opacity: headingOpacity, y: headingY }}
          className="pointer-events-none absolute inset-x-0 top-[16svh] z-10 px-5 sm:px-8 lg:px-12"
        >
          <Container>
            <div className="max-w-2xl">
              <span className="eyebrow text-amber-warm">05 · The twin</span>
              <h2 className="display-2 mt-5 font-display text-slate-ink dark:text-white">
                A financial twin that never stops changing.
              </h2>
              <p className="lede mt-5 max-w-[46ch] text-slate-ink/60 dark:text-white/55">
                Income, expenses, debt, goals, risks, schemes, seasons, family and assets — held
                together the way they actually live: connected. Scroll to watch it form.
              </p>
            </div>
          </Container>
        </motion.div>

        {/* chapter narrative */}
        <Container className="pointer-events-none absolute inset-x-0 bottom-[14svh] z-10 px-5 sm:px-8 lg:px-12">
          <div className="max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={CHAPTERS[chapter].id}
                initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
                animate={{ opacity: chapter === 0 ? 0 : 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
                transition={{ duration: 0.7, ease: easeLumo }}
                className="glass-card rounded-[24px] p-5 sm:p-6"
              >
                <p className="mono text-[0.64rem] uppercase tracking-[0.22em] text-amber-warm">
                  {CHAPTERS[chapter].index}
                </p>
                <h3 className="mt-2.5 max-w-[24ch] text-[1.2rem] font-semibold leading-tight text-slate-ink sm:text-[1.4rem] dark:text-white">
                  {CHAPTERS[chapter].title}
                </h3>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-slate-ink/65 dark:text-white/60">
                  {CHAPTERS[chapter].body}
                </p>
                <div className="mt-4 flex gap-1.5">
                  {CHAPTERS.map((c, i) => (
                    <span
                      key={c.id}
                      className="h-1 rounded-full transition-all duration-700"
                      style={{
                        width: i === chapter ? 26 : 8,
                        background: i <= chapter ? "#F5A623" : "rgba(120,120,140,0.3)",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Container>

        {/* legend + HUD */}
        <Container className="pointer-events-none absolute inset-x-0 bottom-[max(4.5rem,env(safe-area-inset-bottom))] z-10 px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <FadeUp className="no-scrollbar pointer-events-auto flex max-h-16 flex-wrap gap-1.5 overflow-y-auto lg:max-w-md lg:flex-nowrap lg:overflow-visible">
              {KIND_ORDER.map((kind) => {
                const awake = (CHAPTERS[chapter].kinds as readonly string[]).includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    onMouseEnter={() => setHovered(nodes.find((n) => n.kind === kind)?.id ?? null)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(nodes.find((n) => n.kind === kind)?.id ?? null)}
                    className="group flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[0.72rem] capitalize backdrop-blur-md transition-all duration-700"
                    style={{
                      borderColor: awake ? `${KIND_COLORS[kind]}44` : "rgba(120,120,140,0.16)",
                      background: awake ? "rgba(255,253,248,0.78)" : "rgba(255,253,248,0.4)",
                      opacity: awake ? 1 : 0.45,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full transition-transform duration-500 group-hover:scale-125"
                      style={{ background: KIND_COLORS[kind] }}
                    />
                    <span className="text-slate-ink/70 dark:text-white/65">{kind}</span>
                  </button>
                );
              })}
            </FadeUp>

            <FadeUp delay={0.1} className="glass-card pointer-events-auto rounded-[22px] px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-teal-muted">
                  <Radar size={14} />
                  <span className="mono text-[0.72rem]">{signals} signals</span>
                </div>
                <div className="flex items-center gap-2 text-amber-warm">
                  <Activity size={14} />
                  <span className="mono text-[0.72rem]">live</span>
                </div>
                <div className="hidden items-center gap-2 text-slate-ink/40 sm:flex dark:text-white/40">
                  <Info size={13} />
                  <span className="text-[0.7rem]">drag · hover a node</span>
                </div>
              </div>
            </FadeUp>
          </div>
        </Container>
      </div>

      {/* focus panel */}
      <AnimatePresence>
        {focus && (
          <motion.aside
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            transition={{ duration: 0.65, ease: easeLumo }}
            className="glass-card fixed bottom-24 right-4 z-40 w-[min(21rem,calc(100vw-2rem))] rounded-[24px] p-5 md:bottom-8 md:right-8"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className="mono text-[0.66rem] uppercase tracking-[0.2em]"
                  style={{ color: KIND_COLORS[focus.kind] }}
                >
                  {focus.kind}
                </span>
                <h3 className="mt-1.5 text-[1.05rem] font-semibold text-slate-ink dark:text-white">
                  {focus.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setHovered(null);
                }}
                aria-label="Close detail"
                className="rounded-full p-1 text-slate-ink/40 transition-colors hover:text-amber-warm dark:text-white/40"
              >
                <X size={15} />
              </button>
            </div>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-slate-ink/70 dark:text-white/65">
              {focus.detail}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {focus.metric && <Pill tone="amber">{focus.metric}</Pill>}
              <Pill>attributed · explainable</Pill>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── scene wrapper: scroll drives scale, drift and reveal ─── */

function GraphGroup({
  graph,
  revealedIds,
  hoveredId,
  onHover,
  onSelect,
  reduced,
  particleCount,
  progressRef,
  isMobile,
}: {
  graph: ReturnType<typeof buildTwinGraph>;
  revealedIds: Set<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  reduced: boolean;
  particleCount: number;
  progressRef: { current: number };
  isMobile: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const p = progressRef.current;
    // eases out of the title, settles as the last chapter lands
    const s = 0.8 + p * 0.3;
    group.current.scale.setScalar(s * (isMobile ? 0.78 : 1));
    group.current.position.y = (0.5 - p) * (isMobile ? 1.4 : 2.2);
  });

  return (
    <group ref={group}>
      <LivingTwinGraph
        data={graph}
        revealedIds={revealedIds}
        hoveredId={hoveredId}
        onHover={onHover}
        onSelect={onSelect}
        reduced={reduced}
        particleCount={particleCount}
      />
    </group>
  );
}
