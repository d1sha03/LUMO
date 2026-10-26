import type { NodeKind } from "@/types";

/**
 * Realistic, fully populated sample personas. Every financial, familial,
 * seasonal and risk attribute feeds the twin engine deterministically — so the
 * demo always produces the same high-quality output for a given persona.
 */
export interface PersonaProfile {
  id: string;
  name: string;
  age: number;
  gender: "F" | "M";
  role: string;
  location: string;
  state: string;
  languages: string[];
  photo: string; // emoji portrait keeps it warm, never stock
  summary: string;
  /** Monthly income streams (cash + UPI + in-kind converted) */
  income: { source: string; monthly: number; stability: number }[];
  expenses: { category: string; monthly: number }[];
  family: { size: number; dependents: number; children: number; elders: number };
  assets: { label: string; value: number; liquid: boolean }[];
  debts: {
    source: string;
    principal: number;
    rateMonthly: number;
    tenureMonths: number;
    formal: boolean;
  }[];
  goals: { label: string; amount: number; months: number; priority: "high" | "mid" | "low" }[];
  /** Monthly multiplier: 1.0 = normal, 0.4 = severe dip, 1.8 = bonanza */
  seasonality: number[];
  social: { shg: boolean; aadhaar: boolean; bankAccount: boolean; pan: boolean; udyam: boolean };
  /** Pre-scripted conversation turns that reveal the twin over time */
  script: PersonaTurn[];
  /** Initial risk profile, updated by the simulator */
  risk: { medical: number; climate: number; income: number; debt: number };
  /** Domains to reveal as each scripted turn lands */
  revealsPerTurn: string[][];
}

export interface PersonaTurn {
  /** what the persona actually says (in their language) */
  text: string;
  lang: string;
  english: string;
  /** what LUMO replies with */
  reply: string;
  replyEnglish: string;
  /** visible pipeline stages */
  stages: PipelineStage[];
  /** nodes that become visible / updated on this turn */
  signals: TurnSignal[];
  /** running confidence 0-1 after this turn */
  confidence: number;
}

export type PipelineStage =
  | "capture"
  | "asr"
  | "entity"
  | "twin"
  | "retrieval"
  | "reasoning"
  | "pathway"
  | "scheme"
  | "explain";

export interface TurnSignal {
  id: string;
  kind: NodeKind;
  label: string;
  detail: string;
  metric?: string;
  /** where it sits on the fibonacci sphere (stable per persona) */
  position: [number, number, number];
  weight: number;
}

/* ────────────────────────────────────────────────────────────
   1 · MEENA — Street vendor, Lucknow
   ──────────────────────────────────────────────────────────── */

