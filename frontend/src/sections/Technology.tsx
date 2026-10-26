import { motion } from "framer-motion";
import { Brain, Cpu, Database, Layers, Radio, Server, Waves } from "lucide-react";
import { easeLumo } from "@/animations/variants";
import { TECH_BRAINS, TECH_LAYERS } from "@/data/content";
import { Container, FadeUp, Pill, SectionHeading, SectionShell } from "@/components/ui";

const LAYER_ICONS = [Layers, Server, Database, Radio, Waves, Cpu, Brain];

export function Technology() {
  return (
    <SectionShell id="technology" label="Technology" className="md:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-1/3 h-[34rem] w-[34rem] -translate-x-1/2 animate-drift rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(78,205,196,0.14), rgba(27,31,94,0.08) 46%, transparent 72%)",
          }}
        />
      </div>

      <Container>
        <SectionHeading
          eyebrow="09 · Technology"
          title="Four brains, one calm voice."
          lede="Specialised open models debate, extract and simulate in the background. The person only ever meets one assistant that speaks their language — and admits when it is unsure."
          align="center"
          className="mx-auto max-w-3xl"
        />

        {/* ── model constellation ───────────────────────────── */}
        <div className="scene-3d relative mx-auto mt-16 h-[26rem] max-w-4xl sm:h-[30rem]">
          <svg
            viewBox="0 0 400 300"
            className="absolute inset-0 h-full w-full"
            aria-hidden
            preserveAspectRatio="xMidYMid meet"
          >
            {[
              [200, 150, 96, 60],
              [200, 150, 96, -60],
              [200, 150, -96, 60],
              [200, 150, -96, -60],
            ].map(([x1, y1, dx, dy], i) => (
              <motion.line
                key={i}
                x1={x1}
                y1={y1}
                x2={x1 + dx}
                y2={y1 + dy}
                stroke="#1B1F5E"
                strokeOpacity="0.16"
                strokeWidth="0.8"
                strokeDasharray="3 5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: easeLumo, delay: 0.2 + i * 0.12 }}
              />
            ))}
            {[
              [296, 90, 104, 210],
              [104, 90, 296, 210],
              [296, 90, 296, 210],
              [104, 90, 104, 210],
            ].map(([x1, y1, x2, y2], i) => (
              <motion.line
                key={`cross-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#4ECDC4"
                strokeOpacity="0.14"
                strokeWidth="0.7"
                strokeDasharray="2 6"
                animate={{ strokeDashoffset: [0, -32] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: i * 0.4 }}
              />
            ))}
            <motion.circle
              cx="200"
              cy="150"
              r="26"
              fill="none"
              stroke="#F5A623"
              strokeOpacity="0.4"
              animate={{ r: [26, 34, 26], strokeOpacity: [0.4, 0.12, 0.4] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>

          {/* core */}
          <div className="absolute left-1/2 top-1/2 [transform:translate(-50%,-50%)_translateZ(70px)]">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: easeLumo }}
            >
              <div className="glass-card flex h-24 w-24 flex-col items-center justify-center rounded-[26px]">
                <span className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-amber-warm">
                  LUMO
                </span>
                <span className="mt-1 text-[0.6rem] text-slate-ink/45 dark:text-white/40">
                  LangGraph
                </span>
              </div>
            </motion.div>
          </div>

          {TECH_BRAINS.map((b, i) => {
            const pos = [
              { left: "76%", top: "20%" },
              { left: "24%", top: "20%" },
              { left: "76%", top: "70%" },
              { left: "24%", top: "70%" },
            ][i];
            return (
              <div
                key={b.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ ...pos, zIndex: i + 2 }}
              >
                <div style={{ transform: `translate(-50%,-50%) translateZ(${40 + i * 14}px)` }}>
                <motion.div
                  initial={{ opacity: 0, y: 40, rotateX: -18 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 1.05, ease: easeLumo, delay: 0.15 + i * 0.1 }}
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 7 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.6,
                    }}
                    whileHover={{ scale: 1.06 }}
                    className="glass-card w-[8.5rem] rounded-[22px] p-4 sm:w-[10.5rem]"
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: `${b.color}1f`, color: b.color }}
                    >
                      <Brain size={16} />
                    </span>
                    <p className="mt-3.5 text-[0.95rem] font-semibold text-slate-ink dark:text-white">
                      {b.name}
                    </p>
                    <p className="mt-1 text-[0.72rem] leading-snug text-slate-ink/50 dark:text-white/45">
                      {b.role}
                    </p>
                    <p className="mt-2.5 text-[0.7rem] leading-snug text-slate-ink/40 dark:text-white/38">
                      {b.specialty}
                    </p>
                  </motion.div>
                </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── stack ─────────────────────────────────────────── */}
        <div className="mt-14 md:mt-20">
          <FadeUp>
            <p className="eyebrow mb-6 text-center text-slate-ink/35 dark:text-white/35">
              The stack beneath the conversation
            </p>
          </FadeUp>
          <div className="flex flex-wrap justify-center gap-2.5">
            {TECH_LAYERS.map((l, i) => {
              const Icon = LAYER_ICONS[i % LAYER_ICONS.length];
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 22, scale: 0.94 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: easeLumo, delay: i * 0.06 }}
                  whileHover={{ y: -4 }}
                  className="group flex items-center gap-3 rounded-[20px] border border-indigo-deep/8 bg-cream/70 px-4 py-3 dark:border-white/8 dark:bg-white/4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-deep/6 text-indigo-deep dark:bg-white/8 dark:text-white">
                    <Icon size={14} />
                  </span>
                  <span>
                    <span className="block text-[0.88rem] font-medium text-slate-ink dark:text-white">
                      {l.name}
                    </span>
                    <span className="block text-[0.7rem] text-slate-ink/45 dark:text-white/40">
                      {l.detail}
                    </span>
                  </span>
                  <Pill className="ml-1 hidden sm:inline-flex">{l.kind}</Pill>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── numbers ───────────────────────────────────────── */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { k: "<4 min", l: "from first word to a full twin" },
            { k: "38 ms", l: "median node read latency" },
            { k: "22 langs", l: "speech in, speech out" },
          ].map((n, i) => (
            <FadeUp key={n.k} delay={i * 0.08}>
              <div className="rounded-[24px] border border-indigo-deep/8 p-6 dark:border-white/8">
                <p className="mono text-[1.6rem] font-semibold text-slate-ink dark:text-white">
                  {n.k}
                </p>
                <p className="mt-2 text-[0.86rem] text-slate-ink/55 dark:text-white/50">{n.l}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}
