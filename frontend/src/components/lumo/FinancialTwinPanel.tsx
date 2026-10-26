import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  Edit3,
  Plus,
  RefreshCw,
  ShieldAlert,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import { SamjhoTrigger } from "@/components/lumo/SamjhoModal";
import type { TrueEarningsResult } from "@/lib/intelligenceApi";
import {
  formatConfidence,
  formatDisplayDate,
  formatINR,
} from "@/lib/format";
import {
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  SOURCE_TYPE_LABELS,
  tr,
} from "@/lib/i18n";
import type {
  CashFlow,
  CashFlowCategory,
  CashFlowDirection,
  CashFlowFrequency,
  ExplainTermKey,
  FinancialTwin,
  LumoLanguage,
} from "@/types/lumo";

export interface FinancialTwinPanelProps {
  twin: FinancialTwin;
  language: LumoLanguage;
  onSaveTwin: (updatedTwin: FinancialTwin) => Promise<void>;
  onOpenSamjho: (termKey: ExplainTermKey) => void;
  isSimulating: boolean;
  dailyEarnings?: TrueEarningsResult["daily"] | null;
}

const ALL_CATEGORIES: CashFlowCategory[] = [
  "business_sales",
  "business_stock_cost",
  "business_operating_cost",
  "supplier_payment",
  "debt_repayment",
  "household_essential",
  "household_discretionary",
  "savings_goal",
  "other",
];

