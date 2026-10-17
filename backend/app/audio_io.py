"""Audio upload handling and decoding.

Uploads are streamed into a temporary file (size-limited), decoded with soundfile/librosa and the
temporary file is always removed afterwards.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
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


def _decode_ffmpeg(path: str, target_sr: int = ANALYSIS_SR) -> np.ndarray:
    """Fallback decoder using system FFmpeg to decode any stream (e.g. non-standard MPEG/MP3/Opus)."""
    ffmpeg_exe = shutil.which("ffmpeg")
    if not ffmpeg_exe:
        raise RuntimeError("FFmpeg executable not found in PATH.")
    cmd = [
        ffmpeg_exe,
        "-y",
        "-v",
        "error",
        "-i",
        path,
        "-f",
        "f32le",
        "-acodec",
        "pcm_f32le",
        "-ac",
        "1",
        "-ar",
        str(target_sr),
        "-",
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode != 0 or len(p.stdout) == 0:
        err = p.stderr.decode("utf-8", errors="ignore")
        raise RuntimeError(f"FFmpeg decode error: {err}")
    return np.frombuffer(p.stdout, dtype=np.float32)


def _decode(path: str, filename: str, size: int, digest: str) -> LoadedAudio:
    y: np.ndarray | None = None
    native_sr = ANALYSIS_SR
    channels = 1
    container = "Audio/Raw"

    # Stage 1: Try soundfile (direct, fast, accurate for standard WAV, FLAC, OGG, MP3)
    try:
        data, s_sr = sf.read(path, dtype="float32", always_2d=False)
        native_sr = int(s_sr)
        if data.ndim > 1:
            channels = int(data.shape[1])
            data = np.mean(data, axis=1)
        else:
            channels = 1
        if native_sr != ANALYSIS_SR:
            y = librosa.resample(data, orig_sr=native_sr, target_sr=ANALYSIS_SR)
        else:
            y = data
        try:
            info = sf.info(path)
            container = f"{info.format}/{info.subtype}"
        except Exception:
            container = "SoundFile/Audio"
    except Exception:
        y = None

    # Stage 2: Try librosa.load
    if y is None or len(y) == 0:
        try:
            data, orig_sr = librosa.load(path, sr=ANALYSIS_SR, mono=True)
            y = data
            native_sr = int(orig_sr)
            channels = 1
            container = "Librosa/Audio"
        except Exception:
            y = None

    # Stage 3: FFmpeg fallback (handles arbitrary ID3 tags, MPEG resync issues, webm audio)
    if y is None or len(y) == 0:
        try:
            y = _decode_ffmpeg(path, ANALYSIS_SR)
            native_sr = ANALYSIS_SR
            channels = 1
            container = "FFmpeg/Audio"
        except Exception:
            y = None

    if y is None or len(y) == 0:
        raise ApiError(
            422,
            "undecodable_audio",
            "The audio stream could not be decoded. The file may be corrupt or encoded in an unsupported format.",
        )

    duration = len(y) / ANALYSIS_SR
    if duration > MAX_DURATION_S:
        raise ApiError(
            413,
            "audio_too_long",
            f"Audio is {duration:.1f} s long; the demo limit is {MAX_DURATION_S:.0f} s.",
        )
    if duration < MIN_DURATION_S:
        raise ApiError(
            422,
            "audio_too_short",
            f"Audio is {duration:.2f} s; at least {MIN_DURATION_S} s is required.",
        )
    if not np.isfinite(y).all() or float(np.max(np.abs(y))) < 1e-6:
        raise ApiError(422, "silent_audio", "The recording is silent, so no analysis is possible.")

    return LoadedAudio(
        y=y.astype(np.float32),
        sr=ANALYSIS_SR,
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
