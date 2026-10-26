import {
  AlertCircle,
  CheckSquare,
  ExternalLink,
  Landmark,
  Loader2,
} from "lucide-react";
import type { LumoLanguage, OfficialResourceItem } from "@/types/lumo";

export interface ResourcesPanelProps {
  resources: OfficialResourceItem[];
  isLoading: boolean;
  error: string | null;
  language: LumoLanguage;
  occupation?: string;
  state?: string;
}

export function ResourcesPanel({
  resources,
  isLoading,
  error,
  occupation,
  state,
}: ResourcesPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-950">
              <Landmark className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
              Official Indian Resources (`GET /api/resources`)
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Source-Linked Public Programmes & Financial Protection
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Curated directory candidates associated in LUMO's local catalog with{" "}
              <strong className="font-semibold text-slate-800">
                {(occupation || "street_vendor").replace(/_/g, " ")}
              </strong>
              {state ? ` in ${state}` : ""}. This is not an eligibility decision.
              LUMO has not verified scheme benefits or individual eligibility; check
              current details on the official portal.
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
        >
          <Loader2 className="h-4 w-4 animate-spin text-indigo-900" />
          <span>Loading official resources from `/api/resources`…</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-900"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Could not load official resources</p>
            <p className="mt-0.5 text-xs text-rose-800">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-5 lg:grid-cols-2">
          {resources.map((item) => (
            <article
              key={item.id}
              className="surface-card surface-interactive flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-900/30 sm:p-6"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-[11px] font-semibold text-indigo-900">
                      ID: {item.id}
                    </span>
                    <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                      {item.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                    Unverified directory candidate
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Catalog association (not eligibility evidence)
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800">
                    {item.why_relevant} {item.relevance_basis}
                  </p>
                </div>

                {item.source_excerpt && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                    <p className="text-xs font-bold tracking-wider text-emerald-900 uppercase">
                      Retrieved page metadata only{item.source_page_title ? ` · ${item.source_page_title}` : ""}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-950">{item.source_excerpt}</p>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Eligibility to verify
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {item.eligibility_summary}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700">{item.benefit_summary}</p>
                </div>

                {item.requirements_to_verify.length > 0 && (
                  <div>
                    <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                      Documents & details to check
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {item.requirements_to_verify.map((req, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-slate-700"
                        >
                          <CheckSquare
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                            aria-hidden="true"
                          />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] text-slate-500 italic">
                  <strong>Disclaimer:</strong> {item.disclaimer}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-500">
                    {item.source_status === "source_retrieved"
                      ? `Page metadata retrieved${item.source_checked_at ? ` · ${new Date(item.source_checked_at).toLocaleDateString()}` : ""}`
                      : `Official page not retrieved (${item.source_status.replace(/_/g, " ")})`}
                  </span>
                  <a
                    href={item.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-900"
                  >
                    <span>Open Official Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
