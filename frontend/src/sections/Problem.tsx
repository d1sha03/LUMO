import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { easeLumo } from "@/animations/variants";
import { PERSONAS } from "@/data/content";
import { Container, FadeUp, SectionShell, Words } from "@/components/ui";

/* ── Line-drawn silhouettes ──────────────────────────────── */
/** One continuous line per person: quiet, dignified, never a caricature. */
function PersonaFigure({ variant }: { variant: string }) {
  const stroke = "currentColor";
  return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      <g fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M60 26a11 11 0 100 22 11 11 0 000-22"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: easeLumo }}
        />
        {variant === "vendor" && (
          <>
            <path d="M60 48c-14 0-22 9-23 22l-3 30c-.4 5 3 8 7 8h38c4 0 7.4-3 7-8l-3-30c-1-13-9-22-23-22z" />
            <path d="M34 106l-9 16M86 106l9 16M44 122h32" />
            <path d="M22 92h76M30 92l4-14M90 92l-4-14" />
          </>
        )}
        {variant === "farmer" && (
          <>
            <path d="M60 48c-13 0-21 9-22 21l-2 26c-.3 5 2.8 8 6.6 8h34.8c3.8 0 6.9-3 6.6-8l-2-26C81 57 73 48 60 48z" />
            <path d="M60 106v22M46 128h28" />
            <path d="M60 96c0-10 6-18 14-22M60 96c0-12-6-20-16-24M74 74c4-6 10-8 16-8M44 72c-3-6-9-9-15-9" />
          </>
        )}
        {variant === "gig" && (
          <>
            <path d="M60 48c-13 0-21 9-22 21l-2 27c-.3 5 2.8 8 6.6 8h34.8c3.8 0 6.9-3 6.6-8l-2-27C81 57 73 48 60 48z" />
            <path d="M36 92h48l-4 20H40z" />
            <path d="M46 60h28l-3 16H49z" />
            <path d="M52 76h16" />
          </>
        )}
        {variant === "migrant" && (
          <>
            <path d="M60 48c-13 0-21 9-22 21l-2 26c-.3 5 2.8 8 6.6 8h34.8c3.8 0 6.9-3 6.6-8l-2-26C81 57 73 48 60 48z" />
            <path d="M28 74h18v20H28zM32 74v-6h10v6" />
            <path d="M92 82c6 0 8-4 8-9s-3-7-8-7" />
          </>
        )}
        {variant === "shg" && (
          <>
            <path d="M60 48c-14 0-24 10-25 23l-2 26c-.4 5 3 8 7 8h40c4 0 7.4-3 7-8l-2-26C84 58 74 48 60 48z" />
            <path d="M38 66c-8 4-12 12-10 22M82 66c8 4 12 12 10 22" />
            <path d="M52 108c2 8 8 12 16 12" />
            <path d="M24 96c8-2 14 2 16 10" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Financial dots that never quite connect. */
function DisconnectedDots({ seed = 0 }: { seed?: number }) {
  const nodes = [
    { x: 18, y: 30 },
    { x: 44, y: 18 },
    { x: 76, y: 26 },
    { x: 96, y: 52 },
    { x: 78, y: 76 },
    { x: 46, y: 86 },
    { x: 20, y: 70 },
    { x: 60, y: 52 },
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 0],
    [7, 0],
    [7, 2],
    [7, 5],
  ];
  return (
    <svg viewBox="0 0 120 100" className="h-full w-full" aria-hidden>
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="currentColor"
          strokeWidth="0.7"
          strokeDasharray="3 5"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.06, 0.34, 0.06] }}
          transition={{
            duration: 5 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i + seed) * 0.35,
          }}
        />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i === 7 ? 2.6 : 1.7}
          fill="currentColor"
          animate={{ opacity: [0.2, 0.85, 0.2], scale: [1, 1.25, 1] }}
          transition={{
            duration: 3.6 + (i % 3),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.42 + seed * 0.2,
          }}
          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
        />
      ))}
    </svg>
  );
}

