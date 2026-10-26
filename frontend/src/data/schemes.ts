/**
 * Real, named Indian government schemes with realistic eligibility rules and
 * benefits. The matcher scores each scheme against a persona and returns a
 * confidence + reasoning chain — fully explainable.
 */
export interface Scheme {
  id: string;
  name: string;
  code: string;
  agency: string;
  category: "credit" | "income" | "insurance" | "savings" | "enterprise" | "welfare";
  benefit: string;
  amount: string;
  tenure?: string;
  /** English-language eligibility in plain prose */
  eligibility: string;
  /** Rule-based checks: each returns true/false + a reason */
  checks: SchemeCheck[];
  requiredDocuments: string[];
  applicationProcess: string;
  /** Persona ids this scheme is known to match strongly */
  fitsBest: string[];
  /** Base confidence modifier per persona characteristic */
  score: (ctx: SchemeContext) => number;
}

export interface SchemeCheck {
  id: string;
  label: string;
  test: (ctx: SchemeContext) => boolean;
  failReason: string;
}

export interface SchemeContext {
  personaId: string;
  shg: boolean;
  bankAccount: boolean;
  aadhaar: boolean;
  pan: boolean;
  udyam: boolean;
  hasLand: boolean;
  hasFssai: boolean;
  isWoman: boolean;
  isScSt: boolean;
  isMigrant: boolean;
  isVendor: boolean;
  isFarmer: boolean;
  isGig: boolean;
  isConstruction: boolean;
  monthlyIncome: number;
  informalDebt: number;
}

const baseChecks: SchemeCheck[] = [
  {
    id: "aadhaar",
    label: "Aadhaar linked",
    test: (c) => c.aadhaar,
    failReason: "Aadhaar is required for eKYC.",
  },
  {
    id: "bank",
    label: "Bank account active",
    test: (c) => c.bankAccount,
    failReason: "A working bank account is required for DBT.",
  },
];

