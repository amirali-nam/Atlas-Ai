@echo off
REM ATLAS Command - one-shot setup for Windows
setlocal
cd /d "%~dp0\.."

echo === ATLAS COMMAND SETUP (Windows) ===

REM --- 0. Find Python 3.10+ ---
where py >nul 2>nul
if %errorlevel%==0 (
  set "PY=py -3"
) else (
  set "PY=python"
)

echo [1/4] Python backend
cd backend
%PY% -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q
if not exist .env copy .env.example .env >nul
call deactivate
cd ..

echo [2/4] Next.js frontend
cd frontend
call npm install --silent
cd ..

echo [3/4] Ollama model (llama3.2:3b)
where ollama >nul 2>nul
if %errorlevel%==0 (
  ollama pull llama3.2:3b
) else (
  echo   WARNING: Ollama not installed. Get it from https://ollama.com/download
  echo   then run: ollama pull llama3.2:3b
)

echo [4/4] Piper voice model
set "VOICE_DIR=backend\models"
set "BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high"
if not exist "%VOICE_DIR%\en_US-ryan-high.onnx" (
  curl -L --fail -o "%VOICE_DIR%\en_US-ryan-high.onnx" "%BASE%/en_US-ryan-high.onnx"
  curl -L --fail -o "%VOICE_DIR%\en_US-ryan-high.onnx.json" "%BASE%/en_US-ryan-high.onnx.json"
)

echo.
echo === SETUP COMPLETE - run scripts\run.bat ===
endlocal
