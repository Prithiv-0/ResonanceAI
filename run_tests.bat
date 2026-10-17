@echo off
title Resonance SER - Test Suite Runner
echo ============================================================
echo   1. Running Backend Pytest Test Suite
echo ============================================================
cd /d "%~dp0backend"
py -m pytest -q
if errorlevel 1 (
    echo Backend tests failed!
    pause
    exit /b 1
)
echo.
echo ============================================================
echo   2. Building Frontend (TypeScript check and Vite build)
echo ============================================================
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
    echo Frontend build failed!
    pause
    exit /b 1
)
echo.
echo ============================================================
echo   All Tests and Builds Passed Successfully!
echo ============================================================
pause
