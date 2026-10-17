@echo off
title Resonance Speech Emotion Recognition - Backend Service
echo ============================================================
echo   Resonance Backend Service (FastAPI)
echo   Listening on http://127.0.0.1:8000
echo ============================================================
cd /d "%~dp0backend"
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
