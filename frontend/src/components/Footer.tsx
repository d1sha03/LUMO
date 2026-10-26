import { motion } from "framer-motion";
import { ArrowUpRight, Globe, Mail, MessageCircle } from "lucide-react";
import { NAV_SECTIONS } from "@/data/content";
import { easeLumo } from "@/animations/variants";
import { Container, FadeUp, LumoButton } from "./ui";

export function Footer() {
  return (
    <footer
      id="footer"
      className="relative isolate overflow-clip border-t border-indigo-deep/8 px-5 pb-28 pt-20 sm:px-8 md:pb-16 md:pt-28 dark:border-white/8"
      aria-label="Footer"
    >
      {/* slow ambient light */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl animate-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(245,166,35,0.16), rgba(27,31,94,0.08) 45%, transparent 70%)",
        }}
      />
      {/* floating particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-warm/40"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 61) % 100}%` }}
            animate={{ y: [0, -22, 0], opacity: [0.15, 0.55, 0.15] }}
            transition={{
              duration: 12 + (i % 5) * 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      <Container className="relative">
        <div className="grid gap-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <FadeUp>
              <div className="flex items-center gap-3">
                <span className="relative flex h-11 w-11 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-indigo-deep animate-breathe" />
                  <span className="absolute inset-[4px] rounded-full border border-amber-warm/70" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-amber-warm" />
                </span>
                <span className="text-[1.35rem] font-semibold tracking-[0.28em] text-slate-ink dark:text-white">
                  LUMO
                </span>
              </div>
            </FadeUp>
            <FadeUp delay={0.08}>
              <h2 className="display-3 mt-8 max-w-[24ch] font-display text-slate-ink dark:text-white">
                The Living Financial Twin.
              </h2>
            </FadeUp>
            <FadeUp delay={0.14}>
              <p className="mt-5 max-w-[46ch] text-[0.98rem] leading-relaxed text-slate-ink/60 dark:text-white/55">
                Built with economists, community reviewers and 40 vendors in Varanasi. Made for the
                600 million people a credit score could never see.
              </p>
            </FadeUp>
            <FadeUp delay={0.2}>
              <div className="mt-8 flex flex-wrap gap-3">
                <LumoButton data-scroll-to="demo" icon={<ArrowUpRight size={16} />}>
                  Start a conversation
                </LumoButton>
                <LumoButton variant="secondary" data-scroll-to="about">
                  Read our principles
                </LumoButton>
              </div>
            </FadeUp>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterColumn
              title="Story"
              items={NAV_SECTIONS.slice(1, 6).map((s) => ({ label: s.label, id: s.id }))}
            />
            <FooterColumn
              title="Trust"
              items={NAV_SECTIONS.slice(6, 9).map((s) => ({ label: s.label, id: s.id }))}
            />
            <div>
              <FadeUp delay={0.1}>
                <p className="eyebrow mb-4 text-slate-ink/35 dark:text-white/35">Connect</p>
              </FadeUp>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: "hello@lumo.money", icon: <ArrowUpRight size={13} /> },
                  { label: "Research notes", icon: <ArrowUpRight size={13} /> },
                  { label: "Model cards", icon: <ArrowUpRight size={13} /> },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="group inline-flex items-center gap-1.5 text-[0.86rem] text-slate-ink/60 transition-colors duration-500 hover:text-amber-warm dark:text-white/55"
                    >
                      {l.label}
                      <span className="translate-y-0.5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        {l.icon}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-2">
                {[Mail, Globe, MessageCircle].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    aria-label="Social link"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-deep/10 text-slate-ink/50 transition-colors duration-500 hover:border-amber-warm/50 hover:text-amber-warm dark:border-white/10 dark:text-white/50"
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hairline mt-16 h-px w-full" />

        <div className="mt-7 flex flex-col gap-3 text-[0.74rem] text-slate-ink/40 sm:flex-row sm:items-center sm:justify-between dark:text-white/35">
          <p>© {new Date().getFullYear()} LUMO Intelligence Labs. Made in India.</p>
          <p className="mono">
            DPDP aligned · no credit scores · human review always available
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: { label: string; id: string }[] }) {
  return (
    <div>
      <FadeUp>
        <p className="eyebrow mb-4 text-slate-ink/35 dark:text-white/35">{title}</p>
      </FadeUp>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 + i * 0.05, duration: 0.7, ease: easeLumo }}
          >
            <button
              type="button"
              data-scroll-to={item.id}
              className="text-left text-[0.86rem] text-slate-ink/60 transition-colors duration-500 hover:text-indigo-deep dark:text-white/55 dark:hover:text-white"
            >
              {item.label}
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
