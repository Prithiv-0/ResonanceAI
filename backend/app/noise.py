"""Real synthetic noise injection and conventional denoising."""
from __future__ import annotations

import hashlib

import librosa
import numpy as np

SNR_LEVELS = {"snr_20db": 20.0, "snr_10db": 10.0, "snr_5db": 5.0}
DENOISE_SOURCE_SNR_DB = 10.0

CONDITIONS = [
    {"id": "clean", "label": "Clean", "target_snr_db": None},
    {"id": "snr_20db", "label": "20 dB SNR", "target_snr_db": 20.0},
    {"id": "snr_10db", "label": "10 dB SNR", "target_snr_db": 10.0},
    {"id": "snr_5db", "label": "5 dB SNR", "target_snr_db": 5.0},
    {"id": "denoised", "label": "Denoised", "target_snr_db": None},
]


def signal_power(y: np.ndarray) -> float:
    return float(np.mean(np.asarray(y, dtype=np.float64) ** 2))


def noise_seed(content_key: str, tag: str) -> int:
    digest = hashlib.sha256(f"noise|{content_key}|{tag}".encode()).digest()
    return int.from_bytes(digest[:8], "big")


def add_white_noise(y: np.ndarray, snr_db: float, seed: int) -> np.ndarray:
    """Add Gaussian white noise whose power is set from the *measured* signal power.

    P_noise = P_signal / 10^(SNR/10); the random draw is power-normalised so the realised SNR
    matches the request exactly (up to float precision).
    """
    y64 = np.asarray(y, dtype=np.float64)
    p_signal = signal_power(y64)
    p_noise = p_signal / (10.0 ** (snr_db / 10.0))
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(len(y64))
    noise *= np.sqrt(p_noise / signal_power(noise))
    return (y64 + noise).astype(np.float32)


def measured_snr_db(clean: np.ndarray, processed: np.ndarray) -> float:
    err = np.asarray(processed, dtype=np.float64) - np.asarray(clean, dtype=np.float64)
    p_err = signal_power(err)
    if p_err <= 0:
        return float("inf")
    return float(10.0 * np.log10(signal_power(clean) / p_err))


def spectral_gate(y: np.ndarray, sr: int, quiet_fraction: float = 0.15, over_subtraction: float = 1.5,
                  floor: float = 0.08) -> np.ndarray:
    """Spectral-subtraction style gate. Noise profile = mean magnitude of the quietest frames."""
    n_fft, hop = 512, 128
    stft = librosa.stft(y.astype(np.float32), n_fft=n_fft, hop_length=hop)
    mag = np.abs(stft)
    frame_energy = mag.sum(axis=0)
    k = max(3, int(quiet_fraction * mag.shape[1]))
    quiet = np.argsort(frame_energy)[:k]
    profile = mag[:, quiet].mean(axis=1, keepdims=True)
    gain = np.clip((mag - over_subtraction * profile) / (mag + 1e-10), floor, 1.0)
    # smooth the mask over time to reduce musical noise
    kernel = np.array([0.25, 0.5, 0.25])
    gain = np.apply_along_axis(lambda r: np.convolve(r, kernel, mode="same"), 1, gain)
    out = librosa.istft(stft * gain, hop_length=hop, length=len(y))
    return out.astype(np.float32)


def build_conditions(y: np.ndarray, sr: int, content_key: str) -> dict[str, dict]:
    """Return waveform + measured SNR for every noise condition."""
    out: dict[str, dict] = {"clean": {"y": y, "measured_snr_db": None, "processing": "Original recording"}}
    noisy_10 = None
    for cid, snr in SNR_LEVELS.items():
        noisy = add_white_noise(y, snr, noise_seed(content_key, cid))
        out[cid] = {
            "y": noisy,
            "measured_snr_db": round(measured_snr_db(y, noisy), 3),
            "processing": f"Gaussian white noise added at {snr:g} dB SNR "
            "(noise power derived from measured signal power)",
        }
        if snr == DENOISE_SOURCE_SNR_DB:
            noisy_10 = noisy
    den = spectral_gate(noisy_10, sr)
    out["denoised"] = {
        "y": den,
        "measured_snr_db": round(measured_snr_db(y, den), 3),
        "processing": f"Spectral-gating denoiser applied to the {DENOISE_SOURCE_SNR_DB:g} dB SNR noisy signal",
    }
    return out
