@echo off
cd /d "%~dp0"
call .venv\Scripts\activate
echo --- offline tests ---
python -m pytest -q
echo.
echo --- live Sarvam evaluation (needs the key in .env) ---
python -m scripts.live_eval
pause
