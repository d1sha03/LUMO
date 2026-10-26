import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useLumoIntelligence } from "@/app/intelligenceStore";
import { DashboardExperience } from "@/components/lumo/DashboardExperience";
import { KathaScreen } from "@/components/lumo/KathaScreen";
import { SamjhoModal } from "@/components/lumo/SamjhoModal";
import { WelcomeScreen } from "@/components/lumo/WelcomeScreen";
import {
  ApiClientError,
  compileFinancialStory,
  getHealth,
  getOfficialResources,
  setApiTransportMode,
  simulateFinancialScenarios,
} from "@/lib/api";
import {
  buildDemoRecommendation,
  projectLongTermScenarios,
  runDemoPipeline,
  simulateDemoIntervention,
  type LongTermScenario,
} from "@/lib/demoPipeline";
import { DEMO_PERSONAS, getDemoPersona, type DemoPersonaId } from "@/lib/demoPersonas";
import { toContractLanguage, type ExperienceLanguage } from "@/lib/experience";
import type {
  ClarificationQuestion,
  ExecutionMode,
  ExplainContext,
  ExplainTermKey,
  ExtractedFact,
  FinancialTwin,
  OfficialResourceItem,
  ScenarioResult,
  SimulateResponse,
  SimulationScenarioInput,
  SimulationValidationIssue,
} from "@/types/lumo";

type AppView = "welcome" | "katha" | "dashboard";

function getTodayInIndia(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valueFor = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error(`Could not determine today's ${type} in Asia/Kolkata.`);
    return value;
  };
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
}

