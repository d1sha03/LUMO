import {
  addDaysISO,
  daysInMonth,
  diffDaysISO,
  formatDisplayDate,
  formatINR,
  parseISODate,
} from "./format.js";
import type {
  CashFlow,
  ClarificationQuestion,
  DailyBalancePoint,
  ExplainRequest,
  ExplainResponse,
  ExtractedFact,
  FinancialTwin,
  IntakeCompileRequest,
  IntakeCompileResponse,
  LumoLanguage,
  MajorDriver,
  OfficialResourceItem,
  ResourcesQuery,
  ResourcesResponse,
  ScenarioResult,
  ScenarioStatus,
  SimulateRequest,
  SimulateResponse,
  SimulationScenarioInput,
  SimulationValidationIssue,
} from "../types/lumo.js";

export const DEFAULT_AS_OF_DATE = "2026-10-19";

export const SAMPLE_NARRATIVES: {
  id: string;
  label: Record<LumoLanguage, string>;
  badge: string;
  language: LumoLanguage;
  text: string;
}[] = [
  {
    id: "complete_en",
    label: {
      "en-IN": "Full Street Vendor Story (English)",
      "hi-IN": "पूर्ण सब्ज़ी विक्रेता विवरण (English)",
      "pa-IN": "ਪੂਰੀ ਸਬਜ਼ੀ ਰੇਹੜੀ ਕਹਾਣੀ (English)",
    },
    badge: "Complete · 7 flows",
    language: "en-IN",
    text: "I sell vegetables in Lucknow. My sales are around ₹1,500 per day and my mandi stock costs ₹900 per day. I pay ₹120 daily for stall fee and ice, and spend ₹280 daily on household groceries and milk. Right now I have ₹4,200 cash in hand and I try to keep at least ₹1,500 as my minimum safety reserve. I have a wholesale supplier payment of ₹2,200 due in five days, a ₹700 weekly loan instalment, and room rent of ₹1,800 due on the 1st of the month.",
  },
  {
    id: "complete_hi",
    label: {
      "en-IN": "Full Street Vendor Story (Hindi)",
      "hi-IN": "पूर्ण सब्ज़ी विक्रेता विवरण (हिन्दी)",
      "pa-IN": "ਪੂਰੀ ਸਬਜ਼ੀ ਰੇਹੜੀ ਕਹਾਣੀ (ਹਿੰਦੀ)",
    },
    badge: "हिन्दी · पूर्ण",
    language: "hi-IN",
    text: "मैं लखनऊ में सब्ज़ी का ठेला लगाता हूँ। मेरी रोज़ की बिक्री लगभग ₹1,500 है और मंडी से माल खरीदने में ₹900 रोज़ लगते हैं। ठेले की पर्ची और बर्फ में ₹120 रोज़ और घर के राशन-दूध में ₹280 रोज़ खर्च होते हैं। अभी मेरे पास हाथ में ₹4,200 नकद हैं और मैं कम से कम ₹1,500 न्यूनतम रिज़र्व रखना चाहता हूँ। 5 दिन बाद सप्लायर को ₹2,200 देने हैं, हर हफ्ते ₹700 लोन किस्त जाती है, और 1 तारीख को ₹1,800 कमरे का किराया देना है।",
  },
  {
    id: "complete_hinglish",
    label: {
      "en-IN": "Street Vendor Story (Hinglish)",
      "hi-IN": "सब्ज़ी विक्रेता विवरण (Hinglish)",
      "pa-IN": "ਸਬਜ਼ੀ ਵਿਕਰੇਤਾ ਕਹਾਣੀ (Hinglish)",
    },
    badge: "Hinglish",
    language: "hi-IN",
    text: "Main Lucknow mein sabzi bechta hoon. Meri daily sales ₹1,500 hai, mandi stock cost ₹900 per day hai, aur ₹120 daily stall fee aur baraf mein lagta hai. Ghar ke rashan-doodh ka ₹280 daily kharcha hai. Mere paas abhi ₹4,200 cash on hand hai aur ₹1,500 minimum reserve rakhna chahta hoon. 5 din baad ₹2,200 supplier payment dena hai, har hafte ₹700 loan kist hai, aur 1 tareekh ko ₹1,800 rent hai.",
  },
  {
    id: "ambiguous_short",
    label: {
      "en-IN": "Ambiguous / Incomplete Story (Triggers Clarification)",
      "hi-IN": "अधूरा / अस्पष्ट विवरण (स्पष्टीकरण प्रश्न दिखाएगा)",
      "pa-IN": "ਅਧੂਰਾ ਬਿਆਨ (ਸਪੱਸ਼ਟੀਕਰਨ ਸਵਾਲ)",
    },
    badge: "Clarification Demo",
    language: "en-IN",
    text: "I sell vegetables and earn about 1500 rupees per day, and I have a supplier payment of 2200 rupees due in five days.",
  },
];

