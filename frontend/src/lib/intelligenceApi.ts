/**
 * LUMO Workstream E — Frontend Intelligence API Client
 *
 * This is the SINGLE authoritative frontend client for the Python Workstream E
 * Financial Intelligence Engine.
 *
 * CRITICAL ARCHITECTURAL RULES:
 * 1. This file NEVER performs financial arithmetic.
 * 2. All numbers, stress scores, runway projections, debt ratios, shock shortfalls,
 *    and goal timelines MUST come directly from Workstream E backend endpoints.
 * 3. Synthetic fixtures are used only after the user explicitly selects Demo mode.
 *    Live API failures remain errors and are never replaced with demo results.
 */

import { getConfiguredApiBaseUrl } from "./api";
import type { FinancialTwin } from "@/types/lumo";

// ---------------------------------------------------------------------------
// Schemas corresponding to app/intelligence/schemas.py
// ---------------------------------------------------------------------------

export type IntelligenceLanguage = "en" | "hi" | "hinglish" | "pa";

export type OccupationType =
  | "street_vendor"
  | "farmer"
  | "gig_worker"
  | "shg_member"
  | "migrant_worker"
  | "nano_entrepreneur"
  | "delivery_worker"
  | "driver"
  | "home_worker"
  | "other";

export interface UserProfile {
  language?: IntelligenceLanguage;
  location?: string | null;
  occupation?: OccupationType | null;
  name?: string | null;
}

export interface IncomeProfile {
  daily_average?: number | null;
  monthly_average?: number | null;
  strong_day?: number | null;
  weak_day?: number | null;
  income_frequency?: "daily" | "weekly" | "monthly";
  variability?: number | null;
  seasonality?: "none" | "low" | "medium" | "high" | null;
}

export interface ExpenseProfile {
  essential_monthly?: number | null;
  flexible_monthly?: number | null;
  total_monthly?: number | null;
}

export interface DebtRecord {
  label?: string | null;
  principal?: number | null;
  monthly_payment?: number | null;
  interest_rate?: number | null;
  due_day?: number | null;
  lender_type?: "bank" | "microfinance" | "moneylender" | "family" | "other" | null;
}

export interface BusinessProfile {
  gross_daily_revenue?: number | null;
  fuel_daily?: number | null;
  maintenance_daily?: number | null;
  platform_fees_daily?: number | null;
  inventory_daily?: number | null;
  food_work_daily?: number | null;
  other_work_costs_daily?: number | null;
}

export interface GoalRecord {
  name: string;
  amount: number;
  deadline_months?: number | null;
  priority?: "high" | "medium" | "low";
  current_savings?: number | null;
}

export interface AssetProfile {
  cash_savings?: number | null;
  livestock_value?: number | null;
  equipment_value?: number | null;
  other_assets?: number | null;
}

export interface RiskProfile {
  risk_appetite?: "low" | "medium" | "high";
  upcoming_large_expense?: number | null;
  upcoming_expense_months?: number | null;
  health_concern?: boolean;
  seasonal_income_drop_expected?: boolean;
}

