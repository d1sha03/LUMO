import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, AudioLines, Calculator, Languages, MessageCircle, Mic2, ShieldCheck } from "lucide-react";
import { EXPERIENCE_LANGUAGES, languageFallbackNotice, type ExperienceLanguage } from "@/lib/experience";
import { DEMO_PERSONAS, type DemoPersonaId } from "@/lib/demoPersonas";

const STORY_CHIPS = [
  { className: "story-chip-a", dot: "#4b9a90", text: "कमाई रोज़ अलग होती है", en: "Income varies daily", delay: 0.5 },
  { className: "story-chip-b", dot: "#d79118", text: "₹10,000 उधार · पिछले महीने", en: "₹10,000 borrowed", delay: 0.75 },
  { className: "story-chip-c", dot: "#585d9e", text: "बेटी की फीस अगले महीने", en: "School fee next month", delay: 1.0 },
  { className: "story-chip-d", dot: "#c0654f", text: "बारिश = कम बिक्री", en: "Rain lowers sales", delay: 1.25 },
];

export function WelcomeScreen({
  language,
  onLanguageChange,
  onStart,
  onUseDemo,
  onOpenSamjho,
}: {
  language: ExperienceLanguage;
  onLanguageChange: (language: ExperienceLanguage) => void;
  onStart: () => void;
  onUseDemo: (personaId: DemoPersonaId) => void;
  onOpenSamjho: () => void;
}) {
  const reduced = useReducedMotion();
  const float = (i: number) =>
    reduced ? {} : { y: [0, i % 2 === 0 ? -7 : 7, 0] };

  return (
    <main className="lumo-welcome min-h-[100svh] overflow-hidden">
      <header className="lumo-welcome-header">
        <button type="button" className="lumo-wordmark" aria-label="LUMO home">
          <span className="lumo-mark" aria-hidden="true"><i /></span>
          <span>LUMO</span>
        </button>
        <label className="sr-only" htmlFor="welcome-language">Choose language</label>
        <select
          id="welcome-language"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as ExperienceLanguage)}
          className="lumo-language-select"
        >
          {EXPERIENCE_LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>{item.native} · {item.label}</option>
          ))}
        </select>
      </header>

      <section className="lumo-welcome-hero" aria-labelledby="welcome-title">
        <div className="lumo-welcome-copy">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lumo-eyebrow"
          >
            Bharat's Livelihood Intelligence
          </motion.p>
          <motion.h1
            id="welcome-title"
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Your financial life,<br /><span>understood.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.12 }}
            className="lumo-welcome-lede"
          >
            Tell LUMO about your work in your own words. It builds a living picture of your money —
            and shows what may be coming, before it arrives.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2 }}
            className="lumo-welcome-actions"
          >
            <button type="button" onClick={onStart} className="lumo-button lumo-button-primary">
              <Mic2 size={17} aria-hidden="true" />
              <span>Start a conversation</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </motion.div>
          <div className="mt-6" aria-label="Demo selector">
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Run a complete local demo · one click</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEMO_PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => onUseDemo(persona.id)}
                  className="surface-card-raised rounded-xl border border-slate-200 bg-white/85 px-3 py-3 text-left transition hover:border-amber-500 hover:shadow-md dark:border-white/10 dark:bg-white/5"
                  aria-label={`Run ${persona.name} demo`}
                >
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{persona.name}</span>
                  <span className="mt-1 block text-xs text-slate-600 dark:text-white/60">{persona.role}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Synthetic data · no Sarvam, Bhashini, or backend credentials required.</p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="lumo-language-note"
          >
            <AudioLines size={16} aria-hidden="true" />
            <span>LUMO can explain financial terms in your language.</span>
            <button type="button" onClick={onOpenSamjho} className="welcome-ask-link"><MessageCircle size={14} /> Ask LUMO</button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="welcome-trust"
            aria-label="How LUMO works"
          >
            <span><Calculator size={14} aria-hidden="true" /> Deterministic cash-flow math</span>
            <span><ShieldCheck size={14} aria-hidden="true" /> No credit score, ever</span>
            <span><Languages size={14} aria-hidden="true" /> Hindi · English · Punjabi + more</span>
          </motion.div>
          {languageFallbackNotice(language) && (
            <p className="inline-notice mt-4 max-w-[34rem]">{languageFallbackNotice(language)}</p>
          )}
        </div>

        {/* The characteristic opening: a livelihood story becoming a twin */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lumo-welcome-orbit"
          aria-hidden="true"
        >
          <span className="orbit orbit-a" />
          <span className="orbit orbit-b" />
          <span className="orbit orbit-c" />
          <span className="orbit-node node-a" />
          <span className="orbit-node node-b" />
          <span className="orbit-node node-c" />
          <span className="orbit-center"><i /></span>

          {STORY_CHIPS.map((chip, i) => (
            <motion.span
              key={chip.className}
              className={`story-chip ${chip.className}`}
              style={{ ["--chip-dot" as string]: chip.dot }}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, ...float(i) }}
              transition={{
                opacity: { duration: 0.6, delay: chip.delay },
                scale: { duration: 0.6, delay: chip.delay },
                y: reduced
                  ? { duration: 0.6, delay: chip.delay }
                  : { duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: chip.delay },
              }}
            >
              <i />
              {language === "hi-IN" ? chip.text : chip.en}
            </motion.span>
          ))}

          <motion.div
            className="welcome-twin-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.4 }}
          >
            <p>Three demo livelihoods</p>
            {[
              { label: "Income", value: 82 },
              { label: "Expenses", value: 64 },
              { label: "Goals", value: 45 },
            ].map((row, i) => (
              <div key={row.label}>
                <div className="welcome-twin-row"><span>{row.label}</span><b>{row.value}%</b></div>
                <div className="welcome-twin-track">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${row.value}%` }}
                    transition={{ duration: 1.1, delay: 1.6 + i * 0.25, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <footer className="lumo-welcome-footer">
        <span>Stories use the configured API · local deterministic demos are always available</span>
        <span className="lumo-footer-index">Katha → Twin → Radar</span>
      </footer>
    </main>
  );
}