const meena: PersonaProfile = {
  id: "meena",
  name: "Meena Devi",
  age: 38,
  gender: "F",
  role: "Street vendor · chaat stall",
  location: "Hazratganj, Lucknow",
  state: "Uttar Pradesh",
  languages: ["hi", "en"],
  photo: "🧕🏽",
  summary:
    "Runs a chaat stall for 14 years. Cash + UPI mix. Informal moneylender at 8% monthly. Daughter's polytechnic fee due in 18 months.",
  income: [
    { source: "Chaat stall", monthly: 14200, stability: 0.78 },
    { source: "Festival catering", monthly: 2800, stability: 0.42 },
  ],
  expenses: [
    { category: "Groceries & LPG", monthly: 4800 },
    { category: "Rent (1-room)", monthly: 3200 },
    { category: "Children's school", monthly: 1600 },
    { category: "Mother's BP medicine", monthly: 900 },
    { category: "Stall supplies", monthly: 2400 },
    { category: "Mobile data", monthly: 250 },
  ],
  family: { size: 5, dependents: 3, children: 2, elders: 1 },
  assets: [
    { label: "Gold earrings", value: 42000, liquid: true },
    { label: "Stall equipment", value: 18000, liquid: false },
    { label: "Savings (cash)", value: 6400, liquid: true },
  ],
  debts: [
    { source: "Moneylender (local)", principal: 18000, rateMonthly: 0.08, tenureMonths: 6, formal: false },
    { source: "SHG group loan", principal: 12000, rateMonthly: 0.016, tenureMonths: 18, formal: true },
  ],
  goals: [
    { label: "Daughter's polytechnic", amount: 92000, months: 18, priority: "high" },
    { label: "Roof repair", amount: 14500, months: 6, priority: "mid" },
    { label: "Stall expansion", amount: 38000, months: 24, priority: "low" },
  ],
  // Jan Dec — monsoon dip Jul-Aug, Diwali spike Nov
  seasonality: [1.0, 0.95, 1.05, 1.1, 1.15, 0.9, 0.62, 0.58, 0.92, 1.1, 2.4, 1.3],
  social: { shg: true, aadhaar: true, bankAccount: true, pan: false, udyam: false },
  risk: { medical: 0.72, climate: 0.55, income: 0.68, debt: 0.82 },
  revealsPerTurn: [
    ["income-0"],
    ["income-0", "expense-3", "season-14"],
    ["income-0", "expense-3", "season-14", "debt-5", "debt-6"],
    ["income-0", "expense-3", "season-14", "debt-5", "debt-6", "family-16", "goal-7"],
    ["income-0", "expense-3", "season-14", "debt-5", "debt-6", "family-16", "goal-7", "asset-19", "scheme-11"],
    ["income-0", "expense-3", "season-14", "debt-5", "debt-6", "family-16", "goal-7", "asset-19", "scheme-11", "scheme-12", "risk-9"],
  ],
  script: [
    {
      text: "मेरा चाट का ठेला है, चौदह साल से चला रही हूँ।",
      lang: "हिन्दी",
      english: "I have a chaat stall — I've been running it for fourteen years.",
      reply: "समझ गई। 14 साल का व्यापार — यह एक मजबूत संकेत है। आपकी मासिक आय कितनी है?",
      replyEnglish: "Got it. 14 years of trade is a strong signal. What is your monthly income?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "income-0",
          kind: "income",
          label: "Daily stall earnings",
          detail: "₹480–540/day average, 26 days/month, cash+UPI mix",
          metric: "₹14.2k/mo",
          position: [2.4, 1.2, 1.1],
          weight: 1.1,
        },
      ],
      confidence: 0.14,
    },
    {
      text: "बारिश के दो महीने में काम आधा हो जाता है, दिवाली पर तीन गुना।",
      lang: "हिन्दी",
      english: "In the two monsoon months work halves; at Diwali it triples.",
      reply: "जुलाई-अगस्त में 62% गिरावट, नवम्बर में 2.4× — seasonality जुड़ गई। खर्चे बताइए।",
      replyEnglish: "July–August −62%, November +2.4× — seasonality added. Tell me your expenses.",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "expense-3",
          kind: "expense",
          label: "Monthly household spend",
          detail: "Groceries, rent, school, medicine, stall supplies, mobile",
          metric: "₹13.1k/mo",
          position: [-2.3, -0.9, 1.4],
          weight: 1.0,
        },
        {
          id: "season-14",
          kind: "season",
          label: "Monsoon dip + Diwali spike",
          detail: "Earnings fall 62% Jul–Aug, rise 2.4× at Diwali week",
          metric: "Jul→Nov",
          position: [1.6, -2.1, -1.0],
          weight: 0.9,
        },
      ],
      confidence: 0.32,
    },
    {
      text: "साहूकार से 18 हज़ार लिया है, 8% महीना। SHG का भी 12 हज़ार है।",
      lang: "हिन्दी",
      english: "I owe the moneylender ₹18k at 8% monthly. I also have a ₹12k SHG loan.",
      reply: "दोनों ऋण जुड़ गए। साहूकार का 8% बहुत महँगा है — 3 महीने में दोगुना होगा। आगे।",
      replyEnglish: "Both debts recorded. The moneylender at 8% is very expensive — it doubles in 3 months. Go on.",
      stages: ["capture", "asr", "entity", "twin", "retrieval"],
      signals: [
        {
          id: "debt-5",
          kind: "debt",
          label: "Moneylender debt",
          detail: "₹18,000 principal at 8% monthly, 6-month horizon, informal",
          metric: "₹18k @ 8%",
          position: [-1.6, 2.0, -1.2],
          weight: 1.15,
        },
        {
          id: "debt-6",
          kind: "debt",
          label: "SHG group loan",
          detail: "₹12,000 at 1.6% monthly, 18-month tenure, on time",
          metric: "₹12k @ 1.6%",
          position: [1.9, 2.2, -0.7],
          weight: 0.8,
        },
      ],
      confidence: 0.56,
    },
    {
      text: "बेटी को पॉलिटेक्निक भेजना है, 18 महीने में 92 हज़ार चाहिए।",
      lang: "हिन्दी",
      english: "I want to send my daughter to polytechnic. I need ₹92,000 in 18 months.",
      reply: "₹92,000 in 18 महीने = ₹5,112/माह। वर्तमान बचत से ₹2,200/माह कम पड़ रहा है। रास्ता खोज रही हूँ।",
      replyEnglish: "₹92,000 in 18 months = ₹5,112/mo. Current surplus falls short by ₹2,200/mo. Searching pathways.",
      stages: ["capture", "asr", "entity", "twin", "reasoning"],
      signals: [
        {
          id: "family-16",
          kind: "family",
          label: "Family of five",
          detail: "Husband, two school-age children, mother-in-law with BP",
          metric: "5 people",
          position: [2.5, -1.5, -1.6],
          weight: 0.88,
        },
        {
          id: "goal-7",
          kind: "goal",
          label: "Daughter's polytechnic",
          detail: "₹92,000 over 18 months, priority: high",
          metric: "18 mo",
          position: [-2.6, 0.4, 1.7],
          weight: 1.2,
        },
      ],
      confidence: 0.74,
    },
    {
      text: "सोने की बालियाँ हैं, 42 हज़ार की। बैंक खाता है पर इस्तेमाल नहीं होता।",
      lang: "हिन्दी",
      english: "I have gold earrings worth ₹42k. A bank account I never use.",
      reply: "Jan Dhan खाता 2022 से निष्क्रिय है — reactivation से ₹2 लाख का बीमा मिल सकता है। सोना emergency reserve है, बेचना नहीं है।",
      replyEnglish: "Jan Dhan dormant since 2022 — reactivating unlocks ₹2L insurance. Gold is an emergency reserve; we won't sell it.",
      stages: ["capture", "asr", "entity", "twin", "scheme"],
      signals: [
        {
          id: "asset-19",
          kind: "asset",
          label: "Gold + dormant Jan Dhan",
          detail: "22g gold pledged once; Jan Dhan dormant since 2022",
          metric: "₹42k",
          position: [0.4, -2.6, 2.1],
          weight: 1.0,
        },
        {
          id: "scheme-11",
          kind: "scheme",
          label: "Jan Dhan reactivation",
          detail: "Dormant account unlocks RuPay + ₹2L insurance + DBT rail",
          metric: "₹2L cover",
          position: [2.8, 0.2, -2.1],
          weight: 0.9,
        },
      ],
      confidence: 0.88,
    },
    {
      text: "कोई सरकारी योजना है मेरे लिए?",
      lang: "हिन्दी",
      english: "Is there any government scheme for me?",
      reply: "तीन मिलीं: PM SVANidhi (₹10k साहूकार बदलने के लिए), PM Kisan (₹6k/साल, unclaimed), Jan Dhan (₹2L बीमा)। Pathway A की confidence 89% है।",
      replyEnglish: "Three matches: PM SVANidhi (replaces moneylender), PM Kisan (₹6k/yr unclaimed), Jan Dhan (₹2L cover). Pathway A confidence is 89%.",
      stages: ["capture", "asr", "entity", "twin", "retrieval", "scheme", "pathway", "explain"],
      signals: [
        {
          id: "scheme-12",
          kind: "scheme",
          label: "PM SVANidhi",
          detail: "Collateral-free ₹10k → ₹20k for street vendors; 7% interest subvention",
          metric: "₹10k",
          position: [-2.2, -2.2, -0.4],
          weight: 1.1,
        },
        {
          id: "risk-9",
          kind: "risk",
          label: "Informal-debt spiral",
          detail: "8%/month doubles principal every 3 months",
          metric: "high",
          position: [0.0, 2.7, 1.3],
          weight: 1.05,
        },
      ],
      confidence: 0.96,
    },
  ],
};