export interface FinancialProfile {
  user?: UserProfile;
  income?: IncomeProfile | null;
  expenses?: ExpenseProfile | null;
  debts?: DebtRecord[];
  business?: BusinessProfile | null;
  goals?: GoalRecord[];
  assets?: AssetProfile | null;
  risk?: RiskProfile | null;
  cash_available?: number | null;
  source_metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export interface StressDriver {
  factor: string;
  impact: string;
}

export interface StressRadarResult {
  status: string;
  score?: number;
  level?: "stable" | "low" | "moderate" | "high" | "critical";
  monthly_net_cashflow?: number | null;
  days_of_cash_runway?: number | null;
  potential_shortfall?: number | null;
  drivers?: StressDriver[];
  explanation_facts?: Record<string, unknown>;
  disclaimer?: string;
  message?: string;
}

export interface DebtRiskResult {
  status: string;
  pressure_level: "low" | "moderate" | "high" | "uncertain" | "unknown";
  estimated_repayment_burden?: number | null;
  total_monthly_payment: number;
  total_outstanding_debt: number | null;
  income_floor: number;
  weak_income_shortfall?: number | null;
  debt_warning_threshold: number;
  debt_high_threshold: number;
  drivers: StressDriver[];
  recommended_actions: string[];
  confidence: {
    overall: string;
    drivers: string[];
  };
  disclaimer?: string;
  message?: string;
}

export interface TrueEarningsResult {
  status: string;
  revenue_source?: string;
  daily?: {
    gross: number;
    fuel: number;
    maintenance: number;
    platform_fees: number;
    inventory: number;
    food_work_costs: number;
    other_work_costs: number;
    total_work_costs: number;
    estimated_net: number;
    net_margin: number;
    note: string;
  };
  monthly_projection?: {
    gross: number;
    total_work_costs: number;
    estimated_net: number;
    net_margin: number;
    note: string;
  };
  missing_costs?: string[];
  confidence?: {
    overall: string;
    drivers: string[];
  };
  disclaimer?: string;
  message?: string;
}

export interface GoalScenario {
  income_label: string;
  monthly_income: number;
  savings_capacity_per_month: number;
  months_to_goal: number | null;
  remaining_amount: number;
  feasible: boolean;
  note?: string;
}

export interface GoalPlanItem {
  goal_name: string;
  goal_amount: number;
  current_savings: number;
  remaining_amount: number;
  priority: "high" | "medium" | "low";
  deadline_months: number | null;
  deadline_feasible: boolean | null;
  deadline_warning: string | null;
  scenarios: {
    strong: GoalScenario;
    typical: GoalScenario;
    weak: GoalScenario;
  };
  recommended_safe_path: {
    approach: string;
    monthly_saving: number;
    estimated_months: number | null;
    rationale: string;
  };
}

export interface GoalAnalysisResult {
  status: string;
  goals?: GoalPlanItem[];
  disclaimer?: string;
  message?: string;
}

export interface ShockScenarioItem {
  scenario_label: string;
  income_shock_pct: number;
  inputs: {
    baseline_income: number;
    shocked_income: number;
    essential_expenses: number;
    flexible_expenses: number;
    debt_payments: number;
    unexpected_expense: number;
    starting_cash: number;
  };
  results: {
    total_obligations: number;
    monthly_net: number;
    ending_cash: number;
    shortfall: number;
    days_of_cash_left: number | null;
  };
  interpretation: string;
}

export interface ShockSimulationResult {
  status: string;
  baseline_income?: number;
  preset_grid?: ShockScenarioItem[];
  custom_scenario?: ShockScenarioItem;
  zero_income_scenario?: {
    zero_income_days: number;
    income_lost: number;
    obligations_during_period: number;
    ending_cash: number;
    shortfall: number;
  };
  disclaimer?: string;
  message?: string;
}

export interface LumoActionItem {
  priority: number;
  category: string;
  action: string;
  reason: string;
}

export interface ActionEngineResult {
  status: string;
  actions: LumoActionItem[];
  disclaimer?: string;
}

export interface ExplanationResult {
  module: string;
  explanation: string;
  language: string;
  source: string;
}

export interface MasterAnalysisResult {
  status: string;
  profile_summary: {
    occupation?: string | null;
    location?: string | null;
    language?: string | null;
  };
  stress_radar: StressRadarResult;
  debt_warning: DebtRiskResult;
  true_earnings: TrueEarningsResult;
  goal_analysis: GoalAnalysisResult;
  income_shock: ShockSimulationResult;
  actions: ActionEngineResult;
  financial_profile?: FinancialProfile;
  explanation?: ExplanationResult;
}

export interface DemoPersonaEnvelope {
  demo: boolean;
  label: string;
  persona: {
    name: string;
    occupation: string;
    location: string;
    language: string;
    summary: string;
  };
  financial_profile: FinancialProfile;
}

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

export class IntelligenceApiError extends Error {
  public readonly status?: number;
  public readonly endpoint: string;

