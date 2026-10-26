import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Info,
  Loader2,
  Play,
  RotateCcw,
  TrendingDown,
} from "lucide-react";
import { SamjhoTrigger } from "@/components/lumo/SamjhoModal";
import {
  formatDisplayDate,
  formatINR,
  formatSignedINR,
} from "@/lib/format";
import { STATUS_LABELS, tr } from "@/lib/i18n";
import type {
  ExplainTermKey,
  FinancialTwin,
  LumoLanguage,
  SimulateResponse,
  SimulationValidationIssue,
} from "@/types/lumo";

import { useLumoIntelligence } from "@/app/intelligenceStore";

export interface WhatIfPanelProps {
  twin: FinancialTwin;
  simulationResponse: SimulateResponse | null;
  shockActive: boolean;
  onActivateShock30: () => Promise<void>;
  onResetToBaseline: () => Promise<void>;
  isSimulating: boolean;
  validationIssues: SimulationValidationIssue[];
  language: LumoLanguage;
  onOpenSamjho: (termKey: ExplainTermKey) => void;
  onGoToTwin: () => void;
}

export function WhatIfPanel({
  twin,
  simulationResponse,
  shockActive,
  onActivateShock30,
  onResetToBaseline,
  isSimulating,
  validationIssues,
  language,
  onOpenSamjho,
  onGoToTwin,
}: WhatIfPanelProps) {
  const [viewMode, setViewMode] = useState<"side_by_side" | "before" | "after">("side_by_side");
  const [selectedShockPct, setSelectedShockPct] = useState<number>(0.30);
  const [activeShockMode, setActiveShockMode] = useState<string>("income_drop");

  let intelligenceShock = null;
  let runShockFromIntel = null;
  try {
    const intel = useLumoIntelligence();
    intelligenceShock = intel.shockSimulation;
    runShockFromIntel = intel.runShock;
  } catch {
    // outside provider fallback
  }

  if (validationIssues.length > 0 || !simulationResponse) {
    return (
      <div
        role="alert"
        className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-6 text-slate-900"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="space-y-3">
            <h2 className="text-lg font-bold">
              Complete Essential Twin Inputs Before Running What-If Simulation
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950">
              {validationIssues.map((issue, idx) => (
                <li key={idx}>
                  <code className="font-mono font-bold">{issue.field}</code>: {issue.message}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onGoToTwin}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-900"
            >
              <span>Go to Financial Twin</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const baseline =
    simulationResponse.results.find((r) => r.scenario_id === "baseline") ??
    simulationResponse.results[0];
  const stressed =
    simulationResponse.results.find((r) => r.scenario_id === "sales_drop_30") ??
    (simulationResponse.results.length > 1 ? simulationResponse.results[1] : null);

  const reserve = twin.minimum_reserve ?? 0;

  // Dual chart geometry
  const baseTimeline = baseline?.timeline ?? [];
  const stressTimeline = stressed?.timeline ?? [];
  const allVals = [
    ...baseTimeline.map((d) => d.closing_balance),
    ...stressTimeline.map((d) => d.closing_balance),
    reserve,
    0,
  ];
  const maxVal = Math.max(...allVals, 1000);
  const minVal = Math.min(...allVals, 0);
  const range = Math.max(1, maxVal - minVal);

  const chartW = 760;
  const chartH = 240;
  const padL = 58;
  const padR = 20;
  const padT = 20;
  const padB = 32;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const yFor = (v: number) => padT + plotH - ((v - minVal) / range) * plotH;
  const xFor = (i: number) =>
    padL + (baseTimeline.length <= 1 ? 0 : (i / (baseTimeline.length - 1)) * plotW);

  const basePoints = baseTimeline
    .map((pt, i) => `${xFor(i).toFixed(1)},${yFor(pt.closing_balance).toFixed(1)}`)
    .join(" ");

  const stressPoints = stressTimeline
    .map((pt, i) => `${xFor(i).toFixed(1)},${yFor(pt.closing_balance).toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Workstream E Shock Intelligence Section */}
      {intelligenceShock && (
        <div className="rounded-2xl border-2 border-indigo-900/15 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300">
                WORKSTREAM E · DETERMINISTIC SHOCK ENGINE
              </span>
              <h3 className="mt-2 text-xl font-bold text-white">
                Income Shock & Resilience Testing
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Simulate what happens if income drops by 10%, 20%, 30%, 50%, or if work stops for 7 days.
              </p>
            </div>
            <SamjhoTrigger termKey="income_shock" language={language} onOpenTerm={onOpenSamjho} compact />
          </div>

          {/* Preset Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "10% Drop", pct: 0.10, type: "drop" },
              { label: "20% Drop", pct: 0.20, type: "drop" },
              { label: "30% Drop (Rain / Slump)", pct: 0.30, type: "drop" },
              { label: "50% Severe Shock", pct: 0.50, type: "drop" },
              { label: "7-Day Zero Income", pct: 0.30, type: "zero_days", days: 7 },
              { label: "₹5,000 Medical Shock", pct: 0.0, type: "medical", expense: 5000 },
            ].map((preset, idx) => {
              const isSelected =
                preset.type === activeShockMode &&
                (preset.type !== "drop" || selectedShockPct === preset.pct);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveShockMode(preset.type);
                    if (preset.type === "drop") {
                      setSelectedShockPct(preset.pct);
                      if (runShockFromIntel) runShockFromIntel(preset.pct);
                    } else if (preset.type === "zero_days") {
                      if (runShockFromIntel) runShockFromIntel(0.0, undefined, 7);
                    } else if (preset.type === "medical") {
                      if (runShockFromIntel) runShockFromIntel(0.0, 5000);
                    }
                  }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isSelected
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "bg-white/10 text-slate-200 hover:bg-white/20"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Current vs After Shock Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Current Baseline */}
            {(() => {
              const baselineScenario = intelligenceShock.preset_grid?.find(
                (scenario) => scenario.income_shock_pct === 0,
              );
              return <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Current Monthly Position (Baseline)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-slate-300">Monthly Income:</span>
                  <strong className="font-mono text-sm text-white">
                    {formatINR(baselineScenario?.inputs.baseline_income ?? null, language)}
                  </strong>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs text-slate-300">Essential Expenses:</span>
                  <strong className="font-mono text-sm text-rose-300">
                    {formatINR(baselineScenario?.inputs.essential_expenses ?? null, language)}
                  </strong>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs text-slate-300">Monthly Debt Payments:</span>
                  <strong className="font-mono text-sm text-rose-300">
                    {formatINR(baselineScenario?.inputs.debt_payments ?? null, language)}
                  </strong>
                </div>
                <div className="mt-3 border-t border-white/10 pt-2 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-emerald-300">Available Net Cashflow:</span>
                  <strong className="font-mono text-base font-bold text-emerald-300">
                    {formatINR(baselineScenario?.results.monthly_net ?? null, language)}
                  </strong>
                </div>
              </div>;
            })()}

            {/* After Shock */}
            {(() => {
              const currentScenario =
                  intelligenceShock.preset_grid?.find(
                    (scenario) => scenario.income_shock_pct === selectedShockPct,
                  );
                if (!currentScenario) {
                  return <p className="text-sm text-slate-300">No backend scenario is available at this shock level.</p>;
                }
                const hasShortfall = currentScenario.results.shortfall > 0;

                return (
                  <div className={`rounded-xl border p-4 ${
                  hasShortfall
                    ? "border-rose-500/40 bg-rose-950/20"
                    : "border-amber-400/30 bg-amber-950/20"
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    {currentScenario.scenario_label}
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-slate-300">Shocked Monthly Income:</span>
                    <strong className="font-mono text-sm text-white">
                      {formatINR(currentScenario.inputs.shocked_income, language)}
                    </strong>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs text-slate-300">Projected Monthly Result:</span>
                    <strong className={`font-mono text-sm font-bold ${
                      hasShortfall ? "text-rose-400" : "text-amber-300"
                    }`}>
                      {hasShortfall
                        ? `Shortfall of ${formatINR(currentScenario.results.shortfall, language)}`
                        : `${formatINR(currentScenario.results.monthly_net, language)} remaining`}
                    </strong>
                  </div>
                  <div className="mt-3 border-t border-white/10 pt-2 text-xs text-slate-200">
                    {hasShortfall ? (
                      <p className="text-rose-200">
                        ⚠ Under a {Math.round(selectedShockPct * 100)}% drop, essential expenses exceed income. Existing cash buffer covers essential obligations for approximately{" "}
                        <strong className="font-bold underline text-white">
                          {currentScenario.results.days_of_cash_left ?? "Unknown"}{currentScenario.results.days_of_cash_left === null ? "" : " days"}
                        </strong>.
                      </p>
                    ) : (
                      <p className="text-emerald-200">
                        ✓ At this income level, essential expenses remain covered with approximately{" "}
                        <strong className="font-bold text-white">
                          {currentScenario.results.days_of_cash_left ?? "Unknown"}{currentScenario.results.days_of_cash_left === null ? "" : " days"}
                        </strong>{" "}
                        of emergency cash buffer.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          <p className="mt-3 text-[11px] text-slate-400 italic">
            Calculated deterministically by Workstream E shock engine (app/intelligence/shock_simulator.py).
          </p>
        </div>
      )}

      {/* Control Card */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-950">
                <TrendingDown className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
                Step 4 · What-If Stress Simulator
              </span>
              <SamjhoTrigger
                termKey="income_shock"
                language={language}
                onOpenTerm={onOpenSamjho}
                compact
              />
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Simulate a Temporary Business Sales Shock
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Test what happens to your daily cash balance and safety reserve if rain, heatwave, or
              market closure reduces `business_sales` by 30% for 14 days while stock, supplier dues,
              and household commitments continue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onActivateShock30}
              disabled={isSimulating}
              aria-pressed={shockActive}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-xs transition ${
                shockActive
                  ? "bg-amber-500 text-slate-950 ring-2 ring-amber-700"
                  : "bg-indigo-950 text-white hover:bg-indigo-900"
              }`}
            >
              {isSimulating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              )}
              <span>{tr("action.shock30", language)}</span>
            </button>

            {shockActive && (
              <button
                type="button"
                onClick={onResetToBaseline}
                disabled={isSimulating}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Baseline only</span>
              </button>
            )}
          </div>
        </div>

        {/* Before / After / Side-by-Side Switch */}
        {stressed && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                { id: "side_by_side", label: "Side-by-Side Comparison" },
                { id: "before", label: "Before (Baseline)" },
                { id: "after", label: "After (30% Sales Shock)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setViewMode(tab.id as "side_by_side" | "before" | "after")
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === tab.id
                      ? "bg-indigo-950 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-amber-100/80 px-3.5 py-1.5 font-mono text-xs font-bold text-amber-950">
              Change in minimum balance:{" "}
              {formatSignedINR(simulationResponse.comparison.change_in_minimum_balance)}
            </div>
          </div>
        )}
      </div>

      {/* Prompt if shock not yet activated */}
      {!stressed && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">
            Currently showing Baseline (`Expected situation`) only.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Click <strong>“{tr("action.shock30", language)}”</strong> above to call{" "}
            <code className="font-mono">POST /api/finance/simulate</code> with both baseline and
            shock scenarios.
          </p>
        </div>
      )}

      {/* Side-by-Side / Before / After Scenario Cards */}
      {baseline && (
        <div
          className={`grid gap-5 ${
            stressed && viewMode === "side_by_side" ? "lg:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {(viewMode === "side_by_side" || viewMode === "before" || !stressed) && (
            <ScenarioComparisonCard
              title="Before · Baseline Scenario"
              result={baseline}
              reserve={reserve}
              language={language}
              isStressed={false}
            />
          )}

          {stressed && (viewMode === "side_by_side" || viewMode === "after") && (
            <ScenarioComparisonCard
              title="After · Sales fall by 30% for 14 days"
              result={stressed}
              reserve={reserve}
              language={language}
              isStressed={true}
              deltaMinBalance={simulationResponse.comparison.change_in_minimum_balance}
            />
          )}
        </div>
      )}

      {/* Dual Trajectory Chart + Side-by-Side Daily Table when Stressed is Present */}
      {stressed && (
        <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Baseline vs. 30% Sales Shock — Daily Balance Trajectory
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Calculated by `/api/finance/simulate` using the exact same `FinancialTwin` input.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                Baseline ({baseline.label})
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                30% Sales Drop for 14 Days
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-600" />
                Reserve ({formatINR(reserve, language)})
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full min-w-[540px]"
              role="img"
              aria-label="Comparison chart of baseline vs 30 percent sales drop for 14 days"
            >
              {/* 14-day shock shaded window */}
              <rect
                x={xFor(0)}
                y={padT}
                width={xFor(Math.min(13, baseTimeline.length - 1)) - xFor(0)}
                height={plotH}
                fill="#fef3c7"
                opacity={0.45}
              />
              <text
                x={xFor(0) + 8}
                y={padT + 14}
                className="fill-amber-900 font-mono text-[10px] font-semibold"
              >
                14-day sales shock window (×0.7)
              </text>

              {/* Zero line */}
              <line
                x1={padL}
                y1={yFor(0)}
                x2={chartW - padR}
                y2={yFor(0)}
                stroke="#94a3b8"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={yFor(0) + 4}
                textAnchor="end"
                className="fill-slate-600 font-mono text-[10px]"
              >
                ₹0
              </text>

              {/* Reserve line */}
              <line
                x1={padL}
                y1={yFor(reserve)}
                x2={chartW - padR}
                y2={yFor(reserve)}
                stroke="#d97706"
                strokeWidth={1.4}
                strokeDasharray="5 4"
              />
              <text
                x={padL - 6}
                y={yFor(reserve) + 4}
                textAnchor="end"
                className="fill-amber-800 font-mono text-[10px]"
              >
                {formatINR(reserve)}
              </text>

              {/* Baseline polyline */}
              <polyline
                fill="none"
                stroke="#059669"
                strokeWidth={2.4}
                points={basePoints}
              />

              {/* Stress polyline */}
              <polyline
                fill="none"
                stroke="#e11d48"
                strokeWidth={2.6}
                points={stressPoints}
              />
            </svg>
          </div>

          {/* Accessible Side-by-Side Daily Balance Table */}
          <div className="mt-5">
            <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Daily Balance Comparison Table (First 15 Days & Key Dates)
            </h4>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Date</th>
                    <th className="py-2 px-3 font-semibold">Baseline Inflow</th>
                    <th className="py-2 px-3 font-semibold">Shock Inflow</th>
                    <th className="py-2 px-3 font-semibold">Outflows</th>
                    <th className="py-2 px-3 font-semibold">Baseline Closing</th>
                    <th className="py-2 px-3 font-semibold">Shock Closing</th>
                    <th className="py-2 px-3 font-semibold">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {baseTimeline.map((bDay, i) => {
                    const sDay = stressTimeline[i];
                    if (!sDay) return null;
                    const diff = sDay.closing_balance - bDay.closing_balance;
                    const isBreach = sDay.closing_balance < reserve;
                    return (
                      <tr
                        key={bDay.date}
                        className={isBreach ? "bg-rose-50/50" : "hover:bg-slate-50"}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {bDay.date}
                        </td>
                        <td className="py-2 px-3 text-emerald-800">
                          {formatINR(bDay.inflows, language)}
                        </td>
                        <td className="py-2 px-3 text-amber-900">
                          {formatINR(sDay.inflows, language)}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {formatINR(sDay.outflows, language)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-emerald-900">
                          {formatINR(bDay.closing_balance, language)}
                        </td>
                        <td
                          className={`py-2 px-3 font-bold ${
                            sDay.closing_balance < 0
                              ? "text-rose-700"
                              : isBreach
                                ? "text-amber-800"
                                : "text-slate-900"
                          }`}
                        >
                          {formatINR(sDay.closing_balance, language)}
                        </td>
                        <td className="py-2 px-3 text-rose-700">
                          {formatSignedINR(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Major Factors Responsible for the Difference & Scenario Assumptions */}
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h4 className="text-xs font-bold tracking-wider text-amber-950 uppercase">
                Major Factors Responsible for the Difference
              </h4>
              <ul className="mt-2.5 space-y-2 text-xs text-slate-800">
                {stressed.major_drivers.map((d, i) => (
                  <li key={`${d.flow_id}-${i}`} className="flex items-start justify-between gap-2">
                    <span>
                      <strong>{d.label}</strong> ({formatDisplayDate(d.date, language)}):{" "}
                      {d.impact_note}
                    </span>
                    <span className="shrink-0 font-mono font-bold text-rose-800">
                      -{formatINR(d.amount, language)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-900" aria-hidden="true" />
                <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Scenario Assumptions
                </h4>
              </div>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-xs text-slate-700">
                {stressed.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioComparisonCard({
  title,
  result,
  reserve,
  language,
  isStressed,
  deltaMinBalance,
}: {
  title: string;
  result: NonNullable<SimulateResponse["results"][number]>;
  reserve: number;
  language: LumoLanguage;
  isStressed: boolean;
  deltaMinBalance?: number;
}) {
  const statusMeta = STATUS_LABELS[result.status];

  return (
    <div
      className={`rounded-2xl border-2 p-5 shadow-xs ${
        isStressed
          ? "border-amber-400 bg-amber-50/40"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            {title}
          </p>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900">{result.label}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-xs font-bold uppercase ${
            statusMeta.tone === "emerald"
              ? "bg-emerald-200 text-emerald-950"
              : statusMeta.tone === "amber"
                ? "bg-amber-200 text-amber-950"
                : "bg-rose-200 text-rose-950"
          }`}
        >
          {result.status}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-white p-3 shadow-2xs">
          <dt className="font-medium text-slate-500">Minimum balance</dt>
          <dd
            className={`mt-1 font-mono text-xl font-bold ${
              result.minimum_balance < 0
                ? "text-rose-700"
                : result.minimum_balance < reserve
                  ? "text-amber-800"
                  : "text-emerald-800"
            }`}
          >
            {formatINR(result.minimum_balance, language)}
          </dd>
          <dd className="mt-0.5 text-[11px] text-slate-500">
            on {formatDisplayDate(result.minimum_balance_date, language)}
            {deltaMinBalance !== undefined && (
              <span className="ml-1 font-mono font-semibold text-rose-700">
                ({formatSignedINR(deltaMinBalance)})
              </span>
            )}
          </dd>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-2xs">
          <dt className="font-medium text-slate-500">Reserve shortfall</dt>
          <dd
            className={`mt-1 font-mono text-xl font-bold ${
              result.shortfall_to_reserve > 0 ? "text-rose-700" : "text-emerald-800"
            }`}
          >
            {formatINR(result.shortfall_to_reserve, language)}
          </dd>
          <dd className="mt-0.5 text-[11px] text-slate-500">
            vs. {formatINR(reserve, language)} reserve
          </dd>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-2xs">
          <dt className="font-medium text-slate-500">First reserve-breach date</dt>
          <dd className="mt-1 font-mono text-sm font-bold text-slate-900">
            {result.first_reserve_breach_date
              ? formatDisplayDate(result.first_reserve_breach_date, language)
              : "None (Intact)"}
          </dd>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-2xs">
          <dt className="font-medium text-slate-500">Falls below ₹0?</dt>
          <dd
            className={`mt-1 text-sm font-bold ${
              result.minimum_balance < 0 ? "text-rose-700" : "text-emerald-800"
            }`}
          >
            {result.minimum_balance < 0 ? "Yes (Cash deficit)" : "No (Above ₹0)"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
