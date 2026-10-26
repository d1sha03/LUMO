import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ApiClientError,
  askLumo,
  compileFinancialStory,
  explainFinancialTerm,
  getHealth,
  getOfficialResources,
  simulateFinancialScenarios,
} from "../api.js";
import {
  createCanonicalDemoTwin,
  createSitaDemoTwin,
  doesFlowApplyOnDate,
  simulateFinancialScenariosDeterministic,
  validateTwinForSimulation,
} from "../deterministicEngine.js";
import { runDemoPipeline } from "../demoPipeline.js";
import { DEMO_PERSONAS } from "../demoPersonas.js";
import {
  formatConfidence,
  formatINR,
  formatSignedINR,
} from "../format.js";
import type { CashFlow, FinancialTwin } from "../../types/lumo.js";

describe("LUMO 2.0 Core Contract & Frontend Logic Tests", () => {
  it("1. formats INR values using Indian numbering conventions and never converts null to ₹0", () => {
    assert.equal(formatINR(1500, "en-IN"), "₹1,500");
    assert.equal(formatINR(125000, "en-IN"), "₹1,25,000");
    assert.equal(formatSignedINR(-6300), "-₹6,300");
    assert.equal(formatSignedINR(200), "+₹200");
    assert.equal(formatConfidence(0.92), "92%");

    // Critical rule: unknown (null / undefined) must NEVER become ₹0
    assert.equal(formatINR(null, "en-IN"), "Unknown (not set)");
    assert.equal(formatINR(undefined, "en-IN"), "Unknown (not set)");
    assert.equal(formatINR(null, "hi-IN"), "अज्ञात (दर्ज नहीं)");
  });

  it("2. keeps missing cash_on_hand and minimum_reserve as null during intake and triggers clarification questions", async () => {
    const res = await compileFinancialStory(
      {
        text: "I sell vegetables and earn about 1500 rupees per day",
        language: "en-IN",
        as_of_date: "2026-10-19",
        existing_twin: null,
      },
      { mode: "demo" },
    );

    assert.equal(res.mode, "demo");
    assert.equal(res.draft_twin.schema_version, "1.0");
    assert.equal(res.draft_twin.cash_on_hand, null);
    assert.equal(res.draft_twin.minimum_reserve, null);

    // Should trigger q_sales_type (ambiguous 'earn' without stock cost), q_cash_on_hand, and q_minimum_reserve
    const questionIds = res.questions_required.map((q) => q.id);
    assert.ok(questionIds.includes("q_sales_type"));
    assert.ok(questionIds.includes("q_cash_on_hand"));
    assert.ok(questionIds.includes("q_minimum_reserve"));

    // Extracted fact for 1500 sales
    const salesFact = res.extracted_facts.find(
      (f) => f.field === "cash_flows.business_sales.amount",
    );
    assert.ok(salesFact);
    assert.equal(salesFact.value, 1500);
  });

  it("3. preserves existing_twin confirmed values during incremental intake compilation", async () => {
    const baseTwin = createCanonicalDemoTwin("en-IN", "2026-10-19");
    const res = await compileFinancialStory(
      {
        text: "I have a supplier payment of 2800 rupees due in five days.",
        language: "en-IN",
        as_of_date: "2026-10-19",
        existing_twin: baseTwin,
      },
      { mode: "demo" },
    );

    // Existing cash_on_hand and minimum_reserve must be preserved
    assert.equal(res.draft_twin.cash_on_hand, 4200);
    assert.equal(res.draft_twin.minimum_reserve, 1500);
    const supplierFlow = res.draft_twin.cash_flows.find(
      (f) => f.category === "supplier_payment",
    );
    assert.ok(supplierFlow);
    assert.equal(supplierFlow.amount, 2800);
  });

  it("4. records Sita's historical borrowing as a sourced fact without inventing a repayment flow", async () => {
    const story = "मैं एक सब्ज़ी बेचने का काम करती हूं। मेरी कमाई रोज़ अलग होती है। बारिश में बहुत कम हो जाती है। अगले महीने बेटी की फीस है। और मैंने पिछले महीने ₹10,000 उधार लिया था।";
    const result = await compileFinancialStory({
      text: story,
      language: "hi-IN",
      as_of_date: "2026-10-19",
      existing_twin: null,
    }, { mode: "demo" });

    const borrowing = result.extracted_facts.find((fact) => fact.field === "user_stated.historical_debt_balance");
    assert.ok(borrowing);
    assert.equal(borrowing.value, 10000);
    assert.ok(result.questions_required.some((question) => question.id === "q_debt_schedule"));
    assert.equal(result.draft_twin.cash_flows.some((flow) => flow.category === "debt_repayment"), false);
    assert.ok(result.warnings.some((warning) => warning.includes("not treated as a scheduled cash flow")));
  });

  it("5. rejects incomplete essential inputs (null cash_on_hand or minimum_reserve) in simulation with structured validation issues", async () => {
    const incompleteTwin: FinancialTwin = {
      ...createCanonicalDemoTwin("en-IN", "2026-10-19"),
      cash_on_hand: null,
      minimum_reserve: null,
    };

    const issues = validateTwinForSimulation(incompleteTwin);
    assert.equal(issues.length, 2);
    assert.equal(issues[0].field, "cash_on_hand");
    assert.equal(issues[1].field, "minimum_reserve");

    await assert.rejects(
      async () => {
        await simulateFinancialScenarios(
          {
            twin: incompleteTwin,
            scenarios: [
              { scenario_id: "baseline", label: "Expected situation", income_shock: null },
            ],
          },
          { mode: "demo" },
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiClientError);
        assert.equal(err.status, 422);
        assert.ok(Array.isArray(err.validationIssues));
        assert.equal(err.validationIssues.length, 2);
        return true;
      },
    );
  });

  it("6. clamps recurring monthly flows to the final day of shorter months", () => {
    const monthlyFlow: CashFlow = {
      id: "cf_rent_31",
      label: "End of month rent",
      direction: "outflow",
      category: "household_essential",
      amount: 2000,
      frequency: "monthly",
      start_date: "2026-01-31",
      confidence: 0.95,
      source_type: "user_statement",
      essential: true,
    };

    assert.equal(doesFlowApplyOnDate(monthlyFlow, "2026-01-31"), true);
    // Feb 2026 has 28 days, so a flow starting on day 31 clamps to 2026-02-28
    assert.equal(doesFlowApplyOnDate(monthlyFlow, "2026-02-28"), true);
    assert.equal(doesFlowApplyOnDate(monthlyFlow, "2026-02-27"), false);
  });

  it("7. calculates baseline and 30% 14-day business_sales shock scenarios deterministically", async () => {
    const twin = createCanonicalDemoTwin("en-IN", "2026-10-19");
    const sim = await simulateFinancialScenarios(
      {
        twin,
        scenarios: [
          {
            scenario_id: "baseline",
            label: "Expected situation",
            income_shock: null,
          },
          {
            scenario_id: "sales_drop_30",
            label: "Sales fall by 30% for 14 days",
            income_shock: {
              category: "business_sales",
              multiplier: 0.7,
              duration_days: 14,
              start_date: "2026-10-19",
            },
          },
        ],
      },
      { mode: "demo" },
    );

    assert.equal(sim.schema_version, "1.0");
    assert.equal(sim.results.length, 2);

    const baseline = sim.results[0];
    const shock = sim.results[1];

    // Baseline stays within the ₹1,500 reserve
    assert.equal(baseline.status, "within_reserve");
    assert.equal(baseline.first_reserve_breach_date, null);
    assert.equal(baseline.shortfall_to_reserve, 0);
    assert.equal(baseline.minimum_balance, 1600);
    assert.equal(baseline.minimum_balance_date, "2026-11-01");

    // 30% sales drop for 14 days reduces inflows by ₹450/day × 14 days = ₹6,300
    assert.equal(shock.status, "cash_deficit");
    assert.equal(shock.first_reserve_breach_date, "2026-10-24");
    assert.equal(shock.minimum_balance, -4700);
    assert.equal(shock.shortfall_to_reserve, 6200);
    assert.equal(sim.comparison.change_in_minimum_balance, -6300);
  });

  it("8. builds Sita's demo twin and calculates the ₹1,200 reserve gap from the same baseline twin", () => {
    const twin = createSitaDemoTwin("hi-IN", "2026-10-19");
    const result = simulateFinancialScenariosDeterministic({
      twin,
      scenarios: [
        { scenario_id: "baseline", label: "Expected situation", income_shock: null },
        {
          scenario_id: "sales_drop_30",
          label: "Sales fall by 30% for 14 days",
          income_shock: {
            category: "business_sales",
            multiplier: 0.7,
            duration_days: 14,
            start_date: twin.as_of_date,
          },
        },
      ],
    });

    assert.equal(twin.profile.district, "Lucknow");
    assert.equal(twin.cash_on_hand, 8100);
    assert.equal(twin.minimum_reserve, 2100);
    assert.equal(result.results[0].status, "within_reserve");
    assert.equal(result.results[1].status, "reserve_breach");
    assert.equal(result.results[1].minimum_balance, 900);
    assert.equal(result.results[1].shortfall_to_reserve, 1200);
    assert.equal(result.results[1].first_reserve_breach_date, "2026-10-31");
    assert.equal(result.comparison.change_in_minimum_balance, -5600);
    assert.equal(twin.goals[0].target_amount, 25000);
  });

  it("9. returns plain-language Samjho explanations and honest audio-unavailable fallback", async () => {
    const explain = await explainFinancialTerm(
      {
        term_key: "projected_cash_shortfall",
        context: {
          scenario_status: "reserve_breach",
          shortfall_to_reserve: 500,
          minimum_balance_date: "2026-10-24",
          minimum_reserve: 1500,
        },
        language: "hi-IN",
        include_audio: true,
      },
      { mode: "demo" },
    );

    assert.equal(explain.language, "hi-IN");
    assert.ok(explain.explanation.length > 20);
    assert.ok(explain.example.includes("₹500"));
    assert.equal(explain.provider, "fallback");
    assert.equal(explain.audio.status, "unavailable");
    assert.equal(explain.audio.audio_base64, null);
  });

  it("10. labels demo resources as unverified directory candidates", async () => {
    const res = await getOfficialResources(
      { occupation: "street_vendor", state: "Uttar Pradesh", language: "en-IN" },
      { mode: "demo" },
    );

    assert.ok(res.items.length >= 4);
    for (const item of res.items) {
      assert.ok(item.official_url.startsWith("https://"));
      assert.ok(!item.official_url.includes("example.gov.in"));
      assert.equal(item.source_status, "demo_directory_candidate");
      assert.equal(item.relevance_confidence, "unassessed");
      assert.ok(item.disclaimer.length > 10);
    }
  });

  it("11. sends contract-compliant HTTP request shapes in live API mode and surfaces honest errors when unreachable", async () => {
    const capturedCalls: { url: string; method: string; body?: unknown }[] = [];
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        capturedCalls.push({ url, method, body });

        if (url.endsWith("/health")) {
          return new Response(
            JSON.stringify({ status: "ok", version: "1.0", mode: "live" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ detail: "Simulated backend unavailable" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch;

      const health = await getHealth({ mode: "live", baseUrl: "http://localhost:8000" });
      assert.equal(health.status, "ok");
      assert.equal(health.mode, "live");
      assert.equal(capturedCalls[0].url, "http://localhost:8000/health");

      await assert.rejects(
        async () => {
          await compileFinancialStory(
            {
              text: "I sell vegetables",
              language: "en-IN",
              as_of_date: "2026-10-19",
              existing_twin: null,
            },
            { mode: "live", baseUrl: "http://localhost:8000" },
          );
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiClientError);
          assert.equal(err.status, 503);
          assert.equal(err.endpoint, "/api/intake/compile");
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("12. completes all three one-click demo pipelines with distinct graphs, simulations, options, and recommendations", () => {
    assert.deepEqual(DEMO_PERSONAS.map((persona) => persona.id), [
      "small-farmer",
      "kirana-owner",
      "street-food-vendor",
    ]);
    const results = DEMO_PERSONAS.map((persona) =>
      runDemoPipeline(persona.id, "2026-10-26", "en-IN"),
    );

    assert.equal(results.length, 3);
    assert.equal(new Set(results.map((result) => result.twin.twin_id)).size, 3);
    assert.equal(new Set(results.map((result) => result.twin.profile.occupation)).size, 3);
    assert.equal(new Set(results.map((result) => result.simulation.results[1].minimum_balance)).size, 3);
    assert.equal(new Set(results.map((result) => result.confidence)).size, 3);
    assert.equal(new Set(results.map((result) => result.recommendation.nextStep)).size, 3);
    assert.equal(new Set(results.map((result) => result.longTermScenarios[3].expectedBalance)).size, 3);

    for (const result of results) {
      assert.ok(result.narrative.length > 100);
      assert.ok(result.twin.cash_flows.length >= 4);
      assert.ok(result.facts.length >= 8);
      assert.ok(result.confidence > 0 && result.confidence <= 1);
      assert.deepEqual(result.validationIssues, []);
      assert.equal(result.simulation.results.length, 2);
      assert.ok(result.simulation.results.every((scenario) => scenario.timeline.length === 30));
      assert.equal(result.longTermScenarios.map((item) => item.months).join(","), "3,6,12,24");
      assert.ok(result.intervention.timeline.length === 30);
      assert.ok(result.resources.length >= 2);
      assert.ok(result.resources.every((resource) => resource.source_status === "demo_directory_candidate"));
      assert.ok(result.recommendation.explanation.includes("projected minimum"));
      assert.ok(result.recommendation.basis.includes(String(result.simulation.results[1].minimum_balance).replace(/\B(?=(\d{3})+(?!\d))/g, ",")));
    }
  });

  it("13. answers demo-mode questions locally without contacting Sarvam", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Demo mode must not make a network request.");
    };
    try {
      const response = await askLumo({
        question: "What should I do next?",
        language: "en",
        financial_context: {},
        occupation: "small_farm_owner",
      }, { mode: "demo" });

      assert.equal(response.provider, "deterministic_demo");
      assert.equal(response.mode, "demo_fallback");
      assert.ok(response.answer.includes("No Sarvam answer was generated"));
      assert.ok(response.answer.includes("does not confirm eligibility"));
      assert.ok(response.scheme_candidates.every((item) => item.source_status === "demo_directory_candidate"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
