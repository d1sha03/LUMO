import type { LumoLanguage } from "../types/lumo.js";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const UNKNOWN_LABELS: Record<LumoLanguage, string> = {
  "en-IN": "Unknown (not set)",
  "hi-IN": "अज्ञात (दर्ज नहीं)",
  "pa-IN": "ਅਣਜਾਣ (ਦਰਜ ਨਹੀਂ)",
};

/**
 * Formats an INR amount using Indian numbering conventions (e.g., ₹1,500; ₹1,25,000).
 * CRITICAL RULE: Never silently converts null or undefined into ₹0.
 */
export function formatINR(
  value: number | null | undefined,
  language: LumoLanguage = "en-IN",
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return UNKNOWN_LABELS[language] ?? UNKNOWN_LABELS["en-IN"];
  }
  if (value < 0) {
    return `-${inrFormatter.format(Math.abs(Math.round(value)))}`;
  }
  return inrFormatter.format(Math.round(value));
}

export function formatSignedINR(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "₹0";
  const sign = rounded > 0 ? "+" : "-";
  return `${sign}${inrFormatter.format(Math.abs(rounded))}`;
}

export function formatIndianNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

export function formatConfidence(confidence: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return `${pct}%`;
}

/**
 * Parses an ISO YYYY-MM-DD date into year, month (1-12), day (1-31)
 * without browser timezone offset issues.
 */
export function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return {
    year: y || 2026,
    month: m || 1,
    day: d || 1,
  };
}

export function toISODate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDaysISO(isoDate: string, daysToAdd: number): string {
  const { year, month, day } = parseISODate(isoDate);
  const dt = new Date(Date.UTC(year, month - 1, day + daysToAdd));
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function diffDaysISO(startIso: string, endIso: string): number {
  const a = parseISODate(startIso);
  const b = parseISODate(endIso);
  const utcA = Date.UTC(a.year, a.month - 1, a.day);
  const utcB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Formats an ISO YYYY-MM-DD date for display in Asia/Kolkata calendar semantics.
 */
export function formatDisplayDate(
  isoDate: string | null | undefined,
  language: LumoLanguage = "en-IN",
): string {
  if (!isoDate) return "None";
  const { year, month, day } = parseISODate(isoDate);
  const dt = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
  try {
    return new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(dt);
  } catch {
    return isoDate;
  }
}

export function formatShortDate(
  isoDate: string | null | undefined,
  language: LumoLanguage = "en-IN",
): string {
  if (!isoDate) return "—";
  const { year, month, day } = parseISODate(isoDate);
  const dt = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
  try {
    return new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    }).format(dt);
  } catch {
    return isoDate;
  }
}
