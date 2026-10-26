import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, RotateCcw, Route, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { easeLumo } from "@/animations/variants";
import { DEMO_PROMPTS, DEMO_REPLIES, LANGUAGES, PATHWAYS, SCHEMES } from "@/data/content";
import { useSettings } from "@/hooks/useAppSettings";
import { KIND_COLORS } from "@/utils/graph";
import { Container, FadeUp, LumoButton, Pill, SectionHeading, SectionShell } from "@/components/ui";

interface Message {
  id: string;
  role: "user" | "lumo";
  lang: string;
  text: string;
  detail?: string;
}

const MINI_NODES = [
  { id: "season-14", label: "Monsoon", kind: "season", x: 22, y: 22 },
  { id: "risk-9", label: "Income gap", kind: "risk", x: 68, y: 18 },
  { id: "debt-5", label: "Moneylender", kind: "debt", x: 82, y: 52 },
  { id: "scheme-12", label: "SVANidhi", kind: "scheme", x: 62, y: 82 },
  { id: "scheme-11", label: "PM Kisan", kind: "scheme", x: 30, y: 78 },
  { id: "goal-6", label: "Degree", kind: "goal", x: 12, y: 48 },
  { id: "income-0", label: "Wages", kind: "income", x: 48, y: 12 },
  { id: "scheme-13", label: "Jan Dhan", kind: "scheme", x: 52, y: 90 },
];

