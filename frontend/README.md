# LUMO — Your financial life, understood.

A story-led frontend experience for LUMO, Bharat's Livelihood Intelligence & Early-Warning System. The app includes three one-click fictional personas—small farmer, kiryana shop owner, and street food vendor—each running from Katha input through a financial twin, validation, deterministic simulations, scenario comparisons, resource candidates, and an uncertainty-aware recommendation.

The product has a minimal landing, a split conversation/twin-building moment, and **one continuous dashboard**. Dashboard links scroll to its sections; they are not separate applications or a stack of unrelated screens.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The local frontend defaults to the clearly labelled deterministic demo engine. Choose one of the three visible demo personas to run the complete flow with one click; it does not require a backend or external credentials. Demo answers, calculations, and resource candidates are labeled as local/demo output and do not claim verified eligibility, approval, or benefits. Set `VITE_API_BASE_URL=http://localhost:8000` in `.env.local` to connect the frontend to a running FastAPI service. Selecting **Configured API** calls that service. A failed live request is shown to the user; LUMO does not silently substitute demo output.

`VITE_*` values are public browser build configuration. Never put model, Sarvam, BHASHINI, or other provider secrets in Vite environment variables.

## Built-in one-click personas

- **Small Farmer:** seasonal wheat and vegetable income, household and input costs, informal debt context, a recent income shock, and a cash-stability/debt-reduction goal.
- **Kiryana Shop Owner:** daily sales, supplier credit, household costs, a small-business loan, inventory reinvestment, seasonal demand variation, and a working-capital goal.
- **Street Food Vendor:** variable daily sales, raw-material and stall/transport costs, informal borrowing context, household costs, a disruption scenario, and a growth-without-dangerous-debt goal.

Each persona has distinct fictional cash flows, confidence/uncertainty, baseline and shock simulations, 3/6/12/24-month illustrative projections, and a simulation-derived recommendation. Projections are conditional on synthetic recurring inputs and modeled variability, not probabilities or guarantees. Unknown debt principal or repayment terms are not invented. Scheme entries are unverified directory candidates, not eligibility, approval, or benefit determinations. Local demo chat uses a clearly labeled deterministic response when Sarvam is unavailable; demo mode does not call Bhashini, so speech is unavailable there.

### Original Sita fixture reference

Sita says that vegetable-cart income changes day to day, rain reduces sales, her daughter's fee is coming up, and she borrowed ₹10,000 last month. The complete fictional fixture includes separate daily sales, stock, operating and household flows; ₹1,200 inventory due; an explicitly illustrative ₹1,800 instalment; a ₹2,500 school payment; ₹8,100 starting cash; and a ₹2,100 user-set reserve.

The deterministic 30% sales reduction applies only to `business_sales` for 14 days. With the same twin in both scenarios, the current fixture calculates a **₹1,200 reserve gap** and a minimum projected balance of **₹900**. This is a conditional projection over synthetic inputs—not a claim about a real person, a probability, or a guaranteed outcome. The illustrative loan instalment is flagged for confirmation.

The demo can also be reset to the Sita fixture at any time. Blank essential inputs stay `null`; simulation validation asks for the missing cash or reserve rather than treating it as ₹0.

## Languages and voice

The selector lists Hindi, English, Punjabi, Tamil, Bengali, and Marathi. API contracts currently support `hi-IN`, `en-IN`, and `pa-IN`. Tamil, Bengali, and Marathi are visible as future interface options; the UI explicitly states that requests use the English fallback because no verified provider adapter is connected. Voice capture uses browser-native speech recognition only when the browser exposes it; otherwise the user can type or paste. Samjho plays audio only if the configured backend returns actual base64 audio; deterministic demo mode reports audio unavailable and keeps the full explanation visible.

## Contracts and official information

- `contracts/lumo-v1.md` and `contracts/lumo-v1.schema.json` define the shared v1.0 schema and REST payloads.
- `src/types/lumo.ts` mirrors the shared TypeScript data contract.
- `src/lib/api.ts` is the single API client.
- `src/lib/deterministicEngine.ts` contains deterministic intake, date recurrence, simulation, explanations, and a curated official-resource fallback.
- `data/synthetic/` contains fictional demonstration inputs.
- `data/resources/official-resources.json` and the runtime resource fallback contain source-linked official programmes and explicit eligibility/approval disclaimers.

## Verify

```bash
npx tsc --noEmit -p tsconfig.json
npx tsc src/lib/__tests__/lumo.test.ts --outDir .tmp-tests --module ESNext --moduleResolution bundler --target ES2022 --skipLibCheck
node --test .tmp-tests/lib/__tests__/lumo.test.js
rm -rf .tmp-tests
npm run build
```

Automated tests cover API request shapes and honest network errors, INR formatting, unknown values, monthly date clamping, intake clarification, all three complete persona pipelines, local chat fallback, Samjho audio fallback, and official links. The web app is frontend-only; this repository does not contain a deployed FastAPI service or verified Sarvam/BHASHINI adapter.