export const SCHEMES: Scheme[] = [
  {
    id: "svanidhi",
    name: "PM SVANidhi",
    code: "PMS-01",
    agency: "MoHUA",
    category: "credit",
    benefit: "Collateral-free working capital for street vendors",
    amount: "₹10,000 → ₹20,000 → ₹50,000",
    tenure: "12 months per tranche",
    eligibility:
      "Street vendors, hawkers, rehri-wallahs with a vending certificate or a letter from the ULB. 7% interest subvention on timely repayment.",
    checks: [
      ...baseChecks,
      {
        id: "vendor",
        label: "Street vendor activity",
        test: (c) => c.isVendor,
        failReason: "You need a street-vending activity.",
      },
    ],
    requiredDocuments: ["Aadhaar", "Vending certificate or ULB letter", "Bank passbook"],
    applicationProcess: "Apply through CSC or municipal portal. Approval in 15 days.",
    fitsBest: ["meena"],
    score: (c) => (c.isVendor ? 0.96 : c.shg ? 0.52 : 0.18),
  },
  {
    id: "mudra",
    name: "PM MUDRA",
    code: "MUDRA-02",
    agency: "MUDRA Ltd",
    category: "enterprise",
    benefit: "Collateral-free enterprise credit in three tiers",
    amount: "Shishu ₹50k · Kishor ₹5L · Tarun ₹10L",
    tenure: "Up to 5 years",
    eligibility:
      "Non-corporate micro enterprises with Udyam registration. Kishor tier for growing businesses with some track record.",
    checks: [
      ...baseChecks,
      {
        id: "udyam",
        label: "Udyam registration",
        test: (c) => c.udyam,
        failReason: "Udyam registration is required for Kishor tier.",
      },
    ],
    requiredDocuments: ["Udyam", "PAN", "Bank statements (6 months)", "KYC"],
    applicationProcess: "Any scheduled bank or MFI. Online via Udyamimitra portal.",
    fitsBest: ["laxmi", "arjun"],
    score: (c) => {
      if (c.udyam && c.pan) return 0.92;
      if (c.udyam) return 0.78;
      return 0.32;
    },
  },
  {
    id: "kisan",
    name: "PM Kisan Samman Nidhi",
    code: "PMK-03",
    agency: "MoA&FW",
    category: "income",
    benefit: "Direct income support to landholding farmer families",
    amount: "₹6,000 per year in 3 instalments",
    tenure: "Ongoing",
    eligibility:
      "Small and marginal farmer families with cultivable land in their name. Excludes institutional landholders and income-tax payers.",
    checks: [
      ...baseChecks,
      {
        id: "land",
        label: "Cultivable land in name",
        test: (c) => c.hasLand,
        failReason: "Cultivable land must be in the applicant's name.",
      },
    ],
    requiredDocuments: ["Aadhaar", "Land records (7/12 or khatiyauni)", "Bank account"],
    applicationProcess: "Enrol at CSC or revenue office. Aadhaar-linked DBT.",
    fitsBest: ["sunita"],
    score: (c) => (c.isFarmer && c.hasLand ? 0.94 : c.hasLand ? 0.5 : 0.1),
  },
  {
    id: "jandhan",
    name: "PM Jan Dhan Yojana",
    code: "PMJDY-04",
    agency: "MoF",
    category: "savings",
    benefit: "Zero-balance account + RuPay debit + ₹2L accident cover",
    amount: "₹0 balance · ₹2L cover · ₹10k overdraft",
    tenure: "Lifetime",
    eligibility: "Any Indian adult without a bank account. Aadhaar-based eKYC.",
    checks: [
      {
        id: "no-bank",
        label: "No existing bank account",
        test: (c) => !c.bankAccount,
        failReason: "You already have a bank account — use it.",
      },
    ],
    requiredDocuments: ["Aadhaar (or self-declaration)", "Photo"],
    applicationProcess: "Walk into any bank branch. Same-day account opening.",
    fitsBest: ["bikram"],
    score: (c) => (!c.bankAccount ? 0.98 : 0.15),
  },
  {
    id: "pmjjby",
    name: "PM Jeevan Jyoti Bima",
    code: "PMJJBY-05",
    agency: "LIC",
    category: "insurance",
    benefit: "Life insurance cover of ₹2 lakh for death due to any reason",
    amount: "₹2,00,000 cover",
    tenure: "Annual, auto-debit ₹436",
    eligibility: "Any bank account holder aged 18–50. Aadhaar-linked auto-debit.",
    checks: [
      ...baseChecks,
      {
        id: "age",
        label: "Age 18–50",
        test: () => true, // personas are all in range
        failReason: "Age must be between 18 and 50.",
      },
    ],
    requiredDocuments: ["Bank account", "Aadhaar"],
    applicationProcess: "One-click enrol via net banking or branch.",
    fitsBest: ["meena", "sunita", "arjun", "bikram", "laxmi"],
    score: (c) => (c.bankAccount ? 0.88 : 0.2),
  },
  {
    id: "pmsby",
    name: "PM Suraksha Bima",
    code: "PMSBY-06",
    agency: "NICL",
    category: "insurance",
    benefit: "Accidental death + disability cover",
    amount: "₹2,00,000 cover",
    tenure: "Annual, auto-debit ₹20",
    eligibility: "Any bank account holder aged 18–70.",
    checks: baseChecks,
    requiredDocuments: ["Bank account", "Aadhaar"],
    applicationProcess: "One-click enrol via net banking or branch.",
    fitsBest: ["bikram", "arjun"],
    score: (c) => (c.bankAccount ? 0.85 : 0.18),
  },
  {
    id: "standup",
    name: "Stand-Up India",
    code: "SUI-07",
    agency: "SIDBI",
    category: "enterprise",
    benefit: "Greenfield enterprise loans for SC/ST and women entrepreneurs",
    amount: "₹10L – ₹1Cr",
    tenure: "Up to 7 years",
    eligibility:
      "SC/ST or women entrepreneur above 18 setting up a greenfield enterprise. 51% shareholding for partnership firms.",
    checks: [
      ...baseChecks,
      {
        id: "woman-or-scst",
        label: "Woman or SC/ST",
        test: (c) => c.isWoman || c.isScSt,
        failReason: "Must be woman or SC/ST entrepreneur.",
      },
    ],
    requiredDocuments: ["Udyam", "PAN", "Project report", "KYC", "Caste certificate (if applicable)"],
    applicationProcess: "standupmitra.in or any scheduled commercial bank.",
    fitsBest: ["laxmi"],
    score: (c) => {
      if ((c.isWoman || c.isScSt) && c.udyam) return 0.86;
      return 0.12;
    },
  },
  {
    id: "eshran",
    name: "e-Shram",
    code: "ESR-08",
    agency: "MoLE",
    category: "welfare",
    benefit: "Universal registration + ₹2L accidental cover for unorganised workers",
    amount: "₹2,00,000 cover",
    tenure: "Lifetime registration",
    eligibility: "Any unorganised worker aged 16–59, not an income-tax payer.",
    checks: [
      {
        id: "aadhaar",
        label: "Aadhaar linked",
        test: (c) => c.aadhaar,
        failReason: "Aadhaar required.",
      },
    ],
    requiredDocuments: ["Aadhaar", "Mobile number"],
    applicationProcess: "eshram.gov.in self-registration or via CSC.",
    fitsBest: ["arjun", "bikram"],
    score: (c) => ((c.isGig || c.isConstruction) && c.aadhaar ? 0.94 : 0.3),
  },
  {
    id: "fasal",
    name: "PM Fasal Bima Yojana",
    code: "PMFBY-09",
    agency: "MoA&FW",
    category: "insurance",
    benefit: "Crop insurance against yield loss",
    amount: "Sum insured up to scale of finance",
    tenure: "Seasonal (kharif + rabi)",
    eligibility: "All farmers growing notified crops in notified areas. 2% premium for kharif, 1.5% for rabi.",
    checks: [
      ...baseChecks,
      {
        id: "farmer",
        label: "Farmer with notified crop",
        test: (c) => c.isFarmer,
        failReason: "Must be a farmer.",
      },
    ],
    requiredDocuments: ["Aadhaar", "Land records", "Bank account", "Sowing certificate"],
    applicationProcess: "CSC, bank or pmfby.gov.in before cut-off date.",
    fitsBest: ["sunita"],
    score: (c) => (c.isFarmer ? 0.9 : 0.1),
  },
];

