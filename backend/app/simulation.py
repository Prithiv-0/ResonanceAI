"""Deterministic SIMULATED inference engine.

IMPORTANT: this is *not* a neural network and nothing here has been trained. It maps a few simple,
real spectrogram statistics plus seeded pseudo-random offsets to a probability distribution so the
application can demonstrate its complete workflow. Outputs are reproducible for the same audio and
configuration, differ between model configurations, and must never be presented as measured
accuracy or as predictions of a CNN/BiLSTM.
"""
from __future__ import annotations

import hashlib

import numpy as np

from .config import EMOTIONS, simulation_stamp
from .registry import SIM_PROFILE

# arousal / valence loadings per emotion: logit = a*A + v*V (+ constant)
_LOADINGS = {
    "anger": (1.00, -0.60, 0.0),
    "disgust": (0.15, -0.85, 0.0),
    "fear": (0.55, -0.70, 0.0),
    "happiness": (0.70, 0.90, 0.0),
    "sadness": (-0.95, -0.25, 0.0),
    "neutral": (0.0, 0.0, 0.0),  # handled separately
}


def _rng(*parts: str) -> np.random.Generator:
    digest = hashlib.sha256("|".join(parts).encode()).digest()
    return np.random.default_rng(int.from_bytes(digest[:8], "big"))


def descriptor(lm: np.ndarray) -> dict:
    """Simple spectrogram statistics (real measurements) that drive the simulation."""
    a = (lm + 80.0) / 80.0
    frame_energy = a.mean(axis=0)
    weights = a.sum(axis=1)
    idx = np.arange(a.shape[0]) / max(1, a.shape[0] - 1)
    flux = float(np.abs(np.diff(a, axis=1)).mean()) if a.shape[1] > 1 else 0.0
    return {
        "loudness": float(a.mean()),
        "dynamics": float(frame_energy.std()),
        "brightness": float((weights * idx).sum() / (weights.sum() + 1e-9)),
        "flux": flux,
    }


def arousal_proxy(d: dict) -> float:
    raw = (6.0 * (d["loudness"] - 0.5) + 6.0 * (d["brightness"] - 0.3)
           + 15.0 * (d["flux"] - 0.04) + 5.0 * (d["dynamics"] - 0.1))
    return float(1.6 * np.tanh(raw / 2.0))


def _normalise_percent(p: np.ndarray) -> list[float]:
    """Round to 2 dp and force the total to exactly 100.00 (remainder goes to the largest entry)."""
    pct = np.round(p * 100.0, 2)
    pct[int(np.argmax(pct))] += round(100.0 - float(pct.sum()), 2)
    return [round(float(v), 2) for v in pct]


def simulate_from_logmel(lm: np.ndarray, content_key: str, model_id: str, cfg: dict) -> dict:
    prof = SIM_PROFILE[model_id]
    d = descriptor(lm)
    A = arousal_proxy(d)
    V = float(_rng("valence", content_key).normal(0.0, 0.8))
    cfg_key = ",".join(f"{k}={cfg[k]}" for k in sorted(cfg))
    offsets = _rng("model", content_key, model_id, cfg_key).normal(
        0.0, prof["bias_scale"] + prof["noise_scale"], len(EMOTIONS))

    logits = np.zeros(len(EMOTIONS))
    for i, name in enumerate(EMOTIONS):
        a, v, _ = _LOADINGS[name]
        logits[i] = a * A + v * V
    logits[EMOTIONS.index("neutral")] = 0.5 - 0.7 * abs(A)
    logits = (logits + offsets) / prof["temperature"]
    logits -= logits.max()
    p = np.exp(logits)
    p /= p.sum()

    pct = _normalise_percent(p)
    top = int(np.argmax(pct))
    ordered = sorted(pct, reverse=True)
    return {
        **simulation_stamp(),
        "model_id": model_id,
        "probabilities": dict(zip(EMOTIONS, pct)),
        "predicted_label": EMOTIONS[top],
        "confidence_score": pct[top],
        "margin_over_runner_up": round(ordered[0] - ordered[1], 2),
        "score_meaning": "Top-class share of a simulated distribution, not a calibrated confidence.",
        "engine": "deterministic-simulation-v1",
        "driver_statistics": {k: round(v, 4) for k, v in d.items()} | {"arousal_proxy": round(A, 4)},
    }
