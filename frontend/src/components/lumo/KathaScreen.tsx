import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowRight, Check, CircleHelp, LoaderCircle, MessageCircle, Mic, MicOff, Sparkles } from "lucide-react";
import type { ClarificationQuestion, ExecutionMode, FinancialTwin } from "@/types/lumo";
import { EXPERIENCE_LANGUAGES, languageFallbackNotice, toContractLanguage } from "@/lib/experience";
import type { ExperienceLanguage } from "@/lib/experience";
import { formatINR } from "@/lib/format";
import { DEMO_PERSONAS, type DemoPersonaId } from "@/lib/demoPersonas";
import { ApiClientError, transcribeAudio } from "@/lib/api";

type RecorderWindow = Window & {
  MediaRecorder?: typeof MediaRecorder;
};

const SITA_STORY = "मैं एक सब्ज़ी बेचने का काम करती हूं। मेरी कमाई रोज़ अलग होती है। बारिश में बहुत कम हो जाती है। अगले महीने बेटी की फीस है। और मैंने पिछले महीने ₹10,000 उधार लिया था।";

const RECORDER_MIME = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

function pickRecorderMime(): string | undefined {
  const MR = (window as RecorderWindow).MediaRecorder;
  if (!MR) return undefined;
  return RECORDER_MIME.find((type) => MR.isTypeSupported(type));
}

function completionRows(twin: FinancialTwin | null, text: string) {
  const flows = twin?.cash_flows ?? [];
  const hasTopic = (pattern: RegExp) => pattern.test(text);
  const sales = flows.some((f) => f.category === "business_sales");
  const expenseKinds = new Set(flows.filter((f) => f.direction === "outflow").map((f) => f.category));
  const debt = flows.some((f) => f.category === "debt_repayment") || hasTopic(/उधार|कर्ज़|loan|borrow|ਕਰਜ਼ਾ/i);
  const goals = (twin?.goals.length ?? 0) > 0 || hasTopic(/फीस|लक्ष्य|goal|school|fee|ਸਕੂਲ/i);
  const variable = hasTopic(/अलग|बारिश|कम हो|variable|rain|monsoon|fluctuat|ਮੀਂਹ|ਵੱਖ/i);

  const score = (parts: boolean[]) => Math.round((parts.filter(Boolean).length / Math.max(parts.length, 1)) * 100);
  return [
    { label: "Income", value: score([sales || hasTopic(/कमाई|बिक्री|income|sales|ਕਮਾਈ/i), sales, flows.some((f) => f.frequency === "daily")]), note: sales ? "daily sales recorded" : "income pattern mentioned" },
    { label: "Expenses", value: score([expenseKinds.has("business_stock_cost"), expenseKinds.has("business_operating_cost"), expenseKinds.has("household_essential")]), note: `${expenseKinds.size} expense types found` },
    { label: "Debt", value: score([debt, flows.some((f) => f.category === "debt_repayment"), flows.some((f) => f.category === "debt_repayment" && f.start_date)]), note: debt ? "borrowing mentioned; schedule may need confirmation" : "not discussed yet" },
    { label: "Goals", value: score([goals, (twin?.goals.length ?? 0) > 0]), note: goals ? "school fee / goal mentioned" : "not discussed yet" },
    { label: "Risk context", value: score([variable, twin?.cash_on_hand !== null && twin?.cash_on_hand !== undefined, twin?.minimum_reserve !== null && twin?.minimum_reserve !== undefined]), note: variable ? "income varies with weather" : "more context needed" },
  ];
}

function answerActionForField(field: string): string | null {
  if (field === "profile.cash_on_hand") return "set_cash";
  if (field === "profile.minimum_reserve") return "set_reserve";
  if (field.startsWith("cash_flows.business_stock_cost")) return "add_stock_cost";
  return null;
}

