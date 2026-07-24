@echo off
REM ATLAS Command - double-click launcher for Windows.
REM Delegates to a PowerShell script for the animated boot experience.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1"