/* ────────────────────────────────────────────────────────────
   2 · SUNITA — Woman farmer, Vidarbha
   ──────────────────────────────────────────────────────────── */

const sunita: PersonaProfile = {
  id: "sunita",
  name: "Sunita Pawar",
  age: 42,
  gender: "F",
  role: "Smallholder · cotton + soybean",
  location: "Yavatmal, Vidarbha",
  state: "Maharashtra",
  languages: ["mr", "hi"],
  photo: "👩🏽‍🌾",
  summary:
    "3-acre dryland farm, rain-fed. Husband migrant in Pune. Son in 10th. Crop debt + climate risk dominate the year.",
  income: [
    { source: "Cotton (kharif)", monthly: 6500, stability: 0.38 },
    { source: "Soybean (rabi)", monthly: 3800, stability: 0.45 },
    { source: "MGNREGA", monthly: 2200, stability: 0.6 },
    { source: "Husband remittance", monthly: 4000, stability: 0.55 },
  ],
  expenses: [
    { category: "Farm inputs", monthly: 3400 },
    { category: "Household", monthly: 4100 },
    { category: "Son's tuition", monthly: 900 },
    { category: "Loan interest", monthly: 1800 },
  ],
  family: { size: 4, dependents: 2, children: 1, elders: 1 },
  assets: [
    { label: "3-acre dryland", value: 480000, liquid: false },
    { label: "2 buffalo", value: 68000, liquid: false },
    { label: "KCC loan history", value: 0, liquid: false },
  ],
  debts: [
    { source: "Co-op bank (KCC)", principal: 48000, rateMonthly: 0.0075, tenureMonths: 24, formal: true },
    { source: "Input dealer", principal: 22000, rateMonthly: 0.04, tenureMonths: 9, formal: false },
  ],
  goals: [
    { label: "Drip irrigation", amount: 54000, months: 24, priority: "high" },
    { label: "Son's 11–12th", amount: 28000, months: 12, priority: "mid" },
  ],
  seasonality: [0.6, 0.55, 0.7, 0.85, 1.2, 1.35, 1.1, 0.8, 0.9, 1.1, 1.5, 1.4],
  social: { shg: true, aadhaar: true, bankAccount: true, pan: false, udyam: false },
  risk: { medical: 0.45, climate: 0.92, income: 0.78, debt: 0.7 },
  revealsPerTurn: [
    ["income-0"],
    ["income-0", "expense-3", "season-14"],
    ["income-0", "expense-3", "season-14", "debt-5"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19", "scheme-11", "risk-9"],
  ],
  script: [
    {
      text: "तीन एकड़ जमीन है, कपास और सोयाबीन। बारिश पर निर्भर।",
      lang: "मराठी",
      english: "Three acres of land. Cotton and soybean. Dependent on rain.",
      reply: "समझी। 3 एकड़ dryland — climate risk 92%। फसल से आय कितनी?",
      replyEnglish: "Understood. 3 acres dryland — climate risk 92%. What is crop income?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "income-0",
          kind: "income",
          label: "Cotton + soybean",
          detail: "₹6,500 + ₹3,800/mo avg, highly seasonal",
          metric: "₹10.3k/mo",
          position: [2.5, 1.1, 1.0],
          weight: 1.15,
        },
      ],
      confidence: 0.12,
    },
    {
      text: "जून से सितंबर तक कुछ नहीं, अक्टूबर में फसल, मार्च में पैसा।",
      lang: "मराठी",
      english: "Nothing from June–Sept, harvest Oct, cash arrives March.",
      reply: "Seasonality जुड़ गई: जुलाई 55%, मार्च 135%। खर्चे बताइए।",
      replyEnglish: "Seasonality added: July 55%, March 135%. Expenses?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "expense-3",
          kind: "expense",
          label: "Farm + household spend",
          detail: "Inputs, household, tuition, loan interest",
          metric: "₹10.2k/mo",
          position: [-2.2, -1.0, 1.5],
          weight: 1.0,
        },
        {
          id: "season-14",
          kind: "season",
          label: "Kharif-rabi cycle",
          detail: "Zero income Jun–Sept, cash in March post-harvest",
          metric: "Oct–Mar",
          position: [1.7, -2.0, -1.1],
          weight: 1.05,
        },
      ],
      confidence: 0.28,
    },
    {
      text: "कोऑपरेटिव का 48 हज़ार, इनपुट वाले का 22 हज़ार।",
      lang: "मराठी",
      english: "₹48k from the co-op, ₹22k from the input dealer.",
      reply: "दोनों जोड़े गए। इनपुट dealer का 4%/महीना 9 महीने में — जोखिम।",
      replyEnglish: "Both added. Input dealer at 4%/month over 9 months is risky.",
      stages: ["capture", "asr", "entity", "twin", "retrieval"],
      signals: [
        {
          id: "debt-5",
          kind: "debt",
          label: "KCC + input dealer",
          detail: "₹48k formal + ₹22k informal at 4%/month",
          metric: "₹70k",
          position: [-1.5, 2.1, -1.1],
          weight: 1.1,
        },
      ],
      confidence: 0.48,
    },
    {
      text: "बेटे की 11वीं-12वीं, ड्रिप लगाना है।",
      lang: "मराठी",
      english: "Son's 11th-12th, and I want drip irrigation.",
      reply: "दोनों लक्ष्य जुड़ गए। Drip irrigation — climate risk को 40% घटाएगा।",
      replyEnglish: "Both goals added. Drip irrigation cuts climate risk by 40%.",
      stages: ["capture", "asr", "entity", "twin", "reasoning"],
      signals: [
        {
          id: "family-16",
          kind: "family",
          label: "Family of four",
          detail: "Son in 10th, husband migrant in Pune, mother-in-law",
          metric: "4 people",
          position: [2.4, -1.5, -1.5],
          weight: 0.85,
        },
        {
          id: "goal-7",
          kind: "goal",
          label: "Drip irrigation",
          detail: "₹54,000 over 24 months, reduces climate risk 40%",
          metric: "24 mo",
          position: [-2.5, 0.3, 1.8],
          weight: 1.18,
        },
      ],
      confidence: 0.68,
    },
    {
      text: "KCC है, आधार है, SHG में हूँ।",
      lang: "मराठी",
      english: "I have KCC, Aadhaar, and I'm in an SHG.",
      reply: "KCC + SHG = strong formal signal। PM Kisan और Fasal Bima की eligibility बनती है।",
      replyEnglish: "KCC + SHG is a strong formal signal. You're eligible for PM Kisan and Fasal Bima.",
      stages: ["capture", "asr", "entity", "twin", "scheme"],
      signals: [
        {
          id: "asset-19",
          kind: "asset",
          label: "Land + livestock",
          detail: "3 acres + 2 buffalo, no machinery",
          metric: "₹5.5L",
          position: [0.3, -2.5, 2.0],
          weight: 1.0,
        },
        {
          id: "scheme-11",
          kind: "scheme",
          label: "PM Kisan + Fasal Bima",
          detail: "₹6k/yr direct benefit + crop insurance",
          metric: "₹6k + cover",
          position: [2.7, 0.3, -2.0],
          weight: 0.95,
        },
      ],
      confidence: 0.85,
    },
    {
      text: "आगे क्या करूँ?",
      lang: "मराठी",
      english: "What should I do next?",
      reply: "तीन रास्ते: 1) KCC restructure, 2) Drip via PMKSY subsidy, 3) MGNREGA expansion। Pathway 2 confidence 81%।",
      replyEnglish: "Three routes: 1) KCC restructure, 2) Drip via PMKSY subsidy, 3) MGNREGA expansion. Pathway 2 at 81%.",
      stages: ["capture", "asr", "entity", "twin", "retrieval", "scheme", "pathway", "explain"],
      signals: [
        {
          id: "risk-9",
          kind: "risk",
          label: "Climate + crop failure",
          detail: "Rain-fed monoculture, no crop insurance active",
          metric: "very high",
          position: [0.1, 2.8, 1.2],
          weight: 1.15,
        },
      ],
      confidence: 0.92,
    },
  ],
};

