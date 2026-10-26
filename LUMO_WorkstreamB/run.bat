@echo off
cd /d "%~dp0"
if not exist .venv (echo Run setup.bat first. & pause & exit /b 1)
call .venv\Scripts\activate
start "" http://127.0.0.1:8000
python -m uvicorn lumo_compiler.api:app --port 8000
pause
