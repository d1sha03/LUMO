# LUMO - Livelihood Intelligence & Early-Warning System (financial engine + government-LLM layer)

* `apps/api/app/finance/` - deterministic cash-flow engine, Stress Radar, shocks, goals (see its README)
* `apps/api/app/llm/` - BharatGen / Sarvam adapters, Samjho explanations, narrative intake (see its README)
* `.env.example` - variable names only

Run all tests (from `apps/api`): `python -m unittest discover -s app -t . -p "test_*.py"`