/* ────────────────────────────────────────────────────────────
   3 · ARJUN — Gig worker, Bengaluru
   ──────────────────────────────────────────────────────────── */

const arjun: PersonaProfile = {
  id: "arjun",
  name: "Arjun Kumar",
  age: 27,
  gender: "M",
  role: "Gig worker · 4 apps",
  location: "Koramangala, Bengaluru",
  state: "Karnataka",
  languages: ["kn", "en"],
  photo: "🧑🏽‍💻",
  summary:
    "Swiggy + Zomato + Rapido + Urban Company. Four income streams, zero continuity. Wants to buy a bike outright.",
  income: [
    { source: "Food delivery (2 apps)", monthly: 14800, stability: 0.72 },
    { source: "Rapido rides", monthly: 6200, stability: 0.68 },
    { source: "Urban Co tasks", monthly: 3400, stability: 0.42 },
  ],
  expenses: [
    { category: "Room rent (shared)", monthly: 4800 },
    { category: "Fuel + maintenance", monthly: 3200 },
    { category: "Food", monthly: 2800 },
    { category: "Mobile + data", monthly: 550 },
    { category: "Family remittance", monthly: 6000 },
  ],
  family: { size: 1, dependents: 0, children: 0, elders: 0 },
  assets: [
    { label: "Rented bike", value: 0, liquid: false },
    { label: "Smartphone", value: 14000, liquid: false },
    { label: "Savings", value: 8200, liquid: true },
  ],
  debts: [
    { source: "App instant-credit", principal: 9800, rateMonthly: 0.032, tenureMonths: 6, formal: true },
  ],
  goals: [
    { label: "Own a bike", amount: 78000, months: 15, priority: "high" },
    { label: "Emergency fund", amount: 24000, months: 8, priority: "mid" },
  ],
  seasonality: [1.1, 0.95, 1.0, 1.05, 1.15, 0.82, 0.75, 0.78, 1.0, 1.2, 1.35, 1.45],
  social: { shg: false, aadhaar: true, bankAccount: true, pan: false, udyam: false },
  risk: { medical: 0.78, climate: 0.4, income: 0.62, debt: 0.55 },
  revealsPerTurn: [
    ["income-0"],
    ["income-0", "expense-3", "season-14"],
    ["income-0", "expense-3", "season-14", "debt-5"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19", "scheme-11", "risk-9"],
  ],
  script: [
    {
      text: "ನಾನು ನಾಲ್ಕು ಆ್ಯಪ್‌ಗಳಲ್ಲಿ ಕೆಲಸ ಮಾಡ್ತೀನಿ — Swiggy, Zomato, Rapido, Urban Co.",
      lang: "ಕನ್ನಡ",
      english: "I work four apps — Swiggy, Zomato, Rapido, Urban Co.",
      reply: "ನಾಲ್ಕು streams — diversification ಒಳ್ಳೆಯದು, ಆದರೆ ಒಂದೂ continuous ಇಲ್ಲ. ತಿಂಗಳ ಆದಾಯ ಹೇಳಿ.",
      replyEnglish: "Four streams — diversified, but none continuous. What's monthly income?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "income-0",
          kind: "income",
          label: "Multi-app gig income",
          detail: "₹24.4k/mo across 4 platforms, no single employer",
          metric: "₹24.4k/mo",
          position: [2.3, 1.0, 1.2],
          weight: 1.1,
        },
      ],
      confidence: 0.15,
    },
    {
      text: "ಮಳೆ ಬಂದ್ರೆ ಆರ್ಡರ್ ಬರೋಲ್ಲ, ದೀಪಾವಳಿ ಸಮಯ ಜಾಸ್ತಿ.",
      lang: "ಕನ್ನಡ",
      english: "When it rains orders stop; Diwali time there's more.",
      reply: "Bengaluru monsoon Jul–Aug −22%। ದೀಪಾವಳಿ +35%। ಖರ್ಚು?",
      replyEnglish: "Bengaluru monsoon Jul–Aug −22%, Diwali +35%. Expenses?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "expense-3",
          kind: "expense",
          label: "Living + fuel + remittance",
          detail: "Room, fuel, food, mobile, family remittance",
          metric: "₹17.3k/mo",
          position: [-2.2, -1.0, 1.4],
          weight: 1.0,
        },
        {
          id: "season-14",
          kind: "season",
          label: "Monsoon dip + festive spike",
          detail: "Rain cuts orders 22%; Diwali week +35%",
          metric: "Jul→Nov",
          position: [1.6, -2.0, -1.0],
          weight: 0.92,
        },
      ],
      confidence: 0.34,
    },
    {
      text: "ಆ್ಯಪ್ ಲೋನ್ ಇದೆ 9800, EMI ಮೂರು ತಿಂಗಳಿಂದ ತಪ್ಪಿದೆ.",
      lang: "ಕನ್ನಡ",
      english: "I have an app loan of ₹9,800. I've missed EMI for three months.",
      reply: "3 ತಪ್ಪಿದ EMI — CIBIL hit ಆಗುತ್ತಿದೆ। ಪುನರ್‌ರಚನೆ ಮಾಡೋಣ।",
      replyEnglish: "3 missed EMIs are hitting CIBIL. Let's restructure.",
      stages: ["capture", "asr", "entity", "twin", "retrieval"],
      signals: [
        {
          id: "debt-5",
          kind: "debt",
          label: "App instant-credit",
          detail: "₹9,800 at 3.2%/month, 3 EMIs missed",
          metric: "₹9.8k @ 3.2%",
          position: [-1.6, 2.1, -1.1],
          weight: 1.0,
        },
      ],
      confidence: 0.55,
    },
    {
      text: "ಒಂದು ಬೈಕ್ ಕೊಳ್ಳಬೇಕು, ಇಲ್ಲದಿದ್ದ್ರೆ ಎಲ್ಲಾ ಕೈಬಿಡ್ತದೆ.",
      lang: "ಕನ್ನಡ",
      english: "I need to buy a bike, otherwise everything collapses.",
      reply: "₹78k in 15 ತಿಂಗಳು = ₹5,200/mo। ಸಾಧ್ಯ, ಆದರೆ ಮೊದಲು EMI fix ಮಾಡೋಣ।",
      replyEnglish: "₹78k in 15 months = ₹5,200/mo. Possible, but fix EMI first.",
      stages: ["capture", "asr", "entity", "twin", "reasoning"],
      signals: [
        {
          id: "family-16",
          kind: "family",
          label: "Solo, family in village",
          detail: "Remits ₹6k/mo to parents, no dependents here",
          metric: "Solo",
          position: [2.4, -1.4, -1.5],
          weight: 0.78,
        },
        {
          id: "goal-7",
          kind: "goal",
          label: "Buy a bike outright",
          detail: "₹78,000 in 15 months — replaces rented bike",
          metric: "15 mo",
          position: [-2.5, 0.3, 1.7],
          weight: 1.12,
        },
      ],
      confidence: 0.72,
    },
    {
      text: "ಬ್ಯಾಂಕ್ ಅಕೌಂಟ್ ಇದೆ, PAN ಇಲ್ಲ.",
      lang: "ಕನ್ನಡ",
      english: "I have a bank account, no PAN.",
      reply: "Jan Dhan active — ₹2L cover। PAN ಬೇಕು bike loan ಗೆ।",
      replyEnglish: "Jan Dhan active — ₹2L cover. You'll need PAN for a bike loan.",
      stages: ["capture", "asr", "entity", "twin", "scheme"],
      signals: [
        {
          id: "asset-19",
          kind: "asset",
          label: "Smartphone + Jan Dhan",
          detail: "Device is production asset; account active",
          metric: "₹14k",
          position: [0.3, -2.5, 2.0],
          weight: 0.85,
        },
        {
          id: "scheme-11",
          kind: "scheme",
          label: "Jan Dhan + PMJJBY",
          detail: "₹2L life + ₹2L accident cover at ₹330 + ₹436/yr",
          metric: "₹4L cover",
          position: [2.7, 0.2, -2.1],
          weight: 0.9,
        },
      ],
      confidence: 0.86,
    },
    {
      text: "ಮುಂದೆ ಏನು?",
      lang: "ಕನ್ನಡ",
      english: "What next?",
      reply: "ಮೂರು: 1) EMI restructure, 2) MUDRA bike loan, 3) e-Shram + ESIC। Pathway 2 confidence 76%।",
      replyEnglish: "Three: 1) EMI restructure, 2) MUDRA bike loan, 3) e-Shram + ESIC. Pathway 2 at 76%.",
      stages: ["capture", "asr", "entity", "twin", "retrieval", "scheme", "pathway", "explain"],
      signals: [
        {
          id: "risk-9",
          kind: "risk",
          label: "Health shock, no cover",
          detail: "One accident = zero income, no insurance",
          metric: "high",
          position: [0.0, 2.7, 1.2],
          weight: 1.05,
        },
      ],
      confidence: 0.94,
    },
  ],
};

