# Multi-stage production Dockerfile for Resonance SER Platform
# Supports: Hugging Face Spaces (Free Tier), Render, Railway, Google Cloud Run, and Local Docker

# ==============================================================================
# Stage 1: Build the React TypeScript Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent || npm install --silent

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Python 3.11 Slim Production Environment
# ==============================================================================
FROM python:3.11-slim

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    RESONANCE_CORS_ORIGINS="*" \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Install essential audio processing and git-lfs libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    curl \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

# Create standard non-root user (UID 1000 required by Hugging Face Spaces)
RUN useradd -m -u 1000 user && \
    mkdir -p /app && \
    chown -R user:user /app

WORKDIR /app

# Pre-install CPU-only PyTorch to minimize image footprint and build duration
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install backend dependencies
COPY --chown=user:user backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend code, models, and configurations
COPY --chown=user:user backend/ ./backend/

# Copy built frontend assets from stage 1
COPY --chown=user:user --from=frontend-builder /app/frontend/dist ./frontend/dist

# Switch to non-root user
USER user
WORKDIR /app/backend

# Expose port (7860 is default for Hugging Face Spaces, Render injects $PORT)
EXPOSE 7860

# Health check to verify FastAPI startup
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-7860}/api/health || exit 1

# Launch the unified application
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
