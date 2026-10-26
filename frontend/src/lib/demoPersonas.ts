import { addDaysISO } from "./format.js";
import type { CashFlow, FinancialTwin, LumoLanguage } from "../types/lumo.js";

export type DemoPersonaId = "small-farmer" | "kirana-owner" | "street-food-vendor";

export interface DemoPersona {
  id: DemoPersonaId;
  name: string;
  role: string;
  location: string;
  summary: string;
  narrative: string;
  goal: string;
  incomeVariability: number;
  shock: { percentage: number; durationDays: number; reason: string };
  debtPrincipal: number | null;
  buildTwin: (asOfDate: string, language: LumoLanguage) => FinancialTwin;
}

function flow(
  twinId: string,
  asOfDate: string,
  data: Omit<CashFlow, "id" | "start_date" | "source_type"> & {
    id: string;
    daysFromToday?: number;
  },
): CashFlow {
  const { id, daysFromToday = 0, ...rest } = data;
  return {
    ...rest,
    id: `${twinId}_${id}`,
    start_date: addDaysISO(asOfDate, daysFromToday),
    source_type: "synthetic_dataset",
  };
}

function makeTwin(
  persona: DemoPersona,
  asOfDate: string,
  language: LumoLanguage,
  values: {
    cash: number;
    reserve: number;
    flows: CashFlow[];
  },
): FinancialTwin {
  return {
    schema_version: "1.0",
    twin_id: `demo_${persona.id.replace(/-/g, "_")}`,
    as_of_date: asOfDate,
    language,
    profile: {
      occupation: persona.id === "small-farmer"
        ? "small farmer"
        : persona.id === "kirana-owner"
          ? "small kiryana shop owner"
          : "street food vendor",
      state: "Uttar Pradesh",
      district: persona.id === "small-farmer" ? "Barabanki" : "Lucknow",
    },
    cash_on_hand: values.cash,
    minimum_reserve: values.reserve,
    forecast_days: 30,
    cash_flows: values.flows,
    goals: [
      {
        id: `${persona.id}_goal`,
        label: persona.goal,
        target_amount: persona.id === "small-farmer" ? 30000 : persona.id === "kirana-owner" ? 45000 : 22000,
        target_date: addDaysISO(asOfDate, 365),
        priority: "important",
        current_saved: 0,
        source_type: "synthetic_dataset",
        source_note: "Fictional demo goal; confirm the amount and date with the person.",
        confidence: 0.78,
      },
    ],
  };
}

const smallFarmer: DemoPersona = {
  id: "small-farmer",
  name: "Small Farmer",
  role: "Small wheat and vegetable farmer",
  location: "Barabanki, Uttar Pradesh",
  summary: "Seasonal crop income, variable market receipts, farm input costs, household spending and informal borrowing.",
  narrative: "I farm a small plot with wheat and vegetables near Barabanki. I usually receive about ₹12,000 from crop sales each week during the selling season, but income is seasonal and uncertain. Farm seed, fertilizer and irrigation costs are about ₹9,000 a month, and my household needs about ₹13,500 a month. I have ₹18,000 cash and want to keep ₹7,000 untouched. I still owe an informal lender about ₹38,000; I have not confirmed the repayment schedule. Heavy rain recently reduced one week's sales. My goal is to stabilize cash flow and reduce debt.",
  goal: "Stabilize cash flow and reduce informal debt",
  incomeVariability: 0.42,
  shock: { percentage: 45, durationDays: 14, reason: "heavy rain reduces crop-market receipts" },
  debtPrincipal: 38000,
  buildTwin: (asOfDate, language) => {
    const persona = smallFarmer;
    const id = "demo_small_farmer";
    return makeTwin(persona, asOfDate, language, {
      cash: 18000,
      reserve: 7000,
      flows: [
        flow(id, asOfDate, { id: "weekly_crop_sales", label: "Wheat and vegetable market sales", direction: "inflow", category: "business_sales", amount: 12000, frequency: "weekly", confidence: 0.68, source_note: "Fictional seasonal average during the selling period; weekly amount varies.", essential: true }),
        flow(id, asOfDate, { id: "farm_inputs", label: "Seed, fertilizer and irrigation", direction: "outflow", category: "business_stock_cost", amount: 9000, frequency: "monthly", confidence: 0.78, source_note: "Synthetic demo estimate; timing varies with crop cycle.", essential: true }),
        flow(id, asOfDate, { id: "household", label: "Household essentials", direction: "outflow", category: "household_essential", amount: 13500, frequency: "monthly", confidence: 0.84, source_note: "Synthetic demo estimate; actual household expenses need confirmation.", essential: true }),
        flow(id, asOfDate, { id: "flexible_household", label: "Flexible household spending (scenario input)", direction: "outflow", category: "household_discretionary", amount: 2200, frequency: "monthly", confidence: 0.62, source_note: "Illustrative only; included for an optional-spending intervention comparison.", essential: false }),
      ],
    });
  },
};