/* ────────────────────────────────────────────────────────────
   4 · BIKRAM — Migrant worker, Delhi
   ──────────────────────────────────────────────────────────── */

const bikram: PersonaProfile = {
  id: "bikram",
  name: "Bikram Singh",
  age: 34,
  gender: "M",
  role: "Construction · daily wage",
  location: "Noida Sector 62",
  state: "Delhi NCR",
  languages: ["hi", "pa"],
  photo: "👷🏽",
  summary:
    "From Patna, works 22 days/month at ₹680/day. Documents stuck in Bihar. Wants to bring family next year.",
  income: [
    { source: "Construction site", monthly: 14960, stability: 0.62 },
    { source: "Occasional load work", monthly: 2100, stability: 0.35 },
  ],
  expenses: [
    { category: "Room (shared 4)", monthly: 2400 },
    { category: "Food (dhaba)", monthly: 3600 },
    { category: "Mobile + recharge", monthly: 400 },
    { category: "Sent home", monthly: 9000 },
  ],
  family: { size: 5, dependents: 4, children: 3, elders: 0 },
  assets: [
    { label: "Village house", value: 180000, liquid: false },
    { label: "Savings in Bihar", value: 14500, liquid: true },
  ],
  debts: [
    { source: "Agent advance", principal: 12000, rateMonthly: 0.025, tenureMonths: 10, formal: false },
  ],
  goals: [
    { label: "Bring family to Delhi", amount: 45000, months: 12, priority: "high" },
    { label: "Daughter's school admission", amount: 8500, months: 9, priority: "mid" },
  ],
  seasonality: [0.85, 0.9, 1.05, 1.1, 1.15, 0.78, 0.55, 0.6, 0.95, 1.2, 1.1, 0.7],
  social: { shg: false, aadhaar: true, bankAccount: false, pan: false, udyam: false },
  risk: { medical: 0.82, climate: 0.3, income: 0.75, debt: 0.6 },
  revealsPerTurn: [
    ["income-0"],
    ["income-0", "expense-3", "season-14"],
    ["income-0", "expense-3", "season-14", "debt-5"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19", "scheme-11", "risk-9"],
  ],
  script: [
    {
      text: "मैं नोएडा में कंस्ट्रक्शन करता हूँ, पटना से हूँ।",
      lang: "हिन्दी",
      english: "I work construction in Noida, originally from Patna.",
      reply: "समझा। Inter-state migrant — यह एक specific eligibility signal है। रोज़ की मज़दूरी?",
      replyEnglish: "Understood. Inter-state migrant is a specific eligibility signal. Daily wage?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "income-0",
          kind: "income",
          label: "Daily construction wage",
          detail: "₹680/day, 22 days/month, cash weekly",
          metric: "₹14.9k/mo",
          position: [2.4, 1.1, 1.0],
          weight: 1.05,
        },
      ],
      confidence: 0.12,
    },
    {
      text: "बारिश में काम बंद, दीवाली पर 10 दिन छुट्टी।",
      lang: "हिन्दी",
      english: "Work stops in the rains, 10 days off at Diwali.",
      reply: "Jul–Aug −45%, Dec −30%। खर्चे?",
      replyEnglish: "Jul–Aug −45%, Dec −30%. Expenses?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "expense-3",
          kind: "expense",
          label: "Shared living + remittance",
          detail: "Room, food, mobile, ₹9k sent home monthly",
          metric: "₹15.4k/mo",
          position: [-2.2, -1.0, 1.4],
          weight: 1.0,
        },
        {
          id: "season-14",
          kind: "season",
          label: "Monsoon shutdown + festive halt",
          detail: "Construction stops Jul–Aug, 10-day Diwali gap",
          metric: "Jul→Dec",
          position: [1.6, -2.0, -1.0],
          weight: 0.95,
        },
      ],
      confidence: 0.3,
    },
    {
      text: "एजेंट से 12 हज़ार लिया था बिहार से आने के लिए।",
      lang: "हिन्दी",
      english: "I borrowed ₹12k from an agent to come from Bihar.",
      reply: "Agent advance — informal, 2.5%/month। Restructure priority है।",
      replyEnglish: "Agent advance — informal, 2.5%/month. Restructure is a priority.",
      stages: ["capture", "asr", "entity", "twin", "retrieval"],
      signals: [
        {
          id: "debt-5",
          kind: "debt",
          label: "Agent advance",
          detail: "₹12,000 informal, tied to migration",
          metric: "₹12k @ 2.5%",
          position: [-1.6, 2.1, -1.1],
          weight: 1.0,
        },
      ],
      confidence: 0.5,
    },
    {
      text: "बीवी-बच्चों को दिल्ली बुलाना है अगले साल।",
      lang: "हिन्दी",
      english: "I want to bring my wife and kids to Delhi next year.",
      reply: "₹45k in 12 months। वर्तमान बचत से ₹1,300/महीना कम।",
      replyEnglish: "₹45k in 12 months. Current savings fall short by ₹1,300/mo.",
      stages: ["capture", "asr", "entity", "twin", "reasoning"],
      signals: [
        {
          id: "family-16",
          kind: "family",
          label: "Family in Patna",
          detail: "Wife + 3 school-age children, separated 11 months/yr",
          metric: "5 people",
          position: [2.4, -1.4, -1.5],
          weight: 0.9,
        },
        {
          id: "goal-7",
          kind: "goal",
          label: "Bring family to Delhi",
          detail: "₹45,000 in 12 months — rent + deposit + travel",
          metric: "12 mo",
          position: [-2.5, 0.3, 1.7],
          weight: 1.15,
        },
      ],
      confidence: 0.7,
    },
    {
      text: "बैंक खाता नहीं है, आधार है।",
      lang: "हिन्दी",
      english: "No bank account, I have Aadhaar.",
      reply: "Jan Dhan खोलना पहला कदम — 0 balance से शुरू, ₹2L बीमा तुरंत।",
      replyEnglish: "Opening Jan Dhan is step one — zero balance, ₹2L cover immediate.",
      stages: ["capture", "asr", "entity", "twin", "scheme"],
      signals: [
        {
          id: "asset-19",
          kind: "asset",
          label: "Village house + savings",
          detail: "₹1.8L house in Patna, ₹14.5k savings in Bihar",
          metric: "₹1.9L",
          position: [0.3, -2.5, 2.0],
          weight: 0.88,
        },
        {
          id: "scheme-11",
          kind: "scheme",
          label: "Jan Dhan + e-Shram",
          detail: "Zero-balance account + construction worker registration",
          metric: "₹2L + welfare",
          position: [2.7, 0.2, -2.1],
          weight: 1.0,
        },
      ],
      confidence: 0.87,
    },
    {
      text: "आगे क्या?",
      lang: "हिन्दी",
      english: "What next?",
      reply: "तीन रास्ते: 1) Jan Dhan + e-Shram, 2) BOCW welfare, 3) Family migration plan। Pathway 1 confidence 88%।",
      replyEnglish: "Three routes: 1) Jan Dhan + e-Shram, 2) BOCW welfare, 3) Family migration plan. Pathway 1 at 88%.",
      stages: ["capture", "asr", "entity", "twin", "retrieval", "scheme", "pathway", "explain"],
      signals: [
        {
          id: "risk-9",
          kind: "risk",
          label: "On-site injury, no cover",
          detail: "Construction risk, no ESIC, no insurance",
          metric: "very high",
          position: [0.0, 2.7, 1.2],
          weight: 1.12,
        },
      ],
      confidence: 0.95,
    },
  ],
};

