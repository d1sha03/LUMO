#!/bin/sh
cd "$(dirname "$0")"
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
[ -f .env ] || { cp .env.example .env; echo "Edit .env and add SARVAM_API_KEY"; }
