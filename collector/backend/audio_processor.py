"""
RESONANCE Studio Booth — Audio Processor

Handles conversion from browser-native WebM/Opus to standardized
16 kHz mono 16-bit PCM WAV, with RMS normalization and silence trimming.
"""

import io
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from config import (
    SAMPLE_RATE,
    CHANNELS,
    TARGET_LOUDNESS_DB,
    MAX_DURATION_SEC,
    MIN_DURATION_SEC,
    SILENCE_THRESHOLD_DB,
    SILENCE_PAD_SEC,
)


@dataclass
class AudioQuality:
    """Quality metrics returned after processing."""
    duration_sec: float
    peak_db: float
    rms_db: float
    clipping_detected: bool
    original_duration_sec: float


class AudioProcessingError(Exception):
    """Raised when audio fails validation or processing."""
    pass


def process_upload(audio_bytes: bytes, original_filename: str = "recording.webm") -> tuple[bytes, AudioQuality]:
    """
    Process an uploaded audio blob from the browser.

    Steps:
    1. Write to temp file (librosa needs a file path for WebM)
    2. Load and resample to 16 kHz mono
    3. Trim leading/trailing silence
    4. RMS normalize to target loudness
    5. Validate duration
    6. Export as 16-bit PCM WAV

    Returns:
        (wav_bytes, quality_info)

    Raises:
        AudioProcessingError if the audio is invalid or too short/long.
    """
    # Step 1: Write raw bytes to a temp file
    suffix = Path(original_filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Step 2: Load with librosa (handles WebM, MP3, WAV, etc.)
        y, sr = librosa.load(tmp_path, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        raise AudioProcessingError(f"Failed to decode audio: {e}") from e
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    original_duration = len(y) / sr

    if original_duration < MIN_DURATION_SEC:
        raise AudioProcessingError(
            f"Recording too short ({original_duration:.1f}s). "
            f"Minimum is {MIN_DURATION_SEC}s."
        )

    # Step 3: Trim silence
    y_trimmed, _ = librosa.effects.trim(
        y,
        top_db=abs(SILENCE_THRESHOLD_DB),
        frame_length=2048,
        hop_length=512,
    )

    # Add small silence padding at edges
    pad_samples = int(SILENCE_PAD_SEC * sr)
    y_trimmed = np.pad(y_trimmed, (pad_samples, pad_samples), mode="constant")

    # Step 4: RMS normalize
    rms = np.sqrt(np.mean(y_trimmed ** 2))
    if rms > 0:
        target_rms = 10 ** (TARGET_LOUDNESS_DB / 20.0)
        y_normalized = y_trimmed * (target_rms / rms)
    else:
        y_normalized = y_trimmed

    # Clip to prevent overflow in int16
    y_normalized = np.clip(y_normalized, -1.0, 1.0)

    # Compute quality metrics
    duration_sec = len(y_normalized) / sr
    peak_amplitude = np.max(np.abs(y_normalized))
    peak_db = 20 * np.log10(peak_amplitude) if peak_amplitude > 0 else -np.inf
    final_rms = np.sqrt(np.mean(y_normalized ** 2))
    rms_db = 20 * np.log10(final_rms) if final_rms > 0 else -np.inf
    clipping_detected = peak_amplitude >= 0.99

    if duration_sec > MAX_DURATION_SEC:
        raise AudioProcessingError(
            f"Recording too long ({duration_sec:.1f}s). "
            f"Maximum is {MAX_DURATION_SEC}s."
        )

    if duration_sec < MIN_DURATION_SEC:
        raise AudioProcessingError(
            f"Recording too short after trimming ({duration_sec:.1f}s). "
            f"Minimum is {MIN_DURATION_SEC}s."
        )

    # Step 5: Export as 16-bit PCM WAV
    wav_buffer = io.BytesIO()
    sf.write(wav_buffer, y_normalized, sr, subtype="PCM_16", format="WAV")
    wav_bytes = wav_buffer.getvalue()

    quality = AudioQuality(
        duration_sec=round(duration_sec, 3),
        peak_db=round(peak_db, 1),
        rms_db=round(rms_db, 1),
        clipping_detected=clipping_detected,
        original_duration_sec=round(original_duration, 3),
    )

    return wav_bytes, quality