const kiranaOwner: DemoPersona = {
  id: "kirana-owner",
  name: "Kiryana Shop Owner",
  role: "Small kiryana and general store owner",
  location: "Lucknow, Uttar Pradesh",
  summary: "Daily shop sales, supplier credit, household costs, a scheduled business-loan instalment and inventory needs.",
  narrative: "I run a small kiryana and general store in Lucknow. Daily sales average ₹7,800, with demand higher around festivals. I restock at about ₹5,300 a day and pay ₹350 a day for shop electricity and transport. Household essentials cost about ₹12,000 a month. I have ₹42,000 cash and keep ₹15,000 as a reserve. I buy some stock on supplier credit: ₹16,000 is due in five days. My small business loan payment is ₹5,200 a month. I need working capital for inventory and want steadier monthly cash flow.",
  goal: "Build working capital and stabilize monthly cash flow",
  incomeVariability: 0.19,
  shock: { percentage: 30, durationDays: 14, reason: "seasonal demand falls for two weeks" },
  debtPrincipal: null,
  buildTwin: (asOfDate, language) => {
    const persona = kiranaOwner;
    const id = "demo_kirana_owner";
    return makeTwin(persona, asOfDate, language, {
      cash: 42000,
      reserve: 15000,
      flows: [
        flow(id, asOfDate, { id: "daily_sales", label: "Daily kiryana shop sales", direction: "inflow", category: "business_sales", amount: 7800, frequency: "daily", confidence: 0.86, source_note: "Synthetic weekly average; festive demand can be higher.", essential: true }),
        flow(id, asOfDate, { id: "inventory", label: "Daily inventory restocking", direction: "outflow", category: "business_stock_cost", amount: 5300, frequency: "daily", confidence: 0.84, source_note: "Synthetic demo estimate for goods sold and replenished.", essential: true }),
        flow(id, asOfDate, { id: "shop_operations", label: "Shop electricity and local transport", direction: "outflow", category: "business_operating_cost", amount: 350, frequency: "daily", confidence: 0.8, source_note: "Synthetic demo estimate; varies by trading days.", essential: true }),
        flow(id, asOfDate, { id: "household", label: "Household essentials", direction: "outflow", category: "household_essential", amount: 12000, frequency: "monthly", confidence: 0.85, source_note: "Synthetic demo estimate; actual household expenses need confirmation.", essential: true }),
        flow(id, asOfDate, { id: "supplier_credit", label: "Supplier credit settlement", direction: "outflow", category: "supplier_payment", amount: 16000, frequency: "once", daysFromToday: 5, confidence: 0.91, source_note: "Fictional supplier-credit payment due in five days.", essential: true }),
        flow(id, asOfDate, { id: "business_loan", label: "Small business loan instalment", direction: "outflow", category: "debt_repayment", amount: 5200, frequency: "monthly", confidence: 0.89, source_note: "Fictional scheduled loan payment; lender terms must be checked.", essential: true }),
        flow(id, asOfDate, { id: "flexible_household", label: "Flexible household spending (scenario input)", direction: "outflow", category: "household_discretionary", amount: 2800, frequency: "monthly", confidence: 0.62, source_note: "Illustrative only; included for an optional-spending intervention comparison.", essential: false }),
      ],
    });
  },
};

