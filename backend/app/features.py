"""Real acoustic feature extraction (librosa / NumPy / SciPy). Everything here is measured."""
from __future__ import annotations

import librosa
import numpy as np

N_FFT = 1024
HOP = 256
N_MFCC_REPORT = 13


def _stat(a: np.ndarray) -> dict:
    return {"mean": round(float(np.mean(a)), 5), "std": round(float(np.std(a)), 5)}


def estimate_pitch(y: np.ndarray, sr: int, fmin: float = 70.0, fmax: float = 400.0) -> dict:
    """Autocorrelation pitch tracker with explicit reliability checks.

    Returns f0 only when enough frames are clearly voiced and their estimates are consistent;
    otherwise ``reliable`` is False and ``median_hz`` is None.
    """
    frame = int(0.04 * sr)
    hop = int(0.01 * sr)
    if len(y) < frame * 2:
        return {"reliable": False, "median_hz": None, "voiced_fraction": 0.0, "reason": "audio too short"}

    frames = librosa.util.frame(y, frame_length=frame, hop_length=hop).T.astype(np.float64)
    frames = frames - frames.mean(axis=1, keepdims=True)
    rms = np.sqrt(np.mean(frames**2, axis=1))
    gate = 0.15 * np.percentile(rms, 95)
    active = rms > max(gate, 1e-4)
    if active.sum() < 5:
        return {"reliable": False, "median_hz": None, "voiced_fraction": 0.0, "reason": "too few active frames"}

    x = frames[active]
    n = 2 * frame
    spec = np.fft.rfft(x, n=n, axis=1)
    ac = np.fft.irfft(spec * np.conj(spec), n=n, axis=1)[:, :frame]
    ac = ac / (ac[:, :1] + 1e-12)

    lag_min = int(sr / fmax)
    lag_max = min(int(sr / fmin), frame - 1)
    seg = ac[:, lag_min:lag_max]
    peak_idx = np.argmax(seg, axis=1)
    peak_val = seg[np.arange(len(seg)), peak_idx]
    lags = peak_idx + lag_min
    voiced = peak_val > 0.5
    voiced_fraction = float(voiced.sum() / len(active))  # among active frames
    overall_fraction = float(voiced.sum() / len(rms))
    if voiced.sum() < 5 or voiced_fraction < 0.3:
        return {
            "reliable": False,
            "median_hz": None,
            "voiced_fraction": round(overall_fraction, 3),
            "reason": "too few clearly voiced frames",
        }
    f0 = sr / lags[voiced]
    med = float(np.median(f0))
    mad = float(np.median(np.abs(f0 - med)))
    if mad / med > 0.35:
        return {
            "reliable": False,
            "median_hz": None,
            "voiced_fraction": round(overall_fraction, 3),
            "reason": "pitch estimates inconsistent",
        }
    return {
        "reliable": True,
        "median_hz": round(med, 2),
        "p10_hz": round(float(np.percentile(f0, 10)), 2),
        "p90_hz": round(float(np.percentile(f0, 90)), 2),
        "voiced_fraction": round(overall_fraction, 3),
        "reason": None,
    }


def acoustic_features(y: np.ndarray, sr: int) -> dict:
    rms = librosa.feature.rms(y=y, frame_length=N_FFT, hop_length=HOP)[0]
    zcr = librosa.feature.zero_crossing_rate(y, frame_length=N_FFT, hop_length=HOP)[0]
    cent = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=N_FFT, hop_length=HOP)[0]
    mfcc = librosa.feature.mfcc(
        y=y, sr=sr, n_mfcc=N_MFCC_REPORT, n_fft=N_FFT, hop_length=HOP, n_mels=40
    )
    total_rms = float(np.sqrt(np.mean(y.astype(np.float64) ** 2)))
    return {
        "measured": True,
        "source": "librosa / NumPy / SciPy signal analysis",
        "duration_s": round(len(y) / sr, 3),
        "analysis_sample_rate_hz": sr,
        "rms_energy": {**_stat(rms), "overall": round(total_rms, 5),
                       "overall_dbfs": round(20 * np.log10(total_rms + 1e-12), 2)},
        "zero_crossing_rate": _stat(zcr),
        "spectral_centroid_hz": {"mean": round(float(np.mean(cent)), 1), "std": round(float(np.std(cent)), 1)},
        "mfcc": {
            "n_coefficients": N_MFCC_REPORT,
            "mean": [round(float(v), 3) for v in mfcc.mean(axis=1)],
            "std": [round(float(v), 3) for v in mfcc.std(axis=1)],
        },
        "pitch": estimate_pitch(y, sr),
    }


def input_representation(y: np.ndarray, sr: int, model: dict, cfg: dict) -> dict:
    """Actually compute the model-input tensor shape the configuration would feed a network."""
    if model["input_kind"] == "mel_spectrogram":
        n_mels = cfg["n_mels"]
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=1024, hop_length=256, n_mels=n_mels)
        return {"type": "mel_spectrogram", "shape": [int(mel.shape[0]), int(mel.shape[1])],
                "axes": ["mel_bins", "frames"], "measured": True}
    n_mfcc = cfg["n_mfcc"]
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc, n_fft=1024, hop_length=256)
    return {"type": "mfcc_sequence", "shape": [int(mfcc.shape[1]), int(mfcc.shape[0])],
            "axes": ["frames", "mfcc_coefficients"], "measured": True}


def log_mel(y: np.ndarray, sr: int, n_mels: int = 64, hop: int = 320) -> np.ndarray:
    """Log-mel spectrogram in dB relative to its own maximum, range [-80, 0]."""
    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=1024, hop_length=hop, n_mels=n_mels)
    return librosa.power_to_db(mel, ref=np.max, top_db=80.0).astype(np.float32)