/* ────────────────────────────────────────────────────────────
   5 · LAXMI — SHG entrepreneur, Odisha
   ──────────────────────────────────────────────────────────── */

const laxmi: PersonaProfile = {
  id: "laxmi",
  name: "Laxmi Nayak",
  age: 45,
  gender: "F",
  role: "SHG entrepreneur · pickle & papad",
  location: "Koraput, Odisha",
  state: "Odisha",
  languages: ["or", "hi"],
  photo: "👩🏽‍🍳",
  summary:
    "Runs a 12-member SHG making tribal pickles. Perfect repayment record for 7 years. Wants a commercial kitchen.",
  income: [
    { source: "SHG pickle business", monthly: 11400, stability: 0.74 },
    { source: "Local market sales", monthly: 3200, stability: 0.55 },
    { source: "Festival bulk orders", monthly: 4600, stability: 0.4 },
  ],
  expenses: [
    { category: "Raw materials", monthly: 4800 },
    { category: "Household", monthly: 4200 },
    { category: "Packaging", monthly: 1200 },
    { category: "SHG contribution", monthly: 800 },
  ],
  family: { size: 6, dependents: 3, children: 2, elders: 1 },
  assets: [
    { label: "Small kitchen unit", value: 48000, liquid: false },
    { label: "SHG group savings", value: 86000, liquid: true },
    { label: "FSSAI licence", value: 0, liquid: false },
  ],
  debts: [
    { source: "SHG internal loan", principal: 15000, rateMonthly: 0.01, tenureMonths: 12, formal: true },
  ],
  goals: [
    { label: "Commercial kitchen", amount: 145000, months: 30, priority: "high" },
    { label: "Online store setup", amount: 22000, months: 6, priority: "mid" },
  ],
  seasonality: [1.0, 0.95, 1.05, 1.1, 1.0, 0.9, 0.85, 1.0, 1.2, 1.3, 1.9, 1.6],
  social: { shg: true, aadhaar: true, bankAccount: true, pan: true, udyam: true },
  risk: { medical: 0.4, climate: 0.35, income: 0.5, debt: 0.25 },
  revealsPerTurn: [
    ["income-0"],
    ["income-0", "expense-3", "season-14"],
    ["income-0", "expense-3", "season-14", "debt-5"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19", "scheme-11"],
    ["income-0", "expense-3", "season-14", "debt-5", "family-16", "goal-7", "asset-19", "scheme-11", "scheme-12", "risk-9"],
  ],
  script: [
    {
      text: "ଆମ SHG ରେ 12 ଜଣ ମହିଳା, ଆଚାର ଓ ପାପଡ ବନାଉଛୁ।",
      lang: "ଓଡ଼ିଆ",
      english: "Our SHG has 12 women — we make pickles and papads.",
      reply: "SHG + FSSAI + Udyam — strong formal signals। ତିନି ମାସର ଆୟ?",
      replyEnglish: "SHG + FSSAI + Udyam — strong formal signals. Three months of income?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "income-0",
          kind: "income",
          label: "SHG pickle enterprise",
          detail: "₹19.2k/mo from 3 channels, 7-year repayment history",
          metric: "₹19.2k/mo",
          position: [2.5, 1.1, 1.1],
          weight: 1.2,
        },
      ],
      confidence: 0.22,
    },
    {
      text: "ବର୍ଷାରେ କମ, ଦୀପାବଳିରେ ତିନି ଗୁଣ।",
      lang: "ଓଡ଼ିଆ",
      english: "Less in the rains, three times at Diwali.",
      reply: "Jul–Aug −15%, Nov +90%। ଖର୍ଚ୍ଚ?",
      replyEnglish: "Jul–Aug −15%, Nov +90%. Expenses?",
      stages: ["capture", "asr", "entity", "twin"],
      signals: [
        {
          id: "expense-3",
          kind: "expense",
          label: "Raw materials + household",
          detail: "Inputs, packaging, household, SHG contribution",
          metric: "₹11.0k/mo",
          position: [-2.2, -1.0, 1.4],
          weight: 0.95,
        },
        {
          id: "season-14",
          kind: "season",
          label: "Festival-driven demand",
          detail: "Diwali 3×, mild monsoon dip",
          metric: "Nov peak",
          position: [1.6, -2.0, -1.0],
          weight: 0.9,
        },
      ],
      confidence: 0.42,
    },
    {
      text: "SHG ଭିତରୁ 15 ହଜାର ଲୋନ, ସବୁ EMI ଠିକ ସମୟରେ।",
      lang: "ଓଡ଼ିଆ",
      english: "₹15k internal SHG loan, every EMI on time.",
      reply: "7 ବର୍ଷର perfect repayment — ଏହା ଅମୂଲ୍ୟ signal।",
      replyEnglish: "7 years of perfect repayment — this is an invaluable signal.",
      stages: ["capture", "asr", "entity", "twin", "retrieval"],
      signals: [
        {
          id: "debt-5",
          kind: "debt",
          label: "SHG internal loan",
          detail: "₹15,000 at 1%/month, 12-month tenure, on time",
          metric: "₹15k @ 1%",
          position: [-1.5, 2.0, -1.0],
          weight: 0.85,
        },
      ],
      confidence: 0.64,
    },
    {
      text: "ବଡ଼ ରୋଷେଇ ଘର ଦରକାର, ଅନଲାଇନ ଷ୍ଟୋର ବି।",
      lang: "ଓଡ଼ିଆ",
      english: "I need a bigger kitchen, and an online store too.",
      reply: "ଦୁଇଟି ଲକ୍ଷ୍ୟ — commercial kitchen 30 ମାସ, online 6 ମାସ।",
      replyEnglish: "Two goals — commercial kitchen 30 months, online 6 months.",
      stages: ["capture", "asr", "entity", "twin", "reasoning"],
      signals: [
        {
          id: "family-16",
          kind: "family",
          label: "Joint family + 12 SHG members",
          detail: "6 dependents + 11 women who depend on this enterprise",
          metric: "6+11",
          position: [2.4, -1.4, -1.5],
          weight: 0.95,
        },
        {
          id: "goal-7",
          kind: "goal",
          label: "Commercial kitchen",
          detail: "₹145,000 over 30 months — unlocks bulk orders",
          metric: "30 mo",
          position: [-2.5, 0.3, 1.7],
          weight: 1.18,
        },
      ],
      confidence: 0.82,
    },
    {
      text: "ଉଦ୍ୟମ, ପାନ, FSSAI ସବୁ ଅଛି।",
      lang: "ଓଡ଼ିଆ",
      english: "I have Udyam, PAN, FSSAI — all of it.",
      reply: "Udyam + FSSAI + PAN = MUDRA Kishor + ODOP eligible।",
      replyEnglish: "Udyam + FSSAI + PAN makes you eligible for MUDRA Kishor + ODOP.",
      stages: ["capture", "asr", "entity", "twin", "scheme"],
      signals: [
        {
          id: "asset-19",
          kind: "asset",
          label: "Kitchen + FSSAI + group savings",
          detail: "₹48k unit + ₹86k group savings + 3 licences",
          metric: "₹1.34L",
          position: [0.3, -2.5, 2.0],
          weight: 1.1,
        },
        {
          id: "scheme-11",
          kind: "scheme",
          label: "MUDRA Kishor + ODOP",
          detail: "₹50k–5L collateral-free + district ODOP subsidy",
          metric: "₹5L",
          position: [2.7, 0.2, -2.1],
          weight: 1.1,
        },
      ],
      confidence: 0.92,
    },
    {
      text: "ଆଗକୁ କଣ?",
      lang: "ଓଡ଼ିଆ",
      english: "What's next?",
      reply: "ତିନି: 1) MUDRA Kishor ₹2L, 2) ODOP brand, 3) Online storefront। Pathway 1 confidence 94%।",
      replyEnglish: "Three: 1) MUDRA Kishor ₹2L, 2) ODOP brand, 3) Online storefront. Pathway 1 at 94%.",
      stages: ["capture", "asr", "entity", "twin", "retrieval", "scheme", "pathway", "explain"],
      signals: [
        {
          id: "scheme-12",
          kind: "scheme",
          label: "Stand-Up India",
          detail: "SC/ST women enterprise — ₹10L–1Cr for expansion",
          metric: "₹10L+",
          position: [-2.2, -2.2, -0.4],
          weight: 1.0,
        },
        {
          id: "risk-9",
          kind: "risk",
          label: "Key-person risk",
          detail: "Enterprise depends on one leader — succession plan needed",
          metric: "medium",
          position: [0.0, 2.7, 1.2],
          weight: 0.88,
        },
      ],
      confidence: 0.98,
    },
  ],
};

export const PERSONAS = [meena, sunita, arjun, bikram, laxmi] as const;

export const personaById = (id: string) => PERSONAS.find((p) => p.id === id);
