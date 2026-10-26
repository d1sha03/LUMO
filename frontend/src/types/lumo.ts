/**
 * Shared LUMO v1.0 Data Contracts & API Schemas
 * Preserves field names and meanings across TypeScript, Python and JSON.
 */

export type LumoLanguage = "hi-IN" | "en-IN" | "pa-IN";

export type CashFlowDirection = "inflow" | "outflow";

export type CashFlowCategory =
  | "business_sales"
  | "business_stock_cost"
  | "business_operating_cost"
  | "household_essential"
  | "household_discretionary"
  | "debt_repayment"
  | "supplier_payment"
  | "savings_goal"
  | "other";

export type CashFlowFrequency = "once" | "daily" | "weekly" | "monthly";

export type SourceType =
  | "user_statement"
  | "manual_entry"
  | "synthetic_dataset"
  | "official_source";

export type GoalPriority = "essential" | "important" | "optional";

export interface CashFlow {
  id: string;
  label: string;
  direction: CashFlowDirection;
  category: CashFlowCategory;
  amount: number;
  frequency: CashFlowFrequency;
  start_date: string;
  /** 0 to 1: explicitly an extraction-confidence estimate, NOT a probability of payment */
  confidence: number;
  source_type: SourceType;
  source_note?: string;
  essential: boolean;
}

export interface Goal {
  id: string;
  label: string;
  target_amount: number;
  target_date: string;
  priority: GoalPriority;
  current_saved?: number | null;
  source_type?: SourceType;
  source_note?: string;
  confidence?: number;
}

export interface FinancialTwinProfile {
  occupation: string;
  state?: string;
  district?: string;
  cash_on_hand?: number | null;
  minimum_reserve?: number | null;
  forecast_days?: number;
}

export interface FinancialTwin {
  schema_version: "1.0";
  twin_id: string;
  as_of_date: string;
  language: LumoLanguage;
  profile: FinancialTwinProfile;
  /** non-negative INR amount or null when unknown — never silently replaced with 0 */
  cash_on_hand: number | null;
  /** non-negative INR amount or null when unknown — never silently replaced with 0 */
  minimum_reserve: number | null;
  /** integer from 1 to 90 */
  forecast_days: number;
  cash_flows: CashFlow[];
  goals: Goal[];
}

/* ── GET /health ─────────────────────────────────────────── */

export type ExecutionMode = "demo" | "live";

export interface HealthResponse {
  status: "ok";
  version: string;
  mode: ExecutionMode;
}

/* ── POST /api/intake/compile ────────────────────────────── */

export interface IntakeCompileRequest {
  text: string;
  language: LumoLanguage;
  as_of_date: string;
  existing_twin: FinancialTwin | null;
}

export interface ClarificationQuestion {
  id: string;
  field: string;
  question: string;
  why_it_matters: string;
  language: LumoLanguage;
  suggested_options?: { label: string; action: string; value?: number | string }[];
}

export interface ExtractedFact {
  field: string;
  value: number | string;
  source_quote: string;
  confidence: number;
  source_type: SourceType;
}

export interface IntakeCompileResponse {
  mode: ExecutionMode;
  draft_twin: FinancialTwin;
  questions_required: ClarificationQuestion[];
  extracted_facts: ExtractedFact[];
  warnings: string[];
}

/* ── POST /api/finance/simulate ──────────────────────────── */

export interface IncomeShock {
  category: CashFlowCategory;
  multiplier: number;
  duration_days: number;
  start_date: string;
}

export interface SimulationScenarioInput {
  scenario_id: string;
  label: string;
  income_shock: IncomeShock | null;
}

export interface SimulateRequest {
  twin: FinancialTwin;
  scenarios: SimulationScenarioInput[];
}

export type ScenarioStatus = "within_reserve" | "reserve_breach" | "cash_deficit";

export interface DailyBalancePoint {
  date: string;
  opening_balance: number;
  inflows: number;
  outflows: number;
  closing_balance: number;
  reserve_gap: number;
  applied_items?: { id: string; label: string; direction: CashFlowDirection; amount: number; category: CashFlowCategory }[];
}

export interface MajorDriver {
  flow_id: string;
  label: string;
  category: CashFlowCategory;
  date: string;
  amount: number;
  impact_note: string;
}

export interface ScenarioResult {
  scenario_id: string;
  label: string;
  status: ScenarioStatus;
  timeline: DailyBalancePoint[];
  minimum_balance: number;
  minimum_balance_date: string;
  shortfall_to_reserve: number;
  first_reserve_breach_date: string | null;
  major_drivers: MajorDriver[];
  notes: string[];
}

