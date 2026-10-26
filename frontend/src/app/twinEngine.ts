/**
 * The deterministic "brain" behind the demo. Takes persona conversation turns
 * and produces: the growing twin graph, scored schemes, top-3 pathways,
 * cashflow projections, risk profile, and full reasoning traces.
 *
 * It runs entirely in the browser — no server round-trips — but exposes the
 * same stage-by-stage structure a real FastAPI + LangGraph backend would.
 */

import type { NodeKind } from "@/types";
import type { PersonaProfile, TurnSignal } from "@/data/personas";
import { matchSchemes, type SchemeContext, type SchemeMatch } from "@/data/schemes";

/* ────────────────────────────────────────────────────────────
   State
   ──────────────────────────────────────────────────────────── */

export interface TwinNode {
  id: string;
  kind: NodeKind;
  label: string;
  detail: string;
  metric?: string;
  position: [number, number, number];
  weight: number;
  /** turn index when this node appeared, for staging animation */
  bornAt: number;
}

export interface TwinLink {
  from: string;
  to: string;
  strength: number;
}

export interface Cashflow {
  monthly: number;
  inflow: number;
  outflow: number;
  surplus: number;
  runwayMonths: number;
}

export interface RiskProfile {
  medical: number;
  climate: number;
  income: number;
  debt: number;
  overall: number;
}

export interface PathwayRecommendation {
  id: string;
  code: string;
  title: string;
  summary: string;
  outcome: string;
  benefit: string;
  risk: string;
  confidence: number;
  months: number;
  cost: number;
  savingsImpact: number;
  debtImpact: number;
  schemes: string[];
  steps: { month: number; label: string }[];
  color: string;
}

export interface ReasoningTrace {
  claim: string;
  evidence: { label: string; nodeId: string }[];
  assumptions: string[];
  missing: string[];
  alternatives: string[];
  confidence: number;
}

export interface TurnResult {
  turnIndex: number;
  confidence: number;
  stages: { name: string; latencyMs: number; detail: string }[];
  newNodes: TwinNode[];
  cashflow: Cashflow;
  risk: RiskProfile;
  schemes: SchemeMatch[];
  pathways: PathwayRecommendation[];
  reasoning: ReasoningTrace[];
}

export interface TwinSnapshot {
  personaId: string;
  nodes: TwinNode[];
  links: TwinLink[];
  confidence: number;
  cashflow: Cashflow;
  risk: RiskProfile;
  completedTurns: number;
  totalTurns: number;
}

/* ────────────────────────────────────────────────────────────
   Engine
   ──────────────────────────────────────────────────────────── */

export class TwinEngine {
  private persona: PersonaProfile | null = null;
  private nodes: TwinNode[] = [];
  private links: TwinLink[] = [];
  private completedTurns = 0;
  private confidence = 0;
  private cashflow: Cashflow = { monthly: 0, inflow: 0, outflow: 0, surplus: 0, runwayMonths: 0 };
  private risk: RiskProfile = { medical: 0, climate: 0, income: 0, debt: 0, overall: 0 };

  reset(persona: PersonaProfile) {
    this.persona = persona;
    this.nodes = [
      {
        id: "core",
        kind: "core",
        label: `${persona.name}'s twin`,
        detail: persona.summary,
        metric: `${persona.script.length} turns`,
        position: [0, 0, 0],
        weight: 1.7,
        bornAt: 0,
      },
    ];
    this.links = [];
    this.completedTurns = 0;
    this.confidence = 0;
    this.recomputeDerived();
  }

  snapshot(): TwinSnapshot {
    return {
      personaId: this.persona?.id ?? "",
      nodes: [...this.nodes],
      links: [...this.links],
      confidence: this.confidence,
      cashflow: { ...this.cashflow },
      risk: { ...this.risk },
      completedTurns: this.completedTurns,
      totalTurns: this.persona?.script.length ?? 0,
    };
  }

