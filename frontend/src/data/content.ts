import type {
  ChatTurn,
  ImpactStat,
  Pathway,
  Persona,
  Principle,
  Scheme,
  TechBrain,
  TechLayer,
} from "@/types";

export const NAV_SECTIONS = [
  { id: "hero", label: "Home", index: "01" },
  { id: "problem", label: "The Problem", index: "02" },
  { id: "how", label: "How It Works", index: "03" },
  { id: "conversation", label: "Conversation", index: "04" },
  { id: "twin", label: "Financial Twin", index: "05" },
  { id: "pathways", label: "Pathways", index: "06" },
  { id: "schemes", label: "Schemes", index: "07" },
  { id: "responsible", label: "Responsible AI", index: "08" },
  { id: "technology", label: "Technology", index: "09" },
  { id: "impact", label: "Impact", index: "10" },
  { id: "demo", label: "Demo", index: "11" },
  { id: "about", label: "About", index: "12" },
] as const;

export const PERSONAS: Persona[] = [
  {
    id: "vendor",
    name: "Ravi",
    role: "Street vendor · Varanasi",
    quote: "Ten years of daily sales, and not one page of it counts.",
    stat: "63M",
    detail: "Informal vendors with cash-only histories that no bureau can read.",
  },
  {
    id: "farmer",
    name: "Sukhdev",
    role: "Smallholder farmer · Nashik",
    quote: "My income has seasons. Their forms have boxes.",
    stat: "146M",
    detail: "Households whose earnings swing with monsoon, mandi and market.",
  },
  {
    id: "gig",
    name: "Aisha",
    role: "Gig worker · Bengaluru",
    quote: "Four apps, four payouts, zero continuity.",
    stat: "24M",
    detail: "Platform workers stitching together income from many sources.",
  },
  {
    id: "migrant",
    name: "Bikram",
    role: "Migrant worker · Kochi",
    quote: "My money moves states. My record stays behind.",
    stat: "600M",
    detail: "Migrant workers whose documents live in another language, another state.",
  },
  {
    id: "shg",
    name: "Meena",
    role: "SHG member · Odisha",
    quote: "My group knows I repay. The system does not.",
    stat: "89M",
    detail: "Women in self-help groups with perfect repayment and no credit file.",
  },
];

export const LANGUAGES = [
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "en", label: "English", english: "English" },
  { code: "ta", label: "தமிழ்", english: "Tamil" },
  { code: "bn", label: "বাংলা", english: "Bengali" },
  { code: "te", label: "తెలుగు", english: "Telugu" },
  { code: "mr", label: "मराठी", english: "Marathi" },
  { code: "kn", label: "ಕನ್ನಡ", english: "Kannada" },
  { code: "or", label: "ଓଡ଼ିଆ", english: "Odia" },
];

export const CONVERSATION_FLOW: ChatTurn[] = [
  {
    id: "c1",
    role: "user",
    lang: "हिन्दी",
    text: "बारिश में काम बंद हो जाता है, तब महीने का आधा पैसा नहीं आता।",
    translation: "In the rains the work stops, and half my monthly money never arrives.",
    reveals: ["season-14", "risk-9"],
  },
  {
    id: "c2",
    role: "lumo",
    lang: "हिन्दी",
    text: "समझ गई। जुलाई–अगस्त में आपकी आय 62% गिर जाती है — मैंने इसे आपके twin में जोड़ दिया।",
    translation: "Understood. Your income falls 62% in July–August — I have added it to your twin.",
    reveals: ["season-14", "income-0"],
  },
  {
    id: "c3",
    role: "user",
    lang: "தமிழ்",
    text: "என் மகள் பொறியியல் படிக்க வேண்டும். அதற்கு எவ்வளவு மாதம் சேர்க்க வேண்டும்?",
    translation: "My daughter wants to study engineering. How much must I save each month?",
    reveals: ["goal-6", "family-16"],
  },
  {
    id: "c4",
    role: "lumo",
    lang: "தமிழ்",
    text: "மாதம் ₹1,850 சேமித்தால் 36 மாதங்களில் முடியும். PM Kisan உங்கள் குடும்பத்திற்கு ₹6,000 கொடுக்கும்.",
    translation: "₹1,850 a month finishes it in 36 months. PM Kisan adds ₹6,000 a year to your family.",
    reveals: ["scheme-11", "goal-6"],
  },
  {
    id: "c5",
    role: "user",
    lang: "বাংলা",
    text: "সূদখোরের কাছে ১৮ হাজার টাকা ধার আছে। এটা কি খারাপ?",
    translation: "I owe the moneylender eighteen thousand. Is that bad?",
    reveals: ["debt-5"],
  },
  {
    id: "c6",
    role: "lumo",
    lang: "বাংলা",
    text: "খারাপ নয় — কিন্তু ব্যয়বহুল। ৮% মাসিক সুদে ৩ মাসে দ্বিগুণ হবে। একটি পথ আছে: SVANidhi দিয়ে এটি বদলানো।",
    translation: "Not bad — but expensive. At 8% monthly it doubles in three months. There is a path: replace it with SVANidhi.",
    reveals: ["debt-5", "scheme-12"],
  },
];