export function createCanonicalDemoTwin(
  language: LumoLanguage = "en-IN",
  asOfDate: string = DEFAULT_AS_OF_DATE,
): FinancialTwin {
  const supplierDate = addDaysISO(asOfDate, 5); // 2026-10-24
  const loanDate = addDaysISO(asOfDate, 6); // 2026-10-25
  const { year, month } = parseISODate(asOfDate);
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const rentDate = `${String(nextMonthYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;

  return {
    schema_version: "1.0",
    twin_id: "twin_ramesh_veg_vendor_lko",
    as_of_date: asOfDate,
    language,
    profile: {
      occupation: "street_vendor",
      state: "Uttar Pradesh",
      district: "Lucknow",
    },
    cash_on_hand: 4200,
    minimum_reserve: 1500,
    forecast_days: 30,
    cash_flows: [
      {
        id: "cf_daily_sales",
        label: "Daily vegetable sales",
        direction: "inflow",
        category: "business_sales",
        amount: 1500,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.92,
        source_type: "synthetic_dataset",
        source_note: "My sales are around ₹1,500 per day",
        essential: true,
      },
      {
        id: "cf_daily_stock",
        label: "Daily mandi vegetable stock",
        direction: "outflow",
        category: "business_stock_cost",
        amount: 900,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.9,
        source_type: "synthetic_dataset",
        source_note: "my mandi stock costs ₹900 per day",
        essential: true,
      },
      {
        id: "cf_stall_ops",
        label: "Stall fee, ice & polybags",
        direction: "outflow",
        category: "business_operating_cost",
        amount: 120,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.86,
        source_type: "synthetic_dataset",
        source_note: "I pay ₹120 daily for stall fee and ice",
        essential: true,
      },
      {
        id: "cf_household_food",
        label: "Household groceries, milk & LPG",
        direction: "outflow",
        category: "household_essential",
        amount: 280,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.88,
        source_type: "synthetic_dataset",
        source_note: "spend ₹280 daily on household groceries and milk",
        essential: true,
      },
      {
        id: "cf_supplier_due",
        label: "Wholesale supplier settlement (potato & onion)",
        direction: "outflow",
        category: "supplier_payment",
        amount: 2200,
        frequency: "once",
        start_date: supplierDate,
        confidence: 0.95,
        source_type: "synthetic_dataset",
        source_note: "wholesale supplier payment of ₹2,200 due in five days",
        essential: true,
      },
      {
        id: "cf_weekly_loan",
        label: "Weekly micro-loan instalment (kist)",
        direction: "outflow",
        category: "debt_repayment",
        amount: 700,
        frequency: "weekly",
        start_date: loanDate,
        confidence: 0.91,
        source_type: "synthetic_dataset",
        source_note: "₹700 weekly loan instalment",
        essential: true,
      },
      {
        id: "cf_monthly_rent",
        label: "Room rent & electricity",
        direction: "outflow",
        category: "household_essential",
        amount: 1800,
        frequency: "monthly",
        start_date: rentDate,
        confidence: 0.94,
        source_type: "synthetic_dataset",
        source_note: "room rent of ₹1,800 due on the 1st of the month",
        essential: true,
      },
    ],
    goals: [
      {
        id: "goal_school_fee",
        label: "Daughter's school exam fee",
        target_amount: 1800,
        target_date: "2026-11-20",
        priority: "essential",
        current_saved: 400,
      },
      {
        id: "goal_tarpaulin",
        label: "Winter cart tarpaulin & digital weighing scale",
        target_amount: 3500,
        target_date: "2026-12-15",
        priority: "important",
        current_saved: 800,
      },
    ],
  };
}

/**
 * Sita, 34, vegetable vendor in Lucknow. This is a complete synthetic fixture
 * for the one coherent product demonstration. Its one-time due dates and
 * historical loan note are explicitly labelled as demo inputs; they are not
 * eligibility or repayment predictions.
 */
export function createSitaDemoTwin(
  language: LumoLanguage = "hi-IN",
  asOfDate: string = DEFAULT_AS_OF_DATE,
): FinancialTwin {
  const inventoryDue = addDaysISO(asOfDate, 5);
  const loanDue = addDaysISO(asOfDate, 6);
  const schoolFeeDue = addDaysISO(asOfDate, 22);
  const goalDate = "2027-04-19";

  return {
    schema_version: "1.0",
    twin_id: "twin_sita_veg_vendor_lucknow_demo",
    as_of_date: asOfDate,
    language,
    profile: {
      occupation: "street_vendor",
      state: "Uttar Pradesh",
      district: "Lucknow",
    },
    // Synthetic but internally consistent with the due-date stress demonstration.
    cash_on_hand: 8100,
    minimum_reserve: 2100,
    forecast_days: 30,
    cash_flows: [
      {
        id: "sita_daily_sales",
        label: "Vegetable cart gross sales",
        direction: "inflow",
        category: "business_sales",
        amount: 1500,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.88,
        source_type: "synthetic_dataset",
        source_note: "Sita says daily sales vary; ₹1,500/day is an illustrative demo baseline.",
        essential: true,
      },
      {
        id: "sita_daily_stock",
        label: "Mandi vegetable stock",
        direction: "outflow",
        category: "business_stock_cost",
        amount: 900,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.86,
        source_type: "synthetic_dataset",
        source_note: "Illustrative demo amount; confirm with Sita before using outside the demo.",
        essential: true,
      },
      {
        id: "sita_cart_ops",
        label: "Cart fee, ice and carrying costs",
        direction: "outflow",
        category: "business_operating_cost",
        amount: 120,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.8,
        source_type: "synthetic_dataset",
        source_note: "Illustrative demo operating cost.",
        essential: true,
      },
      {
        id: "sita_household_food",
        label: "Essential household groceries",
        direction: "outflow",
        category: "household_essential",
        amount: 280,
        frequency: "daily",
        start_date: asOfDate,
        confidence: 0.82,
        source_type: "synthetic_dataset",
        source_note: "Illustrative demo household amount.",
        essential: true,
      },
      {
        id: "sita_inventory_due",
        label: "Mandi supplier settlement",
        direction: "outflow",
        category: "supplier_payment",
        amount: 1200,
        frequency: "once",
        start_date: inventoryDue,
        confidence: 0.9,
        source_type: "synthetic_dataset",
        source_note: "Fictional demo obligation: ₹1,200 inventory payment due in five days.",
        essential: true,
      },
      {
        id: "sita_loan_instalment",
        label: "Loan instalment — schedule to confirm",
        direction: "outflow",
        category: "debt_repayment",
        amount: 1800,
        frequency: "once",
        start_date: loanDue,
        confidence: 0.62,
        source_type: "synthetic_dataset",
        source_note:
          "Demo-only illustrative payment after Sita reports borrowing ₹10,000 last month. Actual due date, lender and instalment were not supplied.",
        essential: true,
      },
      {
        id: "sita_school_fee",
        label: "Daughter's school fee",
        direction: "outflow",
        category: "household_essential",
        amount: 2500,
        frequency: "once",
        start_date: schoolFeeDue,
        confidence: 0.86,
        source_type: "synthetic_dataset",
        source_note: "Fictional demo obligation: school fee due later next month.",
        essential: true,
      },
    ],
    goals: [
      {
        id: "sita_sewing_machine_goal",
        label: "Sewing machine for a home tailoring sideline",
        target_amount: 25000,
        target_date: goalDate,
        priority: "important",
        current_saved: 0,
      },
    ],
  };
}

/**
 * Helper to extract numbers near keywords from English, Hindi, Hinglish, or Punjabi text.
 */
function parseAmountMatch(text: string, patterns: RegExp[]): { amount: number; quote: string } | null {
  for (const regex of patterns) {
    const m = text.match(regex);
    if (m && m[1]) {
      const cleaned = m[1].replace(/,/g, "").trim();
      const num = Number(cleaned);
      if (!Number.isNaN(num) && num >= 0) {
        return { amount: num, quote: m[0].trim() };
      }
    }
  }
  return null;
}

function parseDaysOffset(text: string): number {
  const lower = text.toLowerCase();
  if (/five\s+days|5\s+days|5\s+din|paanch\s+din|5\s*दिन|पांच\s*दिन|ਪੰਜ\s*ਦਿਨ/.test(lower)) {
    return 5;
  }
  const m = lower.match(/in\s+(\d+)\s+days|(\d+)\s+din\s+baad|(\d+)\s*दिन\s*बाद/);
  if (m) {
    const val = Number(m[1] || m[2] || m[3]);
    if (!Number.isNaN(val) && val >= 0 && val <= 90) return val;
  }
  return 5;
}

/**
 * Deterministic implementation of POST /api/intake/compile
 */
export function compileFinancialStoryDeterministic(
  request: IntakeCompileRequest,
): IntakeCompileResponse {
  const text = request.text.trim();
  const asOfDate = request.as_of_date || DEFAULT_AS_OF_DATE;
  const lang = request.language || "en-IN";
  const existing = request.existing_twin;

  const extracted_facts: ExtractedFact[] = [];
  const questions_required: ClarificationQuestion[] = [];
  const warnings: string[] = [];

  // Occupation & location detection
  let occupation = existing?.profile.occupation || "street_vendor";
  if (/tea|chai|चाय|ਚਾਹ/i.test(text)) occupation = "tea_stall_owner";
  else if (/tailor|silai|सिलाई|ਦਰਜ਼ੀ/i.test(text)) occupation = "tailor";
  else if (/kirana|shop|दुकान|ਦੁਕਾਨ/i.test(text)) occupation = "small_shopkeeper";
  else if (/vegetable|sabzi|सब्ज़ी|सब्जी|ਸਬਜ਼ੀ/i.test(text)) occupation = "street_vendor";

  let state = existing?.profile.state ?? "Uttar Pradesh";
  let district = existing?.profile.district ?? "Lucknow";
  if (/punjab|ludhiana|amritsar|ਪੰਜਾਬ/i.test(text)) {
    state = "Punjab";
    district = "Ludhiana";
  } else if (/delhi|dilli|दिल्ली/i.test(text)) {
    state = "Delhi";
    district = "New Delhi";
  }

  // 1. Extract cash_on_hand (keep null if not stated and not in existing_twin)
  const cashMatch = parseAmountMatch(text, [
    /(?:have|paas\s+abhi|हाथ\s+में|पास\s+अभी|ਕੋਲ\s+ਹੁਣ)\s*(?:around\s*)?₹?\s*([\d,]+)\s*(?:rupees|rs|नकद|cash|ਨਕਦ)?/i,
    /₹?\s*([\d,]+)\s*(?:rupees\s*)?(?:cash\s+in\s+hand|cash\s+on\s+hand|नकद\s+हैं|ਨਕਦ\s+ਹਨ)/i,
  ]);
  const cash_on_hand: number | null = cashMatch
    ? cashMatch.amount
    : existing?.cash_on_hand !== undefined
      ? existing.cash_on_hand
      : null;

  if (cashMatch) {
    extracted_facts.push({
      field: "cash_on_hand",
      value: cashMatch.amount,
      source_quote: cashMatch.quote,
      confidence: 0.94,
      source_type: "user_statement",
    });
  }

  // 2. Extract minimum_reserve (keep null if not stated and not in existing_twin)
  const reserveMatch = parseAmountMatch(text, [
    /(?:keep\s+at\s+least|minimum\s+reserve|safety\s+reserve|कम\s+से\s+कम|सुरक्षित\s+बचत|न्यूनतम\s+रिज़र्व|ਘੱਟੋ-ਘੱਟ)\s*(?:of\s*)?₹?\s*([\d,]+)/i,
    /₹?\s*([\d,]+)\s*(?:rupees\s*)?(?:as\s+my\s+minimum|minimum\s+safety\s+reserve|minimum\s+reserve|न्यूनतम\s+रिज़र्व|रिज़र्व\s+रखना|ਸੁਰੱਖਿਅਤ\s+ਰਿਜ਼ਰਵ)/i,
  ]);
  const minimum_reserve: number | null = reserveMatch
    ? reserveMatch.amount
    : existing?.minimum_reserve !== undefined
      ? existing.minimum_reserve
      : null;

  if (reserveMatch) {
    extracted_facts.push({
      field: "minimum_reserve",
      value: reserveMatch.amount,
      source_quote: reserveMatch.quote,
      confidence: 0.91,
      source_type: "user_statement",
    });
  }

  // Start from existing flows if provided, keyed by id
  const flowMap = new Map<string, CashFlow>();
  if (existing?.cash_flows) {
    for (const f of existing.cash_flows) {
      flowMap.set(f.id, { ...f });
    }
  }

  // 3. Extract business_sales
  const salesMatch = parseAmountMatch(text, [
    /(?:sales\s+are\s+around|daily\s+sales|earn\s+about|रोज़\s+की\s+बिक्री\s+लगभग|रोज़\s+करीब|roz\s+kareeb|ਰੋਜ਼ਾਨਾ\s+ਵਿਕਰੀ\s+ਲਗਭਗ|ਰੋਜ਼ਾਨਾ\s+ਲਗਭਗ)\s*₹?\s*([\d,]+)\s*(?:rupees|rs|रुपये|ਰੁਪਏ)?(?:\s*per\s+day|\s*daily|\s*रोज़)?/i,
    /₹?\s*([\d,]+)\s*(?:rupees|rs|रुपये)?\s*(?:per\s+day|daily)\s*(?:sales|earning)/i,
  ]);
  const ambiguousEarnWord = /earn\s+about|कमा\s+लेता|कमाता|milte\s+hain|ਕਮਾਉਂਦਾ/i.test(text);

  if (salesMatch) {
    const conf = ambiguousEarnWord ? 0.68 : 0.92;
    flowMap.set("cf_daily_sales", {
      id: "cf_daily_sales",
      label: "Daily vegetable sales",
      direction: "inflow",
      category: "business_sales",
      amount: salesMatch.amount,
      frequency: "daily",
      start_date: asOfDate,
      confidence: conf,
      source_type: "user_statement",
      source_note: salesMatch.quote,
      essential: true,
    });
    extracted_facts.push({
      field: "cash_flows.business_sales.amount",
      value: salesMatch.amount,
      source_quote: salesMatch.quote,
      confidence: conf,
      source_type: "user_statement",
    });
  }

  // 4. Extract business_stock_cost
  const stockMatch = parseAmountMatch(text, [
    /(?:stock\s+costs?|mandi\s+stock\s+costs?|माल\s+खरीदने\s+में|सब्ज़ी\s+खरीदने\s+में|ਸਟਾਕ\s+ਖਰੀਦਣ\s+ਦਾ\s+ਖਰਚਾ)\s*(?:around\s*)?₹?\s*([\d,]+)/i,
    /₹?\s*([\d,]+)\s*(?:rupees|rs|रुपये)?\s*(?:per\s+day|daily|रोज़)?\s*(?:for\s+stock|stock\s+cost|मंडी\s+से\s+माल)/i,
  ]);
  if (stockMatch) {
    flowMap.set("cf_daily_stock", {
      id: "cf_daily_stock",
      label: "Daily mandi vegetable stock",
      direction: "outflow",
      category: "business_stock_cost",
      amount: stockMatch.amount,
      frequency: "daily",
      start_date: asOfDate,
      confidence: 0.9,
      source_type: "user_statement",
      source_note: stockMatch.quote,
      essential: true,
    });
    extracted_facts.push({
      field: "cash_flows.business_stock_cost.amount",
      value: stockMatch.amount,
      source_quote: stockMatch.quote,
      confidence: 0.9,
      source_type: "user_statement",
    });
  }

  // 5. Extract business_operating_cost
  const opsMatch = parseAmountMatch(text, [
    /(?:pay|पर्ची\s+और\s+बर्फ\s+में|stall\s+fee)\s*₹?\s*([\d,]+)\s*(?:daily|per\s+day|रोज़)?/i,
    /₹?\s*([\d,]+)\s*(?:daily|रोज़)?\s*(?:for\s+stall\s+fee|stall\s+fee|ठेले\s+की\s+पर्ची)/i,
  ]);
  if (opsMatch) {
    flowMap.set("cf_stall_ops", {
      id: "cf_stall_ops",
      label: "Stall fee, ice & polybags",
      direction: "outflow",
      category: "business_operating_cost",
      amount: opsMatch.amount,
      frequency: "daily",
      start_date: asOfDate,
      confidence: 0.86,
      source_type: "user_statement",
      source_note: opsMatch.quote,
      essential: true,
    });
    extracted_facts.push({
      field: "cash_flows.business_operating_cost.amount",
      value: opsMatch.amount,
      source_quote: opsMatch.quote,
      confidence: 0.86,
      source_type: "user_statement",
    });
  }

  // 6. Extract daily household_essential
  const hhMatch = parseAmountMatch(text, [
    /(?:spend|राशन-दूध\s+में|rashan-doodh\s+ka|ਰਾਸ਼ਨ-ਦੁੱਧ\s+ਲਈ)\s*₹?\s*([\d,]+)\s*(?:daily|per\s+day|रोज़|ਰੋਜ਼)?/i,
    /₹?\s*([\d,]+)\s*(?:daily|per\s+day|रोज़)?\s*(?:on\s+household\s+groceries|for\s+home\s+groceries|घर\s+के\s+राशन)/i,
  ]);
  if (hhMatch) {
    flowMap.set("cf_household_food", {
      id: "cf_household_food",
      label: "Household groceries, milk & LPG",
      direction: "outflow",
      category: "household_essential",
      amount: hhMatch.amount,
      frequency: "daily",
      start_date: asOfDate,
      confidence: 0.88,
      source_type: "user_statement",
      source_note: hhMatch.quote,
      essential: true,
    });
    extracted_facts.push({
      field: "cash_flows.household_essential.amount",
      value: hhMatch.amount,
      source_quote: hhMatch.quote,
      confidence: 0.88,
      source_type: "user_statement",
    });
  }

  // 7. Extract supplier_payment
  const supplierMatch = parseAmountMatch(text, [
    /(?:supplier\s+payment\s+of|आढ़ती\s+को|सप्लायर\s+को|ਸਪਲਾਇਰ\s+ਨੂੰ)\s*₹?\s*([\d,]+)/i,
    /₹?\s*([\d,]+)\s*(?:rupees\s*)?(?:supplier\s+payment|due\s+to\s+supplier|सप्लायर\s+को\s+देने)/i,
  ]);
  if (supplierMatch || /supplier\s+payment\s+due/i.test(text)) {
    const daysOffset = parseDaysOffset(text);
    const dueDate = addDaysISO(asOfDate, daysOffset);
    const amt = supplierMatch ? supplierMatch.amount : 2200;
    const conf = supplierMatch ? 0.95 : 0.6;
    flowMap.set("cf_supplier_due", {
      id: "cf_supplier_due",
      label: "Wholesale supplier settlement",
      direction: "outflow",
      category: "supplier_payment",
      amount: amt,
      frequency: "once",
      start_date: dueDate,
      confidence: conf,
      source_type: "user_statement",
      source_note: supplierMatch ? supplierMatch.quote : "supplier payment due in five days",
      essential: true,
    });
    extracted_facts.push({
      field: "cash_flows.supplier_payment",
      value: `${amt} on ${dueDate}`,
      source_quote: supplierMatch ? supplierMatch.quote : "supplier payment due in five days",
      confidence: conf,
      source_type: "user_statement",
    });
  }

  // 8. Extract weekly debt_repayment
  const loanMatch = parseAmountMatch(text, [
    /₹?\s*([\d,]+)\s*(?:weekly\s+loan|loan\s+kist|किस्त\s+जाती|लोन\s+किस्त|ਕਿਸ਼ਤ)/i,
    /(?:हर\s+हफ्ते|हर\s+रविवार|har\s+hafte|ਹਰ\s+ਐਤਵਾਰ)\s*₹?\s*([\d,]+)/i,
  ]);
  if (loanMatch) {
    const loanDate = addDaysISO(asOfDate, 6);
    flowMap.set("cf_weekly_loan", {
      id: "cf_weekly_loan",
      label: "Weekly micro-loan instalment (kist)",
      direction: "outflow",
      category: "debt_repayment",
      amount: loanMatch.amount,
      frequency: "weekly",
      start_date: loanDate,
      confidence: 0.91,
      source_type: "user_statement",
      source_note: loanMatch.quote,
      essential: true,
    });
    extracted_facts.push({
      field: "cash_flows.debt_repayment.amount",
      value: loanMatch.amount,
      source_quote: loanMatch.quote,
      confidence: 0.91,
      source_type: "user_statement",
    });
  }

  // 9. Extract monthly rent
  const rentMatch = parseAmountMatch(text, [
    /(?:room\s+rent\s+of|rent\s+of|कमरे\s+का\s+किराया|kiraya|ਕਮਰੇ\s+ਦਾ\s+ਕਿਰਾਇਆ)\s*₹?\s*([\d,]+)/i,
    /₹?\s*([\d,]+)\s*(?:कमरे\s+का\s+किराया|kiraya|room\s+rent|rent)/i,
  ]);
  if (rentMatch) {
    const { year, month } = parseISODate(asOfDate);
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const rentDate = `${String(nextMonthYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
    flowMap.set("cf_monthly_rent", {
      id: "cf_monthly_rent",
      label: "Room rent & electricity",
      direction: "outflow",
      category: "household_essential",
      amount: rentMatch.amount,
      frequency: "monthly",
      start_date: rentDate,
      confidence: 0.94,
      source_type: "user_statement",
      source_note: rentMatch.quote,
      essential: true,
    });
    extracted_facts.push({
      field: "cash_flows.household_essential.rent",
      value: rentMatch.amount,
      source_quote: rentMatch.quote,
      confidence: 0.94,
      source_type: "user_statement",
    });
  }

  // A historical loan balance is useful context, but it is NOT a forecast flow.
  // Keep it as a sourced fact and ask for the repayment schedule instead of
  // inventing a rate, instalment or due date.
  const historicalDebtMatch = parseAmountMatch(text, [
    /(?:borrowed|took\s+(?:a\s+)?loan|उधार\s+लिया|कर्ज़\s+लिया|ਕਰਜ਼ਾ\s+ਲਿਆ)\s+(?:last\s+month|पिछले\s+महीने|ਪਿਛਲੇ\s+ਮਹੀਨੇ)?\s*₹?\s*([\d,]+)/i,
    /₹?\s*([\d,]+)\s*(?:उधार|कर्ज़|loan|borrowed)\s*(?:last\s+month|पिछले\s+महीने|ਪਿਛਲੇ\s+ਮਹੀਨੇ)/i,
    /₹?\s*([\d,]+)\s*(?:rupees|रुपये|रुपए)?\s*(?:उधार\s+लिया|कर्ज़\s+लिया|borrowed|loan\s+took)/i,
  ]);
  if (historicalDebtMatch) {
    extracted_facts.push({
      field: "user_stated.historical_debt_balance",
      value: historicalDebtMatch.amount,
      source_quote: historicalDebtMatch.quote,
      confidence: 0.88,
      source_type: "user_statement",
    });
    warnings.push(
      "A historical borrowing amount was mentioned. It is not treated as a scheduled cash flow. Confirm the next instalment amount and due date before relying on a projection.",
    );
    questions_required.push({
      id: "q_debt_schedule",
      field: "cash_flows.debt_repayment",
      question:
        lang === "hi-IN"
          ? "₹10,000 के उधार की अगली किस्त कितनी है और किस तारीख को देनी है?"
          : lang === "pa-IN"
            ? "₹10,000 ਦੇ ਕਰਜ਼ੇ ਦੀ ਅਗਲੀ ਕਿਸ਼ਤ ਕਿੰਨੀ ਹੈ ਅਤੇ ਕਿਹੜੀ ਤਾਰੀਖ ਨੂੰ ਦੇਣੀ ਹੈ?"
            : "What is the next instalment amount and due date for this borrowing?",
      why_it_matters:
        "A borrowed principal is not the same as a repayment. LUMO needs the actual instalment and due date; it will not infer interest, approval, or repayment terms.",
      language: lang,
    });
  }

  const cash_flows = Array.from(flowMap.values());

  // Trigger clarification questions for missing or ambiguous facts
  const hasStockCost = cash_flows.some((f) => f.category === "business_stock_cost");
  if (salesMatch && (!hasStockCost || ambiguousEarnWord)) {
    questions_required.push({
      id: "q_sales_type",
      field: "cash_flows.business_sales",
      question:
        lang === "hi-IN"
          ? "क्या यह ₹1,500 आपकी कुल बिक्री (Gross Sales) है या मंडी का माल खरीदने के बाद बची रकम?"
          : lang === "pa-IN"
            ? "ਕੀ ਇਹ ₹1,500 ਤੁਹਾਡੀ ਕੁੱਲ ਵਿਕਰੀ ਹੈ ਜਾਂ ਮੰਡੀ ਦਾ ਮਾਲ ਖਰੀਦਣ ਤੋਂ ਬਾਅਦ ਬਚੀ ਰਕਮ?"
            : "Is this your total gross sales or the money remaining after buying stock?",
      why_it_matters:
        lang === "hi-IN"
          ? "कुल बिक्री और शुद्ध मुनाफ़ा अलग होते हैं। मंडी के माल की लागत जाने बिना नकदी का सही अनुमान नहीं लग सकता।"
          : "Sales are not the same as profit. Keeping gross sales and stock replenishment separate prevents overestimating available cash.",
      language: lang,
      suggested_options: [
        {
          label: "It is gross sales; my daily stock cost is ₹900",
          action: "add_stock_cost_900",
          value: 900,
        },
        {
          label: "It is gross sales; my daily stock cost is ₹1,000",
          action: "add_stock_cost_1000",
          value: 1000,
        },
      ],
    });
  }

  if (cash_on_hand === null) {
    questions_required.push({
      id: "q_cash_on_hand",
      field: "cash_on_hand",
      question:
        lang === "hi-IN"
          ? "अभी आपके पास हाथ में (गल्ले या खाते में) लगभग कितना नकद उपलब्ध है?"
          : lang === "pa-IN"
            ? "ਹੁਣ ਤੁਹਾਡੇ ਕੋਲ ਹੱਥ ਵਿੱਚ ਕਿੰਨਾ ਨਕਦ ਉਪਲਬਧ ਹੈ?"
            : "How much cash do you currently have on hand today?",
      why_it_matters:
        lang === "hi-IN"
          ? "LUMO कभी भी अज्ञात नकदी को अपने-आप ₹0 नहीं मानता। शुरुआती नकदी के बिना 30-दिन का प्रोजेक्शन नहीं चल सकता।"
          : "LUMO never silently replaces unknown cash with ₹0. Starting cash is required to project daily balances.",
      language: lang,
      suggested_options: [
        { label: "Set cash on hand to ₹4,200", action: "set_cash", value: 4200 },
        { label: "Set cash on hand to ₹2,000", action: "set_cash", value: 2000 },
      ],
    });
    warnings.push(
      "Cash on hand was not mentioned and has been kept as null (Unknown). Please provide it before running simulation.",
    );
  }

  if (minimum_reserve === null) {
    questions_required.push({
      id: "q_minimum_reserve",
      field: "minimum_reserve",
      question:
        lang === "hi-IN"
          ? "आप आपातकाल के लिए कम से कम कितना सुरक्षा रिज़र्व (बफर) अलग रखना चाहते हैं?"
          : lang === "pa-IN"
            ? "ਤੁਸੀਂ ਐਮਰਜੈਂਸੀ ਲਈ ਘੱਟੋ-ਘੱਟ ਕਿੰਨਾ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਰੱਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?"
            : "What is the minimum safety reserve (emergency buffer) you want to keep untouched?",
      why_it_matters:
        lang === "hi-IN"
          ? "सुरक्षा रिज़र्व से पता चलता है कि किस तारीख को आपका नकद बफर टूट सकता है।"
          : "Your minimum reserve lets the Stress Radar warn you before a dip forces high-interest borrowing.",
      language: lang,
      suggested_options: [
        { label: "Set minimum reserve to ₹1,500", action: "set_reserve", value: 1500 },
        { label: "Set minimum reserve to ₹1,000", action: "set_reserve", value: 1000 },
      ],
    });
    warnings.push(
      "Minimum safety reserve was not mentioned and has been kept as null (Unknown).",
    );
  }

  if (extracted_facts.length === 0) {
    warnings.push(
      "No explicit rupee figures were detected in the statement. Try including daily sales, stock costs, or upcoming payments, or load the demo scenario.",
    );
  }

  const draft_twin: FinancialTwin = {
    schema_version: "1.0",
    twin_id: existing?.twin_id || "twin_intake_vendor_01",
    as_of_date: asOfDate,
    language: lang,
    profile: {
      occupation,
      state,
      district,
    },
    cash_on_hand,
    minimum_reserve,
    forecast_days: existing?.forecast_days || 30,
    cash_flows,
    goals:
      existing?.goals && existing.goals.length > 0
        ? existing.goals
        : [
            {
              id: "goal_school_fee",
              label: "Daughter's school exam fee",
              target_amount: 1800,
              target_date: "2026-11-20",
              priority: "essential",
              current_saved: 400,
            },
          ],
  };

  return {
    mode: "demo",
    draft_twin,
    questions_required,
    extracted_facts,
    warnings,
  };
}

/**
 * Validates that a FinancialTwin has complete essential inputs before running simulation.
 * Never silently replaces null with 0.
 */
export function validateTwinForSimulation(twin: FinancialTwin): SimulationValidationIssue[] {
  const issues: SimulationValidationIssue[] = [];

  if (twin.cash_on_hand === null || twin.cash_on_hand === undefined || Number.isNaN(twin.cash_on_hand)) {
    issues.push({
      field: "cash_on_hand",
      message:
        "Cash on hand is unknown (null). Please enter your current cash on hand in the Financial Twin instead of assuming ₹0.",
    });
  } else if (twin.cash_on_hand < 0) {
    issues.push({
      field: "cash_on_hand",
      message: "Cash on hand must be a non-negative INR amount.",
    });
  }

  if (
    twin.minimum_reserve === null ||
    twin.minimum_reserve === undefined ||
    Number.isNaN(twin.minimum_reserve)
  ) {
    issues.push({
      field: "minimum_reserve",
      message:
        "Minimum safety reserve is unknown (null). Please specify your minimum safety reserve to evaluate reserve breaches.",
    });
  } else if (twin.minimum_reserve < 0) {
    issues.push({
      field: "minimum_reserve",
      message: "Minimum reserve must be a non-negative INR amount.",
    });
  }

  if (!Number.isInteger(twin.forecast_days) || twin.forecast_days < 1 || twin.forecast_days > 90) {
    issues.push({
      field: "forecast_days",
      message: "Forecast horizon must be an integer between 1 and 90 days.",
    });
  }

  if (!twin.cash_flows || twin.cash_flows.length === 0) {
    issues.push({
      field: "cash_flows",
      message: "At least one cash flow (inflow or outflow) is required to run a projection.",
    });
  }

  return issues;
}

/**
 * Determines whether a CashFlow applies on a given ISO date `targetDate`.
 * - For recurring monthly flows, uses the day of month from `start_date`,
 *   clamping to the final calendar day when the target month is shorter.
 * - Processes flows beginning on their `start_date`.
 */
export function doesFlowApplyOnDate(flow: CashFlow, targetDate: string): boolean {
  const diff = diffDaysISO(flow.start_date, targetDate);
  if (diff < 0) return false;

  switch (flow.frequency) {
    case "once":
      return diff === 0;
    case "daily":
      return true;
    case "weekly":
      return diff % 7 === 0;
    case "monthly": {
      const startParts = parseISODate(flow.start_date);
      const targetParts = parseISODate(targetDate);
      const maxDayInTargetMonth = daysInMonth(targetParts.year, targetParts.month);
      const clampedDay = Math.min(startParts.day, maxDayInTargetMonth);
      return targetParts.day === clampedDay;
    }
    default:
      return false;
  }
}

function runSingleScenario(
  twin: FinancialTwin,
  scenario: SimulationScenarioInput,
): ScenarioResult {
  const startCash = twin.cash_on_hand as number;
  const minReserve = twin.minimum_reserve as number;
  const horizon = twin.forecast_days;
  const shock = scenario.income_shock;

  const timeline: DailyBalancePoint[] = [];
  let runningBalance = startCash;
  let minBalance = Number.POSITIVE_INFINITY;
  let minBalanceDate = twin.as_of_date;
  let firstBreachDate: string | null = null;

  const shockStart = shock?.start_date ?? twin.as_of_date;
  const shockEnd = shock ? addDaysISO(shockStart, Math.max(0, shock.duration_days - 1)) : "";

  const datedLumpyEvents: MajorDriver[] = [];
  let totalShockAdjustment = 0;

  for (let dayIdx = 0; dayIdx < horizon; dayIdx++) {
    const currentDate = addDaysISO(twin.as_of_date, dayIdx);
    const opening = runningBalance;
    let dayInflows = 0;
    let dayOutflows = 0;
    const applied_items: DailyBalancePoint["applied_items"] = [];

    const inShockWindow =
      shock !== null &&
      shock !== undefined &&
      diffDaysISO(shockStart, currentDate) >= 0 &&
      diffDaysISO(currentDate, shockEnd) >= 0;

    for (const flow of twin.cash_flows) {
      if (!doesFlowApplyOnDate(flow, currentDate)) continue;

      let effectiveAmount = flow.amount;
      if (
        inShockWindow &&
        shock &&
        flow.direction === "inflow" &&
        flow.category === shock.category
      ) {
        effectiveAmount = Math.round(flow.amount * shock.multiplier);
        totalShockAdjustment += effectiveAmount - flow.amount;
      }

      if (flow.direction === "inflow") {
        dayInflows += effectiveAmount;
      } else {
        dayOutflows += effectiveAmount;
      }

      applied_items.push({
        id: flow.id,
        label: flow.label,
        direction: flow.direction,
        amount: effectiveAmount,
        category: flow.category,
      });

      if (flow.direction === "outflow" && flow.frequency !== "daily" && effectiveAmount >= 300) {
        datedLumpyEvents.push({
          flow_id: flow.id,
          label: flow.label,
          category: flow.category,
          date: currentDate,
          amount: effectiveAmount,
          impact_note: `Scheduled ${flow.frequency} ${flow.category.replace(/_/g, " ")} of ${formatINR(effectiveAmount)} on ${formatDisplayDate(currentDate)}`,
        });
      }
    }

    const closing = Math.round(opening + dayInflows - dayOutflows);
    const reserve_gap = Math.max(0, Math.round(minReserve - closing));

    timeline.push({
      date: currentDate,
      opening_balance: Math.round(opening),
      inflows: Math.round(dayInflows),
      outflows: Math.round(dayOutflows),
      closing_balance: closing,
      reserve_gap,
      applied_items,
    });

    if (closing < minBalance) {
      minBalance = closing;
      minBalanceDate = currentDate;
    }

    if (closing < minReserve && firstBreachDate === null) {
      firstBreachDate = currentDate;
    }

    runningBalance = closing;
  }

  if (timeline.length === 0) {
    minBalance = startCash;
  }

  const shortfall_to_reserve = Math.max(0, Math.round(minReserve - minBalance));
  let status: ScenarioStatus = "within_reserve";
  if (minBalance < 0) {
    status = "cash_deficit";
  } else if (firstBreachDate !== null) {
    status = "reserve_breach";
  }

  const major_drivers: MajorDriver[] = [];
  if (shock && totalShockAdjustment !== 0) {
    const shockKind = shock.multiplier < 1 ? "drop" : "increase";
    const adjustmentVerb = totalShockAdjustment < 0 ? "reduces" : "adds";
    major_drivers.push({
      flow_id: "driver_income_shock",
      label: `${shock.category.replace(/_/g, " ")} ${shockKind} (${Math.round(Math.abs(1 - shock.multiplier) * 100)}% for ${shock.duration_days} days)`,
      category: shock.category,
      date: shockStart,
      amount: Math.round(Math.abs(totalShockAdjustment)),
      impact_note: `${adjustmentVerb} cumulative inflows by ${formatINR(Math.abs(totalShockAdjustment))} between ${formatDisplayDate(shockStart)} and ${formatDisplayDate(shockEnd)}.`,
    });
  }

  // Sort dated lumpy outflows by amount descending, keep top 4
  const topDated = [...datedLumpyEvents]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  major_drivers.push(...topDated);

  const lowConfidenceFlows = twin.cash_flows.filter((f) => f.confidence < 0.8);
  const notes: string[] = [
    `Projection assumes recurring daily, weekly, and monthly flows continue unchanged from ${formatDisplayDate(twin.as_of_date)} for ${horizon} days.`,
    "Projected balances are conditional on estimated daily sales and costs, not guaranteed outcomes.",
  ];
  if (shock) {
    notes.push(
      `Scenario applies multiplier ${shock.multiplier} (${shock.multiplier < 1 ? `${Math.round((1 - shock.multiplier) * 100)}% reduction` : `${Math.round((shock.multiplier - 1) * 100)}% increase`}) only to '${shock.category}' inflows for ${shock.duration_days} days starting ${shock.start_date}, while stock and household commitments remain unchanged unless adjusted.`,
    );
  }
  if (lowConfidenceFlows.length > 0) {
    notes.push(
      `${lowConfidenceFlows.length} cash flow item(s) have extraction confidence below 80%; verify them in the Financial Twin.`,
    );
  }

  return {
    scenario_id: scenario.scenario_id,
    label: scenario.label,
    status,
    timeline,
    minimum_balance: minBalance,
    minimum_balance_date: minBalanceDate,
    shortfall_to_reserve,
    first_reserve_breach_date: firstBreachDate,
    major_drivers,
    notes,
  };
}

/**
 * Deterministic implementation of POST /api/finance/simulate
 */
export function simulateFinancialScenariosDeterministic(
  request: SimulateRequest,
): SimulateResponse {
  const issues = validateTwinForSimulation(request.twin);
  if (issues.length > 0) {
    const err = new Error(issues.map((i) => i.message).join(" "));
    (err as Error & { validationIssues?: SimulationValidationIssue[] }).validationIssues = issues;
    throw err;
  }

  const scenarios: SimulationScenarioInput[] =
    request.scenarios && request.scenarios.length > 0
      ? request.scenarios
      : [{ scenario_id: "baseline", label: "Expected situation", income_shock: null }];

  const results = scenarios.map((sc) => runSingleScenario(request.twin, sc));
  const baseline = results.find((r) => r.scenario_id === "baseline") ?? results[0];
  const mostStressed = [...results].sort((a, b) => a.minimum_balance - b.minimum_balance)[0];

  return {
    schema_version: "1.0",
    results,
    comparison: {
      baseline_scenario_id: baseline.scenario_id,
      most_stressed_scenario_id: mostStressed.scenario_id,
      change_in_minimum_balance: Math.round(
        mostStressed.minimum_balance - baseline.minimum_balance,
      ),
    },
  };
}

/**
 * Deterministic implementation of POST /api/explain (LUMO Samjho)
 */
export function explainFinancialTermDeterministic(
  request: ExplainRequest,
): ExplainResponse {
  const lang = request.language || "en-IN";
  const ctx = request.context || {};
  const shortfallStr = formatINR(ctx.shortfall_to_reserve ?? 500, lang);
  const minDateStr = formatDisplayDate(ctx.minimum_balance_date ?? "2026-10-24", lang);
  const reserveStr = formatINR(ctx.minimum_reserve ?? 1500, lang);

  const explanations: Record<
    string,
    Record<LumoLanguage, { explanation: string; example: string }>
  > = {
    gross_sales: {
      "en-IN": {
        explanation:
          "Gross sales is the total cash you collect from customers in a day before paying for mandi stock, stall fees, or household needs. It is not your take-home profit.",
        example:
          "If customers pay you ₹1,500 for vegetables today, ₹1,500 is your gross sales—even though ₹900 of that must go right back to buy tomorrow's stock at the mandi.",
      },
      "hi-IN": {
        explanation:
          "कुल बिक्री (Gross sales) वह पूरी नकद रकम है जो दिन भर में ग्राहकों से आपके गल्ले में आती है—इसमें से अभी मंडी के माल की लागत, ठेले का खर्च या घर का खर्च घटाया नहीं गया है। यह आपका शुद्ध मुनाफ़ा नहीं है।",
        example:
          "अगर आज ग्राहकों ने ₹1,500 की सब्ज़ी खरीदी, तो ₹1,500 आपकी कुल बिक्री है—भले ही इसमें से ₹900 कल सुबह फिर से मंडी में माल लेने के लिए देने पड़ें।",
      },
      "pa-IN": {
        explanation:
          "ਕੁੱਲ ਵਿਕਰੀ (Gross sales) ਉਹ ਪੂਰੀ ਰਕਮ ਹੈ ਜੋ ਦਿਨ ਭਰ ਵਿੱਚ ਗਾਹਕਾਂ ਤੋਂ ਤੁਹਾਡੇ ਗੱਲੇ ਵਿੱਚ ਆਉਂਦੀ ਹੈ—ਇਸ ਵਿੱਚੋਂ ਅਜੇ ਮੰਡੀ ਦੇ ਮਾਲ ਦੀ ਲਾਗਤ ਜਾਂ ਰੇਹੜੀ ਦਾ ਖਰਚਾ ਨਹੀਂ ਕੱਟਿਆ ਗਿਆ।",
        example:
          "ਜੇਕਰ ਅੱਜ ਗਾਹਕਾਂ ਨੇ ₹1,500 ਦੀ ਸਬਜ਼ੀ ਖਰੀਦੀ, ਤਾਂ ₹1,500 ਤੁਹਾਡੀ ਕੁੱਲ ਵਿਕਰੀ ਹੈ, ਭਾਵੇਂ ₹900 ਕੱਲ੍ਹ ਸਵੇਰੇ ਮੰਡੀ ਵਿੱਚ ਸਟਾਕ ਲੈਣ ਲਈ ਦੇਣੇ ਪੈਣ।",
      },
    },
    net_operating_cash: {
      "en-IN": {
        explanation:
          "Net operating cash is the actual business earnings left at the end of the day after subtracting your stock replacement cost and daily stall operating expenses from gross sales.",
        example:
          "With ₹1,500 in daily vegetable sales minus ₹900 for mandi stock and ₹120 for stall fee and ice, your net operating cash from the stall is ₹480 per day (before ₹280 household groceries).",
      },
      "hi-IN": {
        explanation:
          "शुद्ध व्यापारिक बचत (Net operating cash) वह असली रकम है जो रोज़ की कुल बिक्री में से मंडी के माल (₹900) और ठेले के संचालन खर्च (₹120) को निकालने के बाद आपके हाथ में बचती है।",
        example:
          "₹1,500 रोज़ की बिक्री में से ₹900 माल और ₹120 पर्ची-बर्फ घटाने के बाद व्यापार से ₹480 रोज़ बचते हैं, जिससे घर का ₹280 राशन चलता है और ₹200 शुद्ध बचत जुड़ती है।",
      },
      "pa-IN": {
        explanation:
          "ਸ਼ੁੱਧ ਕਾਰੋਬਾਰੀ ਬੱਚਤ (Net operating cash) ਉਹ ਅਸਲ ਰਕਮ ਹੈ ਜੋ ਰੋਜ਼ਾਨਾ ਵਿਕਰੀ ਵਿੱਚੋਂ ਮੰਡੀ ਦੇ ਮਾਲ (₹900) ਅਤੇ ਰੇਹੜੀ ਦੇ ਖਰਚੇ (₹120) ਕੱਢਣ ਤੋਂ ਬਾਅਦ ਬਚਦੀ ਹੈ।",
        example:
          "₹1,500 ਵਿਕਰੀ ਵਿੱਚੋਂ ₹900 ਸਟਾਕ ਅਤੇ ₹120 ਪਰਚੀ-ਬਰਫ਼ ਕੱਢ ਕੇ ₹480 ਬਚਦੇ ਹਨ, ਜਿਸ ਵਿੱਚੋਂ ₹280 ਘਰ ਦਾ ਰਾਸ਼ਨ ਚੱਲਦਾ ਹੈ।",
      },
    },
    supplier_credit: {
      "en-IN": {
        explanation:
          "Supplier credit is stock or goods you take from a wholesaler today with a promise to pay a lump sum on an agreed date. Because it falls due all at once, it can create a sudden dip in your cash balance.",
        example: `In your twin, the ₹2,200 wholesale potato and onion settlement due on ${minDateStr} pulls down your cash buffer in a single day.`,
      },
      "hi-IN": {
        explanation:
          "सप्लायर या आढ़ती उधार (Supplier credit) वह माल है जो आप आज लेते हैं और जिसका इकट्ठा भुगतान कुछ दिनों बाद तय तारीख को करना होता है। एक साथ बड़ी रकम जाने से उस दिन नकदी अचानक गिर सकती है।",
        example: `आपके विवरण में ₹2,200 का आढ़ती भुगतान एक साथ आने पर नकद शेष एक ही दिन में तेज़ी से नीचे आता है।`,
      },
      "pa-IN": {
        explanation:
          "ਸਪਲਾਇਰ ਉਧਾਰ (Supplier credit) ਉਹ ਮਾਲ ਹੈ ਜੋ ਤੁਸੀਂ ਅੱਜ ਲੈਂਦੇ ਹੋ ਅਤੇ ਜਿਸ ਦਾ ਇਕੱਠਾ ਭੁਗਤਾਨ ਤੈਅ ਤਾਰੀਖ ਨੂੰ ਕਰਨਾ ਹੁੰਦਾ ਹੈ।",
        example: `ਤੁਹਾਡੇ ਟਵਿਨ ਵਿੱਚ ₹2,200 ਦਾ ਆੜ੍ਹਤੀ ਭੁਗਤਾਨ ਆਉਣ 'ਤੇ ਨਕਦ ਬਕਾਇਆ ਇੱਕੋ ਦਿਨ ਵਿੱਚ ਘੱਟ ਜਾਂਦਾ ਹੈ।`,
      },
    },
    debt_repayment: {
      "en-IN": {
        explanation:
          "Debt repayment is a fixed loan instalment (kist) that must be paid on its due schedule whether business sales are strong or weak that week.",
        example:
          "Your ₹700 weekly loan instalment comes due every 7 days. When combined with a supplier payment or monthly rent in the same week, it increases cash stress.",
      },
      "hi-IN": {
        explanation:
          "ऋण किस्त (Debt repayment) वह तय भुगतान है जो हर हफ्ते या महीने समय पर देना ही पड़ता है, चाहे उस हफ्ते बिक्री अच्छी हुई हो या कम।",
        example:
          "हर हफ्ते जाने वाली ₹700 की किस्त जब सप्लायर के ₹2,200 या महीने के ₹1,800 किराये के आस-पास पड़ती है, तो नकदी पर दबाव बढ़ जाता है।",
      },
      "pa-IN": {
        explanation:
          "ਕਰਜ਼ੇ ਦੀ ਕਿਸ਼ਤ (Debt repayment) ਉਹ ਤੈਅ ਭੁਗਤਾਨ ਹੈ ਜੋ ਹਰ ਹਫ਼ਤੇ ਜਾਂ ਮਹੀਨੇ ਸਮੇਂ ਸਿਰ ਦੇਣਾ ਪੈਂਦਾ ਹੈ, ਭਾਵੇਂ ਵਿਕਰੀ ਘੱਟ ਹੋਵੇ ਜਾਂ ਵੱਧ।",
        example:
          "ਹਰ ਹਫ਼ਤੇ ਜਾਣ ਵਾਲੀ ₹700 ਦੀ ਕਿਸ਼ਤ ਜਦੋਂ ਸਪਲਾਇਰ ਭੁਗਤਾਨ ਜਾਂ ਕਿਰਾਏ ਦੇ ਨੇੜੇ ਆਉਂਦੀ ਹੈ ਤਾਂ ਨਕਦੀ 'ਤੇ ਦਬਾਅ ਵਧਦਾ ਹੈ।",
      },
    },
    minimum_reserve: {
      "en-IN": {
        explanation:
          "Your minimum safety reserve is the emergency cash cushion you aim to keep untouched so that a few slow days or a minor illness never forces you into high-interest daily borrowing.",
        example: `You set ${reserveStr} as your safety reserve. Whenever LUMO projects your closing balance dropping below ${reserveStr}, it flags a reserve breach early.`,
      },
      "hi-IN": {
        explanation:
          "न्यूनतम सुरक्षा रिज़र्व (Minimum reserve) वह आपातकालीन नकद बफर है जिसे आप हमेशा अलग रखना चाहते हैं ताकि बारिश, बीमारी या मंदी के दिनों में महँगे ब्याज पर उधार न लेना पड़े।",
        example: `आपने ${reserveStr} को अपना सुरक्षा रिज़र्व रखा है। जब भी अनुमानित नकद शेष ${reserveStr} से नीचे जाता है, LUMO पहले से चेतावनी देता है।`,
      },
      "pa-IN": {
        explanation:
          "ਘੱਟੋ-ਘੱਟ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ (Minimum reserve) ਉਹ ਐਮਰਜੈਂਸੀ ਨਕਦ ਬਫਰ ਹੈ ਜਿਸ ਨੂੰ ਤੁਸੀਂ ਹਮੇਸ਼ਾ ਵੱਖ ਰੱਖਣਾ ਚਾਹੁੰਦੇ ਹੋ ਤਾਂ ਜੋ ਮੰਦੀ ਦੇ ਦਿਨਾਂ ਵਿੱਚ ਮਹਿੰਗਾ ਉਧਾਰ ਨਾ ਲੈਣਾ ਪਵੇ।",
        example: `ਤੁਸੀਂ ${reserveStr} ਆਪਣਾ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਰੱਖਿਆ ਹੈ। ਜਦੋਂ ਵੀ ਅਨੁਮਾਨਿਤ ਨਕਦ ${reserveStr} ਤੋਂ ਹੇਠਾਂ ਜਾਂਦਾ ਹੈ, LUMO ਅਗਾਊਂ ਚੇਤਾਵਨੀ ਦਿੰਦਾ ਹੈ।`,
      },
    },
    projected_cash_shortfall: {
      "en-IN": {
        explanation:
          "A projected cash shortfall measures how far your lowest forecasted cash balance drops below your minimum safety reserve (or below ₹0) if current inflows and outflows continue as scheduled.",
        example: `Under the current scenario (${ctx.scenario_status ?? "reserve_breach"}), your lowest balance around ${minDateStr} is ${shortfallStr} below your ${reserveStr} safety reserve.`,
      },
      "hi-IN": {
        explanation:
          "अनुमानित नकदी की कमी (Projected cash shortfall) बताती है कि आने वाले दिनों में आपका सबसे कम नकद शेष आपके सुरक्षा रिज़र्व (${reserveStr}) से कितना नीचे जा सकता है।",
        example: `वर्तमान अनुमान में ${minDateStr} के आस-पास आपका नकद शेष आपके ${reserveStr} सुरक्षा रिज़र्व से ${shortfallStr} कम पड़ रहा है—ताकि आप समय रहते आढ़ती से किस्त बाँटने या खर्च समायोजित करने का निर्णय ले सकें।`,
      },
      "pa-IN": {
        explanation:
          "ਅਨੁਮਾਨਿਤ ਨਕਦੀ ਦੀ ਘਾਟ (Projected cash shortfall) ਦੱਸਦੀ ਹੈ ਕਿ ਆਉਣ ਵਾਲੇ ਦਿਨਾਂ ਵਿੱਚ ਤੁਹਾਡਾ ਸਭ ਤੋਂ ਘੱਟ ਨਕਦ ਬਕਾਇਆ ਤੁਹਾਡੇ ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਤੋਂ ਕਿੰਨਾ ਹੇਠਾਂ ਜਾ ਸਕਦਾ ਹੈ।",
        example: `ਮੌਜੂਦਾ ਅਨੁਮਾਨ ਵਿੱਚ ${minDateStr} ਦੇ ਨੇੜੇ ਤੁਹਾਡਾ ਨਕਦ ਬਕਾਇਆ ਤੁਹਾਡੇ ${reserveStr} ਸੁਰੱਖਿਅਤ ਰਿਜ਼ਰਵ ਤੋਂ ${shortfallStr} ਘੱਟ ਰਿਹਾ ਹੈ।`,
      },
    },
    income_shock: {
      "en-IN": {
        explanation:
          "An income shock is a temporary drop in your daily business sales—caused by heavy rain, heatwave, illness, or local market disruption—while fixed obligations like rent, supplier dues, and loan instalments still have to be paid.",
        example:
          "When daily vegetable sales fall by 30% (from ₹1,500 to ₹1,050) for 14 days, you collect ₹450 less each day—a ₹6,300 cumulative revenue drop over two weeks.",
      },
      "hi-IN": {
        explanation:
          "आय का झटका (Income shock) का मतलब है बारिश, बीमारी या बाज़ार बंद होने के कारण कुछ दिनों के लिए रोज़ की बिक्री का अचानक घट जाना—जबकि किराया, किस्त और सप्लायर का पैसा तय समय पर ही देना होता है।",
        example:
          "जब 14 दिनों के लिए बिक्री 30% घटती है (₹1,500 से घटकर ₹1,050 रोज़), तो हर दिन ₹450 कम आते हैं—यानी 14 दिनों में कुल ₹6,300 की बिक्री कम हो जाती है।",
      },
      "pa-IN": {
        explanation:
          "ਆਮਦਨ ਦਾ ਝਟਕਾ (Income shock) ਦਾ ਮਤਲਬ ਹੈ ਮੀਂਹ, ਬਿਮਾਰੀ ਜਾਂ ਬਾਜ਼ਾਰ ਬੰਦ ਹੋਣ ਕਾਰਨ ਕੁਝ ਦਿਨਾਂ ਲਈ ਰੋਜ਼ਾਨਾ ਵਿਕਰੀ ਦਾ ਅਚਾਨਕ ਘੱਟ ਜਾਣਾ, ਜਦੋਂ ਕਿ ਕਿਰਾਇਆ ਅਤੇ ਕਿਸ਼ਤਾਂ ਤੈਅ ਸਮੇਂ 'ਤੇ ਦੇਣੀਆਂ ਪੈਂਦੀਆਂ ਹਨ।",
        example:
          "ਜਦੋਂ 14 ਦਿਨਾਂ ਲਈ ਵਿਕਰੀ 30% ਘੱਟਦੀ ਹੈ (₹1,500 ਤੋਂ ₹1,050 ਰੋਜ਼), ਤਾਂ 14 ਦਿਨਾਂ ਵਿੱਚ ਕੁੱਲ ₹6,300 ਘੱਟ ਆਉਂਦੇ ਹਨ।",
      },
    },
  };

  const entry =
    explanations[request.term_key]?.[lang] ??
    explanations[request.term_key]?.["en-IN"] ??
    explanations.projected_cash_shortfall[lang] ??
    explanations.projected_cash_shortfall["en-IN"];

  return {
    language: lang,
    explanation: entry.explanation,
    example: entry.example,
    provider: "fallback",
    audio: {
      status: request.include_audio ? "unavailable" : "not_requested",
      mime_type: null,
      audio_base64: null,
    },
  };
}

/** Deterministic demo catalog. Entries are leads, not verified recommendations. */
export function getOfficialResourcesDeterministic(
  query?: ResourcesQuery,
): ResourcesResponse {
  const lang = query?.language ?? "en-IN";

  const items: Omit<
    OfficialResourceItem,
    "benefit_summary" | "source_name" | "source_status" | "relevance_confidence" | "relevance_basis"
  >[] = [
    {
      id: "pm_svanidhi",
      title:
        lang === "hi-IN"
          ? "पीएम स्वनिधि (PM SVANidhi) — स्ट्रीट वेंडर कार्यशील पूँजी ऋण"
          : lang === "pa-IN"
            ? "ਪੀਐਮ ਸਵਨਿਧੀ (PM SVANidhi) — ਰੇਹੜੀ-ਫੜ੍ਹੀ ਕਾਰਜਸ਼ੀਲ ਪੂੰਜੀ ਕਰਜ਼ਾ"
            : "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
      why_relevant:
        lang === "hi-IN"
          ? "शहरी स्ट्रीट वेंडरों को बिना गारंटी ₹10,000 से शुरू होने वाला कार्यशील पूँजी ऋण (समय पर भुगतान पर 7% ब्याज सब्सिडी और अगली किस्त ₹20,000 / ₹50,000) देता है, जिससे महँगे आढ़ती/साहूकार उधार पर निर्भरता घट सकती है।"
          : "Provides collateral-free working-capital credit starting at ₹10,000 (stepping up to ₹20,000 and ₹50,000) with a 7% interest subsidy on timely repayment for street vendors.",
      eligibility_summary:
        "Urban street vendors holding a Certificate of Vending / ID card or a Letter of Recommendation (LoR) from the Urban Local Body (ULB) / Town Vending Committee. Subject to municipal and lender verification.",
      requirements_to_verify: [
        "Aadhaar card linked with an active mobile number",
        "Urban Local Body (ULB) Vending Certificate / ID Card or Letter of Recommendation",
        "Active Aadhaar-seeded savings bank account",
      ],
      official_url: "https://pmsvanidhi.mohua.gov.in/",
      disclaimer:
        "Eligibility and approval must be verified with the official provider and participating lending institution.",
    },
    {
      id: "pm_mudra_yojana",
      title:
        lang === "hi-IN"
          ? "प्रधानमंत्री मुद्रा योजना (PMMY — शिशु / किशोर)"
          : lang === "pa-IN"
            ? "ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਮੁਦਰਾ ਯੋਜਨਾ (PMMY)"
            : "Pradhan Mantri MUDRA Yojana (PMMY)",
      why_relevant:
        lang === "hi-IN"
          ? "छोटे दुकानदारों, ठेला/रेहड़ी और सूक्ष्म व्यापारियों को उपकरण, तराजू, छत/तिरपाल या माल के लिए ₹50,000 (शिशु) तक और उससे ऊपर बिना गारंटी ऋण सुविधा।"
          : "Supports micro enterprises and small vendors with collateral-free business loans (Shishu up to ₹50,000) for working capital or equipment upgrades.",
      eligibility_summary:
        "Non-corporate, non-farm income-generating micro enterprises without existing bank defaults. Approval depends on bank cash-flow assessment.",
      requirements_to_verify: [
        "Identity and address proof (Aadhaar / Voter ID / PAN)",
        "Proof of business activity or Udyam Assist certificate",
        "Equipment quotation or working-capital requirement note",
      ],
      official_url: "https://www.mudra.org.in/",
      disclaimer:
        "Eligibility and approval must be verified with the official provider and lending bank or MFI.",
    },
    {
      id: "eshram_portal",
      title:
        lang === "hi-IN"
          ? "ई-श्रम पोर्टल (e-Shram — असंगठित श्रमिक पंजीकरण)"
          : lang === "pa-IN"
            ? "ਈ-ਸ਼੍ਰਮ ਪੋਰਟਲ (e-Shram)"
            : "e-Shram — National Database of Unorganised Workers",
      why_relevant:
        lang === "hi-IN"
          ? "असंगठित क्षेत्र के कामगारों और रेहड़ी-पटरी विक्रेताओं को UAN कार्ड और सामाजिक सुरक्षा / दुर्घटना बीमा योजनाओं से जोड़ता है।"
          : "Provides a universal UAN card for unorganised workers and street vendors to facilitate social-security portability and accident cover linkage.",
      eligibility_summary:
        "Unorganised workers aged 16–59 years who are not members of EPFO/ESIC and are not income-tax payers.",
      requirements_to_verify: [
        "Aadhaar number linked to an active mobile number",
        "Savings bank account number with IFSC code",
      ],
      official_url: "https://eshram.gov.in/",
      disclaimer:
        "Eligibility and approval must be verified with the official provider (Ministry of Labour & Employment).",
    },
    {
      id: "pm_jan_dhan",
      title:
        lang === "hi-IN"
          ? "प्रधानमंत्री जन-धन योजना (PMJDY)"
          : lang === "pa-IN"
            ? "ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਜਨ-ਧਨ ਯੋਜਨਾ (PMJDY)"
            : "Pradhan Mantri Jan Dhan Yojana (PMJDY)",
      why_relevant:
        lang === "hi-IN"
          ? "बुनियादी बैंकिंग सेवाओं के लिए जन-धन खाता। RuPay कार्ड, बीमा और ओवरड्राफ्ट की शर्तें बैंक तथा मौजूदा योजना नियमों से जाँचें।"
          : "A basic account for access to banking services. RuPay card, insurance cover and overdraft terms depend on current scheme rules, account conditions and bank verification.",
      eligibility_summary:
        "Any Indian citizen aged 10+ without an existing bank account; overdraft facility is subject to account history and bank approval.",
      requirements_to_verify: [
        "Aadhaar card or officially valid KYC document",
        "Passport-size photograph",
      ],
      official_url: "https://pmjdy.gov.in/",
      disclaimer:
        "Eligibility and approval must be verified with the official provider and participating bank branch.",
    },
    {
      id: "jan_suraksha_bima",
      title:
        lang === "hi-IN"
          ? "पीएम सुरक्षा बीमा (PMSBY) और जीवन ज्योति बीमा (PMJJBY)"
          : lang === "pa-IN"
            ? "ਪੀਐਮ ਸੁਰੱਖਿਆ ਬੀਮਾ (PMSBY) ਅਤੇ ਜੀਵਨ ਜੋਤੀ ਬੀਮਾ (PMJJBY)"
            : "Jan Suraksha — PMSBY (₹20/yr) & PMJJBY (₹436/yr)",
      why_relevant:
        lang === "hi-IN"
          ? "कम प्रीमियम (₹20/वर्ष दुर्घटना बीमा और ₹436/वर्ष जीवन बीमा) में ₹2-₹2 लाख का सुरक्षा कवर ताकि अचानक दुर्घटना की स्थिति में परिवार पर कर्ज का बोझ न पड़े।"
          : "Low-cost annual accident insurance (₹20/yr for ₹2L cover) and life insurance (₹436/yr for ₹2L cover) to shield household reserves from catastrophic shocks.",
      eligibility_summary:
        "Bank or post-office account holders aged 18–70 years (PMSBY) and 18–50 years (PMJJBY) who submit auto-debit consent.",
      requirements_to_verify: [
        "Active savings bank or post-office account",
        "Aadhaar linked to bank account",
        "Signed auto-debit mandate with nominee details",
      ],
      official_url: "https://jansuraksha.gov.in/",
      disclaimer:
        "Eligibility and approval must be verified with the official provider and your bank or post office.",
    },
    {
      id: "pm_kisan_directory",
      title: "PM-KISAN official information",
      why_relevant: "Potential information source for a small-farmer profile.",
      eligibility_summary: "Not assessed; check current official requirements.",
      requirements_to_verify: ["Land records", "Current enrollment and exclusion rules"],
      official_url: "https://pmkisan.gov.in/",
      disclaimer: "Eligibility and benefits have not been verified for this demo profile.",
    },
    {
      id: "kisan_credit_card_directory",
      title: "Kisan Credit Card (KCC) information",
      why_relevant: "Potential information source for farm working-capital options.",
      eligibility_summary: "Not assessed; check current official requirements with the lending bank.",
      requirements_to_verify: ["Farm activity and land/tenancy documents", "Lender terms and repayment schedule"],
      official_url: "https://www.myscheme.gov.in/schemes/kcc",
      disclaimer: "Credit availability, terms, and eligibility are not confirmed.",
    },
  ];

  const occupation = query?.occupation?.toLowerCase() ?? "";
  const visibleItems = /farmer|agricultur/i.test(occupation)
    ? items.filter((item) => ["pm_kisan_directory", "kisan_credit_card_directory", "pm_mudra_yojana", "eshram_portal"].includes(item.id))
    : /kiryana|shop|store/i.test(occupation)
      ? items.filter((item) => ["pm_mudra_yojana", "eshram_portal", "pm_jan_dhan", "jan_suraksha_bima"].includes(item.id))
      : /vendor|food|street/i.test(occupation)
        ? items.filter((item) => ["pm_svanidhi", "pm_mudra_yojana", "eshram_portal", "pm_jan_dhan"].includes(item.id))
        : items;

  return {
    items: visibleItems.map((item) => ({
      ...item,
      why_relevant: "Potential directory candidate. LUMO has not assessed individual financial fit.",
      eligibility_summary: "Current eligibility and benefits are not verified by LUMO; check the official source.",
      benefit_summary: "Benefit details have not been verified; consult the current official source.",
      requirements_to_verify: ["Current eligibility, benefits, amounts, and application status"],
      source_name: "Official portal (not checked live)",
      source_status: "demo_directory_candidate",
      relevance_confidence: "unassessed",
      relevance_basis: "Demo catalog entry only; no individual eligibility assessment.",
      disclaimer: "Demo directory candidate only. The official provider determines eligibility.",
    })),
  };
}