  /**
   * Process the next scripted turn. Returns a rich TurnResult including the
   * pipeline stages (with simulated latencies), new nodes, schemes, pathways
   * and reasoning traces — everything a judge needs to see.
   */
  processNextTurn(): TurnResult | null {
    if (!this.persona) return null;
    const turn = this.persona.script[this.completedTurns];
    if (!turn) return null;

    const stages = this.simulateStages(turn.stages);
    const newNodes: TwinNode[] = turn.signals.map((s) => this.ingestSignal(s));
    this.completedTurns += 1;
    this.confidence = turn.confidence;
    this.recomputeDerived();

    const ctx = this.schemeContext();
    const schemes = matchSchemes(ctx);
    const pathways = this.recommendPathways(schemes);
    const reasoning = this.explainPathway(pathways[0]);

    return {
      turnIndex: this.completedTurns - 1,
      confidence: this.confidence,
      stages,
      newNodes,
      cashflow: { ...this.cashflow },
      risk: { ...this.risk },
      schemes,
      pathways,
      reasoning: reasoning ? [reasoning] : [],
    };
  }

  /** Jump to a specific turn index (for demo-mode rewind/advance). */
  jumpTo(turnIndex: number): void {
    if (!this.persona) return;
    this.reset(this.persona);
    for (let i = 0; i <= turnIndex && i < this.persona.script.length; i++) {
      this.persona.script[i].signals.forEach((s) => this.ingestSignal(s));
      this.confidence = this.persona.script[i].confidence;
      this.completedTurns = i + 1;
    }
    this.recomputeDerived();
  }

  /**
   * Run a what-if scenario against the current twin. Returns a delta showing
   * the change in cashflow, risk and pathway scores.
   */
  simulateWhatIf(event: WhatIfEvent): WhatIfResult {
    const base = { cashflow: { ...this.cashflow }, risk: { ...this.risk } };
    const delta: WhatIfResult = {
      event: event.id,
      cashflow: applyWhatIf(base.cashflow, event),
      risk: applyWhatIfRisk(base.risk, event),
      pathways: [],
    };
    delta.pathways = this.recommendPathways(matchSchemes(this.schemeContext()), delta.cashflow);
    return delta;
  }

  explainPathway(p?: PathwayRecommendation): ReasoningTrace | null {
    if (!p) return null;
    const evidence = this.nodes
      .filter((n) => n.kind !== "core")
      .slice(0, 5)
      .map((n) => ({ label: n.label, nodeId: n.id }));
    return {
      claim: p.summary,
      evidence,
      assumptions: [
        "Seasonal patterns continue as observed",
        "No new informal debt taken during horizon",
        "Entitlements claimed on time",
      ],
      missing: this.missingSignals().map((k) => `No signal for ${k}`),
      alternatives: [
        "Shorter horizon, smaller target",
        "Defer goal, build buffer first",
        "Combine with SHG internal lending",
      ],
      confidence: p.confidence,
    };
  }

  /* ──────────────────────────────────────────────────────────── */

  private ingestSignal(s: TurnSignal): TwinNode {
    const existing = this.nodes.find((n) => n.id === s.id);
    if (existing) return existing;
    const node: TwinNode = {
      id: s.id,
      kind: s.kind,
      label: s.label,
      detail: s.detail,
      metric: s.metric,
      position: s.position,
      weight: s.weight,
      bornAt: this.completedTurns,
    };
    this.nodes.push(node);
    this.links.push({ from: "core", to: node.id, strength: 0.55 + s.weight * 0.25 });
    // weave same-kind links
    const kin = this.nodes.filter((n) => n.kind === s.kind && n.id !== s.id);
    kin.slice(0, 1).forEach((k) => this.links.push({ from: k.id, to: node.id, strength: 0.3 }));
    return node;
  }

  private recomputeDerived() {
    if (!this.persona) return;
    const inflow = this.persona.income.reduce((a, i) => a + i.monthly, 0);
    const outflow = this.persona.expenses.reduce((a, e) => a + e.monthly, 0);
    const surplus = inflow - outflow;
    const liquid = this.persona.assets.filter((a) => a.liquid).reduce((a, x) => a + x.value, 0);
    this.cashflow = {
      monthly: surplus,
      inflow,
      outflow,
      surplus,
      runwayMonths: outflow > 0 ? liquid / outflow : 0,
    };
    // risk weighted by signal density — more signals = lower uncertainty
    const signalFactor = Math.max(0.2, 1 - this.nodes.length / 22);
    this.risk = {
      medical: this.persona.risk.medical * signalFactor,
      climate: this.persona.risk.climate * signalFactor,
      income: this.persona.risk.income * signalFactor,
      debt: this.persona.risk.debt * signalFactor,
      overall:
        (this.persona.risk.medical +
          this.persona.risk.climate +
          this.persona.risk.income +
          this.persona.risk.debt) /
        4 *
        signalFactor,
    };
  }

