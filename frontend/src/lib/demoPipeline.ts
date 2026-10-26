import type {
  ClarificationQuestion,
  ExtractedFact,
  FinancialTwin,
  LumoLanguage,
  OfficialResourceItem,
  ScenarioResult,
  SimulateResponse,
  SimulationValidationIssue,
} from "../types/lumo.js";
import { getOfficialResourcesDeterministic, simulateFinancialScenariosDeterministic, validateTwinForSimulation } from "./deterministicEngine.js";
import { getDemoPersona, type DemoPersonaId } from "./demoPersonas.js";

export interface LongTermScenario {
  months: 3 | 6 | 12 | 24;
  expectedBalance: number;
  lowBalance: number;
  highBalance: number;
}

export interface DemoPipelineResult {
  personaId: DemoPersonaId;
  narrative: string;
  twin: FinancialTwin;
  facts: ExtractedFact[];
  questions: ClarificationQuestion[];
  warnings: string[];
  validationIssues: SimulationValidationIssue[];
  confidence: number;
  simulation: SimulateResponse;
  intervention: ScenarioResult;
  longTermScenarios: LongTermScenario[];
  resources: OfficialResourceItem[];
  recommendation: {
    title: string;
    explanation: string;
    nextStep: string;
    basis: string;
    confidence: number;
  };
}

function monthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case "daily": return amount * 30;
    case "weekly": return amount * (30 / 7);
    case "monthly": return amount;
    case "once": return 0;
    default: return 0;
  }
}

function rounded(amount: number): number {
  return Math.round(amount);
}

export function simulateDemoIntervention(twin: FinancialTwin): ScenarioResult {
  const interventionTwin: FinancialTwin = {
    ...twin,
    cash_flows: twin.cash_flows.map((item) => item.category === "household_discretionary"
      ? { ...item, amount: rounded(item.amount * 0.9) }
      : item),
  };
  const response = simulateFinancialScenariosDeterministic({
    twin: interventionTwin,
    scenarios: [{
      scenario_id: "intervention",
      label: "Illustrative 10% reduction in flexible spending",
      income_shock: null,
    }],
  });
  const result = response.results[0];
  if (!result) throw new Error("Demo intervention simulation returned no result.");
  return result;
}

export function projectLongTermScenarios(
  twin: FinancialTwin,
  incomeVariability: number,
): LongTermScenario[] {
  const recurringIncome = twin.cash_flows
    .filter((item) => item.direction === "inflow")
    .reduce((sum, item) => sum + monthlyAmount(item.amount, item.frequency), 0);
  const recurringOutflow = twin.cash_flows
    .filter((item) => item.direction === "outflow")
    .reduce((sum, item) => sum + monthlyAmount(item.amount, item.frequency), 0);
  const monthlyNet = recurringIncome - recurringOutflow;
  const incomeRange = recurringIncome * incomeVariability;
  return ([3, 6, 12, 24] as const).map((months) => ({
    months,
    expectedBalance: rounded((twin.cash_on_hand ?? 0) + monthlyNet * months),
    lowBalance: rounded((twin.cash_on_hand ?? 0) + (monthlyNet - incomeRange) * months),
    highBalance: rounded((twin.cash_on_hand ?? 0) + (monthlyNet + incomeRange) * months),
  }));
}

export function buildDemoRecommendation(
  personaId: DemoPersonaId,
  twin: FinancialTwin,
  simulation: SimulateResponse,
  intervention: ScenarioResult,
  extractedFacts?: readonly ExtractedFact[],
): DemoPipelineResult["recommendation"] {
  const persona = getDemoPersona(personaId);
  const baseline = simulation.results.find((item) => item.scenario_id === "baseline");
  const shock = simulation.results.find((item) => item.scenario_id !== "baseline") ?? baseline;
  if (!baseline || !shock) throw new Error("Recommendation requires a simulation result.");
  const scenarioLabel = shock.scenario_id === "baseline" ? "baseline" : shock.label;
  const confidenceFacts = extractedFacts ?? twin.cash_flows;
  const confidence = rounded(
    confidenceFacts.reduce((sum, item) => sum + item.confidence, 0)
      / Math.max(confidenceFacts.length, 1) * 100,
  ) / 100;
  const nextStepByPersona: Record<DemoPersonaId, string> = {
    "small-farmer": "Confirm crop-sale timing and informal-debt terms before setting any repayment amount.",
    "kirana-owner": "Plan inventory replenishment around the supplier-credit due date before increasing working capital.",
    "street-food-vendor": "Cover the disruption repair and raw-material cycle before expanding the stall or adding borrowing.",
  };
  const reserveStep = shock.shortfall_to_reserve > 0
    ? `The modeled shock path is ${formatCurrency(shock.shortfall_to_reserve)} below the stated reserve.`
    : "The modeled shock path remains at or above the stated reserve.";
  return {
    title: shock.shortfall_to_reserve > 0
      ? "Protect the cash reserve before taking on more commitments"
      : "Keep the reserve intact and verify uncertain amounts before committing",
    explanation: shock.shortfall_to_reserve > 0
      ? `In the ${scenarioLabel} scenario, the projected minimum is ${formatCurrency(shock.minimum_balance)} and the reserve gap is ${formatCurrency(shock.shortfall_to_reserve)}. Compare this with the baseline before changing spending or borrowing.`
      : `The ${scenarioLabel} scenario leaves a minimum balance of ${formatCurrency(shock.minimum_balance)} against a ${formatCurrency(twin.minimum_reserve ?? 0)} reserve. Keep that buffer protected while pursuing the stated goal.`,
    nextStep: `${reserveStep} ${nextStepByPersona[personaId]}`,
    basis: `Baseline minimum ${formatCurrency(baseline.minimum_balance)}; shock minimum ${formatCurrency(shock.minimum_balance)}; illustrative flexible-spending intervention minimum ${formatCurrency(intervention.minimum_balance)}. ${persona.goal}.`,
    confidence,
  };
}

