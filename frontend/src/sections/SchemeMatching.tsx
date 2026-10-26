import { motion } from "framer-motion";
import { BadgeCheck, Check, ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";
import { easeLumo } from "@/animations/variants";
import { SCHEMES } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { useNearViewport } from "@/hooks/useInteractions";
import { TIER_SETTINGS } from "@/hooks/usePerformanceTier";
import { LumoCanvas } from "@/three/Scene";
import { FloatingCards } from "@/three/FloatingCards";
import { Container, FadeUp, Pill, SectionHeading, SectionShell, TiltCard } from "@/components/ui";

const CARD_SPECS = SCHEMES.map((s) => ({
  id: s.id,
  title: s.name,
  subtitle: s.subtitle.split("·")[0].trim(),
  amount: s.amount,
  accent: "#F5A623",
}));

export function SchemeMatching() {
  const [hovered, setHovered] = useState<string | null>(null);
  const { ref: gateRef, near } = useNearViewport<HTMLDivElement>("220px");
  const { tier, reducedMotion } = useSettings();
  const isMobile = useIsMobile();

  return (
    <SectionShell id="schemes" label="Scheme matching">
      {/* cards emerging from the twin — desktop only, mobile keeps its budget */}
      <div ref={gateRef} aria-hidden className="absolute inset-x-0 top-0 -z-10 h-full">
        {near && !isMobile && (
          // decorative backdrop — pointer events stay free for the readable
          // DOM cards in front, so hover never fights the canvas
          <LumoCanvas
            active={near}
            camera={{ position: [-0.6, 0, 10.4], fov: 42 }}
            ariaLabel="Scheme cards emerging from a living financial twin"
            className="!absolute inset-0 opacity-70"
          >
            <FloatingCards
              specs={CARD_SPECS}
              hoveredId={hovered}
              onHover={setHovered}
              reduced={reducedMotion}
              particleCount={Math.round(TIER_SETTINGS[tier].particles * 0.22)}
            />
          </LumoCanvas>
        )}
      </div>

      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <SectionHeading
            eyebrow="07 · Entitlements"
            title="₹3.7 lakh crore of help, unclaimed."
            lede="Most people are not ineligible. They are unmatched. LUMO reads your twin against the live scheme corpus and shows exactly why you qualify — in the language you speak."
          />
          <FadeUp delay={0.12}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="rounded-[22px] border border-indigo-deep/8 bg-cream/70 px-5 py-4 backdrop-blur-md dark:border-white/8 dark:bg-white/5">
                <p className="mono text-[1.6rem] leading-none text-amber-warm">₹3.7k Cr</p>
                <p className="mt-2 max-w-[22ch] text-[0.8rem] leading-snug text-slate-ink/55 dark:text-white/50">
                  of central entitlements went unclaimed last year
                </p>
              </div>
            </div>
          </FadeUp>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SCHEMES.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 48, rotateY: -12 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1, ease: easeLumo, delay: i * 0.09 }}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <TiltCard
                className="h-full border border-indigo-deep/8 bg-cream/75 p-6 dark:border-white/8 dark:bg-white/4"
                strength={6}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[1.06rem] font-semibold text-slate-ink dark:text-white">
                        {s.name}
                      </h3>
                      <p className="mt-1 text-[0.78rem] text-slate-ink/45 dark:text-white/40">
                        {s.subtitle}
                      </p>
                    </div>
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="17"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-indigo-deep/10 dark:text-white/10"
                        />
                        <motion.circle
                          cx="20"
                          cy="20"
                          r="17"
                          fill="none"
                          stroke="#F5A623"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 17}
                          initial={{ strokeDashoffset: 2 * Math.PI * 17 }}
                          whileInView={{
                            strokeDashoffset: 2 * Math.PI * 17 * (1 - s.match / 100),
                          }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.6, ease: easeLumo, delay: 0.3 + i * 0.1 }}
                        />
                      </svg>
                      <span className="mono text-[0.62rem] text-slate-ink dark:text-white">
                        {s.match}
                      </span>
                    </span>
                  </div>

                  <p className="mono mt-5 text-[1.05rem] text-amber-warm">{s.amount}</p>

                  <p className="mt-4 flex-1 text-[0.86rem] leading-relaxed text-slate-ink/65 dark:text-white/60">
                    {s.why}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <Pill key={t}>{t}</Pill>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2 text-[0.78rem] font-medium text-indigo-deep transition-colors duration-500 group-hover:text-amber-warm dark:text-white">
                    <BadgeCheck size={14} className="text-teal-muted" />
                    Eligibility pre-checked
                    <ExternalLink size={12} className="ml-auto opacity-40" />
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        <FadeUp delay={0.1}>
          <div className="glass-card mt-10 flex flex-col gap-5 rounded-[26px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-muted/12 text-teal-muted">
                <Sparkles size={17} />
              </span>
              <div>
                <p className="text-[0.98rem] font-medium text-slate-ink dark:text-white">
                  Every match is explained, never sold.
                </p>
                <p className="mt-1.5 max-w-[54ch] text-[0.86rem] leading-relaxed text-slate-ink/60 dark:text-white/55">
                  LUMO takes no commission from schemes, banks or lenders. If a pathway is not in your
                  interest, it does not appear.
                </p>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {["No lead generation", "No referral fees", "Consent per application"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[0.84rem] text-slate-ink/70 dark:text-white/65">
                  <Check size={13} className="text-teal-muted" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
      </Container>
    </SectionShell>
  );
}