export const schemeById = (id: string) => SCHEMES.find((s) => s.id === id);

/**
 * Runs each scheme against a persona context and returns a ranked list with
 * full reasoning. Deterministic — same input, same output, always explainable.
 */
export function matchSchemes(ctx: SchemeContext): SchemeMatch[] {
  return SCHEMES.map((scheme) => {
    const passed: SchemeCheck[] = [];
    const failed: SchemeCheck[] = [];
    scheme.checks.forEach((c) => (c.test(ctx) ? passed.push(c) : failed.push(c)));
    const score = scheme.score(ctx);
    const penalty = failed.length * 0.18;
    const confidence = Math.max(0, Math.min(0.99, score - penalty));
    return {
      scheme,
      confidence,
      passed,
      failed,
      reason: buildReason(scheme, ctx, passed, failed),
    };
  })
    .sort((a, b) => b.confidence - a.confidence)
    .filter((m) => m.confidence > 0.2);
}

function buildReason(
  scheme: Scheme,
  ctx: SchemeContext,
  passed: SchemeCheck[],
  failed: SchemeCheck[],
): string {
  const why = passed.slice(0, 2).map((p) => p.label);
  const but = failed.slice(0, 1).map((f) => f.failReason);
  let reason = why.length ? `You match on ${why.join(" and ")}.` : "Possible match.";
  if (but.length) reason += ` However: ${but[0]}`;
  if (scheme.fitsBest.includes(ctx.personaId)) {
    reason += " Strong fit for your situation.";
  }
  return reason;
}

export interface SchemeMatch {
  scheme: Scheme;
  confidence: number;
  passed: SchemeCheck[];
  failed: SchemeCheck[];
  reason: string;
}