export const PATHWAYS: Pathway[] = [
  {
    id: "a",
    code: "Path A",
    title: "Steady Ground",
    summary:
      "Refinance the informal loan into SVANidhi, keep the SHG rhythm, and build a 8-week monsoon buffer.",
    months: 9,
    confidence: 0.88,
    outcome: "Interest paid drops from 8%/mo to 1.6%/mo",
    risk: "Low — requires vendor certificate upload only",
    benefit: "₹4,120 saved in interest within 9 months",
    color: "#4ECDC4",
    steps: [
      { label: "SVANidhi application", month: 1 },
      { label: "Moneylender closed", month: 2 },
      { label: "Buffer begins", month: 4 },
      { label: "Monsoon covered", month: 7 },
      { label: "Score-free trust level 3", month: 9 },
    ],
  },
  {
    id: "b",
    code: "Path B",
    title: "Grow the Stall",
    summary:
      "Add MUDRA micro-enterprise credit to double inventory for festival season and hire one helper.",
    months: 14,
    confidence: 0.71,
    outcome: "Festival revenue up 2.4×, household surplus ₹3,900/mo",
    risk: "Medium — inventory risk if Diwali demand is soft",
    benefit: "₹11,600 additional annual income",
    color: "#F5A623",
    steps: [
      { label: "MUDRA pre-qualified", month: 2 },
      { label: "Inventory bought", month: 3 },
      { label: "Helper hired", month: 6 },
      { label: "Diwali cycle", month: 9 },
      { label: "Loan closed early", month: 14 },
    ],
  },
  {
    id: "c",
    code: "Path C",
    title: "Daughter's Degree",
    summary:
      "Long horizon: combine PM Kisan, gold-lite insurance and a 36-month micro-SIP for the polytechnic fee.",
    months: 36,
    confidence: 0.64,
    outcome: "₹90,000 ready before admission, no new informal debt",
    risk: "Medium — a health shock could interrupt the plan",
    benefit: "₹1.4L lifetime earnings uplift",
    color: "#8B7CF6",
    steps: [
      { label: "PM Kisan claimed", month: 1 },
      { label: "Micro-SIP ₹1,850", month: 3 },
      { label: "Health cover added", month: 8 },
      { label: "Half the fee saved", month: 19 },
      { label: "Admission, debt-free", month: 36 },
    ],
  },
];

