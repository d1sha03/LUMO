import { AnimatePresence, motion } from "framer-motion";
import { Languages, Mic, Sparkles, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { easeLumo } from "@/animations/variants";
import { CONVERSATION_FLOW, LANGUAGES } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { useNearViewport } from "@/hooks/useInteractions";
import { useIsMobile } from "@/hooks/useMediaQueries";
import { TIER_SETTINGS } from "@/hooks/usePerformanceTier";
import { LumoCanvas } from "@/three/Scene";
import { Microphone } from "@/three/Microphone";
import { Container, FadeUp, Pill, SectionHeading, SectionShell } from "@/components/ui";

export function Conversation() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const { ref: gateRef, near } = useNearViewport<HTMLDivElement>("160px");
  const { tier, reducedMotion } = useSettings();
  const isMobile = useIsMobile();

  const turn = CONVERSATION_FLOW[step];

  /* typewriter that follows the active turn */
  useEffect(() => {
    if (reducedMotion) {
      setTyped(turn.text);
      return;
    }
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(turn.text.slice(0, i));
      if (i >= turn.text.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [turn, reducedMotion]);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % CONVERSATION_FLOW.length);
    }, 7200);
    return () => clearInterval(id);
  }, []);

  const structuredNodes = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: i,
        x: 12 + (i % 3) * 30,
        y: 16 + Math.floor(i / 3) * 30,
        label: ["income", "season", "debt", "goal", "family", "asset", "scheme", "risk", "buffer"][i],
      })),
    [],
  );

  return (
    <SectionShell id="conversation" label="Conversation as the interface">
      <div
        ref={gateRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
      >
        {near && (
          <LumoCanvas
            active={near}
            camera={{ position: [0, 0, isMobile ? 12 : 10.5], fov: isMobile ? 55 : 44 }}
            ariaLabel="A microphone turning speech into structured financial data"
            className="!absolute inset-0"
          >
            <Microphone listening reduced={reducedMotion} particleCount={TIER_SETTINGS[tier].particles / 2} />
          </LumoCanvas>
        )}
      </div>

      <Container>
        <SectionHeading
          eyebrow="04 · Conversation"
          title="No forms. Just talk."
          lede="LUMO begins the way people actually explain their money — out loud, in their own language, with all the context a form would delete."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* conversation surface */}
          <FadeUp className="glass-card relative overflow-hidden rounded-[28px] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-amber-warm/12 text-amber-warm">
                  <Mic size={15} />
                  <motion.span
                    className="absolute inset-0 rounded-full border border-amber-warm/40"
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                  />
                </span>
                <div>
                  <p className="text-[0.82rem] font-medium text-slate-ink dark:text-white">
                    Live conversation
                  </p>
                  <p className="mono text-[0.68rem] text-slate-ink/40 dark:text-white/40">
                    {turn.lang} · on-device capture
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full bg-teal-muted/70"
                    animate={{ height: [4, 16, 7, 20, 5] }}
                    transition={{
                      duration: 1.4 + i * 0.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.08,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-7 flex min-h-[13.5rem] flex-col gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={turn.id}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                  transition={{ duration: 0.7, ease: easeLumo }}
                  className="flex flex-col gap-4"
                >
                  <div className="max-w-[86%] self-end rounded-[20px] rounded-br-[6px] bg-indigo-deep px-4 py-3 text-cream">
                    <p className="text-[0.94rem] leading-relaxed">{turn.text}</p>
                  </div>
                  <div className="max-w-[88%] self-start rounded-[20px] rounded-bl-[6px] border border-amber-warm/25 bg-amber-warm/8 px-4 py-3">
                    <p className="text-[0.94rem] leading-relaxed text-slate-ink dark:text-white">
                      {turn.role === "lumo" ? typed : CONVERSATION_FLOW[Math.max(0, step - 1)].text}
                    </p>
                  </div>
                  <p className="mono self-start text-[0.7rem] text-slate-ink/40 dark:text-white/40">
                    {turn.translation}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {CONVERSATION_FLOW.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Show conversation example ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === step ? "w-8 bg-amber-warm" : "w-1.5 bg-slate-ink/15 dark:bg-white/15"
                  }`}
                />
              ))}
            </div>
          </FadeUp>

          {/* speech → structure */}
          <div className="flex flex-col gap-6">
            <FadeUp delay={0.1}>
              <div className="glass-card relative overflow-hidden rounded-[28px] p-6">
                <div className="mb-5 flex items-center gap-2 text-amber-warm">
                  <Sparkles size={15} />
                  <p className="eyebrow">Speech becomes structure</p>
                </div>
                <div className="relative h-[13rem] w-full">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
                    <motion.path
                      d="M6 62 C 28 62, 34 26, 56 26 S 82 40, 94 40"
                      fill="none"
                      stroke="url(#flowGrad)"
                      strokeWidth="0.7"
                      strokeDasharray="3 4"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 2.2, ease: easeLumo }}
                    />
                    <defs>
                      <linearGradient id="flowGrad" x1="0" x2="1">
                        <stop offset="0%" stopColor="#F5A623" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4ECDC4" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((i) => (
                      <motion.circle
                        key={i}
                        r="1.4"
                        fill="#F5A623"
                        animate={{ cx: [6, 94], cy: [62, 40], opacity: [0, 1, 0] }}
                        transition={{
                          duration: 3.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.85,
                        }}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0">
                    {structuredNodes.map((n, i) => (
                      <motion.div
                        key={n.id}
                        className="absolute"
                        style={{ left: `${n.x}%`, top: `${n.y}%` }}
                        initial={{ opacity: 0, scale: 0.4 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.09, ...{ duration: 0.8, ease: easeLumo } }}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-teal-muted shadow-[0_0_12px_rgba(78,205,196,0.8)]" />
                          <span className="mono text-[0.58rem] uppercase tracking-[0.12em] text-slate-ink/45 dark:text-white/40">
                            {n.label}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.18}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-slate-ink/60 dark:text-white/55">
                  <Languages size={15} />
                  <p className="text-[0.84rem]">Twenty-two languages, one twin</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.slice(0, 8).map((l, i) => (
                    <motion.div
                      key={l.code}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.7, ease: easeLumo }}
                    >
                      <Pill tone={i % 3 === 0 ? "amber" : "neutral"}>
                        <Volume2 size={11} />
                        {l.label}
                      </Pill>
                    </motion.div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
