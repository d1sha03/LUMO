import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Headphones,
  HelpCircle,
  Loader2,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { askLumo, explainFinancialTerm, requestSpeech } from "@/lib/api";
import { SAMJHO_TERMS, SUPPORTED_LANGUAGES, tr } from "@/lib/i18n";
import type {
  ExecutionMode,
  ExplainContext,
  ExplainResponse,
  ExplainTermKey,
  LumoChatResponse,
  LumoLanguage,
} from "@/types/lumo";

export interface SamjhoTriggerProps {
  termKey: ExplainTermKey;
  label?: string;
  language: LumoLanguage;
  onOpenTerm: (termKey: ExplainTermKey) => void;
  compact?: boolean;
}

/**
 * Reusable contextual-explanation button placed beside financial terms across LUMO.
 */
export function SamjhoTrigger({
  termKey,
  label,
  language,
  onOpenTerm,
  compact = false,
}: SamjhoTriggerProps) {
  const termMeta = SAMJHO_TERMS.find((t) => t.key === termKey);
  const titleText = termMeta?.title[language] ?? termKey.replace(/_/g, " ");

  return (
    <button
      type="button"
      onClick={() => onOpenTerm(termKey)}
      title={`${tr("action.explainThis", language)}: ${titleText}`}
      aria-label={`${tr("action.explainThis", language)}: ${titleText}`}
      className={
        compact
          ? "inline-flex items-center gap-1 rounded-md border border-indigo-900/15 bg-indigo-50/70 px-1.5 py-0.5 text-[11px] font-medium text-indigo-950 transition hover:border-amber-500 hover:bg-amber-50"
          : "inline-flex items-center gap-1.5 rounded-full border border-indigo-900/15 bg-indigo-50/80 px-2.5 py-1 text-xs font-medium text-indigo-950 transition hover:border-amber-500 hover:bg-amber-50"
      }
    >
      <HelpCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
      <span>{label ?? tr("action.explainThis", language)}</span>
    </button>
  );
}

interface SamjhoViewerProps {
  termKey: ExplainTermKey;
  language: LumoLanguage;
  onLanguageChange: (lang: LumoLanguage) => void;
  context: ExplainContext;
  apiMode: ExecutionMode;
}

