#!/usr/bin/env bash
# Resonance SER - Full Stack Launcher for Linux / macOS
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "============================================================"
echo "  Starting Resonance Speech Emotion Recognition Platform"
echo "  1. Starting Backend API at http://127.0.0.1:8000"
echo "  2. Starting Frontend App at http://localhost:5173"
echo "============================================================"

# Trap SIGINT and SIGTERM to kill background children
trap 'kill 0' SIGINT SIGTERM EXIT

bash "$DIR/start_backend.sh" &
BACKEND_PID=$!
sleep 2

bash "$DIR/start_frontend.sh" &
FRONTEND_PID=$!

echo ""
echo "Both services launched in background."
echo "Access the Resonance platform at: http://localhost:5173"
echo "API docs available at: http://127.0.0.1:8000/docs"
echo "Press Ctrl+C to stop all services."

wait
