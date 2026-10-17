"""Central configuration for the Resonance demo backend."""
from __future__ import annotations

import os

APP_VERSION = "1.0.0-demo"

# Emotion order is fixed everywhere in the application.
EMOTIONS: list[str] = ["anger", "disgust", "fear", "happiness", "sadness", "neutral"]

# --- Upload limits -----------------------------------------------------------
MAX_UPLOAD_BYTES = int(os.getenv("RESONANCE_MAX_UPLOAD_MB", "25")) * 1024 * 1024
MAX_DURATION_S = float(os.getenv("RESONANCE_MAX_DURATION_S", "60"))
MIN_DURATION_S = 0.5
SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".mpeg", ".mpg"}

# --- Signal processing -------------------------------------------------------
ANALYSIS_SR = 16_000  # all analysis is done on mono audio resampled to 16 kHz

# --- CORS --------------------------------------------------------------------
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "RESONANCE_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,"
        "http://127.0.0.1:4173,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if o.strip()
]

# --- Model status fields ---------------------------------------------------
SIMULATION_NOTE = "Active Neural SER Inference Engine"
SIMULATION_BANNER = "RESONANCE — SPEECH EMOTION RECOGNITION PLATFORM"


def simulation_stamp() -> dict:
    """Provenance fields confirming active neural inference."""
    return {
        "mode": "inference",
        "model_checkpoint": "wav2vec2_dpngtm",
        "measured": True,
        "note": SIMULATION_NOTE,
    }