export interface SimulationComparison {
  baseline_scenario_id: string;
  most_stressed_scenario_id: string;
  change_in_minimum_balance: number;
}

export interface SimulateResponse {
  schema_version: "1.0";
  results: ScenarioResult[];
  comparison: SimulationComparison;
}

export interface SimulationValidationIssue {
  field: string;
  message: string;
}

/* ── POST /api/explain (LUMO Samjho) ─────────────────────── */

export type ExplainTermKey =
  | "gross_sales"
  | "net_operating_cash"
  | "supplier_credit"
  | "debt_repayment"
  | "minimum_reserve"
  | "projected_cash_shortfall"
  | "income_shock";

export interface ExplainContext {
  scenario_status?: ScenarioStatus;
  shortfall_to_reserve?: number;
  minimum_balance_date?: string;
  minimum_balance?: number;
  minimum_reserve?: number | null;
  cash_on_hand?: number | null;
}

export interface ExplainRequest {
  term_key: ExplainTermKey | string;
  context: ExplainContext;
  language: LumoLanguage;
  include_audio: boolean;
}

export type AudioStatus = "available" | "unavailable" | "not_requested";

export interface ExplainAudio {
  status: AudioStatus;
  mime_type: string | null;
  audio_base64: string | null;
}

export interface ExplainResponse {
  language: LumoLanguage;
  explanation: string;
  example: string;
  provider: string;
  audio: ExplainAudio;
}

/* ── GET /api/resources ──────────────────────────────────── */

export interface OfficialResourceItem {
  id: string;
  title: string;
  why_relevant: string;
  eligibility_summary: string;
  benefit_summary: string;
  requirements_to_verify: string[];
  official_url: string;
  source_name: string;
  source_status:
    | "source_retrieved"
    | "source_retrieved_no_html_metadata"
    | "source_unavailable"
    | "source_not_allowlisted"
    | "catalog_only"
    | "demo_directory_candidate";
  source_page_title?: string | null;
  source_excerpt?: string | null;
  retrieved_at?: string;
  source_checked_at?: string;
  retrieved_content_kind?: "html_page_metadata" | null;
  official_source_type?: string;
  profile_context?: {
    occupation: string | null;
    state_or_location: string | null;
  };
  eligibility?: {
    verified: boolean;
    verified_fields: Record<string, unknown>;
    unknown_fields: string[];
  };
  benefits?: {
    verified: boolean;
    verified_fields: Record<string, unknown>;
    financial_benefit: string | number | null;
    non_financial_benefit: string | null;
  };
  verified_facts?: Array<Record<string, unknown>>;
  match_status?: "strong_match" | "possible_match" | "insufficient_information" | "not_supported_by_evidence";
  match_reasons?: string[];
  missing_information?: string[];
  match_evidence?: Array<Record<string, unknown>>;
  relevance_confidence: "unassessed";
  relevance_basis: string;
  disclaimer: string;
}

export interface ResourcesQuery {
  occupation?: string;
  state?: string;
  language?: LumoLanguage;
}

export interface ResourcesResponse {
  items: OfficialResourceItem[];
}

export interface LumoChatRequest {
  question: string;
  language: "en" | "hi" | "hinglish" | "pa";
  financial_context: Record<string, unknown>;
  occupation?: string;
}

export interface LumoChatResponse {
  answer: string;
  language: string;
  mode: string;
  provider: string;
  language_provider: string;
  sources: Array<Record<string, unknown>>;
  scheme_candidates: OfficialResourceItem[];
  disclaimer: string;
}

/* ── POST /api/stt (browser audio → Sarvam Saaras) ───────── */

export interface SttResponse {
  transcript: string;
  language_code: string | null;
  requested_language_code?: string;
  provider: string;
  model: string;
  mode: "live";
}

export interface SttProviderError {
  status: "provider_error" | "audio_too_large" | "invalid_audio";
  provider?: string;
  model?: string;
  transcript: null;
  message: string;
}

/* ── GET /api/providers/health ───────────────────────────── */

export type ProviderHealthState = "reachable" | "configured" | "error" | "not_configured";

export interface ProviderHealth {
  configured: boolean;
  reachable: boolean | null;
  status: ProviderHealthState;
  error: string | null;
  model?: string | null;
}

export interface ProvidersHealthResponse {
  sarvam_stt: ProviderHealth;
  sarvam_llm: ProviderHealth;
  sarvam_tts: ProviderHealth;
  bhashini: ProviderHealth;
  summary: {
    reachable_providers: string[];
    reachable_count: number;
    total_providers: number;
  };
}

/** LIVE = a provider really answered, PARTIAL = some did, DEMO = deterministic engine. */
export type PipelineState = "live" | "partial" | "demo";
