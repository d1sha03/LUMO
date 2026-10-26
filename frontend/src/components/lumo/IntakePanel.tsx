import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { SAMPLE_NARRATIVES } from "@/lib/deterministicEngine";
import { formatConfidence, formatINR } from "@/lib/format";
import { SOURCE_TYPE_LABELS, SUPPORTED_LANGUAGES, tr } from "@/lib/i18n";
import type {
  ClarificationQuestion,
  ExtractedFact,
  FinancialTwin,
  LumoLanguage,
} from "@/types/lumo";

export interface IntakePanelProps {
  narrativeText: string;
  onNarrativeTextChange: (text: string) => void;
  language: LumoLanguage;
  onLanguageChange: (lang: LumoLanguage) => void;
  onCompile: (text: string, lang: LumoLanguage) => Promise<void>;
  onLoadDemoScenario: () => void;
  onResolveQuestion: (
    question: ClarificationQuestion,
    action: string,
    numericValue?: number,
  ) => void;
  onProceedToTwin: () => void;
  isCompiling: boolean;
  compileError: string | null;
  onSwitchToDemoMode?: () => void;
  extractedFacts: ExtractedFact[];
  questionsRequired: ClarificationQuestion[];
  warnings: string[];
  twin: FinancialTwin;
}

export function IntakePanel({
  narrativeText,
  onNarrativeTextChange,
  language,
  onLanguageChange,
  onCompile,
  onLoadDemoScenario,
  onResolveQuestion,
  onProceedToTwin,
  isCompiling,
  compileError,
  onSwitchToDemoMode,
  extractedFacts,
  questionsRequired,
  warnings,
  twin,
}: IntakePanelProps) {
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCompile(narrativeText, language);
  };

  return (
    <div className="space-y-6">
      {/* Main Intake Form Card */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-950">
              <FileText className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
              Step 1 · Financial Story Intake
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Describe your business and household cash flow
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Write in English, Hindi, Hinglish, or Punjabi. LUMO extracts daily sales, stock costs,
              operating costs, debts, and due dates—and asks for clarification when facts are missing
              or ambiguous.
            </p>
          </div>

          <button
            type="button"
            onClick={onLoadDemoScenario}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span>{tr("action.loadDemo", language)}</span>
          </button>
        </div>

        {/* Preset Narrative Selector */}
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Quick sample statements (click to load into text box):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_NARRATIVES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  onNarrativeTextChange(sample.text);
                  onLanguageChange(sample.language);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-800 transition hover:border-indigo-900/40 hover:bg-indigo-50/40"
              >
                <span>{sample.label[language]}</span>
                <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-900 shadow-2xs">
                  {sample.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="lumo-narrative-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Your financial statement
            </label>
            <textarea
              id="lumo-narrative-input"
              rows={4}
              value={narrativeText}
              onChange={(e) => onNarrativeTextChange(e.target.value)}
              placeholder="Example: I sell vegetables. My sales are around ₹1,500 per day, my stock costs ₹900, and I have a supplier payment due in five days."
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="lumo-intake-lang"
                className="text-xs font-semibold text-slate-700"
              >
                Language:
              </label>
              <select
                id="lumo-intake-lang"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as LumoLanguage)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-900 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeLabel} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                disabled={isCompiling}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900 disabled:opacity-60"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Compiling Financial Twin…</span>
                  </>
                ) : (
                  <>
                    <span>{tr("action.compile", language)}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Honest API Error Banner */}
        {compileError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold">Intake Compilation Error</p>
                <p className="mt-1 text-xs leading-relaxed text-rose-900">{compileError}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {onSwitchToDemoMode && (
                    <button
                      type="button"
                      onClick={onSwitchToDemoMode}
                      className="rounded-lg bg-rose-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
                    >
                      Switch to Deterministic Demo Mode & Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onLoadDemoScenario}
                    className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                  >
                    {tr("action.loadDemo", language)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clarification Questions (`questions_required`) */}
      {questionsRequired.length > 0 && (
        <div
          role="region"
          aria-label="Clarification questions required"
          className="rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Clarification Needed ({questionsRequired.length}{" "}
                {questionsRequired.length === 1 ? "question" : "questions"})
              </h3>
              <p className="mt-0.5 text-xs text-slate-700">
                LUMO never invents missing figures or assumes ₹0 for unknown cash or reserves. Please
                clarify the items below to complete your Financial Twin:
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {questionsRequired.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-amber-300/80 bg-white p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-950">
                    {q.field}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">ID: {q.id}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{q.question}</p>
                <p className="mt-1 text-xs text-slate-600">
                  <strong className="font-semibold text-slate-700">Why it matters:</strong>{" "}
                  {q.why_it_matters}
                </p>

                {/* Quick resolution buttons + custom amount input */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {q.suggested_options?.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        onResolveQuestion(
                          q,
                          opt.action,
                          typeof opt.value === "number" ? opt.value : undefined,
                        )
                      }
                      className="rounded-lg bg-indigo-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-900"
                    >
                      {opt.label}
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      placeholder="Custom ₹ amount"
                      aria-label={`Custom rupee amount for ${q.field}`}
                      value={customInputs[q.id] ?? ""}
                      onChange={(e) =>
                        setCustomInputs((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      className="w-36 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = Number(customInputs[q.id]);
                        if (!Number.isNaN(val) && val >= 0) {
                          const action =
                            q.field === "cash_on_hand"
                              ? "set_cash"
                              : q.field === "minimum_reserve"
                                ? "set_reserve"
                                : "add_stock_cost_custom";
                          onResolveQuestion(q, action, val);
                        }
                      }}
                      className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                    >
                      Apply ₹
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950">
          <p className="font-semibold">Intake Notes & Missing Input Warnings:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted Facts & Provenance Summary */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Extracted Facts & Provenance ({extractedFacts.length})
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Every figure compiled from `/api/intake/compile` carries its source quote and extraction
              confidence.
            </p>
          </div>
          <button
            type="button"
            onClick={onProceedToTwin}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Review & Edit Financial Twin ({twin.cash_flows.length} flows)</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {extractedFacts.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            No facts extracted from live statement yet. Click{" "}
            <strong>{tr("action.compile", language)}</strong> above or{" "}
            <strong>{tr("action.loadDemo", language)}</strong>.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Contract Field</th>
                  <th className="py-2 px-3 font-semibold">Extracted Value</th>
                  <th className="py-2 px-3 font-semibold">Supporting Quote</th>
                  <th className="py-2 px-3 font-semibold">Source Type</th>
                  <th className="py-2 pl-3 font-semibold">Extraction Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extractedFacts.map((fact, idx) => (
                  <tr key={`${fact.field}-${idx}`} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-3 font-mono font-medium text-indigo-950">
                      {fact.field}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                      {typeof fact.value === "number"
                        ? formatINR(fact.value, language)
                        : fact.value}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 italic">
                      “{fact.source_quote}”
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {SOURCE_TYPE_LABELS[fact.source_type]?.[language] ?? fact.source_type}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${
                          fact.confidence >= 0.85
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {formatConfidence(fact.confidence)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