export default function App() {
  const [view, setView] = useState<AppView>("welcome");
  const [language, setLanguage] = useState<ExperienceLanguage>("en-IN");
  const [apiMode, setApiMode] = useState<ExecutionMode>("demo");
  const [healthError, setHealthError] = useState<string | null>(null);
  const [demoData, setDemoData] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<DemoPersonaId | null>(null);
  const [narrative, setNarrative] = useState(DEMO_PERSONAS[0].narrative);
  const [twin, setTwin] = useState<FinancialTwin | null>(null);
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<SimulateResponse | null>(null);
  const [interventionResult, setInterventionResult] = useState<ScenarioResult | null>(null);
  const [longTermScenarios, setLongTermScenarios] = useState<LongTermScenario[]>([]);
  const [finalRecommendation, setFinalRecommendation] = useState<{
    title: string;
    explanation: string;
    nextStep: string;
    basis: string;
    confidence: number;
  } | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState("baseline");
  const [shockPercent, setShockPercent] = useState(30);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<SimulationValidationIssue[]>([]);
  const [resources, setResources] = useState<OfficialResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [samjhoTerm, setSamjhoTerm] = useState<ExplainTermKey | null>(null);
  const intelligence = useLumoIntelligence();

  const apiLanguage = toContractLanguage(language);

  useEffect(() => {
    document.documentElement.lang = apiLanguage;
  }, [apiLanguage]);

  useEffect(() => {
    setApiTransportMode(apiMode);
  }, [apiMode]);

  const runSimulation = useCallback(async (
    targetTwin: FinancialTwin,
    stress: { percentage: number; durationDays?: number } | null,
    modeOverride?: ExecutionMode,
  ) => {
    setIsSimulating(true);
    setSimulationError(null);
    setValidationIssues([]);
    const scenarios: SimulationScenarioInput[] = [
      { scenario_id: "baseline", label: "Expected situation", income_shock: null },
    ];
    if (stress && stress.percentage > 0) {
      const id = `sales_drop_${stress.percentage}`;
      scenarios.push({
        scenario_id: id,
        label: `Sales fall by ${stress.percentage}% for ${stress.durationDays ?? 14} days`,
        income_shock: {
          category: "business_sales",
          multiplier: 1 - stress.percentage / 100,
          duration_days: stress.durationDays ?? 14,
          start_date: targetTwin.as_of_date,
        },
      });
      setActiveScenarioId(id);
      setShockPercent(stress.percentage);
    } else {
      setActiveScenarioId("baseline");
    }
    try {
      const response = await simulateFinancialScenarios(
        { twin: targetTwin, scenarios },
        { mode: modeOverride ?? apiMode },
      );
      setSimulation(response);
      if ((modeOverride ?? apiMode) === "demo") {
        const intervention = simulateDemoIntervention(targetTwin);
        setInterventionResult(intervention);
        const persona = activeDemoId ? getDemoPersona(activeDemoId) : null;
        setLongTermScenarios(projectLongTermScenarios(targetTwin, persona?.incomeVariability ?? 0.25));
        if (activeDemoId) {
          setFinalRecommendation(buildDemoRecommendation(activeDemoId, targetTwin, response, intervention, facts));
        }
      }
      return response;
    } catch (error) {
      setSimulation(null);
      if (error instanceof ApiClientError && error.validationIssues) {
        setValidationIssues(error.validationIssues);
      } else {
        setSimulationError(error instanceof Error ? error.message : "The simulation could not be completed.");
      }
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, [apiMode, activeDemoId, facts]);

  const runDemo = useCallback(async (personaId: DemoPersonaId) => {
    setIsAnalyzing(true);
    setCompileError(null);
    setSimulationError(null);
    setValidationIssues([]);
    setApiMode("demo");
    setApiTransportMode("demo");
    setHealthError(null);
    setResourcesError(null);
    try {
      const result = runDemoPipeline(personaId, getTodayInIndia(), apiLanguage);
      const persona = getDemoPersona(personaId);
      setActiveDemoId(personaId);
      setNarrative(result.narrative);
      setTwin(result.twin);
      setFacts(result.facts);
      setQuestions(result.questions);
      setWarnings(result.warnings);
      setDemoData(true);
      setSimulation(result.simulation);
      setInterventionResult(result.intervention);
      setLongTermScenarios(result.longTermScenarios);
      setFinalRecommendation(result.recommendation);
      setActiveScenarioId(`sales_shock_${personaId}`);
      setShockPercent(persona.shock.percentage);
      setResources(result.resources);
      setResourcesLoading(false);
      await intelligence.syncFromTwin(result.twin, true, persona.incomeVariability);
      setView("dashboard");
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : "The local demo pipeline could not be completed.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [apiLanguage, intelligence]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setCompileError(null);
    setSimulationError(null);
    try {
      const result = await compileFinancialStory({
        text: narrative,
        language: apiLanguage,
        as_of_date: twin?.as_of_date ?? getTodayInIndia(),
        existing_twin: twin,
      }, { mode: apiMode });
      setTwin(result.draft_twin);
      setFacts(result.extracted_facts);
      setQuestions(result.questions_required);
      setWarnings(result.warnings);
      setDemoData(apiMode === "demo");
      await intelligence.syncFromTwin(result.draft_twin, true);
      if (result.draft_twin.cash_on_hand !== null && result.draft_twin.minimum_reserve !== null) {
        await runSimulation(result.draft_twin, null, apiMode);
      } else {
        setSimulation(null);
        setValidationIssues([
          ...(result.draft_twin.cash_on_hand === null ? [{ field: "cash_on_hand", message: "Cash on hand is unknown. Please confirm an amount; LUMO will not assume ₹0." }] : []),
          ...(result.draft_twin.minimum_reserve === null ? [{ field: "minimum_reserve", message: "Safety reserve is unknown. Please choose a buffer before projection." }] : []),
        ]);
      }
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : "The configured intake service could not analyse this story.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resolveQuestion = (question: ClarificationQuestion, action: string, value?: number) => {
    if (!twin) return;
    const updated: FinancialTwin = { ...twin, cash_flows: [...twin.cash_flows] };
    if (action === "set_cash" && value !== undefined) {
      updated.cash_on_hand = value;
      updated.profile = { ...updated.profile, cash_on_hand: value };
    }
    if (action === "set_reserve" && value !== undefined) {
      updated.minimum_reserve = value;
      updated.profile = { ...updated.profile, minimum_reserve: value };
    }
    if (action.startsWith("add_stock_cost") && value !== undefined) {
      const index = updated.cash_flows.findIndex((flow) => flow.category === "business_stock_cost");
      const stock = {
        id: "cf_manual_stock_cost",
        label: "Daily stock / mandi cost",
        direction: "outflow" as const,
        category: "business_stock_cost" as const,
        amount: value,
        frequency: "daily" as const,
        start_date: updated.as_of_date,
        confidence: 1,
        source_type: "manual_entry" as const,
        source_note: "Amount confirmed by user in Katha clarification.",
        essential: true,
      };
      if (index >= 0) updated.cash_flows[index] = stock;
      else updated.cash_flows.push(stock);
    }
    setTwin(updated);
    setQuestions((old) => old.filter((item) => item.id !== question.id));
    setFacts((old) => [...old, {
      field: question.field,
      value: value ?? "confirmed from user clarification",
      source_quote: question.question,
      confidence: 1,
      source_type: "manual_entry",
    }]);
    if (updated.cash_on_hand !== null && updated.minimum_reserve !== null) {
      void runSimulation(updated, null);
    }
    void intelligence.syncFromTwin(updated, true);
  };

  const switchMode = async (mode: ExecutionMode) => {
    setApiMode(mode);
    setApiTransportMode(mode);
    setHealthError(null);
    const discardDemoTwin = mode === "live" && demoData;
    if (discardDemoTwin) {
      setTwin(null);
      setFacts([]);
      setQuestions([]);
      setWarnings([]);
      setDemoData(false);
      setSimulation(null);
      setInterventionResult(null);
      setLongTermScenarios([]);
      setFinalRecommendation(null);
      setActiveDemoId(null);
      setValidationIssues([]);
      setActiveScenarioId("baseline");
      setShockPercent(30);
    }
    try {
      const health = await getHealth({ mode });
      if (mode === "live" && health.mode !== "live") {
        setHealthError(`Backend reported unexpected mode ${health.mode}.`);
      }
      if (twin && !discardDemoTwin) {
        await intelligence.syncFromTwin(
          twin,
          true,
          activeDemoId ? getDemoPersona(activeDemoId).incomeVariability : undefined,
        );
        if (mode === "live" && twin.cash_on_hand !== null && twin.minimum_reserve !== null) {
          await runSimulation(twin, activeScenarioId === "baseline" ? null : { percentage: shockPercent, durationDays: 14 }, "live");
        }
      }
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : "The backend is unreachable.");
    }
  };

  useEffect(() => {
    if (view !== "dashboard" || !twin) return;
    let cancelled = false;
    setResourcesLoading(true);
    setResourcesError(null);
    getOfficialResources({ occupation: twin.profile.occupation, state: twin.profile.state, language: apiLanguage }, { mode: apiMode })
      .then((response) => { if (!cancelled) setResources(response.items); })
      .catch((error) => { if (!cancelled) setResourcesError(error instanceof Error ? error.message : "Official resources could not be loaded."); })
      .finally(() => { if (!cancelled) setResourcesLoading(false); });
    return () => { cancelled = true; };
  }, [view, twin, apiLanguage, apiMode]);

  const baselineResult = simulation?.results.find((result) => result.scenario_id === "baseline") ?? null;
  const stressResult = simulation?.results.find((result) => result.scenario_id !== "baseline") ?? null;
  const selectedResult = simulation?.results.find((result) => result.scenario_id === activeScenarioId) ?? baselineResult;
  const samjhoContext: ExplainContext = useMemo(() => ({
    scenario_status: selectedResult?.status,
    shortfall_to_reserve: selectedResult?.shortfall_to_reserve,
    minimum_balance_date: selectedResult?.minimum_balance_date,
    minimum_balance: selectedResult?.minimum_balance,
    minimum_reserve: twin?.minimum_reserve ?? null,
    cash_on_hand: twin?.cash_on_hand ?? null,
  }), [selectedResult, twin?.minimum_reserve, twin?.cash_on_hand]);
  const financialChatContext = useMemo<Record<string, unknown> | null>(() => {
    const profile = intelligence.profile;
    if (!profile) return null;
    return {
      financial_profile: {
        user: {
          occupation: profile.user?.occupation ?? null,
          location: profile.user?.location ?? null,
        },
        income: profile.income ?? null,
        expenses: profile.expenses ?? null,
        debts: profile.debts ?? [],
        business: profile.business ?? null,
        goals: profile.goals ?? [],
        assets: profile.assets ?? null,
        risk: profile.risk ?? null,
        cash_available: profile.cash_available ?? null,
      },
      workstream_e: {
        stress_radar: intelligence.stressRadar,
        debt_risk: intelligence.debtRisk,
        true_earnings: intelligence.trueEarnings,
        goal_analysis: intelligence.goalAnalysis,
        actions: intelligence.actions,
      },
    };
  }, [
    intelligence.profile,
    intelligence.stressRadar,
    intelligence.debtRisk,
    intelligence.trueEarnings,
    intelligence.goalAnalysis,
    intelligence.actions,
  ]);
  const activeDemoName = activeDemoId ? getDemoPersona(activeDemoId).name : null;

  if (view === "welcome") {
    return <>
      <WelcomeScreen language={language} onLanguageChange={setLanguage} onStart={() => setView("katha")} onUseDemo={(id) => void runDemo(id)} onOpenSamjho={() => setSamjhoTerm("gross_sales")} />
      <SamjhoModal openTerm={samjhoTerm} onClose={() => setSamjhoTerm(null)} onSelectTerm={setSamjhoTerm} language={apiLanguage} onLanguageChange={(next) => setLanguage(next)} context={samjhoContext} financialContext={financialChatContext} occupation={intelligence.profile?.user?.occupation ?? undefined} apiMode={apiMode} />
    </>;
  }

  if (view === "katha" || !twin) {
    return <>
      <KathaScreen
        language={language}
        narrative={narrative}
        onNarrativeChange={setNarrative}
        onLanguageChange={(next) => {
          setLanguage(next);
          if (twin) setTwin({ ...twin, language: toContractLanguage(next) });
        }}
        onAnalyze={() => void handleAnalyze()}
        onLoadDemo={(id) => void runDemo(id)}
        onResolveQuestion={resolveQuestion}
        onOpenSamjho={() => setSamjhoTerm("minimum_reserve")}
        apiMode={apiMode}
        onModeChange={(mode) => void switchMode(mode)}
        isAnalyzing={isAnalyzing || isSimulating}
        questions={questions}
        twin={twin}
        demoData={demoData}
        compileError={compileError}
        onOpenDashboard={() => setView("dashboard")}
        activeDemoName={activeDemoName}
      />
      <SamjhoModal openTerm={samjhoTerm} onClose={() => setSamjhoTerm(null)} onSelectTerm={setSamjhoTerm} language={apiLanguage} onLanguageChange={(next) => setLanguage(next)} context={samjhoContext} financialContext={financialChatContext} occupation={intelligence.profile?.user?.occupation ?? undefined} apiMode={apiMode} />
    </>;
  }

  return <>
    <DashboardExperience
      twin={twin}
      facts={facts}
      demoPersonaId={activeDemoId}
      demoNarrative={demoData ? narrative : null}
      baselineResult={baselineResult}
      stressResult={stressResult}
      interventionResult={interventionResult}
      longTermScenarios={longTermScenarios}
      finalRecommendation={finalRecommendation}
      simulationResponse={simulation}
      activeScenarioId={activeScenarioId}
      shockPercent={shockPercent}
      onSimulateShock={async (percentage) => {
        if (!twin) return;
        await runSimulation(twin, percentage > 0 ? { percentage, durationDays: 14 } : null);
      }}
      onBackToKatha={() => setView("katha")}
      onOpenSamjho={setSamjhoTerm}
      onSaveTwin={async (updatedTwin) => {
        setTwin(updatedTwin);
        await runSimulation(updatedTwin, activeScenarioId === "baseline" ? null : { percentage: shockPercent, durationDays: 14 });
        await intelligence.syncFromTwin(
          updatedTwin,
          true,
          activeDemoId ? getDemoPersona(activeDemoId).incomeVariability : undefined,
        );
      }}
      onSaveGoal={(goal) => setTwin((previous) => {
        if (!previous) return previous;
        const updated = { ...previous, goals: [...previous.goals.filter((item) => item.id !== goal.id), goal] };
        void intelligence.syncFromTwin(
          updated,
          true,
          activeDemoId ? getDemoPersona(activeDemoId).incomeVariability : undefined,
        );
        return updated;
      })}
      isSimulating={isSimulating}
      validationIssues={validationIssues}
      simulationError={simulationError}
      apiMode={apiMode}
      demoData={demoData}
      resources={resources}
      resourcesLoading={resourcesLoading}
      resourcesError={resourcesError}
      experienceLanguage={language}
      onLanguageChange={(next) => {
        setLanguage(next);
        setTwin((previous) => previous ? { ...previous, language: toContractLanguage(next) } : previous);
      }}
      warnings={warnings}
      healthError={healthError}
      onModeChange={switchMode}
      onLoadDemo={(id) => void runDemo(id)}
      questions={questions}
    />
    <div className="dashboard-ask-float">
      <button type="button" onClick={() => setSamjhoTerm("projected_cash_shortfall")}><MessageCircle size={16} /> Ask LUMO</button>
    </div>
    <SamjhoModal openTerm={samjhoTerm} onClose={() => setSamjhoTerm(null)} onSelectTerm={setSamjhoTerm} language={apiLanguage} onLanguageChange={(next) => setLanguage(next)} context={samjhoContext} financialContext={financialChatContext} occupation={intelligence.profile?.user?.occupation ?? undefined} apiMode={apiMode} />
  </>;
}