export function FinancialTwinPanel({
  twin,
  language,
  onSaveTwin,
  onOpenSamjho,
  isSimulating,
  dailyEarnings,
}: FinancialTwinPanelProps) {
  const [draft, setDraft] = useState<FinancialTwin>(twin);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  // Sync local draft when parent twin changes (e.g. from Intake or Load Demo Scenario)
  useEffect(() => {
    setDraft(twin);
  }, [twin]);

  const lowConfidenceFlows = draft.cash_flows.filter((f) => f.confidence < 0.8);
  const hasUnknownEssentials =
    draft.cash_on_hand === null || draft.minimum_reserve === null;

  const handleSave = async () => {
    await onSaveTwin(draft);
    setEditingFlowId(null);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const updateFlow = (id: string, patch: Partial<CashFlow>) => {
    setDraft((prev) => ({
      ...prev,
      cash_flows: prev.cash_flows.map((f) =>
        f.id === id
          ? {
              ...f,
              ...patch,
              source_type: "manual_entry",
              confidence: 1.0,
            }
          : f,
      ),
    }));
  };

  const deleteFlow = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      cash_flows: prev.cash_flows.filter((f) => f.id !== id),
    }));
  };

  const addNewFlow = () => {
    const newId = `cf_manual_${Date.now().toString().slice(-4)}`;
    const newFlow: CashFlow = {
      id: newId,
      label: "New expense or payment",
      direction: "outflow",
      category: "business_operating_cost",
      amount: 500,
      frequency: "once",
      start_date: draft.as_of_date,
      confidence: 1.0,
      source_type: "manual_entry",
      source_note: "Added manually in Financial Twin editor",
      essential: true,
    };
    setDraft((prev) => ({
      ...prev,
      cash_flows: [...prev.cash_flows, newFlow],
    }));
    setEditingFlowId(newId);
  };

  return (
    <div className="space-y-6">
      {/* Header & Save Bar */}
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-950">
              <Wallet className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
              Step 2 · Structured Livelihood Twin (v{draft.schema_version})
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
              {draft.twin_id}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              As of {formatDisplayDate(draft.as_of_date, language)} · {draft.forecast_days}d horizon
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Review & Correct Your Financial Twin
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Occupation:{" "}
            <strong className="font-semibold text-slate-800">
              {draft.profile.occupation.replace(/_/g, " ")}
            </strong>
            {draft.profile.district ? ` · ${draft.profile.district}` : ""}
            {draft.profile.state ? `, ${draft.profile.state}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {savedBanner && (
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900"
            >
              <Check className="h-3.5 w-3.5" />
              Twin updated & recalculated
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSimulating}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSimulating ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{tr("action.saveTwin", language)}</span>
          </button>
        </div>
      </div>

      {/* Warning Banner for Unknown (`null`) or Low-Confidence Values */}
      {(hasUnknownEssentials || lowConfidenceFlows.length > 0) && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-4 text-sm text-amber-950"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-bold">
                Unknown or Low-Confidence Information Requires Attention
              </p>
              {draft.cash_on_hand === null && (
                <p className="text-xs">
                  • <strong>Cash available now (`cash_on_hand`)</strong> is{" "}
                  <code className="rounded bg-amber-100 px-1 font-mono">null</code> (Unknown). LUMO
                  never silently converts unknown values to ₹0. Enter a value below and click Save &
                  Recalculate.
                </p>
              )}
              {draft.minimum_reserve === null && (
                <p className="text-xs">
                  • <strong>Minimum safety reserve (`minimum_reserve`)</strong> is{" "}
                  <code className="rounded bg-amber-100 px-1 font-mono">null</code> (Unknown). Please
                  set your emergency buffer below.
                </p>
              )}
              {lowConfidenceFlows.length > 0 && (
                <p className="text-xs">
                  • <strong>{lowConfidenceFlows.length} flow(s)</strong> have extraction confidence
                  below 80% ({lowConfidenceFlows.map((f) => f.label).join(", ")}). Please review and
                  confirm them.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash Position & Daily Business Breakdown Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 1. Cash Available Now */}
        <div
          className={`rounded-2xl border p-4 shadow-2xs ${
            draft.cash_on_hand === null
              ? "border-amber-400 bg-amber-50/50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Cash available now
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              cash_on_hand
            </span>
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-bold ${
              draft.cash_on_hand === null ? "text-amber-800" : "text-slate-900"
            }`}
          >
            {formatINR(draft.cash_on_hand, language)}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              aria-label="Cash available now in INR"
              value={draft.cash_on_hand === null ? "" : draft.cash_on_hand}
              placeholder="Unknown (null)"
              onChange={(e) => {
                const raw = e.target.value;
                setDraft((prev) => ({
                  ...prev,
                  cash_on_hand: raw === "" ? null : Math.max(0, Number(raw)),
                }));
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, cash_on_hand: null }))}
              title="Set cash_on_hand to null (unknown) to test validation"
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            >
              Set null
            </button>
          </div>
        </div>

        {/* 2. Minimum Safety Reserve */}
        <div
          className={`rounded-2xl border p-4 shadow-2xs ${
            draft.minimum_reserve === null
              ? "border-amber-400 bg-amber-50/50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Minimum safety reserve
            </span>
            <SamjhoTrigger
              termKey="minimum_reserve"
              language={language}
              onOpenTerm={onOpenSamjho}
              compact
            />
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-bold ${
              draft.minimum_reserve === null ? "text-amber-800" : "text-indigo-950"
            }`}
          >
            {formatINR(draft.minimum_reserve, language)}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              aria-label="Minimum safety reserve in INR"
              value={draft.minimum_reserve === null ? "" : draft.minimum_reserve}
              placeholder="Unknown (null)"
              onChange={(e) => {
                const raw = e.target.value;
                setDraft((prev) => ({
                  ...prev,
                  minimum_reserve: raw === "" ? null : Math.max(0, Number(raw)),
                }));
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, minimum_reserve: null }))}
              title="Set minimum_reserve to null (unknown) to test validation"
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            >
              Set null
            </button>
          </div>
        </div>

        {/* 3. Daily Gross Sales vs Stock/Operating Costs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Daily Gross Sales
            </span>
            <SamjhoTrigger
              termKey="gross_sales"
              language={language}
              onOpenTerm={onOpenSamjho}
              compact
            />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-800">
            {formatINR(dailyEarnings?.gross ?? null, language)}
            <span className="text-xs font-normal text-slate-500"> /day</span>
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Stock cost: <strong>{formatINR(dailyEarnings?.inventory ?? null, language)}</strong> · Stall ops:{" "}
            <strong>{formatINR(dailyEarnings?.other_work_costs ?? null, language)}</strong>
          </p>
        </div>

        {/* 4. Net Operating Cash (Distinct from Gross Sales) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Net Operating Cash
            </span>
            <SamjhoTrigger
              termKey="net_operating_cash"
              language={language}
              onOpenTerm={onOpenSamjho}
              compact
            />
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-bold ${
              dailyEarnings?.estimated_net == null ? "text-slate-500" : dailyEarnings.estimated_net >= 0 ? "text-slate-900" : "text-rose-700"
            }`}
          >
            {formatINR(dailyEarnings?.estimated_net ?? null, language)}
            <span className="text-xs font-normal text-slate-500"> /day</span>
          </p>
          <p className="mt-2 text-xs text-slate-600">
            {dailyEarnings?.note ?? "No Workstream E earnings estimate is available."}
          </p>
        </div>
      </div>

      {/* Cash Flows Table with Provenance & Inline Correction */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cash Flows, Supplier Dues, Debts & Household Expenses ({draft.cash_flows.length})
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Revenue (`business_sales`), stock costs (`business_stock_cost`), operating expenses
              (`business_operating_cost`), supplier dues (`supplier_payment`), and debts
              (`debt_repayment`) are stored as separate cash movements. Click any row to edit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SamjhoTrigger
              termKey="supplier_credit"
              label="Explain Supplier Credit"
              language={language}
              onOpenTerm={onOpenSamjho}
            />
            <SamjhoTrigger
              termKey="debt_repayment"
              label="Explain Debt Kist"
              language={language}
              onOpenTerm={onOpenSamjho}
            />
            <button
              type="button"
              onClick={addNewFlow}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-900/20 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-950 hover:bg-indigo-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Cash Flow</span>
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {draft.cash_flows.map((flow) => {
            const isEditing = editingFlowId === flow.id;
            const isLowConf = flow.confidence < 0.8;

            return (
              <div
                key={flow.id}
                className={`rounded-xl border p-4 transition ${
                  isLowConf
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-slate-200 bg-slate-50/50 hover:bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                          flow.direction === "inflow"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {flow.direction}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{flow.label}</span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-950">
                        {CATEGORY_LABELS[flow.category]?.[language] ?? flow.category}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs text-slate-600 shadow-2xs">
                        <Calendar className="h-3 w-3 text-amber-600" aria-hidden="true" />
                        {FREQUENCY_LABELS[flow.frequency]?.[language]} · starts{" "}
                        {formatDisplayDate(flow.start_date, language)}
                      </span>
                    </div>

                    {/* Provenance & Confidence */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                        {SOURCE_TYPE_LABELS[flow.source_type]?.[language] ?? flow.source_type}
                      </span>
                      {flow.source_note && (
                        <span className="italic text-slate-500">“{flow.source_note}”</span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${
                          isLowConf
                            ? "bg-amber-200 text-amber-950"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {isLowConf && <ShieldAlert className="h-3 w-3" aria-hidden="true" />}
                        Extraction confidence: {formatConfidence(flow.confidence)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-lg font-bold ${
                        flow.direction === "inflow" ? "text-emerald-800" : "text-slate-900"
                      }`}
                    >
                      {flow.direction === "inflow" ? "+" : "-"}
                      {formatINR(flow.amount, language)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingFlowId(isEditing ? null : flow.id)}
                      aria-label={`Edit ${flow.label}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isEditing ? "Done" : "Edit"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFlow(flow.id)}
                      aria-label={`Remove ${flow.label}`}
                      className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Label
                      </label>
                      <input
                        type="text"
                        value={flow.label}
                        onChange={(e) => updateFlow(flow.id, { label: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Amount (₹ INR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={flow.amount}
                        onChange={(e) =>
                          updateFlow(flow.id, {
                            amount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Direction & Category
                      </label>
                      <select
                        value={`${flow.direction}:${flow.category}`}
                        onChange={(e) => {
                          const [dir, cat] = e.target.value.split(":") as [
                            CashFlowDirection,
                            CashFlowCategory,
                          ];
                          updateFlow(flow.id, { direction: dir, category: cat });
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                      >
                        <option value="inflow:business_sales">Inflow · Business gross sales</option>
                        <option value="inflow:other">Inflow · Other income</option>
                        {ALL_CATEGORIES.filter((c) => c !== "business_sales").map((cat) => (
                          <option key={cat} value={`outflow:${cat}`}>
                            Outflow · {CATEGORY_LABELS[cat]["en-IN"]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Frequency
                      </label>
                      <select
                        value={flow.frequency}
                        onChange={(e) =>
                          updateFlow(flow.id, {
                            frequency: e.target.value as CashFlowFrequency,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="once">Once (Dated)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Start / Due Date
                      </label>
                      <input
                        type="date"
                        value={flow.start_date}
                        onChange={(e) => updateFlow(flow.id, { start_date: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Goals Section */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-900">
            Livelihood & Household Goals ({draft.goals.length})
          </h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {draft.goals.map((goal) => {
            return (
              <div
                key={goal.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-950 uppercase">
                      {goal.priority}
                    </span>
                    <h4 className="mt-1.5 text-sm font-bold text-slate-900">{goal.label}</h4>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-slate-900">
                      {goal.current_saved == null
                        ? "Current savings not provided"
                        : formatINR(goal.current_saved, language)}
                      {" / "}
                      {formatINR(goal.target_amount, language)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Target: {formatDisplayDate(goal.target_date, language)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