function QuestionAnswer({ question, onResolve }: {
  question: ClarificationQuestion;
  onResolve: (question: ClarificationQuestion, action: string, value?: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const action = answerActionForField(question.field);
  const numeric = Number(amount);
  const valid = action !== null && amount.trim() !== "" && Number.isFinite(numeric) && numeric >= 0;

  if (!action) {
    return (
      <p className="mt-2 text-xs text-slate-600">
        Answer in your own words in the story box above and press “Understand my story” again — LUMO keeps
        everything you already confirmed and only adds this detail.
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`answer-${question.id}`}>{question.question}</label>
      <input
        id={`answer-${question.id}`}
        type="number"
        min={0}
        inputMode="numeric"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="₹ amount"
        className="lumo-language-select w-32"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => onResolve(question, action, numeric)}
        className="quiet-action"
      >
        <Check size={13} /> Confirm
      </button>
      <span className="text-[11px] text-slate-500">Recorded as your own confirmation, not an estimate.</span>
    </div>
  );
}

export function KathaScreen({
  language,
  narrative,
  onNarrativeChange,
  onLanguageChange,
  onAnalyze,
  onLoadDemo,
  onResolveQuestion,
  onOpenSamjho,
  apiMode,
  onModeChange,
  isAnalyzing,
  questions,
  twin,
  demoData,
  compileError,
  onOpenDashboard,
  activeDemoName,
}: {
  language: ExperienceLanguage;
  narrative: string;
  onNarrativeChange: (text: string) => void;
  onLanguageChange: (language: ExperienceLanguage) => void;
  onAnalyze: () => void;
  onLoadDemo: (personaId: DemoPersonaId) => void;
  onResolveQuestion: (question: ClarificationQuestion, action: string, value?: number) => void;
  onOpenSamjho: () => void;
  apiMode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  isAnalyzing: boolean;
  questions: ClarificationQuestion[];
  twin: FinancialTwin | null;
  demoData: boolean;
  compileError: string | null;
  onOpenDashboard: () => void;
  activeDemoName: string | null;
}) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const rows = useMemo(() => completionRows(twin, narrative), [twin, narrative]);
  const doneCount = rows.filter((item) => item.value >= 66).length;
  const isHindi = language === "hi-IN";

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopRecording = () => {
    const instance = recorder.current;
    if (!instance || instance.state === "inactive") {
      setListening(false);
      return;
    }
    instance.stop();
  };

  const handleRecorded = async (blob: Blob) => {
    setListening(false);
    if (!blob.size) {
      setVoiceNotice("No audio was captured. Try again and speak after the recording starts.");
      return;
    }
    setTranscribing(true);
    setVoiceNotice("Sending your voice to Sarvam Saaras for transcription…");
    try {
      const result = await transcribeAudio(blob, toContractLanguage(language));
      const startingText = narrative;
      onNarrativeChange(`${startingText}${startingText ? " " : ""}${result.transcript}`);
      setVoiceNotice(
        `Transcribed by ${result.provider} ${result.model} · detected ${result.language_code ?? toContractLanguage(language)}.`,
      );
    } catch (error) {
      // A failed live transcription is reported, never replaced with invented text.
      const detail = error instanceof ApiClientError ? error.message : "Speech recognition failed.";
      setVoiceNotice(`Voice transcription failed: ${detail} Your typed story is still here.`);
    } finally {
      setTranscribing(false);
    }
  };

  const startRecording = async () => {
    if (apiMode !== "live") {
      setVoiceNotice("Voice input needs the live backend. Switch to Live backend, or type your story in demo mode.");
      return;
    }
    const MR = (window as RecorderWindow).MediaRecorder;
    if (!MR || !navigator.mediaDevices?.getUserMedia) {
      setVoiceNotice("This browser cannot capture microphone audio. Type or paste your story instead.");
      return;
    }
    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceNotice("The microphone was blocked. Allow microphone access, or type your story instead.");
      return;
    }
    stream.current = mediaStream;
    const chunks: BlobPart[] = [];
    const instance = new MR(mediaStream, { mimeType: pickRecorderMime() ?? "" });
    instance.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    instance.onstop = () => {
      mediaStream.getTracks().forEach((track) => track.stop());
      stream.current = null;
      void handleRecorded(new Blob(chunks, { type: instance.mimeType || "audio/webm" }));
    };
    instance.onerror = () => {
      setListening(false);
      setVoiceNotice("The microphone stopped unexpectedly. Your typed story is still here.");
    };
    recorder.current = instance;
    setVoiceNotice(null);
    setListening(true);
    instance.start();
  };

  const toggleVoice = () => {
    if (transcribing) return;
    if (listening) {
      stopRecording();
      return;
    }
    void startRecording();
  };

  return (
    <main className="katha-page min-h-[100svh]">
      <header className="product-topbar">
        <div className="flex items-center gap-3">
          <span className="lumo-mark"><i /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#1B1F5E]">LUMO</p>
            <p className="text-[11px] text-slate-500">Financial Conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="story-persona">{activeDemoName ?? "Your livelihood profile"}</span>
          <label className="sr-only" htmlFor="katha-language">Choose language</label>
          <select id="katha-language" value={language} onChange={(event) => onLanguageChange(event.target.value as ExperienceLanguage)} className="lumo-language-select">
            {EXPERIENCE_LANGUAGES.map((option) => <option key={option.code} value={option.code}>{option.native} · {option.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="katha-api-mode">Choose API mode</label>
          <select id="katha-api-mode" value={apiMode} onChange={(event) => onModeChange(event.target.value as ExecutionMode)} className="lumo-language-select">
            <option value="live">Live backend</option>
            <option value="demo">Demo data</option>
          </select>
          <button type="button" onClick={onOpenSamjho} className="quiet-action katha-ask-button"><MessageCircle size={14} /> LUMO Samjho</button>
        </div>
      </header>

      <nav className="katha-steps" aria-label="Demo progress">
        <span className="is-current"><span className="step-num">1</span> Katha · your story</span>
        <span className="step-line" aria-hidden="true" />
        <span className={twin && twin.cash_flows.length > 0 ? "is-done" : ""}><span className="step-num">2</span> Twin takes shape</span>
        <span className="step-line" aria-hidden="true" />
        <span><span className="step-num">3</span> Review dashboard</span>
      </nav>

      <section className="katha-layout" aria-labelledby="katha-title">
        <div className="katha-conversation">
          <div className="katha-heading">
            <span className="lumo-eyebrow">KATHA · YOUR STORY, IN YOUR WORDS</span>
            <h1 id="katha-title">Let's understand your work and money.</h1>
            <p>Talk naturally. You can correct anything before LUMO uses it.</p>
          </div>

          <div className="katha-thread" aria-live="polite">
            <div className="katha-bubble katha-lumo-bubble">
              <span className="bubble-speaker">LUMO <span className="live-dot" /></span>
              <p>{isHindi ? "आप अपने काम, रोज़ की कमाई, खर्चों या आने वाले भुगतान के बारे में बताइए। जितना पता है, उतना ही साझा करें।" : "Tell me about your work, daily income, expenses or payments coming up. Share only what you know."}</p>
            </div>
            <AnimatePresence initial={false}>
              {narrative.trim() && (
                <motion.div
                  key={narrative.slice(0, 56)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="katha-bubble katha-user-bubble"
                >
                  <span className="bubble-speaker">YOU · {language.replace("-IN", "")}</span>
                  <p>{narrative}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="katha-bubble katha-lumo-bubble katha-typing"
                role="status"
              >
                <span className="dots" aria-hidden="true"><i /><i /><i /></span>
                <small>LUMO is reading your story and separating sales, costs and due dates…</small>
              </motion.div>
            )}
          </div>

          <label className="sr-only" htmlFor="katha-input">Tell LUMO about your financial life</label>
          <textarea
            id="katha-input"
            value={narrative}
            onChange={(event) => onNarrativeChange(event.target.value)}
            rows={4}
            placeholder="मैं एक सब्ज़ी बेचने का काम करती हूं…"
            className="katha-input"
          />
          <div className="katha-toolbar">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleVoice} className={`voice-button ${listening ? "voice-button-live" : ""}`} aria-pressed={listening} disabled={transcribing}>
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
                {listening ? "Recording — tap to stop" : transcribing ? "Transcribing…" : "Speak"}
                {listening && <span className="voice-wave" aria-hidden="true"><i /><i /><i /><i /></span>}
              </button>
              <span className="text-xs text-slate-500">
                {apiMode === "live"
                  ? "Recorded audio is sent to the backend for Sarvam Saaras speech-to-text · transcript stays editable before submission"
                  : "Voice needs the live backend · demo mode is typed input only"}
              </span>
            </div>
            <button type="button" onClick={onAnalyze} disabled={isAnalyzing || !narrative.trim()} className="lumo-button lumo-button-primary">
              {isAnalyzing ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{isAnalyzing ? "Understanding your story…" : "Understand my story"}</span>
              {!isAnalyzing && <ArrowRight size={15} />}
            </button>
          </div>

          {voiceNotice && <p role="status" className="inline-notice mt-3">{voiceNotice}</p>}
          {compileError && <p role="alert" className="inline-error mt-3">{compileError}</p>}
          {questions.length > 0 && (
            <div className="katha-question-stack" role="status">
              {questions.map((question) => <div className="katha-question" key={question.id}>
                <CircleHelp size={17} aria-hidden="true" />
                <div className="flex-1"><strong>One detail needs checking</strong><p>{question.question}</p><small>{question.why_it_matters}</small>
                  {question.suggested_options?.length ? <div className="katha-question-actions">{question.suggested_options.map((option) => <button key={`${question.id}-${option.action}`} type="button" onClick={() => onResolveQuestion(question, option.action, typeof option.value === "number" ? option.value : undefined)}>{option.label}<ArrowRight size={12} /></button>)}</div> : null}
                  {!question.suggested_options?.length && <QuestionAnswer question={question} onResolve={onResolveQuestion} />}
                </div>
              </div>)}
            </div>
          )}
          {languageFallbackNotice(language) && <p className="inline-notice mt-3">{languageFallbackNotice(language)}</p>}
          {twin && twin.cash_flows.length > 0 && (
            <div className="katha-heard" aria-label="What LUMO heard">
              <span className="katha-heard-label">What LUMO heard · edit anytime</span>
              {twin.cash_flows.slice(0, 6).map((flow, i) => (
                <motion.span
                  key={flow.id}
                  className="katha-heard-chip"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.35 }}
                >
                  <Check size={12} aria-hidden="true" />
                  {flow.label.split("(")[0].trim()} · <b>{formatINR(flow.amount, twin.language)}</b>
                  <span className="opacity-60">/{flow.frequency === "once" ? "due" : flow.frequency.replace("ly", "")}</span>
                </motion.span>
              ))}
            </div>
          )}
          <div className="katha-demo-line">
            <span>{demoData ? `Fictional ${activeDemoName ?? "demo"} scenario loaded` : "No bank or government data connected"}</span>
            <div className="flex flex-wrap gap-2">
              {DEMO_PERSONAS.map((persona) => (
                <button key={persona.id} type="button" onClick={() => onLoadDemo(persona.id)}>
                  Run {persona.name} demo <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="twin-build" aria-label="Building your financial twin">
          <div className="twin-build-head">
            <div>
              <span className="lumo-eyebrow">
                {apiMode === "demo" ? "LOCAL DEMO · YOUR MODEL TAKES SHAPE" : "LIVE · YOUR MODEL TAKES SHAPE"}
              </span>
              <h2>Building your<br />Financial Twin</h2>
            </div>
            <span className="twin-orb" aria-hidden="true"><i /></span>
          </div>
          <div className="twin-progress-list">
            {rows.map((row, index) => (
              <motion.div
                key={row.label}
                className="twin-progress-row"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-slate-800">{row.label}</span>
                  <span className="font-mono text-[12px] text-slate-500">{row.value}%</span>
                </div>
                <div className="twin-progress-track"><motion.span animate={{ width: `${row.value}%` }} transition={{ duration: 0.55, ease: "easeOut" }} /></div>
                <p>{row.note}</p>
              </motion.div>
            ))}
          </div>
          <div className="twin-build-foot">
            <span><Check size={14} /> {doneCount} of 5 livelihood areas have a starting signal</span>
            <span className="text-[10px] text-slate-400">Signal coverage, not a risk probability</span>
          </div>

          {twin && (
            <button type="button" className="lumo-button lumo-button-dark mt-6 w-full" onClick={onOpenDashboard}>
              Review this twin draft <ArrowDown size={15} />
            </button>
          )}
          <p className="twin-disclaimer">{demoData ? "Synthetic demonstration data · editable before use" : "Extracted values are estimates until you review them"}</p>
        </aside>
      </section>
    </main>
  );
}

export { SITA_STORY };