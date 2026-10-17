#!/usr/bin/env bash
# Resonance Frontend Dev Server Launcher for Linux / macOS
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "============================================================"
echo "  Resonance Frontend (Vite + React)"
echo "  Listening on http://localhost:5173"
echo "============================================================"

cd "$DIR/frontend"
npm run dev