export function DemoExperience() {
  const [lang, setLang] = useState("हिन्दी");
  const [messages, setMessages] = useState<Message[]>([]);
  const [revealed, setRevealed] = useState<string[]>(["income-0"]);
  const [thinking, setThinking] = useState(false);
  const [typed, setTyped] = useState("");
  const [listening, setListening] = useState(false);
  const [pathway, setPathway] = useState<string | null>(null);
  const { reducedMotion } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeReply = messages.filter((m) => m.role === "lumo").at(-1);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, thinking, reducedMotion]);

  const send = (promptId: string) => {
    const prompt = DEMO_PROMPTS.find((p) => p.id === promptId)!;
    const reply = DEMO_REPLIES[promptId];
    const id = `${Date.now()}`;
    setMessages((m) => [...m, { id, role: "user", lang: prompt.lang, text: prompt.text }]);
    setListening(false);
    setThinking(true);
    setTyped("");

    window.setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        { id: `${id}-r`, role: "lumo", lang: prompt.lang, text: reply.text, detail: reply.detail },
      ]);
      setRevealed((r) => Array.from(new Set([...r, ...(prompt.reveals ?? [])])));
      setPathway(promptId === "p2" ? "c" : promptId === "p3" ? "a" : "a");
      if (reducedMotion) setTyped(reply.text);
    }, 1500);
  };

  /* typewriter on the newest reply */
  useEffect(() => {
    if (!activeReply || reducedMotion) return;
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(activeReply.text.slice(0, i));
      if (i >= activeReply.text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [activeReply, reducedMotion]);

  const revealedSet = useMemo(() => new Set(revealed), [revealed]);
  const matchedSchemes = useMemo(
    () => SCHEMES.filter(() => revealed.some((r) => r.startsWith("scheme"))).slice(0, 2),
    [revealed],
  );

  return (
    <SectionShell id="demo" label="Try LUMO" className="md:py-36">
      <Container>
        <SectionHeading
          eyebrow="11 · Demo"
          title="Talk to it. Right here."
          lede="A small slice of the real experience: pick something you would actually say out loud, and watch the twin grow and a pathway take shape."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ── conversation ──────────────────────────────── */}
          <FadeUp className="glass-card flex min-h-[32rem] flex-col overflow-hidden rounded-[28px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-deep/8 px-5 py-4 dark:border-white/8">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-deep text-cream">
                  <Sparkles size={14} />
                </span>
                <div>
                  <p className="text-[0.85rem] font-medium text-slate-ink dark:text-white">LUMO</p>
                  <p className="mono text-[0.66rem] text-teal-muted">listening · {lang}</p>
                </div>
              </div>
              <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto">
                {LANGUAGES.slice(0, 5).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.label)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] transition-colors duration-500 ${
                      lang === l.label
                        ? "bg-amber-warm/15 text-[#8a5a00] dark:text-amber-soft"
                        : "text-slate-ink/45 hover:text-amber-warm dark:text-white/45"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="no-scrollbar flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-6"
              aria-live="polite"
            >
              {messages.length === 0 && !thinking && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
                  <motion.span
                    className="relative flex h-16 w-16 items-center justify-center rounded-full bg-amber-warm/10 text-amber-warm"
                    animate={reducedMotion ? undefined : { scale: [1, 1.06, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Mic size={20} />
                  </motion.span>
                  <p className="max-w-[30ch] text-[0.94rem] leading-relaxed text-slate-ink/60 dark:text-white/55">
                    Say anything about your money. There is no wrong format.
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.65, ease: easeLumo }}
                      className={`max-w-[88%] rounded-[20px] px-4 py-3 ${
                        m.role === "user"
                          ? "self-end rounded-br-[6px] bg-indigo-deep text-cream"
                          : "self-start rounded-bl-[6px] border border-amber-warm/25 bg-amber-warm/8 text-slate-ink dark:text-white"
                      }`}
                    >
                      <p className="text-[0.92rem] leading-relaxed">
                        {m.role === "lumo" && isLast ? typed || "…" : m.text}
                      </p>
                      {m.detail && (
                        <p className="mono mt-2.5 text-[0.68rem] text-amber-warm">{m.detail}</p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {thinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 self-start rounded-full bg-indigo-deep/6 px-4 py-2.5 dark:bg-white/8"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-amber-warm"
                      animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
                    />
                  ))}
                  <span className="mono ml-1 text-[0.68rem] text-slate-ink/50 dark:text-white/45">
                    updating your twin
                  </span>
                </motion.div>
              )}
            </div>

            <div className="border-t border-indigo-deep/8 px-4 py-4 dark:border-white/8">
              <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
                {DEMO_PROMPTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => send(p.id)}
                    className="shrink-0 rounded-full border border-indigo-deep/10 px-3.5 py-2 text-[0.78rem] text-slate-ink/70 transition-all duration-500 hover:border-amber-warm/50 hover:text-amber-warm dark:border-white/10 dark:text-white/65"
                  >
                    <span className="mono mr-1.5 text-[0.64rem] text-amber-warm">{p.lang}</span>
                    {p.text}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setListening((v) => !v)}
                  aria-pressed={listening}
                  aria-label="Simulate speaking"
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
                    listening
                      ? "bg-amber-warm text-ink"
                      : "border border-indigo-deep/12 text-slate-ink/60 dark:border-white/12 dark:text-white/60"
                  }`}
                >
                  <Mic size={16} />
                  {listening && (
                    <motion.span
                      className="absolute inset-0 rounded-full border border-amber-warm"
                      animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </button>
                <div className="flex h-11 flex-1 items-center gap-2.5 rounded-full border border-indigo-deep/10 px-4 dark:border-white/10">
                  <span className="mono text-[0.78rem] text-slate-ink/45 dark:text-white/45">
                    {listening ? "सुन रही हूँ…" : "Tap a phrase, or speak"}
                  </span>
                  {listening && (
                    <span className="ml-auto flex items-center gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.span
                          key={i}
                          className="w-[3px] rounded-full bg-amber-warm"
                          animate={{ height: [5, 16, 8, 13, 5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setRevealed(["income-0"]);
                    setPathway(null);
                    setTyped("");
                  }}
                  aria-label="Reset the demo"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-deep/12 text-slate-ink/50 transition-colors duration-500 hover:text-amber-warm dark:border-white/12 dark:text-white/50"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </FadeUp>

          {/* ── live twin + pathway ───────────────────────── */}
          <div className="flex flex-col gap-5">
            <FadeUp delay={0.08} className="glass-card rounded-[28px] p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="eyebrow text-amber-warm">Your twin, live</p>
                <span className="mono text-[0.7rem] text-slate-ink/40 dark:text-white/40">
                  {revealedSet.size} of 8 domains
                </span>
              </div>
              <div className="relative aspect-square w-full">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
                  {MINI_NODES.map((n) =>
                    revealedSet.has(n.id) ? (
                      <motion.line
                        key={`l-${n.id}`}
                        x1="50"
                        y1="50"
                        x2={n.x}
                        y2={n.y}
                        stroke={KIND_COLORS[n.kind]}
                        strokeOpacity="0.35"
                        strokeWidth="0.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, ease: easeLumo }}
                      />
                    ) : null,
                  )}
                  <circle cx="50" cy="50" r="6" fill="#F5A623" fillOpacity="0.9" />
                  {MINI_NODES.map((n) =>
                    revealedSet.has(n.id) ? (
                      <motion.g
                        key={n.id}
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.75, ease: easeLumo }}
                        style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                      >
                        <circle cx={n.x} cy={n.y} r="2.6" fill={KIND_COLORS[n.kind]} />
                        <text
                          x={n.x}
                          y={n.y - 4.6}
                          textAnchor="middle"
                          fontSize="3"
                          fill="currentColor"
                          className="text-slate-ink/60 dark:text-white/60"
                        >
                          {n.label}
                        </text>
                      </motion.g>
                    ) : (
                      <circle
                        key={n.id}
                        cx={n.x}
                        cy={n.y}
                        r="1"
                        fill="currentColor"
                        className="text-slate-ink/15 dark:text-white/15"
                      />
                    ),
                  )}
                </svg>
              </div>
            </FadeUp>

            <AnimatePresence>
              {matchedSchemes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.7, ease: easeLumo }}
                  className="glass-card rounded-[24px] p-5"
                >
                  <p className="eyebrow mb-4 text-teal-muted">Matched for you</p>
                  <div className="flex flex-col gap-3">
                    {matchedSchemes.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-[18px] border border-indigo-deep/8 px-4 py-3 dark:border-white/8"
                      >
                        <div>
                          <p className="text-[0.9rem] font-medium text-slate-ink dark:text-white">
                            {s.name}
                          </p>
                          <p className="mono text-[0.72rem] text-amber-warm">{s.amount}</p>
                        </div>
                        <Pill tone="teal">{s.match}% match</Pill>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {pathway && (
                <motion.div
                  key={pathway}
                  initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 14 }}
                  transition={{ duration: 0.7, ease: easeLumo }}
                  className="rounded-[24px] border border-amber-warm/30 bg-amber-warm/6 p-5"
                >
                  <div className="flex items-center gap-2 text-amber-warm">
                    <Route size={15} />
                    <p className="eyebrow">Pathway drafted</p>
                  </div>
                  {PATHWAYS.filter((p) => p.id === pathway).map((p) => (
                    <div key={p.id}>
                      <p className="mt-3 text-[1.05rem] font-semibold text-slate-ink dark:text-white">
                        {p.code} — {p.title}
                      </p>
                      <p className="mt-2 text-[0.88rem] leading-relaxed text-slate-ink/65 dark:text-white/60">
                        {p.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Pill tone="amber">{Math.round(p.confidence * 100)}% confidence</Pill>
                        <Pill>{p.months} months</Pill>
                      </div>
                    </div>
                  ))}
                  <LumoButton
                    size="sm"
                    variant="secondary"
                    className="mt-5 w-full"
                    data-scroll-to="pathways"
                    icon={<ArrowUp size={14} />}
                  >
                    Compare all pathways
                  </LumoButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
