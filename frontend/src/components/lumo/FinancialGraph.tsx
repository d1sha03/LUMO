import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import type { FinancialTwin } from "@/types/lumo";
import type { FinancialProfile } from "@/lib/intelligenceApi";
import { formatINR } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/i18n";

export function FinancialGraph({
  twin,
  profile,
  debtMonthlyPayment,
  language,
}: {
  twin: FinancialTwin;
  profile: FinancialProfile | null;
  debtMonthlyPayment: number | null;
  language: "en-IN" | "hi-IN" | "pa-IN";
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const nodes = useMemo(() => [
    { id: "sales", label: "DAILY GROSS SALES", kind: "business_sales" as const, x: 48, y: 117, value: formatINR(profile?.business?.gross_daily_revenue, language) },
    { id: "other", label: "OTHER INCOME", kind: "other" as const, x: 198, y: 117, value: "Not yet known" },
    { id: "stock", label: "DAILY INVENTORY", kind: "business_stock_cost" as const, x: 48, y: 234, value: formatINR(profile?.business?.inventory_daily, language) },
    { id: "ops", label: "DAILY WORK COSTS", kind: "business_operating_cost" as const, x: 198, y: 234, value: formatINR(profile?.business?.other_work_costs_daily, language) },
    { id: "home", label: "MONTHLY ESSENTIALS", kind: "household_essential" as const, x: 348, y: 234, value: formatINR(profile?.expenses?.essential_monthly, language) },
    { id: "debt", label: "MONTHLY DEBT", kind: "debt_repayment" as const, x: 498, y: 234, value: formatINR(debtMonthlyPayment, language) },
  ], [profile, debtMonthlyPayment, language]);
  const activeNode = nodes.find((node) => node.id === selected);

  return (
    <div className="livelihood-graph-wrap">
      <div className="livelihood-graph-scroll">
        <svg viewBox="0 0 650 318" role="img" aria-labelledby="life-graph-title life-graph-description" className="livelihood-graph">
          <title id="life-graph-title">Financial profile graph</title>
          <desc id="life-graph-description">Gross sales flow into the business. Stock and operating costs are separate, while household needs and loan payments are shown as distinct obligations.</desc>
          <defs>
            <marker id="life-arrow" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
              <path d="M0,0 L6,4 L0,8" fill="none" stroke="#9d9aa0" strokeWidth="1.2" />
            </marker>
          </defs>
          <path d="M324 70 C324 94 123 86 123 100" className="life-link" markerEnd="url(#life-arrow)" />
          <path d="M324 70 C324 94 273 86 273 100" className="life-link" markerEnd="url(#life-arrow)" />
          <path d="M123 154 C123 184 123 192 123 215" className="life-link" markerEnd="url(#life-arrow)" />
          <path d="M123 154 C148 187 243 182 273 215" className="life-link" markerEnd="url(#life-arrow)" />
          <path d="M273 154 C312 181 390 183 423 215" className="life-link" markerEnd="url(#life-arrow)" />
          <path d="M273 154 C342 179 531 178 573 215" className="life-link" markerEnd="url(#life-arrow)" />
          <g className="life-root">
            <rect x="239" y="22" width="170" height="50" rx="15" />
            <text x="324" y="43" textAnchor="middle" className="life-root-title">INCOME</text>
            <text x="324" y="59" textAnchor="middle" className="life-root-sub">Recorded profile values</text>
          </g>
          {nodes.map((node) => {
            const flow = twin.cash_flows.find((item) => item.category === node.kind);
            const isActive = selected === node.id;
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${node.label}: ${node.value}. Select to inspect source.`}
                onClick={() => setSelected(isActive ? null : node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(isActive ? null : node.id);
                  }
                }}
                className={`life-node ${node.kind === "business_sales" ? "life-node-income" : ""} ${isActive ? "life-node-active" : ""}`}
              >
                <rect x={node.x} y={node.y} width="126" height="54" rx="13" />
                <text x={node.x + 63} y={node.y + 20} textAnchor="middle" className="life-node-label">{node.label}</text>
                <text x={node.x + 63} y={node.y + 39} textAnchor="middle" className="life-node-value">{node.value}</text>
                <title>{flow ? `${flow.label}. ${CATEGORY_LABELS[flow.category][language]}. ${flow.source_note ?? "Source not provided"}` : `${node.label}: not yet recorded.`}</title>
              </g>
            );
          })}
          <g className="life-profit">
            <rect x="239" y="280" width="170" height="28" rx="10" />
            <text x="324" y="299" textAnchor="middle">PROFILE VALUES · SOURCE DETAILS</text>
          </g>
        </svg>
      </div>
      <div className="life-graph-caption">
        <span><ArrowRight size={14} /> Gross sales are kept separate from stock and operating costs.</span>
        <span>Select any node to inspect its source.</span>
      </div>
      {activeNode && (
        <div className="life-node-detail" role="status">
          <div><strong>{activeNode.label}</strong><span>{activeNode.value}</span></div>
          <p>{activeNode.kind === "other" ? "No other income has been recorded." : twin.cash_flows.find((flow) => flow.category === activeNode.kind)?.source_note ?? "This value was not provided; it remains unknown rather than being estimated."}</p>
          <ArrowDown size={14} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}