export const SCHEMES: Scheme[] = [
  {
    id: "svanidhi",
    name: "PM SVANidhi",
    subtitle: "Street vendors · collateral-free",
    amount: "₹10,000 → ₹20,000",
    match: 96,
    why: "Your stall licence and 14 months of UPI receipts already satisfy the proof-of-business test.",
    tags: ["Vendor", "Working capital", "7% interest subvention"],
  },
  {
    id: "mudra",
    name: "PM MUDRA",
    subtitle: "Micro-enterprise · Kishor tier",
    amount: "₹50,000",
    match: 82,
    why: "Festival demand curve shows absorbable inventory credit with a 14-month payback.",
    tags: ["Growth", "Inventory", "No collateral"],
  },
  {
    id: "kisan",
    name: "PM Kisan",
    subtitle: "Landholding families",
    amount: "₹6,000 / year",
    match: 91,
    why: "Your husband's land record matches the eligible list — ₹18,000 has gone unclaimed for 3 years.",
    tags: ["Direct benefit", "Unclaimed", "3 years back"],
  },
  {
    id: "jandhan",
    name: "Jan Dhan",
    subtitle: "Universal banking",
    amount: "RuPay + overdraft ₹10,000",
    match: 74,
    why: "Your account has been dormant since 2022. Reactivating unlocks DBT and insurance riders.",
    tags: ["Banking", "DBT rail", "₹2L insurance"],
  },
];

