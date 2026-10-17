@echo off
title Resonance SER - Full Stack Launcher
echo ============================================================
echo   Starting Resonance Speech Emotion Recognition Platform
echo   1. Starting Backend API at http://127.0.0.1:8000
echo   2. Starting Frontend App at http://localhost:5173
echo ============================================================
start "Resonance Backend" cmd /k "%~dp0start_backend.bat"
timeout /t 2 /nobreak >nul
start "Resonance Frontend" cmd /k "%~dp0start_frontend.bat"
echo.
echo Both services launched in separate windows.
echo Open http://localhost:5173 in your browser to access Resonance.
timeout /t 5
