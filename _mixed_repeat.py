import json, httpx
d = json.load(open('E:/Downloads/LUMO/_mixed.json', encoding='utf-8'))
for i in range(6):
    r = httpx.post("http://127.0.0.1:8000/api/intake/compile", json=d, timeout=600).json()
    twin = r.get('draft_twin') or {}
    print(f"run {i}: mode={r.get('mode')} provider={r.get('provider')} "
          f"flows={len(twin.get('cash_flows') or [])} warnings={json.dumps(r.get('warnings'), ensure_ascii=False)[:600]}", flush=True)