export const PRINCIPLES: Principle[] = [
  {
    id: "consent",
    label: "Consent",
    icon: "handshake",
    headline: "Nothing enters the twin without a yes.",
    body: "Every signal is added only after a spoken confirmation, in your language, with a plain-language reason.",
    detail: [
      "Granular consent per data source — bank, UPI, speech, documents.",
      "Withdraw any permission mid-conversation; the twin re-shrinks live.",
      "Consent receipts stored as tamper-evident logs you can hear back.",
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: "lock",
    headline: "Your life is not a training set.",
    body: "Conversations are processed in an isolated session, encrypted at rest, and never used to train foundation models.",
    detail: [
      "Field-level encryption; raw audio discarded after transcription.",
      "No third-party data sale, no ad tracking, no shadow profiles.",
      "Indian data resident — DPDP Act aligned by design.",
    ],
  },
  {
    id: "explainability",
    label: "Explainability",
    icon: "sparkles",
    headline: "Every suggestion arrives with its reasoning.",
    body: "LUMO shows which signals produced a pathway — and which signals would change it — before you act.",
    detail: [
      "Signal attribution per recommendation, rendered in local language.",
      "Counterfactual view: 'if your monsoon gap were 3 weeks shorter…'.",
      "Plain-language summary read aloud for low-literacy users.",
    ],
  },
  {
    id: "fairness",
    label: "Fairness",
    icon: "scale",
    headline: "No scores. No gatekeeping.",
    body: "LUMO refuses to output a single ranking number. It outputs pathways, trade-offs and confidence.",
    detail: [
      "Bias audits across caste, religion, gender, state and language cohorts.",
      "Adverse-action style explanations whenever support is reduced.",
      "Model cards published openly for every deployed version.",
    ],
  },
  {
    id: "human",
    label: "Human Review",
    icon: "user-check",
    headline: "A person is always one tap away.",
    body: "Any decision that changes access to money can be escalated to a trained human reviewer within 24 hours.",
    detail: [
      "Human-in-the-loop for credit, insurance and scheme denials.",
      "Community reviewers who speak the user's language.",
      "Full audit trail visible to the user, not just the institution.",
    ],
  },
];

export const TECH_BRAINS: TechBrain[] = [
  {
    id: "qwen",
    name: "Qwen",
    role: "Multilingual reasoning",
    specialty: "Hindi, Tamil, Bengali, Odia financial dialogue",
    color: "#4ECDC4",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    role: "Structured extraction",
    specialty: "Turning speech into ledger entries and evidence",
    color: "#8B7CF6",
  },
  {
    id: "llama",
    name: "Llama",
    role: "Pathway planning",
    specialty: "Long-horizon scenario simulation and trade-offs",
    color: "#F5A623",
  },
  {
    id: "gemma",
    name: "Gemma",
    role: "Edge inference",
    specialty: "On-device intent capture for low-bandwidth villages",
    color: "#6FA8DC",
  },
];

export const TECH_LAYERS: TechLayer[] = [
  { id: "langgraph", name: "LangGraph", kind: "Orchestration", detail: "Stateful multi-agent graphs with checkpointed turns." },
  { id: "fastapi", name: "FastAPI", kind: "Services", detail: "Sub-100ms twin reads, streaming responses." },
  { id: "postgres", name: "Postgres", kind: "System of record", detail: "Consent-ledger and event-sourced twin history." },
  { id: "chroma", name: "ChromaDB", kind: "Vector memory", detail: "Scheme corpus and precedent retrieval." },
  { id: "ai4bharat", name: "AI4Bharat", kind: "Speech", detail: "Indic ASR + TTS for 22 languages." },
  { id: "react", name: "React", kind: "Interface", detail: "Accessible, motion-first experience layer." },
  { id: "three", name: "ThreeJS", kind: "Visualisation", detail: "The living twin rendered in real time." },
];

export const IMPACT_STATS: ImpactStat[] = [
  { id: "lives", value: 1284000, suffix: "", label: "People modelled", detail: "Living twins created from conversation alone" },
  { id: "languages", value: 22, suffix: "", label: "Languages spoken", detail: "Speech-first, read-optional, in every Indic script" },
  { id: "schemes", value: 3.7, suffix: "k Cr", label: "Benefits unlocked", detail: "Entitlements matched, claimed and received", decimals: 1 },
  { id: "pathways", value: 96, suffix: "%", label: "Explainable", detail: "Every recommendation carries signal attribution" },
];

export const DEMO_PROMPTS = [
  { id: "p1", lang: "हिन्दी", text: "बारिश में काम बंद हो जाता है।", reveals: ["season-14", "risk-9"] },
  { id: "p2", lang: "தமிழ்", text: "மகளுக்கு கல்லூரி கட்டணம் சேர்க்க வேண்டும்.", reveals: ["goal-6", "scheme-11"] },
  { id: "p3", lang: "বাংলা", text: "সূদখোরের ধার বদলাতে চাই।", reveals: ["debt-5", "scheme-12"] },
  { id: "p4", lang: "English", text: "Which scheme am I missing out on?", reveals: ["scheme-11", "scheme-13"] },
];

export const DEMO_REPLIES: Record<string, { text: string; detail: string }> = {
  p1: {
    text: "Noted. Your twin now shows a 62% income dip across July–August. That is a seasonality signal, not a risk penalty.",
    detail: "3 signals added · seasonality, income gap, buffer need",
  },
  p2: {
    text: "₹1,850 a month for 36 months reaches the polytechnic fee. PM Kisan contributes ₹6,000 a year you have not claimed.",
    detail: "Pathway C drafted · confidence 64%",
  },
  p3: {
    text: "PM SVANidhi can replace ₹10,000 of that at 1.6% monthly instead of 8%. Your stall licence is already sufficient proof.",
    detail: "Pathway A drafted · confidence 88%",
  },
  p4: {
    text: "Two: PM Kisan (₹18,000 unclaimed across three years) and Jan Dhan, dormant since 2022 but carrying a ₹2L insurance rider.",
    detail: "2 entitlements matched · 1 reactivation",
  },
};

export const ABOUT_TIMELINE = [
  { year: "2024", title: "A question in a tea stall", body: "We asked 40 vendors in Varanasi how they would prove their income. Nobody had an answer that a bank would accept." },
  { year: "2025", title: "Speech became the form", body: "The first prototype listened in five languages and returned a structured financial picture in under four minutes." },
  { year: "2025", title: "The twin went live", body: "Pilots with self-help groups in Odisha and Nashik. 214 signals per household, refreshed after every conversation." },
  { year: "2026", title: "Pathways, not scores", body: "LUMO now answers the real question — 'what should I do next?' — with trade-offs, confidence and human review." },
];

export const ABOUT_VALUES = [
  { title: "Dignity by default", body: "We never ask a person to prove they are poor. We help them show what they already are: reliable." },
  { title: "Calm technology", body: "No dashboards to learn, no jargon to decode. One conversation, in the language you think in." },
  { title: "Open to scrutiny", body: "Model cards, bias audits and an appeal path in every language we speak." },
  { title: "Built with, not for", body: "Community reviewers co-author every prompt, every script, every release." },
];
