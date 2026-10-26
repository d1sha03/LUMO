# LUMO Story Demonstration Checklist

## One Continuous Product Story

1. Open the minimal LUMO landing and choose **Start a conversation**.
2. On Katha, review Sita's Hindi story. Type an edit, use browser-native speech recognition if available, or compile the story through the selected API mode.
3. Watch the twin-completeness bars derive from story topics and recorded cash-flow fields. The bars describe coverage, not payment probability or a financial risk score.
4. Choose **Use Sita's complete demo details** to load the explicit synthetic fixture and its source labels. Open the single continuous dashboard.
5. Review the Financial Twin: separate gross sales, stock, cart operations, household needs, historical borrowing, current cash, reserve and upcoming dated obligations. Expand the graph nodes to inspect source notes. Open the editor to correct any flow and recalculate.
6. Read Financial Stress Radar. Baseline and 30% sales-drop results are both calculated from the same twin by the deterministic simulation engine. Under the included fixture, the stress case projects a ₹1,200 reserve gap; it does not claim certainty.
7. Move the sales-drop control and choose **Compare this scenario**. The UI sends a new request to `/api/finance/simulate` and renders the returned baseline and scenario values, first reserve dip, and comparison change.
8. Change the sewing-machine goal amount/horizon. LUMO computes three savings arithmetic options and recommends the lower monthly burden because Sita described variable earnings; it does not predict or guarantee income.
9. Review resource cards from `GET /api/resources`. Check a programme's official source and requirements; no card claims that Sita is approved or individually eligible.
10. In Business Intelligence, enter a customer count and run the ₹5 price test. The API recalculates a conditional sales-uplift scenario using the entered count; the UI states that demand is assumed unchanged.
11. Use **Ask LUMO** or any **Explain this** control. Samjho shows the contextual explanation and text fallback. If audio is not returned by the configured API, the interface reports unavailable and does not fake playback.

## Validation

- A missing `cash_on_hand` or `minimum_reserve` remains `null` and blocks simulation with a structured validation issue.
- Demo values carry a persistent `Demo data` indicator and synthetic provenance.
- A failed live API call displays an error and offers an explicit switch back to deterministic demo mode.
- Daily, weekly, one-time and monthly cash flows follow the v1.0 calendar rules. Monthly recurrence clamps to the last calendar day when the source day is not present in the target month.
- The only risk indicator is the actual projection status (`within_reserve`, `reserve_breach`, or `cash_deficit`); there is no universal credit/risk score.