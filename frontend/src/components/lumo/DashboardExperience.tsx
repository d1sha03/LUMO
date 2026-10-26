import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronRight,
  CircleHelp,
  CloudRain,
  ExternalLink,
  Info,
  Landmark,
  MessageCircle,
  Pencil,
  Sparkles,
  Target,
} from "lucide-react";
import { FinancialTwinPanel } from "@/components/lumo/FinancialTwinPanel";
import { FinancialGraph } from "@/components/lumo/FinancialGraph";
import { AnimatedNumber, Reveal, useReadingProgress, useScrollSpy } from "@/components/lumo/motion";
import { SamjhoTrigger } from "@/components/lumo/SamjhoModal";
import { EXPERIENCE_LANGUAGES, languageFallbackNotice, toContractLanguage, type ExperienceLanguage } from "@/lib/experience";
import { formatDisplayDate, formatINR, formatShortDate, formatSignedINR } from "@/lib/format";
import type {
  ClarificationQuestion,
  ExecutionMode,
  ExplainTermKey,
  ExtractedFact,
  FinancialTwin,
  OfficialResourceItem,
  ScenarioResult,
  SimulateResponse,
  SimulationValidationIssue,
} from "@/types/lumo";
import { useLumoIntelligence } from "@/app/intelligenceStore";
import { getDemoPersona, type DemoPersonaId } from "@/lib/demoPersonas";
import type { LongTermScenario } from "@/lib/demoPipeline";

type ShockCall = (percentage: number) => Promise<void>;

