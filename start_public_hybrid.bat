@echo off
title Resonance — Hybrid Local AI Engine + Public Tunnel
echo ====================================================================
echo   Resonance Speech Emotion Recognition Platform
echo   HYBRID MODE: Local Deep Learning Models + Public Cloudflare Tunnel
echo ====================================================================
echo.
echo [1/2] Starting local FastAPI backend (Port 8000)...
echo       Running all 5 AI models with FULL PC RAM (No 512MB limit!)
start "Resonance Backend Service" cmd /k "cd /d "%~dp0backend" && py -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

timeout /t 3 >nul

echo [2/2] Launching Cloudflare Public HTTPS Tunnel...
echo.
echo ====================================================================
echo Look for the public tunnel URL below (ends in .trycloudflare.com)
echo Copy that URL, add /api at the end, and paste it into the online UI!
echo Example: https://random-name.trycloudflare.com/api
echo ====================================================================
echo.
"%~dp0scripts\cloudflared.exe" tunnel --url http://127.0.0.1:8000
pause