  constructor(message: string, endpoint: string, status?: number) {
    super(message);
    this.name = "IntelligenceApiError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// HTTP Request Helper
// ---------------------------------------------------------------------------

async function intelligenceFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getConfiguredApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network request failed";
    throw new IntelligenceApiError(
      `Could not connect to LUMO Financial Intelligence backend at ${url} (${detail}).`,
      endpoint,
    );
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} from ${endpoint}`;
    try {
      const body = await response.json();
      if (body?.detail) {
        errorDetail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // non-JSON error
    }
    throw new IntelligenceApiError(errorDetail, endpoint, response.status);
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Deterministic Fallback Fixture (Canonical Sita Profile)
// Used only in explicitly selected Demo Mode
// ---------------------------------------------------------------------------

export const CANONICAL_SITA_PROFILE: FinancialProfile = {
  user: {
    name: "Sita (Demo)",
    language: "hi",
    location: "Lucknow, Uttar Pradesh",
    occupation: "street_vendor",
  },
  income: {
    daily_average: 900,
    strong_day: 1200,
    weak_day: 600,
    income_frequency: "daily",
    variability: 0.30,
    seasonality: "medium",
  },
  expenses: {
    essential_monthly: 9000,
    flexible_monthly: 2500,
  },
  debts: [
    {
      label: "Microfinance group loan",
      principal: 10000,
      monthly_payment: 1500,
      due_day: 10,
      lender_type: "microfinance",
    },
  ],
  goals: [
    {
      name: "Children school fees",
      amount: 15000,
      deadline_months: 3,
      priority: "high",
      current_savings: 0,
    },
  ],
  cash_available: 2000,
};

export const DETERMINISTIC_FALLBACK_ANALYSIS: MasterAnalysisResult = {
  status: "ok",
  profile_summary: {
    occupation: "street_vendor",
    location: "Lucknow, Uttar Pradesh",
    language: "hi",
  },
  stress_radar: {
    status: "ok",
    score: 35,
    level: "moderate",
    monthly_net_cashflow: 10400,
    days_of_cash_runway: 4,
    potential_shortfall: 0,
    drivers: [
      { factor: "high income variability", impact: "high" },
      { factor: "very low cash buffer (less than 1 week)", impact: "high" },
      { factor: "seasonal income fluctuation expected", impact: "medium" },
    ],
    disclaimer: "Stress score is an indicative indicator, not a credit score.",
  },
  debt_warning: {
    status: "ok",
    pressure_level: "low",
    estimated_repayment_burden: 0.064,
    total_monthly_payment: 1500,
    total_outstanding_debt: 10000,
    income_floor: 10500,
    weak_income_shortfall: null,
    debt_warning_threshold: 0.2,
    debt_high_threshold: 0.4,
    drivers: [
      { factor: "moderate income variability increases risk of missed payment", impact: "medium" },
    ],
    recommended_actions: [],
    confidence: {
      overall: "medium",
      drivers: [],
    },
    disclaimer: "Debt evaluation reflects cash-flow pressure, not creditworthiness.",
  },
  true_earnings: {
    status: "ok",
    revenue_source: "business_profile",
    daily: {
      gross: 900,
      fuel: 0,
      maintenance: 0,
      platform_fees: 0,
      inventory: 0,
      food_work_costs: 0,
      other_work_costs: 0,
      total_work_costs: 0,
      estimated_net: 900,
      net_margin: 1,
      note: "ESTIMATED — based on costs provided by the user",
    },
    monthly_projection: {
      gross: 23400,
      total_work_costs: 0,
      estimated_net: 23400,
      net_margin: 1,
      note: "ESTIMATED — based on 26 working days per month",
    },
    missing_costs: ["Any work costs not listed separately in the fictional demo flows remain unmodeled."],
    confidence: { overall: "moderate", drivers: [] },
    disclaimer: "True earnings deduct direct work expenses from gross receipts.",
  },
  goal_analysis: {
    status: "ok",
    goals: [
      {
        goal_name: "Children school fees",
        goal_amount: 15000,
        current_savings: 0,
        remaining_amount: 15000,
        priority: "high",
        deadline_months: 3,
        deadline_feasible: true,
        deadline_warning: null,
        scenarios: {
          strong: {
            income_label: "strong month",
            monthly_income: 31200,
            savings_capacity_per_month: 17580,
            months_to_goal: 1,
            remaining_amount: 15000,
            feasible: true,
          },
          typical: {
            income_label: "typical month",
            monthly_income: 23400,
            savings_capacity_per_month: 10560,
            months_to_goal: 2,
            remaining_amount: 15000,
            feasible: true,
          },
          weak: {
            income_label: "weak month",
            monthly_income: 15600,
            savings_capacity_per_month: 3540,
            months_to_goal: 5,
            remaining_amount: 15000,
            feasible: true,
          },
        },
        recommended_safe_path: {
          approach: "Save from typical income",
          monthly_saving: 7500,
          estimated_months: 2,
          rationale: "Uses typical income and protects essential expenses and a 10% cash buffer.",
        },
      },
    ],
    disclaimer: "Goal timelines preserve essential expenses and a cash buffer.",
  },
  income_shock: {
    status: "ok",
    baseline_income: 23400,
    preset_grid: [
      {
        scenario_label: "Baseline",
        income_shock_pct: 0,
        inputs: { baseline_income: 23400, shocked_income: 23400, essential_expenses: 9000, flexible_expenses: 2500, debt_payments: 1500, unexpected_expense: 0, starting_cash: 0 },
        results: { total_obligations: 13000, monthly_net: 10400, ending_cash: 10400, shortfall: 0, days_of_cash_left: null },
        interpretation: "Baseline looks stable for this month.",
      },
      {
        scenario_label: "Income -10%",
        income_shock_pct: 0.1,
        inputs: { baseline_income: 23400, shocked_income: 21060, essential_expenses: 9000, flexible_expenses: 2500, debt_payments: 1500, unexpected_expense: 0, starting_cash: 0 },
        results: { total_obligations: 13000, monthly_net: 8060, ending_cash: 8060, shortfall: 0, days_of_cash_left: null },
        interpretation: "Income remains above monthly obligations.",
      },
      {
        scenario_label: "Income -20%",
        income_shock_pct: 0.2,
        inputs: { baseline_income: 23400, shocked_income: 18720, essential_expenses: 9000, flexible_expenses: 2500, debt_payments: 1500, unexpected_expense: 0, starting_cash: 0 },
        results: { total_obligations: 13000, monthly_net: 5720, ending_cash: 5720, shortfall: 0, days_of_cash_left: null },
        interpretation: "Income remains above monthly obligations.",
      },
      {
        scenario_label: "Income -30%",
        income_shock_pct: 0.3,
        inputs: { baseline_income: 23400, shocked_income: 16380, essential_expenses: 9000, flexible_expenses: 2500, debt_payments: 1500, unexpected_expense: 0, starting_cash: 0 },
        results: { total_obligations: 13000, monthly_net: 3380, ending_cash: 3380, shortfall: 0, days_of_cash_left: null },
        interpretation: "Income remains above monthly obligations.",
      },
      {
        scenario_label: "Income -50%",
        income_shock_pct: 0.5,
        inputs: { baseline_income: 23400, shocked_income: 11700, essential_expenses: 9000, flexible_expenses: 2500, debt_payments: 1500, unexpected_expense: 0, starting_cash: 0 },
        results: { total_obligations: 13000, monthly_net: -1300, ending_cash: -1300, shortfall: 1300, days_of_cash_left: null },
        interpretation: "Income is below monthly obligations.",
      },
    ],
    custom_scenario: {
      scenario_label: "Income -30%",
      income_shock_pct: 0.3,
      inputs: { baseline_income: 23400, shocked_income: 16380, essential_expenses: 9000, flexible_expenses: 2500, debt_payments: 1500, unexpected_expense: 0, starting_cash: 0 },
      results: { total_obligations: 13000, monthly_net: 3380, ending_cash: 3380, shortfall: 0, days_of_cash_left: null },
      interpretation: "Income remains above monthly obligations.",
    },
    zero_income_scenario: {
      zero_income_days: 7,
      income_lost: 6300,
      obligations_during_period: 3500,
      ending_cash: -7800,
      shortfall: 7800,
    },
    disclaimer: "Deterministic shock simulations test liquidity without guessing future events.",
  },
  actions: {
    status: "ok",
    actions: [
      {
        category: "cash_buffer",
        priority: 1,
        action: "Build a 7-day survival buffer.",
        reason: "A very low cash buffer leaves little room for unexpected expenses.",
      },
      {
        category: "debt_management",
        priority: 2,
        action: "Set aside money for the loan repayment ahead of its due date.",
        reason: "Planning around the due date can reduce last-minute borrowing.",
      },
      {
        category: "goal_planning",
        priority: 2,
        action: "Save toward the school-fee goal from typical income.",
        reason: "This approach protects essential expenses and keeps a buffer.",
      },
    ],
    disclaimer: "LUMO suggests options to consider. Decisions are always yours.",
  },
  explanation: {
    module: "full",
    explanation:
      "सीता जी, आपकी कमाई अच्छी है पर रोज़ एक जैसी नहीं रहती। आपके पास सिर्फ़ 4 दिन का कैश बचा है। अगर कुछ दिन दुकान कम चली, तो किश्त देने में परेशानी हो सकती है। LUMO की सलाह है कि अच्छे दिनों में से ₹100 अलग रखकर पहले 7 दिन का सुरक्षा कवच तैयार करें।",
    language: "hi",
    source: "fallback",
  },
};

function monthlyFlowAmount(amount: number, frequency: string): number {
  if (frequency === "daily") return amount * 30;
  if (frequency === "weekly") return amount * (30 / 7);
  if (frequency === "monthly") return amount;
  return 0;
}

function horizonMonthsToGoal(amount: number, monthlyCapacity: number): number | null {
  return monthlyCapacity > 0 ? Math.ceil(amount / monthlyCapacity) : null;
}

export function analyzeDemoTwin(
  twin: FinancialTwin,
  incomeVariability = 0.25,
): { profile: FinancialProfile; analysis: MasterAnalysisResult } {
  const monthlyIncome = twin.cash_flows
    .filter((flow) => flow.direction === "inflow")
    .reduce((sum, flow) => sum + monthlyFlowAmount(flow.amount, flow.frequency), 0);
  const monthlyWorkCosts = twin.cash_flows
    .filter((flow) => flow.direction === "outflow"
      && ["business_stock_cost", "business_operating_cost"].includes(flow.category))
    .reduce((sum, flow) => sum + monthlyFlowAmount(flow.amount, flow.frequency), 0);
  const monthlyEssentials = twin.cash_flows
    .filter((flow) => flow.direction === "outflow" && flow.category === "household_essential")
    .reduce((sum, flow) => sum + monthlyFlowAmount(flow.amount, flow.frequency), 0);
  const monthlyFlexible = twin.cash_flows
    .filter((flow) => flow.direction === "outflow" && flow.category === "household_discretionary")
    .reduce((sum, flow) => sum + monthlyFlowAmount(flow.amount, flow.frequency), 0);
  const monthlyDebtPayment = twin.cash_flows
    .filter((flow) => flow.direction === "outflow" && flow.category === "debt_repayment")
    .reduce((sum, flow) => sum + monthlyFlowAmount(flow.amount, flow.frequency), 0);
  const monthlyNet = monthlyIncome - monthlyWorkCosts - monthlyEssentials - monthlyFlexible - monthlyDebtPayment;
  const daily = (category: string) => twin.cash_flows
    .filter((flow) => flow.direction === "outflow" && flow.category === category)
    .reduce((sum, flow) => sum + (
      flow.frequency === "daily" ? flow.amount
        : flow.frequency === "weekly" ? flow.amount / 7
          : flow.frequency === "monthly" ? flow.amount / 30
            : 0
    ), 0);
  const dailyGross = twin.cash_flows
    .filter((flow) => flow.direction === "inflow")
    .reduce((sum, flow) => sum + (
      flow.frequency === "daily" ? flow.amount
        : flow.frequency === "weekly" ? flow.amount / 7
          : flow.frequency === "monthly" ? flow.amount / 30
            : 0
    ), 0);
  const occupation = /farmer/i.test(twin.profile.occupation)
    ? "farmer"
    : /kiryana|shop/i.test(twin.profile.occupation)
      ? "nano_entrepreneur"
      : "street_vendor";
  const debtFlows = twin.cash_flows.filter((flow) => flow.direction === "outflow" && flow.category === "debt_repayment");
  const profile: FinancialProfile = {
    user: {
      occupation,
      location: [twin.profile.district, twin.profile.state].filter(Boolean).join(", "),
      language: twin.language === "hi-IN" ? "hi" : twin.language === "pa-IN" ? "pa" : "en",
    },
    income: {
      daily_average: monthlyIncome / 30,
      monthly_average: monthlyIncome,
      strong_day: monthlyIncome / 30 * (1 + incomeVariability),
      weak_day: monthlyIncome / 30 * (1 - incomeVariability),
      income_frequency: "daily",
      variability: incomeVariability,
      seasonality: occupation === "farmer" ? "high" : occupation === "street_vendor" ? "medium" : "low",
    },
    expenses: {
      essential_monthly: monthlyEssentials,
      flexible_monthly: monthlyFlexible,
      total_monthly: monthlyEssentials + monthlyFlexible + monthlyWorkCosts,
    },
    debts: debtFlows.map((flow) => ({
      label: flow.label,
      principal: null,
      monthly_payment: monthlyFlowAmount(flow.amount, flow.frequency),
      lender_type: /informal/i.test(flow.label) ? "moneylender" : "other",
    })),
    business: {
      gross_daily_revenue: dailyGross,
      inventory_daily: daily("business_stock_cost"),
      other_work_costs_daily: daily("business_operating_cost"),
    },
    goals: twin.goals.map((goal) => ({
      name: goal.label,
      amount: goal.target_amount,
      deadline_months: Math.max(1, Math.ceil((new Date(`${goal.target_date}T12:00:00`).getTime()
        - new Date(`${twin.as_of_date}T12:00:00`).getTime()) / (30 * 86_400_000))),
      priority: goal.priority === "essential" ? "high" : goal.priority === "optional" ? "low" : "medium",
      current_savings: goal.current_saved ?? 0,
    })),
    assets: { cash_savings: twin.cash_on_hand },
    risk: {
      risk_appetite: "low",
      seasonal_income_drop_expected: incomeVariability >= 0.3,
    },
    cash_available: twin.cash_on_hand,
    source_metadata: { mode: "deterministic_demo", income_variability: incomeVariability },
  };

  const expenseAndDebt = monthlyWorkCosts + monthlyEssentials + monthlyFlexible + monthlyDebtPayment;
  const cashRunway = expenseAndDebt > 0
    ? Math.max(0, Math.round((twin.cash_on_hand ?? 0) / (expenseAndDebt / 30)))
    : 0;
  const reserveRisk = (twin.cash_on_hand ?? 0) < (twin.minimum_reserve ?? 0) ? 25 : 0;
  const stressScore = Math.min(100, Math.round(
    incomeVariability * 45
    + (monthlyNet <= 0 ? 40 : Math.max(0, 25 - monthlyNet / Math.max(monthlyIncome, 1) * 25))
    + reserveRisk
    + (cashRunway < 14 ? 15 : 0),
  ));
  const stressLevel = stressScore >= 75 ? "critical"
    : stressScore >= 55 ? "high"
      : stressScore >= 35 ? "moderate"
        : stressScore >= 20 ? "low" : "stable";
  const repaymentBurden = monthlyIncome > 0 ? monthlyDebtPayment / monthlyIncome : null;
  const debtPressure = repaymentBurden === null ? "unknown"
    : repaymentBurden >= 0.4 ? "high"
      : repaymentBurden >= 0.2 ? "moderate" : "low";
  const trueDailyNet = dailyGross - daily("business_stock_cost") - daily("business_operating_cost");
  const incomeScenarios = [0, 0.1, 0.2, 0.3, 0.5].map((shock) => {
    const shockedIncome = monthlyIncome * (1 - shock);
    const obligations = expenseAndDebt;
    const monthlyCash = shockedIncome - obligations;
    return {
      scenario_label: shock === 0 ? "Baseline" : `Income -${Math.round(shock * 100)}%`,
      income_shock_pct: shock,
      inputs: {
        baseline_income: Math.round(monthlyIncome),
        shocked_income: Math.round(shockedIncome),
        essential_expenses: Math.round(monthlyEssentials),
        flexible_expenses: Math.round(monthlyFlexible + monthlyWorkCosts),
        debt_payments: Math.round(monthlyDebtPayment),
        unexpected_expense: 0,
        starting_cash: twin.cash_on_hand ?? 0,
      },
      results: {
        total_obligations: Math.round(obligations),
        monthly_net: Math.round(monthlyCash),
        ending_cash: Math.round((twin.cash_on_hand ?? 0) + monthlyCash),
        shortfall: Math.max(0, Math.round((twin.minimum_reserve ?? 0) - ((twin.cash_on_hand ?? 0) + monthlyCash))),
        days_of_cash_left: monthlyCash < 0 ? Math.max(0, Math.round((twin.cash_on_hand ?? 0) / Math.abs(monthlyCash) * 30)) : null,
      },
      interpretation: monthlyCash < 0
        ? "Modeled income is below recurring obligations; check the amounts and dates."
        : "Modeled income remains above recurring obligations under these assumptions.",
    };
  });
  const weakCapacity = Math.max(0, monthlyIncome * (1 - incomeVariability) - expenseAndDebt);
  const typicalCapacity = Math.max(0, monthlyNet);
  const goalPlans: GoalPlanItem[] = profile.goals?.map((goal) => {
    const remaining = Math.max(0, goal.amount - (goal.current_savings ?? 0));
    const variants = {
      strong: monthlyIncome * (1 + incomeVariability) - expenseAndDebt,
      typical: monthlyNet,
      weak: monthlyIncome * (1 - incomeVariability) - expenseAndDebt,
    };
    const scenario = (key: "strong" | "typical" | "weak"): GoalScenario => {
      const capacity = Math.max(0, variants[key]);
      return {
        income_label: `${key} month`,
        monthly_income: Math.round(monthlyIncome * (key === "strong" ? 1 + incomeVariability : key === "weak" ? 1 - incomeVariability : 1)),
        savings_capacity_per_month: Math.round(capacity),
        months_to_goal: horizonMonthsToGoal(remaining, capacity),
        remaining_amount: remaining,
        feasible: capacity > 0,
        note: "Deterministic estimate from demo inputs; not a guarantee.",
      };
    };
    const safeCapacity = weakCapacity > 0 ? weakCapacity : typicalCapacity;
    const safeMonths = horizonMonthsToGoal(remaining, safeCapacity);
    return {
      goal_name: goal.name,
      goal_amount: goal.amount,
      current_savings: goal.current_savings ?? 0,
      remaining_amount: remaining,
      priority: goal.priority ?? "medium",
      deadline_months: goal.deadline_months ?? null,
      deadline_feasible: safeMonths === null || goal.deadline_months === null || goal.deadline_months === undefined
        ? null
        : safeMonths <= goal.deadline_months,
      deadline_warning: safeMonths !== null && goal.deadline_months !== null && goal.deadline_months !== undefined
        && safeMonths > goal.deadline_months ? "The modeled savings path is longer than the entered deadline." : null,
      scenarios: {
        strong: scenario("strong"),
        typical: scenario("typical"),
        weak: scenario("weak"),
      },
      recommended_safe_path: {
        approach: weakCapacity > 0 ? "Use the weak-income estimate and protect essential costs"
          : "Pause the goal until recurring costs and income are reviewed",
        monthly_saving: Math.round(safeCapacity),
        estimated_months: safeMonths,
        rationale: "This path is derived from the modeled income, work costs, household costs and scheduled debt payments.",
      },
    };
  }) ?? [];
  const actions = monthlyNet <= 0
    ? [{
      priority: 1,
      category: "cash_flow",
      action: "Review recurring costs and payment timing before adding new debt.",
      reason: `The modeled recurring monthly net is ${Math.round(monthlyNet)} INR from the entered demo flows.`,
    }]
    : cashRunway < 14
      ? [{
        priority: 1,
        category: "cash_buffer",
        action: "Protect the stated reserve and verify upcoming payments before reinvesting.",
        reason: `The current cash amount covers approximately ${cashRunway} days of modeled work, household, and debt outflows.`,
      }]
      : [{
        priority: 1,
        category: "goal_planning",
        action: "Compare the goal with the weak-income path before committing the full amount.",
        reason: `The lower-income scenario leaves an estimated ${Math.round(weakCapacity)} INR monthly savings capacity.`,
      }];
  const analysis: MasterAnalysisResult = {
    status: "ok",
    profile_summary: {
      occupation,
      location: profile.user?.location ?? null,
      language: profile.user?.language ?? null,
    },
    stress_radar: {
      status: "ok",
      score: stressScore,
      level: stressLevel,
      monthly_net_cashflow: Math.round(monthlyNet),
      days_of_cash_runway: cashRunway,
      potential_shortfall: Math.max(0, Math.round((twin.minimum_reserve ?? 0) - (twin.cash_on_hand ?? 0))),
      drivers: [
        { factor: "modeled income variability", impact: incomeVariability >= 0.3 ? "high" : "moderate" },
        { factor: "recurring monthly cash flow", impact: monthlyNet < 0 ? "high" : monthlyNet < monthlyIncome * 0.15 ? "moderate" : "low" },
        { factor: "cash compared with stated reserve", impact: reserveRisk ? "high" : "low" },
      ],
      disclaimer: "Deterministic estimate from fictional demo inputs; not a credit score or certainty.",
    },
    debt_warning: {
      status: "ok",
      pressure_level: debtPressure,
      estimated_repayment_burden: repaymentBurden,
      total_monthly_payment: Math.round(monthlyDebtPayment),
      total_outstanding_debt: null,
      income_floor: Math.round(monthlyIncome * (1 - incomeVariability)),
      weak_income_shortfall: Math.max(0, Math.round(expenseAndDebt - monthlyIncome * (1 - incomeVariability))),
      debt_warning_threshold: 0.2,
      debt_high_threshold: 0.4,
      drivers: [{ factor: "confirmed scheduled debt payments", impact: debtPressure }],
      recommended_actions: debtFlows.length ? ["Confirm the lender schedule and payment dates."] : ["Debt principal is recorded only as context; confirm any repayment schedule."],
      confidence: { overall: "limited", drivers: ["Debt principal and unconfirmed schedules are not inferred."] },
      disclaimer: "Debt evaluation reflects only scheduled payments captured in the demo twin.",
    },
    true_earnings: {
      status: "ok",
      revenue_source: "financial_twin_demo_flows",
      daily: {
        gross: Math.round(dailyGross),
        fuel: 0,
        maintenance: 0,
        platform_fees: 0,
        inventory: Math.round(daily("business_stock_cost")),
        food_work_costs: 0,
        other_work_costs: Math.round(daily("business_operating_cost")),
        total_work_costs: Math.round(daily("business_stock_cost") + daily("business_operating_cost")),
        estimated_net: Math.round(trueDailyNet),
        net_margin: dailyGross > 0 ? trueDailyNet / dailyGross : 0,
        note: "Estimated from recorded recurring demo sales and work costs; missing costs are not assumed to be zero in a real assessment.",
      },
      monthly_projection: {
        gross: Math.round(monthlyIncome),
        total_work_costs: Math.round(monthlyWorkCosts),
        estimated_net: Math.round(monthlyIncome - monthlyWorkCosts),
        net_margin: monthlyIncome > 0 ? (monthlyIncome - monthlyWorkCosts) / monthlyIncome : 0,
        note: "Monthlyized from recorded recurring demo flows; seasonal variation is shown separately.",
      },
      missing_costs: [],
      confidence: { overall: "limited", drivers: ["Fictional demo inputs; confirm all figures and seasonal timing."] },
      disclaimer: "Demo estimate only; not verified financial advice.",
    },
    goal_analysis: {
      status: goalPlans.length ? "ok" : "insufficient_data",
      goals: goalPlans,
      disclaimer: "Goal calculations are conditional estimates from fictional inputs.",
    },
    income_shock: {
      status: "ok",
      baseline_income: Math.round(monthlyIncome),
      preset_grid: incomeScenarios,
      disclaimer: "Income shock comparisons are deterministic scenarios, not predictions.",
    },
    actions: {
      status: "ok",
      actions,
      disclaimer: "Suggested next steps are generated from this demo profile; they do not establish eligibility or approval.",
    },
    financial_profile: profile,
    explanation: {
      module: "full",
      explanation: `The demo's recurring flows produce an estimated monthly net of ₹${Math.round(monthlyNet).toLocaleString("en-IN")}. This estimate uses the listed costs and an income-variability assumption of ±${Math.round(incomeVariability * 100)}%; it does not confirm debt terms, scheme eligibility, or future income.`,
      language: profile.user?.language ?? "en",
      source: "deterministic_demo",
    },
  };

  return { profile, analysis };
}

