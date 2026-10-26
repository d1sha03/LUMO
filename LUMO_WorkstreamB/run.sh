#!/bin/sh
cd "$(dirname "$0")" && . .venv/bin/activate && python -m uvicorn lumo_compiler.api:app --port 8000