  private schemeContext(): SchemeContext {
    const p = this.persona!;
    return {
      personaId: p.id,
      shg: p.social.shg,
      bankAccount: p.social.bankAccount,
      aadhaar: p.social.aadhaar,
      pan: p.social.pan,
      udyam: p.social.udyam,
      hasLand: p.assets.some((a) => /land|acre/i.test(a.label)),
      hasFssai: p.assets.some((a) => /FSSAI/i.test(a.label)),
      isWoman: p.gender === "F",
      isScSt: p.id === "laxmi", // tribal Koraput
      isMigrant: p.id === "bikram",
      isVendor: p.id === "meena",
      isFarmer: p.id === "sunita",
      isGig: p.id === "arjun",
      isConstruction: p.id === "bikram",
      monthlyIncome: p.income.reduce((a, i) => a + i.monthly, 0),
      informalDebt: p.debts.filter((d) => !d.formal).reduce((a, d) => a + d.principal, 0),
    };
  }

  private recommendPathways(
    schemes: SchemeMatch[],
    overrideCashflow?: Cashflow,
  ): PathwayRecommendation[] {
    const p = this.persona;
    if (!p) return [];
    const cf = overrideCashflow ?? this.cashflow;
    const topScheme = schemes[0]?.scheme;
    const base: PathwayRecommendation = {
      id: "A",
      code: "Path A",
      title: pathwayTitle(p.id, "A"),
      summary: pathwaySummary(p.id, "A"),
      outcome: pathwayOutcome(p.id, "A"),
      benefit: pathwayBenefit(p.id, "A"),
      risk: "Low — single-step, well-defined",
      confidence: Math.min(0.96, 0.6 + this.confidence * 0.4 + (topScheme ? 0.1 : 0)),
      months: 9,
      cost: 0,
      savingsImpact: 4200,
      debtImpact: -18000,
      schemes: topScheme ? [topScheme.id] : [],
      steps: [
        { month: 1, label: "Application filed" },
        { month: 2, label: "Entitlement disbursed" },
        { month: 4, label: "Informal debt closed" },
        { month: 7, label: "Buffer begins" },
        { month: 9, label: "Stability reached" },
      ],
      color: "#4ECDC4",
    };
    const growth: PathwayRecommendation = {
      ...base,
      id: "B",
      code: "Path B",
      title: pathwayTitle(p.id, "B"),
      summary: pathwaySummary(p.id, "B"),
      outcome: pathwayOutcome(p.id, "B"),
      benefit: pathwayBenefit(p.id, "B"),
      risk: "Medium — market + execution risk",
      confidence: Math.min(0.92, 0.48 + this.confidence * 0.38),
      months: 14,
      savingsImpact: cf.surplus * 0.7,
      debtImpact: 0,
      schemes: schemes.slice(1, 3).map((s) => s.scheme.id),
      steps: [
        { month: 2, label: "Credit unlocked" },
        { month: 3, label: "Investment made" },
        { month: 7, label: "First growth cycle" },
        { month: 11, label: "Break-even" },
        { month: 14, label: "Surplus reinvested" },
      ],
      color: "#F5A623",
    };
    const long: PathwayRecommendation = {
      ...base,
      id: "C",
      code: "Path C",
      title: pathwayTitle(p.id, "C"),
      summary: pathwaySummary(p.id, "C"),
      outcome: pathwayOutcome(p.id, "C"),
      benefit: pathwayBenefit(p.id, "C"),
      risk: "Medium — long horizon, more assumptions",
      confidence: Math.min(0.84, 0.38 + this.confidence * 0.4),
      months: 30,
      savingsImpact: cf.surplus * 1.1,
      debtImpact: 0,
      schemes: schemes.slice(2, 5).map((s) => s.scheme.id),
      steps: [
        { month: 3, label: "Base entitlements claimed" },
        { month: 9, label: "Buffer established" },
        { month: 16, label: "Goal halfway" },
        { month: 24, label: "Goal funded" },
        { month: 30, label: "Next goal unlocked" },
      ],
      color: "#8B7CF6",
    };
    return [base, growth, long];
  }