export function Problem() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  return (
    <SectionShell id="problem" label="The problem" className="pt-8 md:pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px hairline"
      />
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <FadeUp>
              <span className="eyebrow text-amber-warm">02 · The problem</span>
            </FadeUp>
            <h2 className="display-2 mt-6 font-display text-slate-ink dark:text-white">
              <Words text="Millions of people are" />{" "}
              <span className="text-warm-gradient">
                <Words text="financially invisible." delay={0.35} />
              </span>
            </h2>
          </div>
          <FadeUp delay={0.15}>
            <p className="lede max-w-[46ch] text-slate-ink/65 dark:text-white/60">
              Not because they lack money or reliability — because their money has no shape a bureau
              can read. Cash. Seasons. Four apps. A loan from a neighbour. A perfect repayment record
              inside a self-help group that no spreadsheet will ever see.
            </p>
          </FadeUp>
        </div>

        <div ref={ref} className="mt-16 md:mt-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {PERSONAS.map((p, i) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 42, rotateX: -8 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.05, ease: easeLumo, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="group relative flex flex-col gap-5 rounded-[24px] border border-indigo-deep/8 bg-cream/70 p-5 transition-colors duration-700 hover:border-amber-warm/35 dark:border-white/8 dark:bg-white/3"
              >
                <div className="relative h-36 w-full text-indigo-deep/70 dark:text-white/60">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <div className="h-32 w-28">
                      <PersonaFigure variant={p.id} />
                    </div>
                  </div>
                  <div className="absolute inset-0 text-amber-warm/60 transition-opacity duration-700 group-hover:text-teal-muted/70">
                    <DisconnectedDots seed={i} />
                  </div>
                </div>

                <div>
                  <p className="mono text-[0.68rem] uppercase tracking-[0.18em] text-amber-warm">
                    {p.stat}
                  </p>
                  <h3 className="mt-2 text-[1.05rem] font-semibold text-slate-ink dark:text-white">
                    {p.name}
                  </h3>
                  <p className="text-[0.78rem] text-slate-ink/45 dark:text-white/40">{p.role}</p>
                </div>

                <blockquote className="text-[0.9rem] leading-relaxed text-slate-ink/75 dark:text-white/70">
                  “{p.quote}”
                </blockquote>

                <div className="mt-auto h-px w-full bg-indigo-deep/8 dark:bg-white/8" />
                <p className="text-[0.78rem] leading-relaxed text-slate-ink/50 dark:text-white/45">
                  {p.detail}
                </p>
              </motion.article>
            ))}
          </div>
        </div>

        {/* the disconnect moment */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.1, ease: easeLumo }}
          className="glass-card mt-14 overflow-hidden rounded-[28px] p-8 md:mt-20 md:p-12"
        >
          <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div>
              <p className="eyebrow text-slate-ink/35 dark:text-white/35">What exists today</p>
              <ul className="mt-5 flex flex-col gap-3">
                {[
                  "A credit score that starts at zero",
                  "A form with no field for seasons",
                  "A KYC that expires across state lines",
                  "A language the interface never learned",
                ].map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -14 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 + i * 0.12, duration: 0.8, ease: easeLumo }}
                    className="flex items-center gap-3 text-[0.92rem] text-slate-ink/70 dark:text-white/65"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-deep/30 dark:bg-white/25" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto h-24 w-24 shrink-0">
              <motion.span
                className="absolute inset-0 rounded-full border border-dashed border-amber-warm/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
              />
              <span className="absolute inset-4 rounded-full bg-indigo-deep/6 dark:bg-white/8" />
              <span className="absolute inset-[38%] rounded-full bg-amber-warm animate-breathe" />
            </div>

            <div>
              <p className="eyebrow text-amber-warm">What LUMO sees</p>
              <ul className="mt-5 flex flex-col gap-3">
                {[
                  "214 signals from one conversation",
                  "Seasonality as a first-class citizen",
                  "Family, gold, cattle and loans that live in speech",
                  "Pathways with confidence and trade-offs",
                ].map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: 14 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.12, duration: 0.8, ease: easeLumo }}
                    className="flex items-center gap-3 text-[0.92rem] text-slate-ink/80 dark:text-white/75"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-muted" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </Container>
    </SectionShell>
  );
}