export function explainDemoFinancialProfile(profile: FinancialProfile, module = "full"): ExplanationResult {
  const income = profile.income?.monthly_average
    ?? (profile.income?.daily_average === null || profile.income?.daily_average === undefined
      ? null
      : profile.income.daily_average * 30);
  const costs = (profile.expenses?.total_monthly ?? 0) + (profile.debts ?? []).reduce(
    (sum, debt) => sum + (debt.monthly_payment ?? 0),
    0,
  );
  return {
    module,
    explanation: income === null
      ? "The demo profile does not include enough income information for a cash-flow estimate."
      : `The demo profile shows about ₹${Math.round(income).toLocaleString("en-IN")} monthly income and ₹${Math.round(costs).toLocaleString("en-IN")} in recorded monthly costs and payments. These are fictional inputs; confirm the amounts and dates before relying on them.`,
    language: profile.user?.language ?? "en",
    source: "deterministic_demo",
  };
}

// ---------------------------------------------------------------------------
// Exported Workstream E Client Functions
// ---------------------------------------------------------------------------

export async function getDemoProfile(): Promise<DemoPersonaEnvelope> {
  return intelligenceFetch<DemoPersonaEnvelope>("/api/intelligence/demo", {
    method: "GET",
  });
}

export async function analyzeFinancialProfile(
  profile: FinancialProfile,
  explain = false,
): Promise<MasterAnalysisResult> {
  return intelligenceFetch<MasterAnalysisResult>(
    `/api/intelligence/analyze?explain=${explain ? "true" : "false"}`,
    {
      method: "POST",
      body: JSON.stringify({ financial_profile: profile }),
    },
  );
}

