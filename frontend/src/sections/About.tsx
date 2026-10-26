import { motion } from "framer-motion";
import { ArrowUpRight, Heart } from "lucide-react";
import { ABOUT_TIMELINE, ABOUT_VALUES } from "@/data/content";
import { easeLumo } from "@/animations/variants";
import { Container, FadeUp, LumoButton, SectionHeading, SectionShell } from "@/components/ui";

export function About() {
  return (
    <SectionShell id="about" label="About LUMO" className="md:py-36">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionHeading
              eyebrow="12 · About"
              title="We started with a tea stall, not a spreadsheet."
              lede="LUMO is built by a small team of economists, Indic-language engineers and community organisers who kept meeting the same person: reliable, hardworking, and completely invisible to the system that decides who gets credit."
            />

            <FadeUp delay={0.12}>
              <div className="mt-10 flex flex-col gap-4">
                {ABOUT_VALUES.map((v, i) => (
                  <motion.div
                    key={v.title}
                    initial={{ opacity: 0, x: -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.85, ease: easeLumo, delay: i * 0.08 }}
                    className="group border-l border-indigo-deep/10 pl-5 transition-colors duration-700 hover:border-amber-warm/60 dark:border-white/10"
                  >
                    <p className="text-[1rem] font-medium text-slate-ink dark:text-white">
                      {v.title}
                    </p>
                    <p className="mt-1.5 max-w-[44ch] text-[0.88rem] leading-relaxed text-slate-ink/60 dark:text-white/55">
                      {v.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-3">
                <LumoButton data-scroll-to="demo" icon={<ArrowUpRight size={15} />}>
                  Start a conversation
                </LumoButton>
                <LumoButton variant="ghost" data-scroll-to="responsible">
                  Our AI principles
                </LumoButton>
              </div>
            </FadeUp>
          </div>

          {/* timeline */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-amber-warm/60 via-indigo-deep/15 to-transparent"
            />
            <ol className="flex flex-col gap-10">
              {ABOUT_TIMELINE.map((t, i) => (
                <motion.li
                  key={`${t.year}-${t.title}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.95, ease: easeLumo, delay: i * 0.1 }}
                  className="relative pl-10"
                >
                  <motion.span
                    className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center"
                    whileInView={{ scale: [0.4, 1.15, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: easeLumo, delay: 0.1 + i * 0.1 }}
                  >
                    <span className="absolute inset-0 rounded-full bg-amber-warm/20" />
                    <span className="relative h-2 w-2 rounded-full bg-amber-warm" />
                  </motion.span>
                  <p className="mono text-[0.72rem] text-amber-warm">{t.year}</p>
                  <h3 className="mt-2 text-[1.15rem] font-semibold text-slate-ink dark:text-white">
                    {t.title}
                  </h3>
                  <p className="mt-2 max-w-[48ch] text-[0.9rem] leading-relaxed text-slate-ink/60 dark:text-white/55">
                    {t.body}
                  </p>
                </motion.li>
              ))}
            </ol>

            <FadeUp delay={0.15}>
              <div className="glass-card mt-12 flex items-start gap-4 rounded-[26px] p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-warm/12 text-amber-warm">
                  <Heart size={16} />
                </span>
                <div>
                  <p className="text-[0.98rem] font-medium text-slate-ink dark:text-white">
                    Community reviewers are paid, credited and named in every release.
                  </p>
                  <p className="mt-2 text-[0.86rem] leading-relaxed text-slate-ink/60 dark:text-white/55">
                    41 reviewers across 9 states currently shape what LUMO says and how it says it.
                    If a phrase does not feel right in Odia or Marathi, it does not ship.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
