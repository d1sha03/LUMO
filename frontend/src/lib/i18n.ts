import type {
  CashFlowCategory,
  CashFlowFrequency,
  ExplainTermKey,
  LumoLanguage,
  ScenarioStatus,
  SourceType,
} from "../types/lumo.js";

export const SUPPORTED_LANGUAGES: {
  code: LumoLanguage;
  label: string;
  nativeLabel: string;
}[] = [
  { code: "en-IN", label: "English", nativeLabel: "English (IN)" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "pa-IN", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
];

type TranslationTable = Record<string, Record<LumoLanguage, string>>;

const UI_STRINGS: TranslationTable = {
  "app.subtitle": {
    "en-IN": "Bharat's Livelihood Intelligence & Early-Warning System",
    "hi-IN": "भारत की आजीविका बुद्धिमत्ता और प्रारंभिक चेतावनी प्रणाली",
    "pa-IN": "ਭਾਰਤ ਦਾ ਰੋਜ਼ੀ-ਰੋਟੀ ਇੰਟੈਲੀਜੈਂਸ ਅਤੇ ਅਗਾਊਂ ਚੇਤਾਵਨੀ ਸਿਸਟਮ",
  },
  "badge.demoData": {
    "en-IN": "Demo data",
    "hi-IN": "डेमो डेटा",
    "pa-IN": "ਡੈਮੋ ਡੇਟਾ",
  },
  "badge.liveMode": {
    "en-IN": "Live API",
    "hi-IN": "लाइव एपीआई",
    "pa-IN": "ਲਾਈਵ API",
  },
  "badge.demoMode": {
    "en-IN": "Demo mode (deterministic)",
    "hi-IN": "डेमो मोड (निश्चित गणना)",
    "pa-IN": "ਡੈਮੋ ਮੋਡ (ਨਿਸ਼ਚਿਤ ਗਣਨਾ)",
  },
  "action.loadDemo": {
    "en-IN": "Load demo scenario",
    "hi-IN": "डेमो परिदृश्य लोड करें",
    "pa-IN": "ਡੈਮੋ ਦ੍ਰਿਸ਼ ਲੋਡ ਕਰੋ",
  },
  "action.compile": {
    "en-IN": "Compile & Analyse",
    "hi-IN": "विश्लेषण करें और जुड़वाँ बनाएँ",
    "pa-IN": "ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ ਅਤੇ ਟਵਿਨ ਬਣਾਓ",
  },
  "action.saveTwin": {
    "en-IN": "Save & Recalculate",
    "hi-IN": "सहेजें और फिर से गणना करें",
    "pa-IN": "ਸੇਵ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਗਣਨਾ ਕਰੋ",
  },
  "action.explainThis": {
    "en-IN": "Explain this",
    "hi-IN": "लूमो समझो",
    "pa-IN": "ਇਹ ਸਮਝਾਓ",
  },
  "action.shock30": {
    "en-IN": "Sales fall by 30% for 14 days",
    "hi-IN": "14 दिनों के लिए बिक्री में 30% की गिरावट",
    "pa-IN": "14 ਦਿਨਾਂ ਲਈ ਵਿਕਰੀ ਵਿੱਚ 30% ਗਿਰਾਵਟ",
  },
  "action.listen": {
    "en-IN": "Listen",
    "hi-IN": "सुनें",
    "pa-IN": "ਸੁਣੋ",
  },
  "nav.overview": {
    "en-IN": "Overview & Intake",
    "hi-IN": "विवरण और इनटेक",
    "pa-IN": "ਸੰਖੇਪ ਅਤੇ ਇਨਟੇਕ",
  },
  "nav.twin": {
    "en-IN": "Financial Twin",
    "hi-IN": "वित्तीय जुड़वाँ",
    "pa-IN": "ਵਿੱਤੀ ਟਵਿਨ",
  },
  "nav.radar": {
    "en-IN": "Stress Radar",
    "hi-IN": "तनाव रडार",
    "pa-IN": "ਤਣਾਅ ਰਡਾਰ",
  },
  "nav.whatif": {
    "en-IN": "What If?",
    "hi-IN": "क्या-अगर?",
    "pa-IN": "ਕੀ-ਜੇਕਰ?",
  },
  "nav.samjho": {
    "en-IN": "LUMO Samjho",
    "hi-IN": "लूमो समझो",
    "pa-IN": "ਲੂਮੋ ਸਮਝੋ",
  },
  "nav.resources": {
    "en-IN": "Official Resources",
    "hi-IN": "सरकारी संसाधन",
    "pa-IN": "ਸਰਕਾਰੀ ਸਰੋਤ",
  },
};

export function tr(key: string, lang: LumoLanguage = "en-IN"): string {
  return UI_STRINGS[key]?.[lang] ?? UI_STRINGS[key]?.["en-IN"] ?? key;
}

export const CATEGORY_LABELS: Record<CashFlowCategory, Record<LumoLanguage, string>> = {
  business_sales: {
    "en-IN": "Business gross sales",
    "hi-IN": "व्यापार की कुल बिक्री",
    "pa-IN": "ਕਾਰੋਬਾਰ ਦੀ ਕੁੱਲ ਵਿਕਰੀ",
  },
  business_stock_cost: {
    "en-IN": "Stock / raw material cost",
    "hi-IN": "माल / स्टॉक की लागत",
    "pa-IN": "ਸਟਾਕ / ਕੱਚੇ ਮਾਲ ਦੀ ਲਾਗਤ",
  },
  business_operating_cost: {
    "en-IN": "Business operating cost",
    "hi-IN": "व्यापार संचालन खर्च",
    "pa-IN": "ਕਾਰੋਬਾਰ ਚਲਾਉਣ ਦਾ ਖਰਚਾ",
  },
  household_essential: {
    "en-IN": "Essential household expense",
    "hi-IN": "घर का ज़रूरी खर्च",
    "pa-IN": "ਘਰ ਦਾ ਜ਼ਰੂਰੀ ਖਰਚਾ",
  },
  household_discretionary: {
    "en-IN": "Optional household expense",
    "hi-IN": "घर का वैकल्पिक खर्च",
    "pa-IN": "ਘਰ ਦਾ ਵਾਧੂ ਖਰਚਾ",
  },
  debt_repayment: {
    "en-IN": "Debt / loan repayment",
    "hi-IN": "ऋण / किस्त भुगतान",
    "pa-IN": "ਕਰਜ਼ਾ / ਕਿਸ਼ਤ ਭੁਗਤਾਨ",
  },
  supplier_payment: {
    "en-IN": "Supplier / mandi credit payment",
    "hi-IN": "सप्लायर / आढ़ती भुगतान",
    "pa-IN": "ਸਪਲਾਇਰ / ਆੜ੍ਹਤੀ ਭੁਗਤਾਨ",
  },
  savings_goal: {
    "en-IN": "Savings allocation",
    "hi-IN": "बचत मद",
    "pa-IN": "ਬੱਚਤ ਹਿੱਸਾ",
  },
  other: {
    "en-IN": "Other cash movement",
    "hi-IN": "अन्य नकद लेन-देन",
    "pa-IN": "ਹੋਰ ਨਕਦ ਲੈਣ-ਦੇਣ",
  },
};

export const FREQUENCY_LABELS: Record<CashFlowFrequency, Record<LumoLanguage, string>> = {
  once: {
    "en-IN": "One-time (dated)",
    "hi-IN": "एक बार (तारीख पर)",
    "pa-IN": "ਇੱਕ ਵਾਰ (ਤਾਰੀਖ 'ਤੇ)",
  },
  daily: {
    "en-IN": "Daily",
    "hi-IN": "प्रतिदिन (रोज़)",
    "pa-IN": "ਰੋਜ਼ਾਨਾ",
  },
  weekly: {
    "en-IN": "Weekly",
    "hi-IN": "साप्ताहिक (हर हफ्ते)",
    "pa-IN": "ਹਫ਼ਤਾਵਾਰੀ",
  },
  monthly: {
    "en-IN": "Monthly",
    "hi-IN": "मासिक (हर महीने)",
    "pa-IN": "ਮਾਸਿਕ",
  },
};

export const SOURCE_TYPE_LABELS: Record<SourceType, Record<LumoLanguage, string>> = {
  user_statement: {
    "en-IN": "Extracted from your statement",
    "hi-IN": "आपके कथन से निकाला गया",
    "pa-IN": "ਤੁਹਾਡੇ ਬਿਆਨ ਤੋਂ ਲਿਆ ਗਿਆ",
  },
  manual_entry: {
    "en-IN": "Reviewed / edited by you",
    "hi-IN": "आपके द्वारा जाँचा / बदला गया",
    "pa-IN": "ਤੁਹਾਡੇ ਵੱਲੋਂ ਸੋਧਿਆ ਗਿਆ",
  },
  synthetic_dataset: {
    "en-IN": "Synthetic demo scenario",
    "hi-IN": "सिंथेटिक डेमो डेटा",
    "pa-IN": "ਸਿੰਥੈਟਿਕ ਡੈਮੋ ਡੇਟਾ",
  },
  official_source: {
    "en-IN": "Official verified source",
    "hi-IN": "आधिकारिक स्रोत",
    "pa-IN": "ਅਧਿਕਾਰਤ ਸਰੋਤ",
  },
};

export const STATUS_LABELS: Record<
  ScenarioStatus,
  {
    title: Record<LumoLanguage, string>;
    summary: Record<LumoLanguage, string>;
    tone: "emerald" | "amber" | "rose";
  }
> = {
  within_reserve: {
    title: {
      "en-IN": "Within safety reserve",
      "hi-IN": "सुरक्षित रिज़र्व के भीतर",
      "pa-IN": "ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਦੇ ਅੰਦਰ",
    },
    summary: {
      "en-IN":
        "Projected daily closing cash stays at or above your minimum safety reserve across the forecast window.",
      "hi-IN":
        "अनुमानित दैनिक नकद शेष पूरे पूर्वानुमान समय में आपके न्यूनतम सुरक्षा रिज़र्व के बराबर या ऊपर रहता है।",
      "pa-IN":
        "ਅਨੁਮਾਨਿਤ ਰੋਜ਼ਾਨਾ ਨਕਦ ਬਕਾਇਆ ਪੂਰੇ ਸਮੇਂ ਦੌਰਾਨ ਤੁਹਾਡੇ ਘੱਟੋ-ਘੱਟ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਤੋਂ ਉੱਪਰ ਰਹਿੰਦਾ ਹੈ।",
    },
    tone: "emerald",
  },
  reserve_breach: {
    title: {
      "en-IN": "Safety reserve dipped",
      "hi-IN": "सुरक्षा रिज़र्व से नीचे",
      "pa-IN": "ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਤੋਂ ਹੇਠਾਂ",
    },
    summary: {
      "en-IN":
        "Cash stays positive, but dips below your minimum safety buffer on one or more upcoming dates.",
      "hi-IN":
        "नकद शून्य से ऊपर रहता है, लेकिन आने वाली कुछ तारीखों पर आपके न्यूनतम सुरक्षा रिज़र्व से नीचे चला जाता है।",
      "pa-IN":
        "ਨਕਦ ਸਿਫ਼ਰ ਤੋਂ ਉੱਪਰ ਰਹਿੰਦਾ ਹੈ, ਪਰ ਆਉਣ ਵਾਲੀਆਂ ਕੁਝ ਤਾਰੀਖਾਂ 'ਤੇ ਤੁਹਾਡੇ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਤੋਂ ਘੱਟ ਜਾਂਦਾ ਹੈ।",
    },
    tone: "amber",
  },
  cash_deficit: {
    title: {
      "en-IN": "Projected cash shortfall (below ₹0)",
      "hi-IN": "अनुमानित नकदी की कमी (₹0 से नीचे)",
      "pa-IN": "ਅਨੁਮਾਨਿਤ ਨਕਦੀ ਦੀ ਘਾਟ (₹0 ਤੋਂ ਹੇਠਾਂ)",
    },
    summary: {
      "en-IN":
        "Under these assumptions, scheduled outflows exceed available cash and push the projected balance below ₹0.",
      "hi-IN":
        "इन मान्यताओं के तहत, तय भुगतान उपलब्ध नकदी से अधिक हो जाते हैं और अनुमानित शेष ₹0 से नीचे चला जाता है।",
      "pa-IN":
        "ਇਨ੍ਹਾਂ ਧਾਰਨਾਵਾਂ ਹੇਠ, ਤੈਅ ਖਰਚੇ ਉਪਲਬਧ ਨਕਦੀ ਤੋਂ ਵੱਧ ਜਾਂਦੇ ਹਨ ਅਤੇ ਅਨੁਮਾਨਿਤ ਬਕਾਇਆ ₹0 ਤੋਂ ਹੇਠਾਂ ਚਲਾ ਜਾਂਦਾ ਹੈ।",
    },
    tone: "rose",
  },
};

export const SAMJHO_TERMS: {
  key: ExplainTermKey;
  title: Record<LumoLanguage, string>;
  shortHint: Record<LumoLanguage, string>;
}[] = [
  {
    key: "gross_sales",
    title: {
      "en-IN": "Gross sales (कुल बिक्री)",
      "hi-IN": "कुल बिक्री (Gross sales)",
      "pa-IN": "ਕੁੱਲ ਵਿਕਰੀ (Gross sales)",
    },
    shortHint: {
      "en-IN": "Total cash collected from customers before paying for stock or expenses.",
      "hi-IN": "ग्राहकों से मिलने वाली कुल रकम, माल और खर्च घटाने से पहले।",
      "pa-IN": "ਗਾਹਕਾਂ ਤੋਂ ਮਿਲੀ ਕੁੱਲ ਰਕਮ, ਸਟਾਕ ਅਤੇ ਖਰਚੇ ਕੱਟਣ ਤੋਂ ਪਹਿਲਾਂ।",
    },
  },
  {
    key: "net_operating_cash",
    title: {
      "en-IN": "Net operating cash (शुद्ध व्यापारिक बचत)",
      "hi-IN": "शुद्ध व्यापारिक बचत (Net operating cash)",
      "pa-IN": "ਸ਼ੁੱਧ ਕਾਰੋਬਾਰੀ ਬੱਚਤ (Net operating cash)",
    },
    shortHint: {
      "en-IN": "What remains from daily sales after paying for stock and stall operating costs.",
      "hi-IN": "रोज़ की बिक्री में से मंडी का माल और ठेले का खर्च निकालने के बाद बची रकम।",
      "pa-IN": "ਰੋਜ਼ਾਨਾ ਵਿਕਰੀ ਵਿੱਚੋਂ ਸਟਾਕ ਅਤੇ ਰੇਹੜੀ ਦਾ ਖਰਚਾ ਕੱਢਣ ਤੋਂ ਬਾਅਦ ਬਚੀ ਰਕਮ।",
    },
  },
  {
    key: "supplier_credit",
    title: {
      "en-IN": "Supplier credit (आढ़ती / मंडी उधार)",
      "hi-IN": "आढ़ती / सप्लायर उधार (Supplier credit)",
      "pa-IN": "ਸਪਲਾਇਰ / ਆੜ੍ਹਤੀ ਉਧਾਰ (Supplier credit)",
    },
    shortHint: {
      "en-IN": "Stock taken today to be paid on a fixed future date.",
      "hi-IN": "आज लिया गया माल जिसका भुगतान तय तारीख को करना होता है।",
      "pa-IN": "ਅੱਜ ਲਿਆ ਗਿਆ ਮਾਲ ਜਿਸ ਦਾ ਭੁਗਤਾਨ ਤੈਅ ਤਾਰੀਖ ਨੂੰ ਕਰਨਾ ਹੁੰਦਾ ਹੈ।",
    },
  },
  {
    key: "debt_repayment",
    title: {
      "en-IN": "Debt repayment (ऋण किस्त)",
      "hi-IN": "ऋण किस्त (Debt repayment)",
      "pa-IN": "ਕਰਜ਼ੇ ਦੀ ਕਿਸ਼ਤ (Debt repayment)",
    },
    shortHint: {
      "en-IN": "Fixed weekly or monthly loan instalments that must be paid regardless of sales.",
      "hi-IN": "बिक्री कम हो या ज़्यादा, तय समय पर जाने वाली ऋण की किस्त।",
      "pa-IN": "ਵਿਕਰੀ ਘੱਟ ਹੋਵੇ ਜਾਂ ਵੱਧ, ਤੈਅ ਸਮੇਂ 'ਤੇ ਜਾਣ ਵਾਲੀ ਕਰਜ਼ੇ ਦੀ ਕਿਸ਼ਤ।",
    },
  },
  {
    key: "minimum_reserve",
    title: {
      "en-IN": "Minimum safety reserve (न्यूनतम सुरक्षा बचत)",
      "hi-IN": "न्यूनतम सुरक्षा रिज़र्व (Minimum reserve)",
      "pa-IN": "ਘੱਟੋ-ਘੱਟ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ (Minimum reserve)",
    },
    shortHint: {
      "en-IN": "Emergency cash cushion kept aside so a slow week doesn't force high-interest borrowing.",
      "hi-IN": "आपातकालीन नकद बफर ताकि मंदी के दिनों में महँगा उधार न लेना पड़े।",
      "pa-IN": "ਐਮਰਜੈਂਸੀ ਨਕਦ ਬਫਰ ਤਾਂ ਜੋ ਮੰਦੀ ਦੇ ਦਿਨਾਂ ਵਿੱਚ ਮਹਿੰਗਾ ਉਧਾਰ ਨਾ ਲੈਣਾ ਪਵੇ।",
    },
  },
  {
    key: "projected_cash_shortfall",
    title: {
      "en-IN": "Projected cash shortfall (अनुमानित नकदी की कमी)",
      "hi-IN": "अनुमानित नकदी की कमी (Projected shortfall)",
      "pa-IN": "ਅਨੁਮਾਨਿਤ ਨਕਦੀ ਦੀ ਘਾਟ (Projected shortfall)",
    },
    shortHint: {
      "en-IN": "How far your lowest projected balance falls below your safety reserve.",
      "hi-IN": "आपका सबसे कम अनुमानित शेष आपके सुरक्षा रिज़र्व से कितना नीचे जाता है।",
      "pa-IN": "ਤੁਹਾਡਾ ਸਭ ਤੋਂ ਘੱਟ ਅਨੁਮਾਨਿਤ ਬਕਾਇਆ ਤੁਹਾਡੇ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਤੋਂ ਕਿੰਨਾ ਹੇਠਾਂ ਜਾਂਦਾ ਹੈ।",
    },
  },
  {
    key: "income_shock",
    title: {
      "en-IN": "Income shock (बिक्री में अचानक झटका)",
      "hi-IN": "आय का झटका (Income shock)",
      "pa-IN": "ਆਮਦਨ ਦਾ ਝਟਕਾ (Income shock)",
    },
    shortHint: {
      "en-IN": "A temporary drop in business sales due to rain, illness, heatwave, or market closure.",
      "hi-IN": "बारिश, बीमारी या बाज़ार बंद होने से कुछ दिनों के लिए बिक्री में गिरावट।",
      "pa-IN": "ਮੀਂਹ, ਬਿਮਾਰੀ ਜਾਂ ਬਾਜ਼ਾਰ ਬੰਦ ਹੋਣ ਕਾਰਨ ਕੁਝ ਦਿਨਾਂ ਲਈ ਵਿਕਰੀ ਵਿੱਚ ਗਿਰਾਵਟ।",
    },
  },
];
