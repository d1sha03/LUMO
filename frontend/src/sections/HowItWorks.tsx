import { motion, useScroll, useTransform } from "framer-motion";
import { MessagesSquare, Network, Route } from "lucide-react";
import { useRef } from "react";
import { easeLumo } from "@/animations/variants";
import { Container, FadeUp, SectionShell, Words } from "@/components/ui";

const STEPS = [
  {
    icon: <MessagesSquare size={18} />,
    kicker: "Step one",
    title: "You talk. That's the whole input.",
    body: "A four-minute conversation, out loud, in your language. No documents to find, no fields to guess at, no branch to visit.",
    detail: "AI4Bharat speech · 22 languages",
    color: "#F5A623",
  },
  {
    icon: <Network size={18} />,
    kicker: "Step two",
    title: "The twin assembles itself.",
    body: "Sentences become nodes. Nodes find their connections. Seasons, family, gold, informal loans and dreams take their place in one living structure.",
    detail: "214 signals · 9 domains · 1 model",
    color: "#4ECDC4",
  },
  {
    icon: <Route size={18} />,
    kicker: "Step three",
    title: "You choose a pathway.",
    body: "LUMO simulates routes through your real life with timelines, confidence and honest risk. Then it walks the route with you, month by month.",
    detail: "3 pathways · 0 scores",
    color: "#8B7CF6",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineScale = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);
  const dotY = useTransform(scrollYProgress, [0.1, 0.8], ["0%", "100%"]);

  return (
    <SectionShell id="how" label="How it works" className="py-20 md:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <FadeUp>
              <span className="eyebrow text-amber-warm">03 · How it works</span>
            </FadeUp>
            <h2 className="display-2 mt-6 font-display text-slate-ink dark:text-white">
              <Words text="Three moves. Nothing to learn." />
            </h2>
            <FadeUp delay={0.12}>
              <p className="lede mt-6 max-w-[38ch] text-slate-ink/60 dark:text-white/55">
                LUMO is designed for someone holding a phone with one hand, in a queue, with four
                minutes. Everything else is our problem, not theirs.
              </p>
            </FadeUp>
          </div>

          <div ref={ref} className="relative pl-14 sm:pl-16">
            {/* the route */}
            <div
              aria-hidden
              className="absolute left-[1.35rem] top-3 h-[calc(100%-2rem)] w-px bg-indigo-deep/10 sm:left-[1.85rem] dark:bg-white/10"
            >
              <motion.span
                style={{ scaleY: lineScale }}
                className="block h-full w-full origin-top bg-gradient-to-b from-amber-warm via-teal-muted to-[#8B7CF6]"
              />
              <motion.span
                style={{ top: dotY }}
                className="absolute -left-[3px] h-2 w-2 rounded-full bg-amber-warm shadow-[0_0_14px_rgba(245,166,35,0.9)]"
              />
            </div>

            <ol className="flex flex-col gap-5">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, amount: 0.45 }}
                  transition={{ duration: 1, ease: easeLumo, delay: i * 0.12 }}
                  whileHover={{ y: -5 }}
                  className="group relative rounded-[26px] border border-indigo-deep/8 bg-cream/70 p-6 backdrop-blur-sm transition-colors duration-700 hover:border-amber-warm/30 dark:border-white/8 dark:bg-white/3 sm:p-7"
                >
                  <span
                    aria-hidden
                    className="absolute -left-14 top-7 flex h-11 w-11 items-center justify-center rounded-full border sm:-left-16"
                    style={{
                      borderColor: `${s.color}55`,
                      background: `${s.color}14`,
                      color: s.color,
                    }}
                  >
                    {s.icon}
                  </span>
                  <p
                    className="mono text-[0.66rem] uppercase tracking-[0.2em]"
                    style={{ color: s.color }}
                  >
                    {s.kicker}
                  </p>
                  <h3 className="mt-3 max-w-[28ch] text-[1.3rem] font-semibold leading-tight text-slate-ink sm:text-[1.5rem] dark:text-white">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-[52ch] text-[0.93rem] leading-relaxed text-slate-ink/65 dark:text-white/60">
                    {s.body}
                  </p>
                  <p className="mono mt-5 text-[0.7rem] text-slate-ink/40 dark:text-white/38">
                    {s.detail}
                  </p>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                    style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }}
                  />
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
