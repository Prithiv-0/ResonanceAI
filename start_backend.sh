#!/usr/bin/env bash
# Resonance Backend Service Launcher for Linux / macOS
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "============================================================"
echo "  Resonance Backend Service (FastAPI)"
echo "  Listening on http://127.0.0.1:8000"
echo "============================================================"

cd "$DIR/backend"
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

$PYTHON_CMD -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