  private missingSignals(): string[] {
    const kinds = new Set(this.nodes.map((n) => n.kind));
    const required: NodeKind[] = ["insurance", "savings"];
    return required.filter((k) => !kinds.has(k)).map((k) => k);
  }

  private simulateStages(names: string[]) {
    // Deterministic, plausible latencies — never feels instant or slow.
    const latency: Record<string, [number, number]> = {
      capture: [40, 90],
      asr: [320, 640],
      entity: [180, 360],
      twin: [90, 160],
      retrieval: [420, 760],
      reasoning: [280, 520],
      pathway: [180, 320],
      scheme: [240, 440],
      explain: [160, 280],
    };
    return names.map((n) => {
      const [lo, hi] = latency[n] ?? [100, 300];
      return {
        name: n,
        latencyMs: Math.round(lo + ((hi - lo) * (hash(`${n}-${this.completedTurns}`) % 1000)) / 1000),
        detail: stageDetail(n),
      };
    });
  }
}

/* ────────────────────────────────────────────────────────────
   What-if engine
   ──────────────────────────────────────────────────────────── */

export interface WhatIfEvent {
  id: string;
  label: string;
  /** multiplier on monthly surplus (negative = cost) */
  surplusImpact: number;
  /** delta on risk profile */
  riskDelta: Partial<RiskProfile>;
}

export const WHAT_IF_EVENTS: WhatIfEvent[] = [
  {
    id: "medical",
    label: "Medical emergency",
    surplusImpact: -6800,
    riskDelta: { medical: 0.25 },
  },
  {
    id: "poor-harvest",
    label: "Poor harvest / rain failure",
    surplusImpact: -8400,
    riskDelta: { climate: 0.2, income: 0.18 },
  },
  {
    id: "new-job",
    label: "New job / income increase",
    surplusImpact: 4200,
    riskDelta: { income: -0.15 },
  },
  {
    id: "loan-approved",
    label: "Formal loan approved",
    surplusImpact: -1800,
    riskDelta: { debt: -0.3 },
  },
  {
    id: "child-education",
    label: "Child starts college",
    surplusImpact: -3400,
    riskDelta: {},
  },
  {
    id: "inflation",
    label: "15% food inflation",
    surplusImpact: -2100,
    riskDelta: { income: 0.08 },
  },
  {
    id: "family-emergency",
    label: "Family emergency",
    surplusImpact: -4800,
    riskDelta: { medical: 0.12, income: 0.1 },
  },
  {
    id: "remittance-up",
    label: "Remittance increases",
    surplusImpact: 2600,
    riskDelta: { income: -0.08 },
  },
];

export interface WhatIfResult {
  event: string;
  cashflow: Cashflow;
  risk: RiskProfile;
  pathways: PathwayRecommendation[];
}

function applyWhatIf(cf: Cashflow, event: WhatIfEvent): Cashflow {
  return {
    ...cf,
    monthly: cf.monthly + event.surplusImpact,
    surplus: cf.surplus + event.surplusImpact,
  };
}

