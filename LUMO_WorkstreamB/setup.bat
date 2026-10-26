@echo off
cd /d "%~dp0"
echo === LUMO setup ===
where python >nul 2>nul || (echo Python not found. Install Python 3.10+ from python.org and tick "Add to PATH". & pause & exit /b 1)
if not exist .venv python -m venv .venv
call .venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt || (echo Install failed. & pause & exit /b 1)
if not exist .env (
  copy .env.example .env >nul
  echo.
  echo Put your Sarvam key in the file that opens, save it, then close it.
  notepad .env
)
echo.
echo Setup done. Now double-click run.bat
pause
