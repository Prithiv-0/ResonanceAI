#!/usr/bin/env bash
# Resonance SER Test Runner for Linux / macOS
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "============================================================"
echo "  1. Running Backend Pytest Test Suite"
echo "============================================================"

cd "$DIR/backend"
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

$PYTHON_CMD -m pytest -q
if [ $? -ne 0 ]; then
    echo "Backend tests failed!"
    exit 1
fi

echo ""
echo "============================================================"
echo "  2. Building Frontend (TypeScript check and Vite build)"
echo "============================================================"

cd "$DIR/frontend"
npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi

echo ""
echo "============================================================"
echo "  All Tests and Builds Passed Successfully!"
echo "============================================================"