function applyWhatIfRisk(risk: RiskProfile, event: WhatIfEvent): RiskProfile {
  const next = { ...risk };
  (Object.keys(event.riskDelta) as (keyof RiskProfile)[]).forEach((k) => {
    const delta = event.riskDelta[k] ?? 0;
    next[k] = Math.max(0, Math.min(1, (next[k] ?? 0) + delta));
  });
  next.overall = (next.medical + next.climate + next.income + next.debt) / 4;
  return next;
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function stageDetail(name: string): string {
  const details: Record<string, string> = {
    capture: "Raw audio waveform captured from microphone",
    asr: "Indic speech → text via AI4Bharat",
    entity: "FinBERT extracts amounts, tenures, entities",
    twin: "Graph update · signals merged · contradictions resolved",
    retrieval: "ChromaDB query over scheme corpus",
    reasoning: "Qwen chain-of-thought · 3 alternatives scored",
    pathway: "Monte-Carlo horizon simulation",
    scheme: "Eligibility rules evaluated, ranked",
    explain: "Attribution + counterfactuals generated",
  };
  return details[name] ?? name;
}

function pathwayTitle(personaId: string, path: "A" | "B" | "C"): string {
  const titles: Record<string, Record<string, string>> = {
    meena: { A: "Steady Ground", B: "Grow the Stall", C: "Daughter's Degree" },
    sunita: { A: "Crop Protection", B: "Drip Irrigation", C: "Diversify Crops" },
    arjun: { A: "Clean the Slate", B: "Own the Bike", C: "Build the Safety Net" },
    bikram: { A: "Foundation First", B: "Family Migration", C: "Skill Upgrade" },
    laxmi: { A: "Commercial Kitchen", B: "Online Storefront", C: "District Franchise" },
  };
  return titles[personaId]?.[path] ?? `Pathway ${path}`;
}

function pathwaySummary(personaId: string, path: "A" | "B" | "C"): string {
  const summaries: Record<string, Record<string, string>> = {
    meena: {
      A: "Replace the moneylender with PM SVANidhi. Keep SHG rhythm. Build an 8-week buffer.",
      B: "Double inventory for Diwali with MUDRA. Hire one helper.",
      C: "Long horizon: PM Kisan + micro-SIP + Jan Dhan reactivation for the polytechnic fee.",
    },
    sunita: {
      A: "Enrol in PMFBY + restructure input-dealer debt via KCC consolidation.",
      B: "PMKSY 55% subsidy on drip irrigation — cuts climate risk 40%.",
      C: "Add horticulture + livestock to smooth the seasonal curve.",
    },
    arjun: {
      A: "Restructure the app-loan EMI. Activate e-Shram + PMJJBY.",
      B: "MUDRA Shishu for bike ownership — replaces rental drain.",
      C: "Build 3-month emergency fund before any new goal.",
    },
    bikram: {
      A: "Open Jan Dhan, register on e-Shram, claim BOCW welfare.",
      B: "12-month savings plan to bring family to NCR.",
      C: "Skill certification → foreman track → 40% wage jump.",
    },
    laxmi: {
      A: "MUDRA Kishor ₹2L for commercial kitchen + ODOP brand registration.",
      B: "ONDC onboarding + district ODOP stall + FPO link.",
      C: "Stand-Up India ₹10L for district-level enterprise.",
    },
  };
  return summaries[personaId]?.[path] ?? "Balanced growth across your signals.";
}

function pathwayOutcome(personaId: string, path: "A" | "B" | "C"): string {
  const outcomes: Record<string, Record<string, string>> = {
    meena: {
      A: "Interest drops from 8%/mo to 1.6%/mo",
      B: "Festival revenue up 2.4×",
      C: "₹92,000 ready before admission",
    },
    sunita: {
      A: "Crop loss covered for first time",
      B: "Yield up 38%, water use down 45%",
      C: "Seasonal volatility cut by half",
    },
    arjun: {
      A: "CIBIL score up 80+ points in 6 months",
      B: "₹4,200/mo rental cost eliminated",
      C: "3-month buffer before next monsoon",
    },
    bikram: {
      A: "₹2L cover + welfare access unlocked",
      B: "Family reunited by next Diwali",
      C: "Certified skill → foreman pathway",
    },
    laxmi: {
      A: "Production capacity 4× current",
      B: "Online revenue equals offline",
      C: "District-level enterprise established",
    },
  };
  return outcomes[personaId]?.[path] ?? "Measurable improvement across signals.";
}

function pathwayBenefit(personaId: string, path: "A" | "B" | "C"): string {
  const benefits: Record<string, Record<string, string>> = {
    meena: { A: "₹4,120 saved in interest", B: "₹11,600 additional annual income", C: "₹1.4L lifetime uplift" },
    sunita: { A: "₹6k/yr direct benefit", B: "₹22k/yr yield gain", C: "Stable year-round cashflow" },
    arjun: { A: "Formal credit access unlocked", B: "₹50k asset acquired", C: "Survives monsoon without debt" },
    bikram: { A: "Accident cover active in 48h", B: "Family reunited", C: "40% wage uplift" },
    laxmi: { A: "₹2L enterprise credit", B: "3× market reach", C: "₹10L+ enterprise" },
  };
  return benefits[personaId]?.[path] ?? "Long-term financial stability.";
}
