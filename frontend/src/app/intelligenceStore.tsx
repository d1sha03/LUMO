/**
 * LUMO Workstream E — Normalized Intelligence State Store
 *
 * Provides a unified React Context and `useLumoIntelligence()` hook that manages
 * authoritative state received from the Workstream E Python engine.
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import {
  analyzeFinancialTwin,
  analyzeFinancialProfile,
  analyzeDemoTwin,
  explainFinancialResult,
  explainDemoFinancialProfile,
  getDemoProfile,
  runShockSimulation,
  type ActionEngineResult,
  type DebtRiskResult,
  type ExplanationResult,
  type FinancialProfile,
  type GoalAnalysisResult,
  type MasterAnalysisResult,
  type ShockSimulationResult,
  type StressRadarResult,
  type TrueEarningsResult,
} from "@/lib/intelligenceApi";
import { getApiTransportMode } from "@/lib/api";
import type { FinancialTwin } from "@/types/lumo";

export type ConnectionStatus = "connected" | "demo" | "error" | "connecting";

export interface LumoIntelligenceState {
  profile: FinancialProfile | null;
  analysis: MasterAnalysisResult | null;
  stressRadar: StressRadarResult | null;
  debtRisk: DebtRiskResult | null;
  trueEarnings: TrueEarningsResult | null;
  goalAnalysis: GoalAnalysisResult | null;
  shockSimulation: ShockSimulationResult | null;
  actions: ActionEngineResult | null;
  explanation: ExplanationResult | null;
  isLoading: boolean;
  isExplaining: boolean;
  error: string | null;
  explanationError: string | null;
  lastUpdated: Date | null;
  connectionStatus: ConnectionStatus;

  // Actions
  loadDemoPersona: () => Promise<void>;
  syncFromTwin: (twin: FinancialTwin, explain?: boolean, incomeVariability?: number) => Promise<void>;
  runShock: (shockPct: number, unexpectedExpense?: number, zeroIncomeDays?: number) => Promise<void>;
  requestExplanation: (module?: string, shockPct?: number) => Promise<void>;
  setProfileManually: (profile: FinancialProfile) => Promise<void>;
}

const LumoIntelligenceContext = createContext<LumoIntelligenceState | null>(null);

export function LumoIntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [analysis, setAnalysis] = useState<MasterAnalysisResult | null>(null);
  const [shockSimulation, setShockSimulation] = useState<ShockSimulationResult | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  // Populate derived components from MasterAnalysisResult
  const stressRadar = analysis?.stress_radar ?? null;
  const debtRisk = analysis?.debt_warning ?? null;
  const trueEarnings = analysis?.true_earnings ?? null;
  const goalAnalysis = analysis?.goal_analysis ?? null;
  const actions = analysis?.actions ?? null;

  const applyAnalysis = useCallback((res: MasterAnalysisResult, prof: FinancialProfile) => {
    setProfile(prof);
    setAnalysis(res);
    if (res.income_shock) {
      setShockSimulation(res.income_shock);
    }
    if (res.explanation) {
      setExplanation(res.explanation);
    }
    setExplanationError(null);
    setError(null);
    setLastUpdated(new Date());
  }, []);

  const syncFromTwin = useCallback(async (twin: FinancialTwin, explain = false, incomeVariability = 0.25) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setProfile(null);
    setShockSimulation(null);
    setExplanation(null);
    setExplanationError(null);
    try {
      if (getApiTransportMode() === "demo") {
        const result = analyzeDemoTwin(twin, incomeVariability);
        applyAnalysis(result.analysis, result.profile);
        setConnectionStatus("demo");
        return;
      }
      const res = await analyzeFinancialTwin(twin, explain);
      if (!res.financial_profile) {
        throw new Error("Workstream E response did not include its normalized financial profile.");
      }
      const p = res.financial_profile;
      applyAnalysis(res, p);
      setConnectionStatus(getApiTransportMode() === "demo" ? "demo" : "connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load financial intelligence.");
      setConnectionStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, [applyAnalysis]);

  const loadDemoPersona = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const envelope = await getDemoProfile();
      const res = await analyzeFinancialProfile(envelope.financial_profile, true);
      applyAnalysis(res, envelope.financial_profile);
      setConnectionStatus(envelope.demo || getApiTransportMode() === "demo" ? "demo" : "connected");
    } catch (err) {
      setError("Unable to load the demo profile. Check the backend connection and retry.");
      setConnectionStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, [applyAnalysis]);

  const runShock = useCallback(
    async (shockPct: number, unexpectedExpense?: number, zeroIncomeDays?: number) => {
      if (!profile) return;
      setIsLoading(true);
      setError(null);
      try {
        const shockRes = await runShockSimulation(profile, shockPct, unexpectedExpense, zeroIncomeDays);
        setShockSimulation(shockRes);
        setLastUpdated(new Date());
      } catch (err) {
        setError("Unable to run the income shock scenario. Retry when the backend is available.");
      } finally {
        setIsLoading(false);
      }
    },
    [profile],
  );

  const requestExplanation = useCallback(
    async (module = "full", shockPct?: number) => {
      if (!profile) return;
      setIsExplaining(true);
      setExplanationError(null);
      try {
        if (getApiTransportMode() === "demo") {
          setExplanation(explainDemoFinancialProfile(profile, module));
          return;
        }
        const exp = await explainFinancialResult(profile, module, shockPct);
        setExplanation(exp);
      } catch (err) {
        setExplanationError(err instanceof Error ? err.message : "Unable to generate explanation.");
      } finally {
        setIsExplaining(false);
      }
    },
    [profile],
  );

  const setProfileManually = useCallback(
    async (newProfile: FinancialProfile) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await analyzeFinancialProfile(newProfile, false);
        applyAnalysis(res, newProfile);
      } catch (err) {
        setError("Unable to analyze the financial profile. Check the backend connection and retry.");
      } finally {
        setIsLoading(false);
      }
    },
    [applyAnalysis],
  );

  // Initial load
  const value: LumoIntelligenceState = {
    profile,
    analysis,
    stressRadar,
    debtRisk,
    trueEarnings,
    goalAnalysis,
    shockSimulation,
    actions,
    explanation,
    isLoading,
    isExplaining,
    error,
    explanationError,
    lastUpdated,
    connectionStatus,
    loadDemoPersona,
    syncFromTwin,
    runShock,
    requestExplanation,
    setProfileManually,
  };

  return (
    <LumoIntelligenceContext.Provider value={value}>
      {children}
    </LumoIntelligenceContext.Provider>
  );
}

export function useLumoIntelligence(): LumoIntelligenceState {
  const context = useContext(LumoIntelligenceContext);
  if (!context) {
    throw new Error("useLumoIntelligence must be used within a LumoIntelligenceProvider");
  }
  return context;
}