function dateOffset(from: string, to: string) {
  const a = new Date(`${from}T12:00:00+05:30`).getTime();
  const b = new Date(`${to}T12:00:00+05:30`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function SummaryMetric({
  label,
  value,
  amount,
  note,
  language,
  accent = false,
  term,
  onExplain,
}: {
  label: string;
  value: string;
  /** when provided, the figure counts up on first view */
  amount?: number | null;
  note: string;
  language: "en-IN" | "hi-IN" | "pa-IN";
  accent?: boolean;
  term?: ExplainTermKey;
  onExplain?: (term: ExplainTermKey) => void;
}) {
  return (
    <div className={`summary-metric surface-card-raised ${accent ? "summary-metric-accent" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="summary-metric-label">{label}</span>
        {term && onExplain && <SamjhoTrigger termKey={term} language={language} onOpenTerm={onExplain} compact />}
      </div>
      <p className="summary-metric-value">
        {amount !== undefined && amount !== null ? (
          <AnimatedNumber value={amount} format={(n) => formatINR(n, language)} />
        ) : (
          value
        )}
      </p>
      <p className="summary-metric-note">{note}</p>
    </div>
  );
}

export function DashboardExperience({
  twin,
  facts,
  demoPersonaId,
  demoNarrative,
  baselineResult,
  stressResult,
  interventionResult,
  longTermScenarios,
  finalRecommendation,
  simulationResponse,
  activeScenarioId,
  shockPercent,
  onSimulateShock,
  onBackToKatha,
  onOpenSamjho,
  onSaveTwin,
  onSaveGoal,
  isSimulating,
  validationIssues,
  simulationError,
  apiMode,
  demoData,
  resources,
  resourcesLoading,
  resourcesError,
  experienceLanguage,
  onLanguageChange,
  warnings,
  healthError,
  onModeChange,
  onLoadDemo,
  questions,
}: {
  twin: FinancialTwin;
  facts: ExtractedFact[];
  demoPersonaId: DemoPersonaId | null;
  demoNarrative: string | null;
  baselineResult: ScenarioResult | null;
  stressResult: ScenarioResult | null;
  interventionResult: ScenarioResult | null;
  longTermScenarios: LongTermScenario[];
  finalRecommendation: {
    title: string;
    explanation: string;
    nextStep: string;
    basis: string;
    confidence: number;
  } | null;
  simulationResponse: SimulateResponse | null;
  activeScenarioId: string;
  shockPercent: number;
  onSimulateShock: ShockCall;
  onBackToKatha: () => void;
  onOpenSamjho: (term: ExplainTermKey) => void;
  onSaveTwin: (twin: FinancialTwin) => Promise<void>;
  onSaveGoal: (goal: FinancialTwin["goals"][number]) => void;
  isSimulating: boolean;
  validationIssues: SimulationValidationIssue[];
  simulationError: string | null;
  apiMode: ExecutionMode;
  demoData: boolean;
  resources: OfficialResourceItem[];
  resourcesLoading: boolean;
  resourcesError: string | null;
  experienceLanguage: ExperienceLanguage;
  onLanguageChange: (language: ExperienceLanguage) => void;
  warnings: string[];
  healthError: string | null;
  onModeChange: (mode: ExecutionMode) => void;
  onLoadDemo: (personaId: DemoPersonaId) => void;
  questions: ClarificationQuestion[];
}) {
  const intelligence = useLumoIntelligence();
  const demoPersona = demoPersonaId ? getDemoPersona(demoPersonaId) : null;
  const apiLanguage = toContractLanguage(twin.language);
  const [percent, setPercent] = useState(shockPercent);
  const [savingName, setSavingName] = useState(twin.goals[0]?.label ?? "");
  const [savingTarget, setSavingTarget] = useState(twin.goals[0]?.target_amount.toString() ?? "");
  const [savingMonths, setSavingMonths] = useState(
    intelligence.goalAnalysis?.goals?.[0]?.deadline_months?.toString() ?? "",
  );
  const [goalSaved, setGoalSaved] = useState(false);
  const [goalInputError, setGoalInputError] = useState<string | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<string | null>(null);

  const sectionIds = useMemo(
    () => ["twin-summary", "stress-radar", "long-term", "what-if", "recommendation", "goal-engine", "navigator", "business-intel"],
    [],
  );
  const activeSection = useScrollSpy(sectionIds);
  const readingProgress = useReadingProgress();
  const showBackToTop = readingProgress > 0.08;

  const intelligenceProfile = intelligence.profile;
  const monthlyGrossSales = intelligence.trueEarnings?.monthly_projection?.gross ?? null;
  const monthlyEssentials = intelligenceProfile?.expenses?.essential_monthly ?? null;
  const monthlyDebt = intelligence.debtRisk?.total_monthly_payment ?? null;
  const cashAvailable = intelligenceProfile?.cash_available ?? null;
  const dailyEarnings = intelligence.trueEarnings?.daily;
  const businessProfile = intelligenceProfile?.business;
  const goalPlan = intelligence.goalAnalysis?.goals?.[0] ?? null;

  const upcomingObligations = useMemo(() => {
    return twin.cash_flows
      .filter((flow) => flow.direction === "outflow" && flow.frequency === "once" && flow.start_date >= twin.as_of_date)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [twin]);

  const currentScenario = activeScenarioId === "baseline" ? baselineResult : stressResult ?? baselineResult;
  const currentStatus = currentScenario?.status ?? "within_reserve";
  const activeLabel = activeScenarioId === "baseline" ? "Expected situation" : `Sales fall by ${shockPercent}% for ${demoPersona?.shock.durationDays ?? 14} days`;
  const firstDue = upcomingObligations[0];
  const nextDueDays = firstDue ? dateOffset(twin.as_of_date, firstDue.start_date) : null;

  const handleSaveGoal = () => {
    setGoalInputError(null);
    const targetAmount = Number(savingTarget);
    const months = Number(savingMonths);
    if (!savingName.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0
      || !Number.isInteger(months) || months < 1 || months > 120) {
      setGoalInputError("Enter a goal name, a positive amount, and a timeline from 1 to 120 months.");
      return;
    }
    const now = new Date(`${twin.as_of_date}T12:00:00+05:30`);
    now.setMonth(now.getMonth() + months);
    const targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    onSaveGoal({
      id: twin.goals[0]?.id ?? `goal_${Date.now()}`,
      label: savingName,
      target_amount: targetAmount,
      target_date: targetDate,
      priority: "important",
      current_saved: twin.goals[0]?.current_saved ?? null,
    });
    setGoalSaved(true);
    window.setTimeout(() => setGoalSaved(false), 2800);
  };
  const factsConfidence = facts.length > 0 ? Math.round(facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length * 100) : null;

  const sectionLinks = [
    { id: "twin-summary", label: "Twin" },
    { id: "workstream-e", label: "LUMO Intelligence" },
    { id: "stress-radar", label: "Stress Radar" },
    { id: "long-term", label: "3/6/12/24 months" },
    { id: "what-if", label: "What if?" },
    { id: "recommendation", label: "Recommendation" },
    { id: "goal-engine", label: "Goals" },
    { id: "navigator", label: "Benefits" },
    { id: "business-intel", label: "Business" },
  ];

  return (
    <main className="lumo-dashboard min-h-screen">
      <div className="dashboard-reading-progress" style={{ width: `${readingProgress * 100}%` }} aria-hidden="true" />
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-inner">
          <div className="flex items-center gap-3">
            <span className="lumo-mark"><i /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#1B1F5E]">LUMO</p>
              <p className="text-[11px] text-slate-500">Your financial life, understood.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {demoData && <span className="demo-data-chip"><span /> Demo data</span>}
            <span className={`api-mode-chip ${apiMode === "live" ? "api-mode-live" : ""}`}>{apiMode === "live" ? "Live API" : "Deterministic demo"}</span>
            <label className="sr-only" htmlFor="dashboard-language">Choose language</label>
            <select id="dashboard-language" className="dashboard-language" value={experienceLanguage} onChange={(event) => onLanguageChange(event.target.value as ExperienceLanguage)}>
              {EXPERIENCE_LANGUAGES.map((option) => <option key={option.code} value={option.code}>{option.native} · {option.label}</option>)}
            </select>
            {demoPersona && <span className="text-xs text-slate-500">Switch demo:</span>}
            {demoPersona && (
              <div className="flex flex-wrap gap-1" aria-label="Demo selector">
                {(["small-farmer", "kirana-owner", "street-food-vendor"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onLoadDemo(id)}
                    className="quiet-action"
                    aria-pressed={demoPersonaId === id}
                  >
                    {getDemoPersona(id).name}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={onBackToKatha} className="quiet-action"><MessageCircle size={15} /> Katha</button>
          </div>
        </div>
      </header>

      <nav className="dashboard-anchor-nav" aria-label="Dashboard sections">
        <div className="dashboard-anchor-inner">
          {sectionLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              className={activeSection === link.id ? "is-active" : ""}
              aria-current={activeSection === link.id ? "true" : undefined}
              onClick={() => document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {link.label}<ChevronRight size={13} />
            </button>
          ))}
        </div>
      </nav>

      <div className="dashboard-content">
        {healthError && apiMode === "live" && <div className="dashboard-question dashboard-question-alert" role="alert"><AlertTriangle size={17} /><div><strong>Live service unavailable</strong><p>{healthError} Live results are not replaced with demo outputs.</p></div><button type="button" onClick={() => onModeChange("demo")}>Switch to demo <ArrowRight size={13} /></button></div>}
        <div className="dashboard-mode-tools" aria-label="Backend mode">
          <span>Calculation mode</span>
          <button type="button" aria-pressed={apiMode === "demo"} onClick={() => onModeChange("demo")}>Deterministic demo</button>
          <button type="button" aria-pressed={apiMode === "live"} onClick={() => onModeChange("live")}>Configured API</button>
        </div>
        <section className="dashboard-intro">
          <div>
            <p className="lumo-eyebrow">{demoPersona ? `${demoPersona.role} · ${demoPersona.location}` : "LIVELIHOOD PROFILE"}</p>
            <h1>Your Financial Twin</h1>
            <p className="dashboard-intro-sub">A clear picture of the money moving through work and home, built from the supplied profile and ready to review.</p>
          </div>
          <div className="intro-meta">
            <span className="persona-badge">
              <span className="avatar" aria-hidden="true">{demoPersona?.name.slice(0, 1) ?? "L"}</span>
              <span className="who"><b>{demoPersona?.name ?? twin.profile.occupation}</b><small>{twin.profile.district ?? ""}{twin.profile.district && twin.profile.state ? ", " : ""}{twin.profile.state ?? ""}</small></span>
            </span>
            <span><span className="intro-dot" /> Updated {formatShortDate(twin.as_of_date, apiLanguage)}</span>
            {factsConfidence !== null && <span>{factsConfidence}% average extraction confidence · not payment probability</span>}
            <span>{validationIssues.length === 0 && simulationResponse ? "Validation passed · all required simulation inputs present" : "Validation needs review"}</span>
          </div>
        </section>

        {demoNarrative && (
          <section className="surface-card mb-5 rounded-2xl p-5" aria-label="Demo input and profile">
            <div className="section-heading-row">
              <div><p className="lumo-eyebrow">INPUT / PROFILE · STRUCTURED DEMO</p><h2 className="text-lg font-semibold">{demoPersona?.name ?? "Demo profile"}</h2></div>
              <span className="micro-label">Synthetic · editable · no live provider used</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{demoNarrative}</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <span>Income variability: ±{Math.round((demoPersona?.incomeVariability ?? 0) * 100)}% modeled uncertainty</span>
              <span>Profile facts extracted: {facts.length}</span>
              <span>Open clarification(s): {questions.length}</span>
            </div>
          </section>
        )}
        <ol className="mb-7 grid gap-2 rounded-xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-700 sm:grid-cols-4 lg:grid-cols-7" aria-label="Pipeline stage status">
          {[
            "Input / profile",
            "Extraction",
            "Financial graph",
            "Validation",
            "Simulation",
            "Scheme options",
            "Recommendation",
          ].map((stage) => (
            <li key={stage} className="flex items-center gap-2">
              <Check size={13} className="text-teal-700" aria-hidden="true" /> {stage}
            </li>
          ))}
        </ol>

        {questions.length > 0 && (
          <section className="dashboard-question" aria-label="Details to confirm">
            <CircleHelp size={17} />
            <div><strong>A detail still needs confirmation</strong><p>{questions[0].question} No unconfirmed repayment is included in the cash-flow projection.</p></div>
            <button type="button" onClick={onBackToKatha}>Review story <ArrowRight size={14} /></button>
          </section>
        )}
        {warnings.length > 0 && <details className="forecast-assumptions"><summary><Info size={14} /> Data notes and assumptions</summary><ul>{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}

        {validationIssues.length > 0 && (
          <section className="dashboard-question dashboard-question-alert" role="alert">
            <AlertTriangle size={18} />
            <div><strong>Projection paused until essential values are known.</strong><p>{validationIssues.map((issue) => `${issue.field}: ${issue.message}`).join(" ")}</p></div>
          </section>
        )}

        <Reveal id="twin-summary" className="dashboard-section" ariaLabelledBy="twin-section-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">THE LIVELIHOOD TWIN</p><h2 id="twin-section-title">The pieces, connected.</h2></div>
            <span className="section-number">01 / 08</span>
          </div>

          <div className="summary-metrics-grid">
            <SummaryMetric language={apiLanguage} label="GROSS SALES · MONTHLYIZED ESTIMATE" value={formatINR(monthlyGrossSales, apiLanguage)} amount={monthlyGrossSales} note={intelligence.trueEarnings?.monthly_projection?.note ?? "Shown only when the profile has enough income information"} term="gross_sales" onExplain={onOpenSamjho} />
            <SummaryMetric language={apiLanguage} label="MONTHLY ESSENTIAL EXPENSES" value={formatINR(monthlyEssentials, apiLanguage)} amount={monthlyEssentials} note="Recorded by the intake pipeline; unknown values remain blank" />
            <SummaryMetric language={apiLanguage} label="MONTHLY DEBT PAYMENT" value={formatINR(monthlyDebt, apiLanguage)} amount={monthlyDebt} note={intelligence.debtRisk?.message ?? "Backend-reported recurring payment"} term="debt_repayment" onExplain={onOpenSamjho} />
            <SummaryMetric language={apiLanguage} label="CASH ON HAND" value={formatINR(cashAvailable, apiLanguage)} amount={cashAvailable} note="No reserve subtraction or estimate is applied" accent term="minimum_reserve" onExplain={onOpenSamjho} />
          </div>

          <div className="dashboard-two-column">
            <div className="dashboard-plain-panel surface-card">
              <div className="panel-heading"><div><p className="lumo-eyebrow">HOW MONEY MOVES</p><h3>Your business and home</h3></div><span className="micro-label">Select a node</span></div>
              <FinancialGraph
                twin={twin}
                profile={intelligenceProfile}
                debtMonthlyPayment={monthlyDebt}
                language={apiLanguage}
              />
            </div>
            <aside className="insight-panel surface-obsidian">
              <span className="insight-mark"><Sparkles size={16} /></span>
              <p className="lumo-eyebrow">LUMO SEES</p>
              <h3>{intelligenceProfile?.income ? "Workstream E has assessed the income details provided." : "Income details are still needed for a complete assessment."}</h3>
              <p>Gross sales, business costs and household costs are shown separately. Sales are not treated as money available at home.</p>
              {firstDue && nextDueDays !== null && (
                <div className="next-pressure"><CalendarClock size={15} /><span>Your next listed cash pressure is in <strong>about {Math.max(0, nextDueDays)} days</strong>: {firstDue.label.toLowerCase()} · {formatINR(firstDue.amount, apiLanguage)}.</span></div>
              )}
              <SamjhoTrigger termKey="net_operating_cash" language={apiLanguage} onOpenTerm={onOpenSamjho} />
            </aside>
          </div>
        </Reveal>

        <Reveal id="workstream-e" className="dashboard-section surface-card" ariaLabelledBy="workstream-e-title">
          <div className="section-heading-row">
            <div>
              <p className="lumo-eyebrow">{apiMode === "demo" ? "LOCAL DETERMINISTIC ANALYSIS" : "PYTHON WORKSTREAM E · BACKEND RESULTS"}</p>
              <h2 id="workstream-e-title">LUMO Intelligence</h2>
              <p className="section-lede">{apiMode === "demo" ? "Derived from this selected demo profile and its recorded cash flows; no external API results are simulated." : "Financial intelligence is returned by the configured backend analysis engine."}</p>
            </div>
            <span className="section-number">{intelligence.connectionStatus.toUpperCase()}</span>
          </div>
          {intelligence.error && (
            <div role="alert" className="inline-error">
              <p>{intelligence.error}</p>
              <button type="button" className="benefit-explain" onClick={() => void intelligence.syncFromTwin(twin, true)}>
                Retry
              </button>
            </div>
          )}
          {intelligence.isLoading && <p role="status" className="empty-note">Running backend intelligence analysis…</p>}
          {!intelligence.analysis && !intelligence.error && !intelligence.isLoading && (
            <p className="empty-note">No Workstream E result is available yet. Compile a story using Live backend mode.</p>
          )}
          {intelligence.analysis && (
            <>
            <div className="summary-metrics-grid">
              <SummaryMetric
                language={apiLanguage}
                label="STRESS RADAR · FINANCIAL HEALTH"
                value={intelligence.analysis.stress_radar.level && intelligence.analysis.stress_radar.score !== undefined
                  ? `${intelligence.analysis.stress_radar.level} · ${intelligence.analysis.stress_radar.score}/100`
                  : "Insufficient data"}
                note={intelligence.analysis.stress_radar.message
                  ?? (intelligence.analysis.stress_radar.monthly_net_cashflow === null || intelligence.analysis.stress_radar.monthly_net_cashflow === undefined
                    ? "Net cash flow unavailable from the facts provided"
                    : `Backend monthly net cash flow: ${formatINR(intelligence.analysis.stress_radar.monthly_net_cashflow, apiLanguage)}`)}
              />
              <SummaryMetric
                language={apiLanguage}
                label="INCOME SHOCK · 30% SCENARIO"
                value={(() => {
                  const scenario = intelligence.analysis?.income_shock.preset_grid?.find(
                    (item) => item.income_shock_pct === 0.3,
                  );
                  return scenario
                    ? `${scenario.scenario_label} · ${formatINR(scenario.results.shortfall, apiLanguage)} shortfall`
                    : "Insufficient data";
                })()}
                note={intelligence.analysis.income_shock.message ?? "Backend-computed shortfall under the selected scenario"}
              />
              <SummaryMetric
                language={apiLanguage}
                label="DEBT PRESSURE"
                value={`${intelligence.analysis.debt_warning.pressure_level} · ${formatINR(intelligence.analysis.debt_warning.total_monthly_payment, apiLanguage)} / month`}
                note={apiMode === "demo" ? "Recorded monthly demo payments; unknown debt principal stays unconfirmed" : "Recorded monthly debt payments from the backend profile"}
              />
              <SummaryMetric
                language={apiLanguage}
                label="TRUE EARNINGS"
                value={intelligence.analysis.true_earnings.status}
                amount={intelligence.analysis.true_earnings.monthly_projection?.estimated_net ?? null}
                note={intelligence.analysis.true_earnings.monthly_projection?.note
                  ?? intelligence.analysis.true_earnings.message
                  ?? "Backend estimate; unavailable when income facts are missing"}
              />
              <div className="surface-card p-4">
                <h3 className="font-semibold">Goal Engine</h3>
                {intelligence.analysis.goal_analysis.goals?.length
                  ? intelligence.analysis.goal_analysis.goals.map((goal) => (
                    <p key={goal.goal_name} className="mt-2 text-sm">
                      {goal.goal_name}: {goal.recommended_safe_path.estimated_months == null
                      ? "timeline unavailable"
                      : `${goal.recommended_safe_path.estimated_months} months · ${formatINR(goal.recommended_safe_path.monthly_saving, apiLanguage)} / month`}
                    </p>
                  ))
                  : <p className="mt-2 text-sm text-slate-600">{intelligence.analysis.goal_analysis.message ?? "No savings plan is available for the current profile."}</p>}
              </div>
              <div className="surface-card p-4">
                <h3 className="font-semibold">Actions</h3>
                {intelligence.analysis.actions.actions.length
                  ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {intelligence.analysis.actions.actions.map((action) => (
                      <li key={`${action.category}-${action.action}`}>
                        <p>{action.action}</p>
                        <p className="text-xs text-slate-600">{action.reason}</p>
                      </li>
                    ))}
                  </ul>
                  : <p className="mt-2 text-sm text-slate-600">No actions returned for the currently available facts.</p>}
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="surface-card p-4">
                <h3 className="font-semibold">Stress drivers</h3>
                {intelligence.analysis.stress_radar.drivers?.length
                  ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {intelligence.analysis.stress_radar.drivers.map((driver, index) => (
                      <li key={`${driver.factor}-${index}`}>{driver.factor}: {driver.impact}</li>
                    ))}
                  </ul>
                  : <p className="mt-2 text-sm text-slate-600">No stress drivers were returned for the available facts.</p>}
              </div>
              <div className="surface-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">Explanation</h3>
                  {intelligence.isExplaining && <span role="status">Loading…</span>}
                </div>
                {intelligence.explanation && (
                  <>
                    <p className="mt-2 text-sm">{intelligence.explanation.explanation}</p>
                    {intelligence.explanation.source.startsWith("fallback")
                      && <p className="mt-2 text-xs text-slate-600">Sarvam is unavailable. Workstream E calculations are unchanged; using a safe offline explanation.</p>}
                  </>
                )}
                {intelligence.explanationError && (
                  <div role="alert" className="mt-2">
                    <p className="text-sm">Unable to generate explanation.</p>
                    <button type="button" className="benefit-explain" onClick={() => void intelligence.requestExplanation()}>
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
            </>
          )}
        </Reveal>

        <Reveal id="stress-radar" className="dashboard-section stress-section" ariaLabelledBy="stress-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">LOOK AHEAD · DAILY CASH PROJECTION</p><h2 id="stress-title">Financial Stress Radar</h2><p className="section-lede">A dated cash-flow forecast, not a credit score. The warning depends on the assumptions shown below.</p></div>
            <span className="section-number">02 / 08</span>
          </div>

          {currentScenario ? (
            <div className="stress-layout">
              <div className={`stress-status stress-${currentStatus}`}>
                <span className="stress-status-kicker">{activeLabel}</span>
                <div className="stress-status-ring"><span>{currentStatus === "within_reserve" ? "Within" : currentStatus === "reserve_breach" ? "Reserve" : "Cash"}<small>{currentStatus === "within_reserve" ? "buffer" : currentStatus === "reserve_breach" ? "dip" : "shortfall"}</small></span></div>
                <p className="stress-status-title">{currentStatus === "within_reserve" ? "Reserve stays intact" : currentStatus === "reserve_breach" ? "Reserve may dip" : "Cash may fall below zero"}</p>
                <p className="stress-status-copy">{currentStatus === "within_reserve" ? "Under this baseline, projected closing cash remains at or above the stated safety reserve." : currentStatus === "reserve_breach" ? "Under this scenario, projected closing cash falls below the stated reserve. This is a conditional forecast, not a certainty." : "Under these assumptions, scheduled payments exceed projected cash. Check dates and amounts with the profile owner."}</p>
                <div className="stress-shortfall"><span>Potential reserve gap</span><strong>{formatINR(currentScenario.shortfall_to_reserve, apiLanguage)}</strong></div>
                {currentScenario.first_reserve_breach_date && <p className="stress-breach-date">First projected dip · {formatDisplayDate(currentScenario.first_reserve_breach_date, apiLanguage)}</p>}
              </div>

              <div className="pressure-list-panel surface-card">
                <div className="panel-heading"><div><p className="lumo-eyebrow">DATED OBLIGATIONS</p><h3>What is coming due</h3></div><SamjhoTrigger termKey="projected_cash_shortfall" language={apiLanguage} onOpenTerm={onOpenSamjho} compact /></div>
                <div className="pressure-list">
                  {upcomingObligations.map((flow) => {
                    const projected = currentScenario.timeline.find((day) => day.date === flow.start_date);
                    return <div className="pressure-row" key={flow.id}><span className="pressure-date">{formatShortDate(flow.start_date, apiLanguage)}</span><span className="pressure-name">{flow.label}</span><strong>{formatINR(flow.amount, apiLanguage)}</strong><small>{projected ? `Projected closing: ${formatINR(projected.closing_balance, apiLanguage)}` : "Outside current forecast"}</small></div>;
                  })}
                  {upcomingObligations.length === 0 && <p className="empty-note">No dated one-off obligations are recorded yet.</p>}
                </div>
                <div className="driver-list">
                  <p className="micro-label">WHAT THE FORECAST USES</p>
                  <div><span className="driver-name">Income pattern</span><span className="driver-source">{intelligence.analysis?.stress_radar.level ? `${apiMode === "demo" ? "Local demo" : "Workstream E"} · ${intelligence.analysis.stress_radar.level}` : `${apiMode === "demo" ? "Local demo" : "Workstream E"} result unavailable`}</span></div>
                  <div><span className="driver-name">Debt obligation</span><span className="driver-source">{monthlyDebt !== null && monthlyDebt > 0 ? "Backend payment recorded" : "No repayment schedule recorded"}</span></div>
                  <div><span className="driver-name">Cash buffer</span><span className="driver-source">{currentScenario.shortfall_to_reserve > 0 ? "Below the stated reserve in this scenario" : "At or above reserve in this scenario"}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-question"><AlertTriangle size={18} /><div><strong>Stress Radar needs complete starting values.</strong><p>Cash on hand and minimum reserve must be confirmed before projection.</p></div><button type="button" onClick={onBackToKatha}>Complete Katha <ArrowRight size={14} /></button></div>
          )}

          {currentScenario && (
            <div className="balance-strip" aria-label="Daily forecast textual summary">
              <div><span>Lowest balance</span><strong>{formatINR(currentScenario.minimum_balance, apiLanguage)}</strong><small>{formatDisplayDate(currentScenario.minimum_balance_date, apiLanguage)}</small></div>
              <div><span>Safety reserve</span><strong>{formatINR(twin.minimum_reserve, apiLanguage)}</strong><small>User-set buffer</small></div>
              <div><span>Below ₹0?</span><strong>{currentScenario.minimum_balance < 0 ? "Yes, in this projection" : "No"}</strong><small>Not a guaranteed outcome</small></div>
              <div><span>Cash after {currentScenario.timeline.length} days</span><strong>{formatINR(currentScenario.timeline.at(-1)?.closing_balance ?? null, apiLanguage)}</strong><small>Conditional on listed flows</small></div>
            </div>
          )}
          {simulationError && <p role="alert" className="inline-error mt-4">Simulation failed: {simulationError}</p>}
          {validationIssues.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-amber-900">{validationIssues.map((issue) => <li key={issue.field}>{issue.field}: {issue.message}</li>)}</ul>}
          {currentScenario && <p className="scenario-notes"><Info size={14} /> {currentScenario.notes.join(" ")}</p>}
          <button type="button" onClick={() => document.getElementById("what-if")?.scrollIntoView({ behavior: "smooth" })} className="text-link mt-5">Explore a safer pathway <ArrowRight size={15} /></button>
        </Reveal>

        <Reveal id="long-term" className="dashboard-section" ariaLabelledBy="long-term-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">LONGER HORIZONS · RANGE, NOT PROMISE</p><h2 id="long-term-title">3, 6, 12 and 24-month scenarios</h2><p className="section-lede">Recurring demo flows are monthlyized and extended with the stated income-variability range. One-off events and future scheme benefits are not extrapolated.</p></div>
            <span className="section-number">03 / 08</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {longTermScenarios.map((scenario) => (
              <article key={scenario.months} className="surface-card rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{scenario.months} months · modeled closing cash</p>
                <strong className="mt-2 block text-xl">{formatINR(scenario.expectedBalance, apiLanguage)}</strong>
                <p className="mt-2 text-sm text-slate-600">Illustrative range: {formatINR(scenario.lowBalance, apiLanguage)} to {formatINR(scenario.highBalance, apiLanguage)}</p>
              </article>
            ))}
          </div>
          <p className="scenario-notes"><Info size={14} /> These are deterministic extensions of recorded recurring flows, not predictions. Actual seasonality, prices, costs, debt terms and events can change the result.</p>
        </Reveal>

        <Reveal id="what-if" className="dashboard-section whatif-section" ariaLabelledBy="whatif-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">SHOCK / INTERVENTION COMPARISON</p><h2 id="whatif-title">What if sales fall?</h2><p className="section-lede">The shock changes only gross business sales. The intervention is a separate illustrative 10% reduction in flexible spending; neither is a guaranteed outcome.</p></div>
            <span className="section-number">04 / 08</span>
          </div>

          <div className="whatif-controls">
            <div className="whatif-slider-block">
              <div className="flex items-baseline justify-between gap-3"><label htmlFor="sales-shock-slider">Temporary sales drop</label><strong>{shockPercent}%</strong></div>
              <input id="sales-shock-slider" type="range" min="0" max="50" step="5" value={percent} onChange={(event) => setPercent(Number(event.target.value))} aria-describedby="shock-description" />
              <div className="flex justify-between text-[11px] text-slate-500"><span>No change</span><span>50% lower</span></div>
              <p id="shock-description">For {demoPersona?.shock.durationDays ?? 14} days · applies to <code>business_sales</code> only</p>
            </div>
            <button type="button" className="lumo-button lumo-button-dark" onClick={() => void onSimulateShock(percent)} disabled={isSimulating}>
              {isSimulating ? <Activity size={16} className="animate-pulse" /> : <CloudRain size={16} />}
              <span>{isSimulating ? "Recalculating the twin…" : "Compare this scenario"}</span>
              {!isSimulating && <ArrowRight size={15} />}
            </button>
          </div>

          {baselineResult && stressResult && (
            <div className="scenario-compare surface-card">
              <div className="scenario-compare-head"><span /><span>Expected</span><span>{shockPercent}% lower sales</span></div>
              <div className="scenario-compare-row"><span>Lowest balance</span><strong>{formatINR(baselineResult.minimum_balance, apiLanguage)}</strong><strong className={stressResult.minimum_balance < (twin.minimum_reserve ?? 0) ? "text-amber-800" : ""}>{formatINR(stressResult.minimum_balance, apiLanguage)}</strong></div>
              <div className="scenario-compare-row"><span>Reserve gap</span><strong>{formatINR(baselineResult.shortfall_to_reserve, apiLanguage)}</strong><strong>{formatINR(stressResult.shortfall_to_reserve, apiLanguage)}</strong></div>
              <div className="scenario-compare-row"><span>First reserve dip</span><strong>{baselineResult.first_reserve_breach_date ? formatShortDate(baselineResult.first_reserve_breach_date, apiLanguage) : "None"}</strong><strong>{stressResult.first_reserve_breach_date ? formatShortDate(stressResult.first_reserve_breach_date, apiLanguage) : "None"}</strong></div>
              <div className="scenario-compare-row"><span>Balance below zero</span><strong>{baselineResult.minimum_balance < 0 ? "Yes" : "No"}</strong><strong>{stressResult.minimum_balance < 0 ? "Yes in projection" : "No"}</strong></div>
              <div className="scenario-compare-foot"><ArrowDownRight size={15} /><span>Minimum-balance change from this simulation: <strong>{formatSignedINR(simulationResponse?.comparison.change_in_minimum_balance ?? 0)}</strong>. Listed payments are held constant.</span></div>
              {interventionResult && (
                <div className="scenario-compare-foot">
                  <Sparkles size={15} />
                  <span>
                    Separate intervention test · 10% less flexible spending: minimum {formatINR(interventionResult.minimum_balance, apiLanguage)}
                    {" "}({formatSignedINR(interventionResult.minimum_balance - baselineResult.minimum_balance)} vs baseline).
                    This is an assumption-based comparison, not advice or a promised saving.
                  </span>
                </div>
              )}
            </div>
          )}
          {!baselineResult && <p className="empty-note">Enter or confirm cash on hand and reserve values to run this scenario.</p>}
          {isSimulating && <p className="scenario-notes"><Activity size={14} className="animate-pulse" /> Recalculating baseline and stress scenarios in the selected mode.</p>}
        </Reveal>

        <Reveal id="recommendation" className="dashboard-section" ariaLabelledBy="recommendation-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">FINAL PATHWAY · GROUNDED IN SIMULATION</p><h2 id="recommendation-title">{finalRecommendation?.title ?? "Review the simulated cash path"}</h2></div>
            <span className="section-number">05 / 08</span>
          </div>
          {finalRecommendation ? (
            <article className="surface-card rounded-2xl p-5">
              <p className="text-sm leading-relaxed text-slate-700">{finalRecommendation.explanation}</p>
              <p className="mt-3 text-sm"><strong>Suggested next step:</strong> {finalRecommendation.nextStep}</p>
              <p className="mt-3 text-sm"><strong>Why this pathway:</strong> {finalRecommendation.basis}</p>
              <p className="mt-3 text-xs text-slate-500">Input confidence: {Math.round(finalRecommendation.confidence * 100)}% average extraction confidence; this is not a probability of repayment or a verified financial outcome.</p>
              <p className="mt-2 text-xs text-slate-500">No scheme eligibility, approval, or benefit is confirmed. Review the assumptions and verify details with official providers.</p>
            </article>
          ) : (
            <p className="empty-note">A recommendation is unavailable until a simulation result has been returned.</p>
          )}
        </Reveal>

        <Reveal id="goal-engine" className="dashboard-section goal-section" ariaLabelledBy="goal-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">A PLAN THAT FITS REAL LIFE</p><h2 id="goal-title">Make room for a goal.</h2><p className="section-lede">Savings paths and timelines are derived from the selected analysis mode and remain conditional on the inputs.</p></div>
            <span className="section-number">06 / 08</span>
          </div>
          <div className="goal-layout">
            <div className="goal-form surface-card">
              <label>What are you saving for?<input value={savingName} onChange={(event) => setSavingName(event.target.value)} /></label>
              <div className="goal-input-row"><label>Target amount (₹)<input type="number" min="0" value={savingTarget} onChange={(event) => setSavingTarget(event.target.value)} /></label><label>Target horizon (months)<input type="number" min="1" max="120" value={savingMonths} onChange={(event) => setSavingMonths(event.target.value)} /></label></div>
              <p className="goal-form-help">Enter a goal and timeline to recalculate its estimated paths.</p>
              {goalInputError && <p role="alert" className="inline-error">{goalInputError}</p>}
            </div>
            <div className="goal-paths">
              {goalPlan ? (
                <>
                  {(["strong", "typical", "weak"] as const).map((scenario) => {
                    const path = goalPlan.scenarios[scenario];
                    return (
                      <div key={scenario} className={`goal-path goal-path-${scenario === "weak" ? "safe" : scenario}`}>
                        <span>
                          <span className="goal-path-title">{scenario === "weak" ? "Weak-income path" : `${scenario[0].toUpperCase()}${scenario.slice(1)}-income path`}</span>
                          <span className="goal-path-sub">
                            {path.months_to_goal === null
                              ? "Timeline unavailable"
                              : `${path.months_to_goal} months · ${formatINR(path.savings_capacity_per_month, apiLanguage)} / month`}
                          </span>
                        </span>
                        {scenario === "weak" && <span className="recommended-stamp">Safer path</span>}
                      </div>
                    );
                  })}
                  <p className="goal-reason"><Sparkles size={15} /> Recommended: {goalPlan.recommended_safe_path.approach}. {goalPlan.recommended_safe_path.rationale}</p>
                </>
              ) : (
                <p className="empty-note">No Workstream E goal plan is available for the current profile.</p>
              )}
              <button type="button" className="lumo-button lumo-button-dark" onClick={handleSaveGoal}>{goalSaved ? <Check size={15} /> : <Target size={15} />}<span>{goalSaved ? "Goal saved to the twin" : "Save this goal"}</span></button>
            </div>
          </div>
        </Reveal>

        <Reveal id="navigator" className="dashboard-section benefits-section" ariaLabelledBy="navigator-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">PUBLIC INFORMATION · NOT APPROVAL</p><h2 id="navigator-title">Sarkari Navigator</h2><p className="section-lede">A few official resources that may be worth checking. LUMO cannot confirm eligibility or approval.</p></div>
            <span className="section-number">07 / 08</span>
          </div>
          {resourcesError && <p role="alert" className="inline-error">Official resource request failed: {resourcesError}</p>}
          {resourcesLoading && <p className="empty-note">Loading official resources…</p>}
          {!resourcesLoading && !resourcesError && (
            <div className="benefit-grid">
              {resources.slice(0, 4).map((resource) => {
                const required = resource.requirements_to_verify ?? [];
                return (
                  <article className="benefit-row surface-card" key={resource.id}>
                    <div className="benefit-row-main">
                      <span className="benefit-icon"><Landmark size={17} /></span>
                      <div><span className="benefit-overline">UNVERIFIED DIRECTORY CANDIDATE</span><h3>{resource.title}</h3><p>{resource.why_relevant}</p></div>
                    </div>
                    <div className="benefit-checks">
                      <span><Check size={13} /> Match: {resource.match_status?.replace(/_/g, " ") ?? "unassessed"}</span>
                      <span><CircleHelp size={13} /> {resource.missing_information?.[0] ?? required[0] ?? "Eligibility requirements need checking"}</span>
                    </div>
                    <div className="benefit-footer"><span>Eligibility and approval not confirmed · {resource.source_status.replace(/_/g, " ")}</span><a href={resource.official_url} target="_blank" rel="noopener noreferrer">Check {resource.source_name} <ExternalLink size={13} /></a></div>
                    {selectedBenefit === resource.id && <p className="benefit-why">{resource.relevance_basis} Retrieved page metadata is not verified scheme evidence. Check current facts with the official provider.</p>}
                    <button type="button" className="benefit-explain" onClick={() => setSelectedBenefit(selectedBenefit === resource.id ? null : resource.id)}>{selectedBenefit === resource.id ? "Close explanation" : "Why did LUMO show me this?"}</button>
                  </article>
                );
              })}
              {resources.length === 0 && <p className="empty-note">No official resources were returned. LUMO will not create scheme entries locally.</p>}
            </div>
          )}
        </Reveal>

        <Reveal id="business-intel" className="dashboard-section business-section" ariaLabelledBy="business-title">
          <div className="section-heading-row">
            <div><p className="lumo-eyebrow">THE BUSINESS, NOT JUST THE CHAT</p><h2 id="business-title">What does the business really earn?</h2><p className="section-lede">Earnings are calculated from the listed flows; any unlisted work costs remain unmodeled.</p></div>
            <span className="section-number">08 / 08</span>
          </div>
          <div className="business-ledger surface-card">
            <div><span>Daily gross earnings</span><strong>{formatINR(businessProfile?.gross_daily_revenue == null ? null : dailyEarnings?.gross ?? null, apiLanguage)}</strong></div>
            <div><span>Daily inventory cost</span><strong className="ledger-outflow">{formatINR(businessProfile?.inventory_daily == null ? null : dailyEarnings?.inventory ?? null, apiLanguage)}</strong></div>
            <div><span>Other daily work costs</span><strong className="ledger-outflow">{formatINR(businessProfile?.other_work_costs_daily == null ? null : dailyEarnings?.other_work_costs ?? null, apiLanguage)}</strong></div>
            <div className="business-ledger-total"><span>Estimated net earnings · Workstream E</span><strong>{formatINR(dailyEarnings?.estimated_net ?? null, apiLanguage)}</strong><small>{intelligence.trueEarnings?.missing_costs?.length ? `Costs not provided: ${intelligence.trueEarnings.missing_costs.join(", ")}` : dailyEarnings?.note ?? intelligence.trueEarnings?.message ?? "Backend estimate unavailable"}</small></div>
          </div>
        </Reveal>

        <section className="dashboard-story-close" aria-label="Story summary">
          <div><span className="lumo-eyebrow">LUMO SAMJHO · ALWAYS HERE</span><h2>Understanding should move with the numbers.</h2><p>Ask what a reserve means, why a payment changes the forecast, or what the scenario assumes. Every explanation stays beside its source figures.</p></div>
          <button type="button" className="lumo-button lumo-button-dark" onClick={() => onOpenSamjho("projected_cash_shortfall")}><MessageCircle size={16} /> Ask LUMO <ArrowRight size={14} /></button>
        </section>

        <details className="twin-editor-disclosure">
          <summary><Pencil size={15} /> Review or correct this Financial Twin</summary>
          <div className="mt-5"><FinancialTwinPanel twin={twin} language={apiLanguage} onSaveTwin={onSaveTwin} onOpenSamjho={onOpenSamjho} isSimulating={isSimulating} dailyEarnings={dailyEarnings} /></div>
        </details>

        {languageFallbackNotice(experienceLanguage) && <p className="language-fallback-note">{languageFallbackNotice(experienceLanguage)}</p>}
        <footer className="dashboard-footer"><span>Forecasts are conditional, not certain. Demo values are fictional and editable.</span><span>FinancialTwin · schema v1.0 · Asia/Kolkata · Speech and Samjho providers report their actual availability</span></footer>
      </div>

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            className="back-to-top"
            aria-label="Back to top of dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}