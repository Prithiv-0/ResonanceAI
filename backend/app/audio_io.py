"""Audio upload handling and decoding.

Uploads are streamed into a temporary file (size-limited), decoded with soundfile/librosa and the
temporary file is always removed afterwards.
"""
from __future__ import annotations

import hashlib
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from fastapi import UploadFile

from .config import (
    ANALYSIS_SR,
    MAX_DURATION_S,
    MAX_UPLOAD_BYTES,
    MIN_DURATION_S,
    SUPPORTED_EXTENSIONS,
)
from .errors import ApiError


@dataclass
class LoadedAudio:
    y: np.ndarray  # mono float32 at ANALYSIS_SR
    sr: int
    filename: str
    size_bytes: int
    sha256: str
    duration_s: float
    native_sample_rate: int
    channels: int
    container: str

    def metadata(self) -> dict:
        return {
            "filename": self.filename,
            "size_bytes": self.size_bytes,
            "duration_s": round(self.duration_s, 3),
            "native_sample_rate_hz": self.native_sample_rate,
            "analysis_sample_rate_hz": self.sr,
            "channels": self.channels,
            "container": self.container,
            "sha256": self.sha256,
            "measured": True,
        }


async def load_upload(file: UploadFile | None) -> LoadedAudio:
    if file is None or not file.filename:
        raise ApiError(400, "no_file", "No audio file was provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ApiError(
            415,
            "unsupported_file_type",
            f"Unsupported file type '{ext or 'unknown'}'. "
            f"Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}.",
        )

    fd, tmp_path = tempfile.mkstemp(suffix=ext, prefix="resonance_")
    sha = hashlib.sha256()
    size = 0
    try:
        with os.fdopen(fd, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise ApiError(
                        413,
                        "file_too_large",
                        f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.",
                    )
                sha.update(chunk)
                out.write(chunk)
        if size == 0:
            raise ApiError(400, "empty_file", "The uploaded file is empty.")
        return _decode(tmp_path, file.filename, size, sha.hexdigest())
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def _decode(path: str, filename: str, size: int, digest: str) -> LoadedAudio:
    try:
        info = sf.info(path)
        native_sr = int(info.samplerate)
        channels = int(info.channels)
        container = f"{info.format}/{info.subtype}"
        duration_est = info.duration
    except Exception:
        # Fallback to librosa if soundfile info fails (e.g. specialized MPEG streams)
        try:
            native_sr = int(librosa.get_samplerate(path))
            duration_est = float(librosa.get_duration(path=path))
            channels = 1
            container = "MPEG/Audio"
        except Exception as exc:
            raise ApiError(
                422,
                "undecodable_audio",
                "The file could not be decoded as audio. It may be corrupted or not a real audio file.",
            ) from exc

    if duration_est > MAX_DURATION_S:
        raise ApiError(
            413,
            "audio_too_long",
            f"Audio is {duration_est:.1f} s long; the demo limit is {MAX_DURATION_S:.0f} s.",
        )
    try:
        y, sr = librosa.load(path, sr=ANALYSIS_SR, mono=True)
    except Exception as exc:  # noqa: BLE001
        raise ApiError(422, "undecodable_audio", "The audio stream could not be decoded.") from exc

    duration = len(y) / sr
    if duration < MIN_DURATION_S:
        raise ApiError(
            422, "audio_too_short", f"Audio is {duration:.2f} s; at least {MIN_DURATION_S} s is required."
        )
    if not np.isfinite(y).all() or float(np.max(np.abs(y))) < 1e-6:
        raise ApiError(422, "silent_audio", "The recording is silent, so no analysis is possible.")

    return LoadedAudio(
        y=y.astype(np.float32),
        sr=sr,
        filename=filename,
        size_bytes=size,
        sha256=digest,
        duration_s=duration,
        native_sample_rate=native_sr,
        channels=channels,
        container=container,
    )


def waveform_envelope(y: np.ndarray, buckets: int = 600) -> list[list[float]]:
    """Min/max envelope for plotting (real samples, downsampled)."""
    n = len(y)
    if n == 0:
        return []
    buckets = min(buckets, n)
    edges = np.linspace(0, n, buckets + 1, dtype=int)
    out = []
    for a, b in zip(edges[:-1], edges[1:]):
        seg = y[a:max(b, a + 1)]
        out.append([round(float(seg.min()), 4), round(float(seg.max()), 4)])
    return out
