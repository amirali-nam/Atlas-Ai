@echo off
REM ATLAS Command - double-click launcher for Windows.
REM First run: installs everything. Every run: starts servers + opens the browser.
cd /d "%~dp0"
title ATLAS Command Launcher

echo ========================================
echo    ATLAS COMMAND - starting up
echo ========================================

REM First-time setup if the environment isn't built yet
if not exist "backend\.venv" goto setup
if not exist "frontend\node_modules" goto setup
goto run

:setup
echo First-time setup (a few minutes, one time only)...
call scripts\setup.bat
if errorlevel 1 (
  echo Setup failed - see messages above.
  pause
  exit /b 1
)

:run
REM Start Ollama (if installed), backend and frontend in minimized windows
where ollama >nul 2>nul && start "ATLAS Ollama" /min ollama serve
start "ATLAS Backend" /min cmd /k "cd backend ^&^& call .venv\Scripts\activate.bat ^&^& uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "ATLAS Frontend" /min cmd /k "cd frontend ^&^& npm run dev"

echo Waiting for ATLAS to come online...
REM Poll until the UI responds, then open the browser
for /l %%i in (1,1,90) do (
  curl -s http://localhost:3000 >nul 2>nul && goto ready
  timeout /t 1 /nobreak >nul
)

:ready
start http://localhost:3000
echo.
echo ATLAS is running. The two minimized windows are the servers.
echo Close them (or this window) to stop ATLAS.
timeout /t 6 /nobreak >nul
