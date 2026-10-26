import { motion, useInView } from "framer-motion";
import { MapPin } from "lucide-react";
import { useRef } from "react";
import { easeLumo } from "@/animations/variants";
import { IMPACT_STATS } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { useNearViewport } from "@/hooks/useInteractions";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { LumoCanvas } from "@/three/Scene";
import { WorldMap } from "@/three/WorldMap";
import { Container, Counter, FadeUp, SectionHeading, SectionShell } from "@/components/ui";

const HOTSPOTS = [
  { name: "Srinagar", col: 12, row: 1 },
  { name: "Amritsar", col: 11, row: 3 },
  { name: "Delhi", col: 12, row: 5 },
  { name: "Varanasi", col: 16, row: 8 },
  { name: "Kolkata", col: 21, row: 9 },
  { name: "Nashik", col: 11, row: 14 },
  { name: "Bhubaneswar", col: 19, row: 14 },
  { name: "Hyderabad", col: 14, row: 17 },
  { name: "Bengaluru", col: 12, row: 20 },
  { name: "Kochi", col: 11, row: 23 },
];

export function Impact() {
  const { ref: gateRef, near } = useNearViewport<HTMLDivElement>("220px");
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true, amount: 0.35 });
  const { reducedMotion } = useSettings();
  const isMobile = useIsMobile();

  return (
    <SectionShell id="impact" label="Impact" className="md:py-36">
      <div ref={gateRef} className="relative">
        <div aria-hidden className="absolute inset-x-0 -top-16 -z-10 h-[120%]">
          {near && (
            <LumoCanvas
              active={near}
              camera={{ position: [0, 0, isMobile ? 15 : 12], fov: isMobile ? 55 : 42 }}
              ariaLabel="A map of India where each illuminated dot represents a person LUMO has helped"
              className="!absolute inset-0"
            >
              <WorldMap
                reduced={reducedMotion}
                revealSeconds={isMobile ? 2.6 : 4.4}
                hotspots={HOTSPOTS}
              />
            </LumoCanvas>
          )}
        </div>

        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-end">
            <SectionHeading
              eyebrow="10 · Impact"
              title="One dot at a time, a country becomes visible."
              lede="Every dot is a household that went from unreadable to understood — a scheme claimed, a moneylender retired, a daughter's fee paid without new debt."
            />

            <div ref={statsRef} className="grid grid-cols-2 gap-6">
              {IMPACT_STATS.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 26 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.9, ease: easeLumo, delay: i * 0.1 }}
                >
                  <Counter
                    value={s.value}
                    suffix={s.suffix}
                    decimals={s.decimals ?? 0}
                    label={s.label}
                    detail={s.detail}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* hotspot ticker */}
          <div className="mt-16 flex flex-wrap gap-2.5">
            {HOTSPOTS.map((h, i) => (
              <motion.span
                key={h.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: easeLumo, delay: 0.6 + i * 0.07 }}
                whileHover={{ y: -3 }}
                className="flex items-center gap-1.5 rounded-full border border-indigo-deep/8 bg-cream/70 px-3 py-1.5 text-[0.76rem] text-slate-ink/65 backdrop-blur-md dark:border-white/8 dark:bg-white/5 dark:text-white/60"
              >
                <MapPin size={11} className="text-amber-warm" />
                {h.name}
              </motion.span>
            ))}
          </div>

          <FadeUp delay={0.1}>
            <div className="glass-card mt-12 grid gap-6 rounded-[28px] p-7 sm:grid-cols-3 sm:p-9">
              {[
                {
                  q: "The moneylender is paid off. I sleep differently now.",
                  a: "Ravi · Varanasi",
                  d: "PM SVANidhi, ₹10,000, 9 months",
                },
                {
                  q: "It spoke Odia, and it knew my group repays on time.",
                  a: "Meena · Odisha",
                  d: "SHG record surfaced · ₹12,000",
                },
                {
                  q: "Nobody asked me for a document I did not have.",
                  a: "Bikram · Kochi",
                  d: "Cross-state verification, 1 call",
                },
              ].map((t) => (
                <figure key={t.a} className="flex flex-col gap-4">
                  <blockquote className="text-[1rem] leading-relaxed text-slate-ink/85 dark:text-white/85">
                    “{t.q}”
                  </blockquote>
                  <figcaption className="mt-auto">
                    <span className="block text-[0.86rem] font-medium text-slate-ink dark:text-white">
                      {t.a}
                    </span>
                    <span className="mono block text-[0.72rem] text-amber-warm">{t.d}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </FadeUp>
        </Container>
      </div>
    </SectionShell>
  );
}