export function runDemoPipeline(
  personaId: DemoPersonaId,
  asOfDate: string,
  language: LumoLanguage,
): DemoPipelineResult {
  const persona = getDemoPersona(personaId);
  const twin = persona.buildTwin(asOfDate, language);
  const facts: ExtractedFact[] = [
    {
      field: "profile.occupation",
      value: twin.profile.occupation,
      source_quote: persona.narrative,
      confidence: 1,
      source_type: "synthetic_dataset",
    },
    ...twin.cash_flows.map((item) => ({
      field: `cash_flows.${item.category}.${item.id}`,
      value: item.amount,
      source_quote: item.source_note ?? item.label,
      confidence: item.confidence,
      source_type: "synthetic_dataset" as const,
    })),
    {
      field: "cash_on_hand",
      value: twin.cash_on_hand ?? 0,
      source_quote: "Fictional structured demo input; not a bank balance.",
      confidence: 1,
      source_type: "synthetic_dataset",
    },
    {
      field: "minimum_reserve",
      value: twin.minimum_reserve ?? 0,
      source_quote: "Fictional structured demo input; user-set demonstration reserve.",
      confidence: 1,
      source_type: "synthetic_dataset",
    },
    {
      field: "profile.income_variability",
      value: persona.incomeVariability,
      source_quote: persona.summary,
      confidence: 0.76,
      source_type: "synthetic_dataset",
    },
    {
      field: "goal",
      value: persona.goal,
      source_quote: persona.narrative,
      confidence: 0.9,
      source_type: "synthetic_dataset",
    },
    ...(persona.debtPrincipal === null ? [] : [{
      field: "user_stated.historical_debt_balance",
      value: persona.debtPrincipal,
      source_quote: persona.narrative,
      confidence: 0.78,
      source_type: "synthetic_dataset" as const,
    }]),
  ];

  const questions: ClarificationQuestion[] = persona.debtPrincipal === null ? [] : [{
    id: "q_debt_schedule",
    field: "cash_flows.debt_repayment",
    question: "What is the next instalment amount and due date for this informal borrowing?",
    why_it_matters: "The demo records the stated debt balance but does not invent a payment schedule, interest rate, or due date.",
    language,
  }];
  const warnings = [
    "All figures and events are fictional deterministic demo inputs, not verified financial records.",
    `Income uncertainty is modeled at approximately ±${Math.round(persona.incomeVariability * 100)}% around the typical recurring-income estimate; it is not a probability.`,
    ...(persona.debtPrincipal === null ? [] : [
      "Informal debt principal is recorded as context only. No repayment flow is projected because its schedule is unconfirmed.",
    ]),
    "Scheme entries are unverified directory candidates. No eligibility, approval, or benefit is confirmed.",
  ];

  const validationIssues = validateTwinForSimulation(twin);
  if (validationIssues.length > 0) {
    throw new Error(`Demo input failed financial validation: ${validationIssues.map((item) => item.message).join(" ")}`);
  }

  const shockScenario = {
    scenario_id: `sales_shock_${personaId}`,
    label: `${persona.shock.reason} · ${persona.shock.percentage}% for ${persona.shock.durationDays} days`,
    income_shock: {
      category: "business_sales" as const,
      multiplier: 1 - persona.shock.percentage / 100,
      duration_days: persona.shock.durationDays,
      start_date: twin.as_of_date,
    },
  };
  const simulation = simulateFinancialScenariosDeterministic({
    twin,
    scenarios: [
      { scenario_id: "baseline", label: "Expected situation", income_shock: null },
      shockScenario,
    ],
  });

  const intervention = simulateDemoIntervention(twin);
  const longTermScenarios = projectLongTermScenarios(twin, persona.incomeVariability);
  const confidence = rounded(
    facts.reduce((sum, item) => sum + item.confidence, 0) / facts.length * 100,
  ) / 100;
  const recommendation = buildDemoRecommendation(personaId, twin, simulation, intervention, facts);
  const resources = getOfficialResourcesDeterministic({
    occupation: twin.profile.occupation,
    state: twin.profile.state,
    language,
  }).items;

  return {
    personaId,
    narrative: persona.narrative,
    twin,
    facts,
    questions,
    warnings,
    validationIssues,
    confidence,
    simulation,
    intervention,
    longTermScenarios,
    resources,
    recommendation,
  };
}

function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