const streetFoodVendor: DemoPersona = {
  id: "street-food-vendor",
  name: "Street Food Vendor",
  role: "Street food and snack vendor",
  location: "Lucknow, Uttar Pradesh",
  summary: "Variable daily sales, raw-material costs, stall and transport expenses, informal borrowing and a recent disruption.",
  narrative: "I sell snacks from a street-food stall in Lucknow. Sales are usually around ₹3,200 a day, but demand changes with weather and the market. Raw materials cost about ₹1,350 daily and stall fees plus transport cost ₹420 daily. Household essentials are around ₹14,000 a month. I have ₹9,500 cash and try to keep ₹4,000 aside. I borrowed ₹22,000 informally, but the repayment dates and amount are not confirmed. A recent rainstorm damaged my stall cover and I missed two selling days. I want to expand carefully without taking dangerous debt.",
  goal: "Expand carefully without taking dangerous debt",
  incomeVariability: 0.34,
  shock: { percentage: 50, durationDays: 7, reason: "market disruption and rain reduce daily demand" },
  debtPrincipal: 22000,
  buildTwin: (asOfDate, language) => {
    const persona = streetFoodVendor;
    const id = "demo_street_food_vendor";
    return makeTwin(persona, asOfDate, language, {
      cash: 9500,
      reserve: 4000,
      flows: [
        flow(id, asOfDate, { id: "daily_sales", label: "Daily snack and street-food sales", direction: "inflow", category: "business_sales", amount: 3200, frequency: "daily", confidence: 0.75, source_note: "Synthetic daily average; weather and footfall make sales variable.", essential: true }),
        flow(id, asOfDate, { id: "raw_materials", label: "Daily food ingredients and raw materials", direction: "outflow", category: "business_stock_cost", amount: 1350, frequency: "daily", confidence: 0.83, source_note: "Synthetic demo estimate for ingredients and packaging.", essential: true }),
        flow(id, asOfDate, { id: "stall_transport", label: "Stall fee and transport", direction: "outflow", category: "business_operating_cost", amount: 420, frequency: "daily", confidence: 0.8, source_note: "Synthetic demo estimate; may vary by location and selling day.", essential: true }),
        flow(id, asOfDate, { id: "household", label: "Household essentials", direction: "outflow", category: "household_essential", amount: 14000, frequency: "monthly", confidence: 0.84, source_note: "Synthetic demo estimate; actual household expenses need confirmation.", essential: true }),
        flow(id, asOfDate, { id: "stall_repair", label: "Stall-cover repair after recent rain disruption", direction: "outflow", category: "business_operating_cost", amount: 2800, frequency: "once", daysFromToday: 3, confidence: 0.72, source_note: "Fictional upcoming repair cost representing the reported recent disruption.", essential: true }),
        flow(id, asOfDate, { id: "flexible_household", label: "Flexible household spending (scenario input)", direction: "outflow", category: "household_discretionary", amount: 1800, frequency: "monthly", confidence: 0.6, source_note: "Illustrative only; included for an optional-spending intervention comparison.", essential: false }),
      ],
    });
  },
};

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  smallFarmer,
  kiranaOwner,
  streetFoodVendor,
];

export function getDemoPersona(id: DemoPersonaId): DemoPersona {
  const persona = DEMO_PERSONAS.find((item) => item.id === id);
  if (!persona) throw new Error(`Unknown demo persona: ${id}`);
  return persona;
}
