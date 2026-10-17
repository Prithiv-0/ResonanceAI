#!/usr/bin/env bash
# ==============================================================================
# Resonance SER Platform - Automated Hugging Face Spaces Deployment Script
# ==============================================================================
set -e

USERNAME="$1"
SPACE_NAME="${2:-resonance-ser}"

echo "===================================================================="
echo "  Resonance SER — Hugging Face Spaces Cloud Deployment Script       "
echo "===================================================================="

if ! command -v git &> /dev/null; then
    echo "Error: git is not installed."
    exit 1
fi

if ! command -v git-lfs &> /dev/null; then
    echo "Error: git-lfs is not installed. Run 'git lfs install'."
    exit 1
fi

if [ -z "$USERNAME" ]; then
    echo "To deploy, you need a free Hugging Face account (https://huggingface.co/join)."
    read -p "Enter your Hugging Face Username: " USERNAME
    if [ -z "$USERNAME" ]; then
        echo "Error: Username is required."
        exit 1
    fi
fi

SPACE_URL="https://huggingface.co/spaces/${USERNAME}/${SPACE_NAME}"
LIVE_APP_URL="https://${USERNAME,,}-${SPACE_NAME,,}.hf.space"

echo "Target Space: ${SPACE_URL}"
echo "Live App URL: ${LIVE_APP_URL}"

cd "$(dirname "$0")/.."

if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git branch -M main
fi

echo "Configuring Git LFS for AI model weights..."
git lfs install
git lfs track "*.pt" "*.bin" "*.safetensors" "*.onnx"

if git remote | grep -q "^space$"; then
    git remote set-url space "${SPACE_URL}"
else
    git remote add space "${SPACE_URL}"
fi

echo "Building React frontend..."
npm --prefix frontend run build

echo "Staging files..."
git add .gitattributes .gitignore Dockerfile docker-compose.yml render.yaml README.md backend frontend scripts
git commit -m "Deploy Resonance SER platform with full neural model suite" --allow-empty

echo "Pushing to Hugging Face Spaces (${SPACE_URL})..."
echo "NOTE: When prompted for password, enter your Hugging Face Access Token (write permission)"
echo "Token link: https://huggingface.co/settings/tokens"

git push -u space main --force

echo "===================================================================="
echo "  DEPLOYMENT PUSH SUCCESSFUL!"
echo "===================================================================="
echo "Hugging Face is building your container (takes ~2-4 minutes)."
echo "Track build progress at: ${SPACE_URL}"
echo "Your live application will be available at: ${LIVE_APP_URL}"
echo "===================================================================="