export async function analyzeFinancialTwin(
  twin: FinancialTwin,
  explain = false,
): Promise<MasterAnalysisResult> {
  return intelligenceFetch<MasterAnalysisResult>(
    `/api/intelligence/analyze?explain=${explain ? "true" : "false"}`,
    {
      method: "POST",
      body: JSON.stringify({ financial_twin: twin }),
    },
  );
}

export async function getStressAnalysis(profile: FinancialProfile): Promise<StressRadarResult> {
  return intelligenceFetch<StressRadarResult>("/api/intelligence/stress", {
    method: "POST",
    body: JSON.stringify({ financial_profile: profile }),
  });
}

export async function runShockSimulation(
  profile: FinancialProfile,
  shockPct = 0.30,
  unexpectedExpense?: number,
  zeroIncomeDays?: number,
): Promise<ShockSimulationResult> {
  return intelligenceFetch<ShockSimulationResult>("/api/intelligence/shock", {
    method: "POST",
    body: JSON.stringify({
      financial_profile: profile,
      income_shock_pct: shockPct,
      unexpected_expense: unexpectedExpense,
      zero_income_days: zeroIncomeDays,
    }),
  });
}

export async function analyzeGoals(
  profile: FinancialProfile,
  goalIndex = 0,
): Promise<GoalPlanItem> {
  return intelligenceFetch<GoalPlanItem>("/api/intelligence/goals", {
    method: "POST",
    body: JSON.stringify({
      financial_profile: profile,
      goal_index: goalIndex,
    }),
  });
}

export async function analyzeAllGoals(profile: FinancialProfile): Promise<GoalAnalysisResult> {
  return intelligenceFetch<GoalAnalysisResult>("/api/intelligence/goals/all", {
    method: "POST",
    body: JSON.stringify({ financial_profile: profile }),
  });
}

export async function analyzeDebt(profile: FinancialProfile): Promise<DebtRiskResult> {
  return intelligenceFetch<DebtRiskResult>("/api/intelligence/debt", {
    method: "POST",
    body: JSON.stringify({ financial_profile: profile }),
  });
}

export async function calculateTrueEarnings(
  profile: FinancialProfile,
): Promise<TrueEarningsResult> {
  return intelligenceFetch<TrueEarningsResult>("/api/intelligence/earnings", {
    method: "POST",
    body: JSON.stringify({ financial_profile: profile }),
  });
}

export async function explainFinancialResult(
  profile: FinancialProfile,
  module = "full",
  incomeShockPct?: number,
): Promise<ExplanationResult> {
  return intelligenceFetch<ExplanationResult>("/api/intelligence/explain", {
    method: "POST",
    body: JSON.stringify({
      financial_profile: profile,
      module,
      income_shock_pct: incomeShockPct,
    }),
  });
}
