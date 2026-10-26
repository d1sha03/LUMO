import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Info,
  ShieldAlert,
  Table,
  TrendingDown,
} from "lucide-react";
import { SamjhoTrigger } from "@/components/lumo/SamjhoModal";
import {
  formatDisplayDate,
  formatINR,
  formatShortDate,
} from "@/lib/format";
import { STATUS_LABELS } from "@/lib/i18n";
import type {
  ExplainTermKey,
  FinancialTwin,
  LumoLanguage,
  ScenarioResult,
  SimulationValidationIssue,
} from "@/types/lumo";

import { useLumoIntelligence } from "@/app/intelligenceStore";

export interface StressRadarPanelProps {
  twin: FinancialTwin;
  scenarioResult: ScenarioResult | null;
  validationIssues: SimulationValidationIssue[];
  simulationError: string | null;
  language: LumoLanguage;
  onOpenSamjho: (termKey: ExplainTermKey) => void;
  onGoToTwin: () => void;
  onGoToWhatIf: () => void;
}

export function StressRadarPanel({
  twin,
  scenarioResult,
  validationIssues,
  simulationError,
  language,
  onOpenSamjho,
  onGoToTwin,
  onGoToWhatIf,
}: StressRadarPanelProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [showFullTable, setShowFullTable] = useState<boolean>(true);

  // Workstream E Authoritative Intelligence
  let intelligenceStress = null;
  try {
    const intel = useLumoIntelligence();
    intelligenceStress = intel.stressRadar;
  } catch {
    // If used outside provider, gracefully fall back
  }

  // If essential inputs (cash_on_hand or minimum_reserve) are null/missing, show structured validation
  if (validationIssues.length > 0 || !scenarioResult) {
    return (
      <div
        role="alert"
        className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-6 text-slate-900 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              Cannot Run Cash-Flow Projection — Incomplete Essential Inputs
            </h2>
            <p className="text-sm text-slate-700">
              LUMO never replaces unknown (`null`) values with ₹0. The simulation endpoint rejected
              the current twin with the following validation findings:
            </p>
            {validationIssues.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm font-medium text-amber-950">
                {validationIssues.map((issue, idx) => (
                  <li key={idx}>
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                      {issue.field}
                    </code>
                    : {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-rose-800">
                {simulationError ?? "No simulation result available yet."}
              </p>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={onGoToTwin}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-900"
              >
                <span>Complete Missing Fields in Financial Twin</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_LABELS[scenarioResult.status];
  const fallsBelowZero = scenarioResult.minimum_balance < 0;
  const timeline = scenarioResult.timeline;
  const reserve = twin.minimum_reserve ?? 0;

  // Chart bounds
  const allValues = [
    ...timeline.map((d) => d.closing_balance),
    reserve,
    0,
  ];
  const maxVal = Math.max(...allValues, 1000);
  const minVal = Math.min(...allValues, 0);
  const range = Math.max(1, maxVal - minVal);

  const chartWidth = 760;
  const chartHeight = 230;
  const padLeft = 56;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 32;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const yForValue = (val: number) =>
    padTop + plotH - ((val - minVal) / range) * plotH;
  const xForIndex = (idx: number) =>
    padLeft + (timeline.length <= 1 ? 0 : (idx / (timeline.length - 1)) * plotW);

  const reserveY = yForValue(reserve);
  const zeroY = yForValue(0);

  const polylinePoints = timeline
    .map((pt, idx) => `${xForIndex(idx).toFixed(1)},${yForValue(pt.closing_balance).toFixed(1)}`)
    .join(" ");

  const inspectedDay =
    timeline[Math.min(selectedDayIdx, Math.max(0, timeline.length - 1))] ?? timeline[0];

  return (
    <div className="space-y-6">
      {/* Workstream E Authoritative Stress Indicator */}
      {intelligenceStress && (
        <div className="rounded-2xl border-2 border-indigo-900/15 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300">
                  WORKSTREAM E · DETERMINISTIC FINANCIAL STRESS
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                    intelligenceStress.level === "stable" || intelligenceStress.level === "low"
                      ? "bg-emerald-500/30 text-emerald-300"
                      : intelligenceStress.level === "moderate"
                        ? "bg-amber-500/30 text-amber-300"
                        : "bg-rose-500/30 text-rose-300"
                  }`}
                >
                  {intelligenceStress.level ?? "insufficient data"}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono text-4xl font-extrabold text-amber-400">
                  {intelligenceStress.score ?? "—"}
                </span>
                {intelligenceStress.score !== undefined && <span className="text-xl font-bold text-slate-300">/ 100</span>}
                <span className="text-sm font-medium uppercase tracking-wider text-slate-300">
                  {intelligenceStress.level ? `${intelligenceStress.level} Stress Level` : intelligenceStress.message}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                LUMO Financial Stress Indicator evaluates your cash runway, debt load, and irregular income. This is NOT a credit score.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-6">
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <span className="block text-[11px] text-slate-300 uppercase">Cash Runway</span>
                <strong className="font-mono text-lg text-emerald-300">
                  {intelligenceStress.days_of_cash_runway !== null && intelligenceStress.days_of_cash_runway !== undefined
                    ? `${intelligenceStress.days_of_cash_runway} days`
                    : "Unknown"}
                </strong>
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <span className="block text-[11px] text-slate-300 uppercase">Potential Shortfall</span>
                <strong className="font-mono text-lg text-amber-300">
                  {formatINR(intelligenceStress.potential_shortfall ?? null, language)}
                </strong>
              </div>
            </div>
          </div>

          {intelligenceStress.drivers && intelligenceStress.drivers.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Primary Stress Drivers Identified by LUMO:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {intelligenceStress.drivers.map((d, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                      d.impact === "high"
                        ? "border border-rose-500/30 bg-rose-500/20 text-rose-200"
                        : "border border-amber-500/30 bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    <span>●</span>
                    <span>{d.factor}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Status Banner */}
      <div
        className={`rounded-2xl border-2 p-5 shadow-xs sm:p-6 ${
          statusMeta.tone === "emerald"
            ? "border-emerald-300 bg-emerald-50/70"
            : statusMeta.tone === "amber"
              ? "border-amber-400 bg-amber-50/80"
              : "border-rose-300 bg-rose-50/80"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {statusMeta.tone === "emerald" ? (
              <CheckCircle2
                className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            ) : (
              <ShieldAlert
                className={`mt-0.5 h-6 w-6 shrink-0 ${
                  statusMeta.tone === "amber" ? "text-amber-700" : "text-rose-700"
                }`}
                aria-hidden="true"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 shadow-2xs">
                  Scenario: {scenarioResult.label} ({scenarioResult.scenario_id})
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold uppercase ${
                    statusMeta.tone === "emerald"
                      ? "bg-emerald-200 text-emerald-950"
                      : statusMeta.tone === "amber"
                        ? "bg-amber-200 text-amber-950"
                        : "bg-rose-200 text-rose-950"
                  }`}
                >
                  {scenarioResult.status}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {statusMeta.title[language]}
              </h2>
              <p className="mt-1 text-sm text-slate-700">{statusMeta.summary[language]}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToWhatIf}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-900"
          >
            <TrendingDown className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>Test 30% Sales Shock in What-If Simulator</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Required 6 Stress Radar Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Lowest Projected Balance & Date */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Lowest projected balance
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              minimum_balance
            </span>
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-bold ${
              scenarioResult.minimum_balance < 0
                ? "text-rose-700"
                : scenarioResult.minimum_balance < reserve
                  ? "text-amber-800"
                  : "text-slate-900"
            }`}
          >
            {formatINR(scenarioResult.minimum_balance, language)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            Occurs on:{" "}
            <strong className="font-semibold text-slate-900">
              {formatDisplayDate(scenarioResult.minimum_balance_date, language)}
            </strong>{" "}
            (<code className="font-mono text-[11px]">{scenarioResult.minimum_balance_date}</code>)
          </p>
        </div>

        {/* 2. User's Minimum Reserve */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Your minimum safety reserve
            </span>
            <SamjhoTrigger
              termKey="minimum_reserve"
              language={language}
              onOpenTerm={onOpenSamjho}
              compact
            />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-indigo-950">
            {formatINR(twin.minimum_reserve, language)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            Starting cash on hand:{" "}
            <strong className="font-semibold text-slate-900">
              {formatINR(twin.cash_on_hand, language)}
            </strong>
          </p>
        </div>

        {/* 3. Projected Shortfall Relative to Reserve */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Shortfall relative to reserve
            </span>
            <SamjhoTrigger
              termKey="projected_cash_shortfall"
              language={language}
              onOpenTerm={onOpenSamjho}
              compact
            />
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-bold ${
              scenarioResult.shortfall_to_reserve > 0 ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {formatINR(scenarioResult.shortfall_to_reserve, language)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            <code className="font-mono text-[11px]">max(0, minimum_reserve - minimum_balance)</code>
          </p>
        </div>

        {/* 4. First Reserve-Breach Date */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              First reserve-breach date
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              first_reserve_breach_date
            </span>
          </div>
          <p
            className={`mt-2 text-xl font-bold ${
              scenarioResult.first_reserve_breach_date ? "text-amber-900" : "text-emerald-800"
            }`}
          >
            {scenarioResult.first_reserve_breach_date
              ? formatDisplayDate(scenarioResult.first_reserve_breach_date, language)
              : "None (Reserve intact)"}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            {scenarioResult.first_reserve_breach_date
              ? `First day closing balance drops below ${formatINR(twin.minimum_reserve, language)}`
              : `Balance stays ≥ ${formatINR(twin.minimum_reserve, language)} for all ${twin.forecast_days} days`}
          </p>
        </div>

        {/* 5. Does Projected Balance Ever Fall Below Zero? */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Falls below ₹0 (Cash deficit)?
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              closing_balance &lt; 0
            </span>
          </div>
          <p
            className={`mt-2 text-xl font-bold ${
              fallsBelowZero ? "text-rose-700" : "text-emerald-800"
            }`}
          >
            {fallsBelowZero ? "Yes — Projected cash deficit" : "No — Stays above ₹0"}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            {fallsBelowZero
              ? `Lowest closing balance reaches ${formatINR(scenarioResult.minimum_balance, language)}`
              : "All scheduled outflows can be met without going negative"}
          </p>
        </div>

        {/* 6. Forecast Window Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Ending Balance (Day {timeline.length})
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              {timeline[timeline.length - 1]?.date}
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
            {formatINR(timeline[timeline.length - 1]?.closing_balance ?? 0, language)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            Across {timeline.length}-day forecast from{" "}
            {formatShortDate(twin.as_of_date, language)}
          </p>
        </div>
      </div>

      {/* Daily Cash Balance Timeline Visualization + Textual Equivalent */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daily Closing Cash Balance Timeline ({timeline.length} days)
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Click any day on the chart to inspect its opening balance, inflows, outflows, closing
              balance, and reserve gap.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-950" />
              Closing balance
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-600" />
              Safety reserve ({formatINR(reserve, language)})
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
              <span className="h-0.5 w-4 bg-rose-500" />
              ₹0 threshold
            </span>
          </div>
        </div>

        {/* Accessible Textual Summary of the Chart */}
        <div
          className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700"
          aria-label="Textual summary of cash balance chart"
        >
          <strong>Textual summary:</strong> Starting at{" "}
          {formatINR(twin.cash_on_hand, language)} on{" "}
          {formatDisplayDate(twin.as_of_date, language)}, the projected closing balance reaches a
          low of <strong>{formatINR(scenarioResult.minimum_balance, language)}</strong> on{" "}
          <strong>{formatDisplayDate(scenarioResult.minimum_balance_date, language)}</strong> (with a
          reserve shortfall of{" "}
          <strong>{formatINR(scenarioResult.shortfall_to_reserve, language)}</strong> relative to
          your {formatINR(twin.minimum_reserve, language)} reserve) and ends the{" "}
          {timeline.length}-day window at{" "}
          <strong>
            {formatINR(timeline[timeline.length - 1]?.closing_balance ?? 0, language)}
          </strong>
          .
        </div>

        {/* SVG Chart */}
        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full min-w-[540px]"
            role="img"
            aria-label={`Daily closing cash balance chart for ${scenarioResult.label}`}
          >
            {/* Zero line */}
            <line
              x1={padLeft}
              y1={zeroY}
              x2={chartWidth - padRight}
              y2={zeroY}
              stroke="#e11d48"
              strokeWidth={1.2}
            />
            <text
              x={padLeft - 6}
              y={zeroY + 4}
              textAnchor="end"
              className="fill-rose-700 font-mono text-[10px]"
            >
              ₹0
            </text>

            {/* Minimum Reserve Line */}
            <line
              x1={padLeft}
              y1={reserveY}
              x2={chartWidth - padRight}
              y2={reserveY}
              stroke="#d97706"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={padLeft - 6}
              y={reserveY + 4}
              textAnchor="end"
              className="fill-amber-800 font-mono text-[10px]"
            >
              {formatINR(reserve)}
            </text>

            {/* Max value guide */}
            <text
              x={padLeft - 6}
              y={padTop + 6}
              textAnchor="end"
              className="fill-slate-500 font-mono text-[10px]"
            >
              {formatINR(maxVal)}
            </text>

            {/* Balance Trajectory Line */}
            <polyline
              fill="none"
              stroke="#1e1b4b"
              strokeWidth={2.5}
              points={polylinePoints}
            />

            {/* Day points */}
            {timeline.map((pt, idx) => {
              const cx = xForIndex(idx);
              const cy = yForValue(pt.closing_balance);
              const isBreach = pt.closing_balance < reserve;
              const isNegative = pt.closing_balance < 0;
              const isSelected = idx === selectedDayIdx;

              return (
                <g
                  key={pt.date}
                  className="cursor-pointer"
                  onClick={() => setSelectedDayIdx(idx)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : isBreach ? 4.5 : 3.2}
                    fill={
                      isNegative
                        ? "#e11d48"
                        : isBreach
                          ? "#d97706"
                          : "#1e1b4b"
                    }
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  {(idx === 0 ||
                    idx === timeline.length - 1 ||
                    idx % 5 === 0 ||
                    pt.date === scenarioResult.minimum_balance_date) && (
                    <text
                      x={cx}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className="fill-slate-600 font-mono text-[10px]"
                    >
                      {pt.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Day Inspector */}
        {inspectedDay && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-900/15 bg-indigo-50/50 px-4 py-3 text-xs">
            <div className="font-semibold text-indigo-950">
              Selected Day: {formatDisplayDate(inspectedDay.date, language)} (
              <code className="font-mono">{inspectedDay.date}</code>)
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono">
              <span>Opening: {formatINR(inspectedDay.opening_balance, language)}</span>
              <span className="text-emerald-800">
                +Inflows: {formatINR(inspectedDay.inflows, language)}
              </span>
              <span className="text-rose-800">
                -Outflows: {formatINR(inspectedDay.outflows, language)}
              </span>
              <span className="font-bold text-slate-900">
                = Closing: {formatINR(inspectedDay.closing_balance, language)}
              </span>
              {inspectedDay.reserve_gap > 0 && (
                <span className="rounded bg-amber-200 px-2 py-0.5 font-bold text-amber-950">
                  Reserve gap: {formatINR(inspectedDay.reserve_gap, language)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Toggle & Accessible Daily Ledger Table */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowFullTable((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-950 hover:underline"
          >
            <Table className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {showFullTable
                ? "Hide daily cash-flow table"
                : "Show full daily cash-flow table (textual equivalent)"}
            </span>
          </button>

          {showFullTable && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Date</th>
                    <th className="py-2 px-3 font-semibold">Opening</th>
                    <th className="py-2 px-3 font-semibold">Inflows</th>
                    <th className="py-2 px-3 font-semibold">Outflows</th>
                    <th className="py-2 px-3 font-semibold">Closing</th>
                    <th className="py-2 px-3 font-semibold">Reserve Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {timeline.map((day, idx) => {
                    const isBreach = day.reserve_gap > 0;
                    const isDeficit = day.closing_balance < 0;
                    return (
                      <tr
                        key={day.date}
                        onClick={() => setSelectedDayIdx(idx)}
                        className={`cursor-pointer ${
                          isDeficit
                            ? "bg-rose-50/80 font-semibold text-rose-950"
                            : isBreach
                              ? "bg-amber-50/70 font-semibold text-amber-950"
                              : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2 px-3">{day.date}</td>
                        <td className="py-2 px-3">
                          {formatINR(day.opening_balance, language)}
                        </td>
                        <td className="py-2 px-3 text-emerald-800">
                          +{formatINR(day.inflows, language)}
                        </td>
                        <td className="py-2 px-3 text-rose-800">
                          -{formatINR(day.outflows, language)}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {formatINR(day.closing_balance, language)}
                        </td>
                        <td className="py-2 px-3">
                          {day.reserve_gap > 0
                            ? formatINR(day.reserve_gap, language)
                            : "₹0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Main Dated Obligations Driving the Projection + Assumptions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900">
              Main Dated Obligations & Drivers ({scenarioResult.major_drivers.length})
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            These scheduled lump-sum payments and shocks have the largest impact on your projected
            minimum balance:
          </p>
          <div className="mt-4 space-y-2.5">
            {scenarioResult.major_drivers.map((driver, idx) => (
              <div
                key={`${driver.flow_id}-${driver.date}-${idx}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-950">
                      {formatDisplayDate(driver.date, language)}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{driver.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{driver.impact_note}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-rose-800">
                  -{formatINR(driver.amount, language)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-indigo-900" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900">
              Projection Assumptions & Uncertainty Notes
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            A projected shortfall is conditional on the assumptions below, never a fixed credit
            score or guaranteed outcome:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-700">
            {scenarioResult.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