export function SamjhoExplanationCard({
  termKey,
  language,
  onLanguageChange,
  context,
  apiMode,
}: SamjhoViewerProps) {
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioRequested, setAudioRequested] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const termMeta = SAMJHO_TERMS.find((t) => t.key === termKey) ?? SAMJHO_TERMS[0];

  // Clean up any temporary Blob URL when term, language, or component changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAudioPlaybackError(null);
    setData(null);

    explainFinancialTerm(
      {
        term_key: termKey,
        context,
        language,
        include_audio: audioRequested,
      },
      { mode: apiMode },
    )
      .then((res) => {
        if (cancelled) return;
        setData(res);

        // Revoke previous object URL if any
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }

        if (
          res.audio?.status === "available" &&
          res.audio.audio_base64 &&
          res.audio.mime_type
        ) {
          try {
            const binary = atob(res.audio.audio_base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: res.audio.mime_type });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
          } catch {
            setAudioPlaybackError(
              "Audio data could not be decoded. Showing text explanation below.",
            );
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load explanation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termKey, language, audioRequested, apiMode, context.scenario_status, context.shortfall_to_reserve, context.minimum_balance_date, retryCount]);

  const handleListenClick = () => {
    setAudioPlaybackError(null);
    if (!audioRequested) {
      setAudioRequested(true);
      return;
    }
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {
        setAudioPlaybackError(
          "Browser blocked or failed audio playback. Please read the text explanation below.",
        );
      });
    }
  };

  return (
    <div className="surface-card-raised rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              LUMO Samjho
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">
              {termKey}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            {termMeta.title[language]}
          </h3>
        </div>

        {/* Language selector inside Samjho */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onLanguageChange(l.code)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                language === l.code
                  ? "bg-indigo-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {l.nativeLabel}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-900" />
          <span>Loading plain-language explanation…</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Could not fetch explanation from API</p>
            <p className="mt-0.5 text-rose-800">{error}</p>
            <button
              type="button"
              className="mt-2 font-semibold underline"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Plain-language meaning ({data.language})
            </p>
            <p className="mt-1.5 text-base leading-relaxed text-slate-900">
              {data.explanation}
            </p>
          </div>

          {data.provider !== "sarvam_llm" && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {language === "hi-IN"
                ? "सरल, जाँची हुई शब्दावली वाली व्याख्या दिखाई जा रही है।"
                : language === "pa-IN"
                  ? "ਸਰਲ, ਜਾਂਚੀ ਹੋਈ ਸ਼ਬਦਾਵਲੀ ਦੀ ਵਿਆਖਿਆ ਦਿਖਾਈ ਜਾ ਰਹੀ ਹੈ।"
                  : "Showing the reviewed plain-language glossary fallback."}
            </p>
          )}

          {data.example && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
              <p className="text-xs font-semibold tracking-wider text-amber-900 uppercase">
                Example
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                {data.example}
              </p>
            </div>
          )}

          {/* Audio controls & honest fallback */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleListenClick}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-900"
              >
                <Volume2 className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span>{tr("action.listen", language)}</span>
              </button>

              {audioUrl && data.audio.status === "available" && (
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="h-8 max-w-[220px]"
                  onError={() =>
                    setAudioPlaybackError(
                      "Audio stream failed to play. Showing text fallback.",
                    )
                  }
                />
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Provider:</span>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono font-medium text-slate-800 shadow-2xs">
                {data.provider}
              </span>
            </div>
          </div>

          {(data.audio.status === "unavailable" || audioPlaybackError) && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700"
            >
              <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-900">
                  Audio unavailable — text explanation active
                </p>
                <p className="mt-0.5 text-slate-600">
                  {audioPlaybackError ??
                    "Live speech synthesis (BHASHINI / TTS) is not connected in deterministic demo mode. LUMO never fakes audio playback; the complete plain-language explanation is displayed above."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Modal / Sheet wrapper when a user clicks "Explain this" anywhere in the app.
 */
export function SamjhoModal({
  openTerm,
  onClose,
  onSelectTerm,
  language,
  onLanguageChange,
  context,
  financialContext,
  occupation,
  apiMode,
}: {
  openTerm: ExplainTermKey | null;
  onClose: () => void;
  onSelectTerm: (term: ExplainTermKey) => void;
  language: LumoLanguage;
  onLanguageChange: (lang: LumoLanguage) => void;
  context: ExplainContext;
  financialContext: Record<string, unknown> | null;
  occupation?: string;
  apiMode: ExecutionMode;
}) {
  if (!openTerm) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="LUMO Samjho Financial Explanation"
    >
      <div className="surface-card-raised relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-100 p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
              LUMO Samjho — Plain-Language Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close explanation modal"
            className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <SamjhoChatCard
          language={language}
          financialContext={financialContext}
          occupation={occupation}
          apiMode={apiMode}
        />

        <SamjhoExplanationCard
          termKey={openTerm}
          language={language}
          onLanguageChange={onLanguageChange}
          context={context}
          apiMode={apiMode}
        />

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">
            Explore other financial terms:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMJHO_TERMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTerm(item.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  item.key === openTerm
                    ? "bg-indigo-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-amber-500"
                }`}
              >
                {item.title[language]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SamjhoChatCard({
  language,
  financialContext,
  occupation,
  apiMode,
}: {
  language: LumoLanguage;
  financialContext: Record<string, unknown> | null;
  occupation?: string;
  apiMode: ExecutionMode;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<LumoChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const languageMap: Record<LumoLanguage, "en" | "hi" | "pa"> = {
    "en-IN": "en",
    "hi-IN": "hi",
    "pa-IN": "pa",
  };
  const languageCode = languageMap[language];

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const submitQuestion = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRetryQuestion(trimmed);
    setLoading(true);
    setError(null);
    setSpeechError(null);
    setAnswer(null);
    try {
      const response = await askLumo({
        question: trimmed,
        language: languageCode,
        financial_context: financialContext ?? {},
        occupation,
      }, { mode: apiMode });
      setAnswer(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to get an answer.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeech = async () => {
    if (apiMode === "demo") {
      setSpeechError("Speech synthesis needs the live backend. In local demo mode the written response remains available.");
      return;
    }
    if (!answer) {
      setSpeechError("Ask a question first, then LUMO can read the answer aloud.");
      return;
    }
    try {
      setSpeechError(null);
      const result = await requestSpeech(answer.answer, languageCode);
      if (!result) {
        setSpeechError("Sarvam Bulbul could not produce audio for this answer. The written answer is still available.");
        return;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const nextUrl = URL.createObjectURL(result.audio);
      setAudioUrl(nextUrl);
      window.setTimeout(() => audioRef.current?.play().catch(() => {
        setSpeechError(`Audio from ${result.provider} was received but the browser blocked playback. The written answer is available.`);
      }), 0);
    } catch (err) {
      setSpeechError(err instanceof Error
        ? `Speech synthesis failed: ${err.message}`
        : "Speech synthesis is unavailable; the written answer is still available.");
    }
  };

  return (
    <section className="mb-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Ask LUMO">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">Ask LUMO anything</h3>
        <p className="mt-1 text-sm text-slate-600">
          {apiMode === "demo"
            ? "Local demo answers use only the displayed fictional profile. No Sarvam result is generated; scheme entries are unverified leads."
            : "Sarvam answers using the available financial profile and Workstream E results. Scheme entries are unverified leads."}
        </p>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void submitQuestion(question);
        }}
      >
        <label className="sr-only" htmlFor="lumo-freeform-question">Your question</label>
        <textarea
          id="lumo-freeform-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Ask about your income, expenses, goals, or a scheme…"
          className="min-h-14 flex-1 resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-700 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </button>
      </form>

      {loading && <p className="mt-3 text-sm text-slate-600" role="status">Thinking…</p>}
      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={() => void submitQuestion(retryQuestion)}>Retry</button>
        </div>
      )}
      {answer && !loading && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">LUMO answer · {answer.provider}</p>
              <button type="button" onClick={() => void handleSpeech()} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium">
                <Headphones className="h-3.5 w-3.5" /> Listen
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">{answer.answer}</p>
            {audioUrl && <audio ref={audioRef} controls src={audioUrl} className="mt-3 h-8 max-w-full" />}
          </div>
          {answer.mode !== "sarvam_chat" && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Sarvam is unavailable. This is a safe offline or reviewed-glossary fallback.
            </p>
          )}
          {answer.language_provider === "english_fallback" && languageCode !== "en" && (
            <p role="status" className="text-sm text-amber-900">Translation is unavailable; the original English answer is shown.</p>
          )}
          {speechError && <p role="status" className="text-sm text-amber-900">{speechError}</p>}
          {answer.scheme_candidates.length > 0 && (
            <div className="space-y-2" aria-label="Scheme directory candidates">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Official directory candidates · eligibility not verified</p>
              {answer.scheme_candidates.slice(0, 3).map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                    <span className="text-xs text-slate-600">Match: {item.match_status?.replace(/_/g, " ") ?? "unassessed"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Source retrieval: {item.source_status.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.why_relevant}</p>
                  {item.source_excerpt && (
                    <p className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-950">
                      Retrieved page metadata, not verified scheme facts{item.source_page_title ? ` · ${item.source_page_title}` : ""}: {item.source_excerpt}
                    </p>
                  )}
                  {item.missing_information && item.missing_information.length > 0 && (
                    <p className="mt-1 text-xs text-slate-600">Information still needed: {item.missing_information.join("; ")}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-600">{item.eligibility_summary}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.benefit_summary}</p>
                  <a href={item.official_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-indigo-800 underline">
                    Open official source: {item.source_name}
                  </a>
                </article>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-600">{answer.disclaimer}</p>
        </div>
      )}
    </section>
  );
}

/**
 * Dedicated full-screen Samjho glossary & explanation tab.
 */
export function SamjhoPanel({
  selectedTerm,
  onSelectTerm,
  language,
  onLanguageChange,
  context,
  apiMode,
}: {
  selectedTerm: ExplainTermKey;
  onSelectTerm: (t: ExplainTermKey) => void;
  language: LumoLanguage;
  onLanguageChange: (l: LumoLanguage) => void;
  context: ExplainContext;
  apiMode: ExecutionMode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-sm font-bold tracking-wider text-slate-500 uppercase">
          Glossary Terms
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Select any concept to see what it means for your business cash flow in English, Hindi, or Punjabi.
        </p>
        <div className="mt-4 space-y-2">
          {SAMJHO_TERMS.map((term) => {
            const active = term.key === selectedTerm;
            return (
              <button
                key={term.key}
                type="button"
                onClick={() => onSelectTerm(term.key)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-indigo-950 bg-indigo-950 text-white shadow-xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-900 hover:border-amber-500 hover:bg-white"
                }`}
              >
                <p className="text-sm font-semibold">{term.title[language]}</p>
                <p
                  className={`mt-1 text-xs leading-snug ${
                    active ? "text-indigo-100" : "text-slate-600"
                  }`}
                >
                  {term.shortHint[language]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SamjhoExplanationCard
          termKey={selectedTerm}
          language={language}
          onLanguageChange={onLanguageChange}
          context={context}
          apiMode={apiMode}
        />
      </div>
    </div>
  );
}
