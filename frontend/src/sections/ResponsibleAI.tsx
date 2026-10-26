import { AnimatePresence, motion } from "framer-motion";
import { Handshake, Lock, Scale, Sparkles, UserCheck, Check } from "lucide-react";
import { useState } from "react";
import { easeLumo } from "@/animations/variants";
import { PRINCIPLES } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { useNearViewport } from "@/hooks/useInteractions";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { TIER_SETTINGS } from "@/hooks/usePerformanceTier";
import { LumoCanvas } from "@/three/Scene";
import { OrbitingIcons } from "@/three/OrbitingIcons";
import { Container, FadeUp, SectionHeading, SectionShell } from "@/components/ui";

const ICONS: Record<string, React.ReactNode> = {
  handshake: <Handshake size={13} />,
  lock: <Lock size={13} />,
  sparkles: <Sparkles size={13} />,
  scale: <Scale size={13} />,
  "user-check": <UserCheck size={13} />,
};

export function ResponsibleAI() {
  const { ref: gateRef, near } = useNearViewport<HTMLDivElement>("200px");
  const [active, setActive] = useState<string>("consent");
  const { tier, reducedMotion } = useSettings();
  const isMobile = useIsMobile();
  const principle = PRINCIPLES.find((p) => p.id === active)!;

  const items = PRINCIPLES.map((p) => ({
    id: p.id,
    label: p.label,
    icon: ICONS[p.icon],
  }));

  return (
    <SectionShell
      id="responsible"
      label="Responsible AI"
      className="overflow-visible md:py-36"
    >
      <div ref={gateRef} className="relative">
        <div aria-hidden className="absolute inset-x-0 -top-24 -z-10 h-[130%] opacity-95">
          {near && !isMobile && (
            <LumoCanvas
              active={near}
              interactive
              camera={{ position: [0, 0, 9.4], fov: 44 }}
              ariaLabel="A shield of light with the principles of responsible AI orbiting it"
              className="!absolute inset-0"
            >
              <OrbitingIcons
                items={items}
                activeId={active}
                onSelect={setActive}
                reduced={reducedMotion}
                particleCount={Math.round(TIER_SETTINGS[tier].particles * 0.3)}
              />
            </LumoCanvas>
          )}
        </div>

        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="08 · Responsible AI"
                title="Trust is the product."
                lede="A financial twin only works if the person it belongs to is in charge of it. Five commitments, engineered in — not bolted on."
              />

              {/* keyboard-accessible selector (always available; the orbiting
                  anchors are the same controls rendered in 3D space) */}
              <div className="mt-9 flex flex-wrap gap-2">
                {PRINCIPLES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActive(p.id)}
                    aria-pressed={active === p.id}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8rem] transition-all duration-500 ${
                      active === p.id
                        ? "border-amber-warm/50 bg-amber-warm/10 text-[#8a5a00] dark:text-amber-soft"
                        : "border-indigo-deep/10 text-slate-ink/60 dark:border-white/10 dark:text-white/55"
                    }`}
                  >
                    {ICONS[p.icon]}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:min-h-[26rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={principle.id}
                  initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -18, filter: "blur(9px)" }}
                  transition={{ duration: 0.7, ease: easeLumo }}
                  className="glass-card rounded-[28px] p-7 sm:p-8"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-warm/12 text-amber-warm">
                    {ICONS[principle.icon]}
                  </span>
                  <p className="eyebrow mt-6 text-amber-warm">{principle.label}</p>
                  <h3 className="display-3 mt-3 max-w-[22ch] font-display text-slate-ink dark:text-white">
                    {principle.headline}
                  </h3>
                  <p className="mt-4 text-[0.96rem] leading-relaxed text-slate-ink/70 dark:text-white/65">
                    {principle.body}
                  </p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {principle.detail.map((d, i) => (
                      <motion.li
                        key={d}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.09, duration: 0.7, ease: easeLumo }}
                        className="flex items-start gap-3 text-[0.88rem] leading-relaxed text-slate-ink/70 dark:text-white/65"
                      >
                        <Check size={14} className="mt-0.5 shrink-0 text-teal-muted" />
                        {d}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <FadeUp delay={0.1}>
            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {[
                { k: "0", l: "credit scores produced", d: "By design, forever." },
                { k: "24h", l: "to a human reviewer", d: "For any decision that limits access." },
                { k: "100%", l: "recommendations attributable", d: "Signal-level reasoning, in your language." },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-[24px] border border-indigo-deep/8 p-6 dark:border-white/8"
                >
                  <p className="display-3 mono font-display text-amber-warm">{s.k}</p>
                  <p className="mt-3 text-[0.92rem] font-medium text-slate-ink dark:text-white">
                    {s.l}
                  </p>
                  <p className="mt-1.5 text-[0.82rem] text-slate-ink/50 dark:text-white/45">{s.d}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </Container>
      </div>
    </SectionShell>
  );
}
