"""Synthetic speech-like test signals (NOT speech, NOT emotional content).

Used for the test suite and for sample WAV files so the demo can be exercised without a dataset.
"""
from __future__ import annotations

import io

import numpy as np
import soundfile as sf


def speech_like(duration_s: float = 3.0, sr: int = 16000, f0_base: float = 150.0, vibrato: float = 0.1,
                syllable_rate: float = 3.5, level: float = 0.5, seed: int = 0) -> np.ndarray:
    """Harmonic source with formant-like shaping, syllable-rate amplitude modulation and pauses."""
    rng = np.random.default_rng(seed)
    n = int(duration_s * sr)
    t = np.arange(n) / sr
    f0 = f0_base * (1 + vibrato * np.sin(2 * np.pi * 0.7 * t) + 0.5 * vibrato * np.sin(2 * np.pi * 2.3 * t))
    phase = 2 * np.pi * np.cumsum(f0) / sr
    sig = np.zeros(n)
    formants = [(700, 120), (1200, 150), (2600, 250)]
    for h in range(1, 30):
        freq = f0 * h
        gain = sum(np.exp(-0.5 * ((freq - fc) / bw) ** 2) for fc, bw in formants) + 0.03
        gain = gain * (freq < sr / 2 * 0.95)
        sig += gain * np.sin(h * phase)
    env = np.clip(np.sin(2 * np.pi * syllable_rate * t) + 0.3, 0, 1) ** 0.7
    pause = (np.sin(2 * np.pi * 0.35 * t + 1.0) > -0.6).astype(float)
    sig = sig * env * pause + 0.002 * rng.standard_normal(n)
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * level
    return sig.astype(np.float32)


def sine(freq: float = 220.0, duration_s: float = 2.0, sr: int = 16000, level: float = 0.5) -> np.ndarray:
    t = np.arange(int(duration_s * sr)) / sr
    return (level * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def to_wav_bytes(y: np.ndarray, sr: int = 16000) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()
