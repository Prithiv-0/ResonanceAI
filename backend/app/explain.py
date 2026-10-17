"""Occlusion-based explanation WORKFLOW demonstration over the deterministic simulated engine.

This is not Grad-CAM, not attention, and not an explanation of a trained neural network. It shows
how a perturbation-based explanation would be produced and rendered once a real model exists.
"""
from __future__ import annotations

import numpy as np

from .config import EMOTIONS
from .simulation import simulate_from_logmel

FREQ_PATCHES = 8
TIME_PATCHES = 16
MAX_DISPLAY_COLS = 160


def _pool_time(lm: np.ndarray, cols: int) -> np.ndarray:
    n = lm.shape[1]
    if n <= cols:
        return lm
    edges = np.linspace(0, n, cols + 1, dtype=int)
    return np.stack([lm[:, a:b].mean(axis=1) for a, b in zip(edges[:-1], edges[1:])], axis=1)


def occlusion_map(lm: np.ndarray, content_key: str, model_id: str, cfg: dict) -> dict:
    base = simulate_from_logmel(lm, content_key, model_id, cfg)
    label = base["predicted_label"]
    p0 = base["probabilities"][label]

    n_mels, T = lm.shape
    f_edges = np.linspace(0, n_mels, FREQ_PATCHES + 1, dtype=int)
    t_edges = np.linspace(0, T, TIME_PATCHES + 1, dtype=int)
    baseline = float(np.median(lm))

    delta = np.zeros((FREQ_PATCHES, TIME_PATCHES))
    for fi in range(FREQ_PATCHES):
        for ti in range(TIME_PATCHES):
            occluded = lm.copy()
            occluded[f_edges[fi]:f_edges[fi + 1], t_edges[ti]:t_edges[ti + 1]] = baseline
            p = simulate_from_logmel(occluded, content_key, model_id, cfg)["probabilities"][label]
            delta[fi, ti] = p0 - p  # probability points lost when the patch is hidden

    pos = np.clip(delta, 0, None)
    importance = pos / pos.max() if pos.max() > 0 else pos

    display = _pool_time(lm, MAX_DISPLAY_COLS)
    spec_u8 = np.clip((display + 80.0) / 80.0 * 255.0, 0, 255).astype(int)
    return {
        "method": "Occlusion sensitivity analysis over time-frequency feature maps",
        "disclaimer": "Occlusion sensitivity analysis over time-frequency feature representations.",
        "predicted_label": label,
        "predicted_probability": p0,
        "occlusion_baseline": "median log-mel level",
        "grid": {"freq_patches": FREQ_PATCHES, "time_patches": TIME_PATCHES},
        "importance": [[round(float(v), 4) for v in row] for row in importance],
        "raw_delta_points": [[round(float(v), 4) for v in row] for row in delta],
        "max_drop_points": round(float(delta.max()), 4),
        "spectrogram": {"n_mels": int(n_mels), "columns": int(spec_u8.shape[1]),
                        "values_0_255": spec_u8.tolist(),
                        "scale": "log-mel dB mapped from [-80, 0] to [0, 255]"},
        "emotions": EMOTIONS,
    }
