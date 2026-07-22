@echo off
REM Launch ATLAS backend (:8000) + frontend (:3000) in separate windows.
setlocal
cd /d "%~dp0\.."

REM Start Ollama if installed and not already running
where ollama >nul 2>nul
if %errorlevel%==0 start "ATLAS Ollama" /min ollama serve

start "ATLAS Backend" cmd /k "cd backend ^&^& call .venv\Scripts\activate.bat ^&^& uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "ATLAS Frontend" cmd /k "cd frontend ^&^& npm run dev"

echo.
echo === ATLAS COMMAND STARTING ===
echo   UI:  http://localhost:3000
echo   API: http://localhost:8000/docs
echo Close the two opened windows to stop the servers.
endlocal
