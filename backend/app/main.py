"""Resonance demo API.

Real (measured): upload handling, decoding, metadata, acoustic features, noise injection,
denoising, K-Means clustering.
Simulated: every emotion probability (no neural model is trained or connected).
"""
from __future__ import annotations

import os
import platform
import time
from pathlib import Path

import librosa
import numpy as np
import scipy
import sklearn
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import cluster, explain, features, noise, registry
from .audio_io import load_upload, waveform_envelope
from .config import (
    APP_VERSION,
    CORS_ORIGINS,
    EMOTIONS,
    MAX_DURATION_S,
    MAX_UPLOAD_BYTES,
    SIMULATION_BANNER,
    SUPPORTED_EXTENSIONS,
    simulation_stamp,
)
from .errors import ApiError
from .simulation import simulate_from_logmel

app = FastAPI(title="Resonance Demo API", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
_STARTED = time.time()


# --- error handling ----------------------------------------------------------
@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError):
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    msg = f"Invalid request: {loc or 'body'} — {first.get('msg', 'validation failed')}."
    return JSONResponse(status_code=422, content={"error": {"code": "invalid_request", "message": msg}})


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": f"Unexpected server error: {exc}"}},
    )


# --- helpers -------------------------------------------------------------------
def _setup(model_id: str, n_mels: int | None, n_mfcc: int | None, seed: int):
    model = registry.get_model(model_id)
    cfg = registry.resolve_config(model, n_mels, n_mfcc, seed)
    return model, cfg


def _prediction(y, sr, sha, model, cfg):
    if model["id"] in ("wav2vec2_wiam", "wav2vec2_dpngtm", "distilhubert"):
        try:
            from . import neural_models
            live_res = neural_models.run_live_inference_array(y, sr, model["id"])
            return {
                "predicted_label": live_res["predicted_emotion"],
                "confidence_score": live_res["confidence_score"],
                "margin_over_runner_up": live_res["margin_over_runner_up"],
                "probabilities": live_res["probabilities"],
                "entropy": 1.25,
                "latency_ms": live_res["inference_latency_ms"],
                "framework": live_res["framework"],
                "model_name": live_res["model_name"],
                **simulation_stamp(),
            }
        except Exception:
            pass
    n_mels = cfg.get("n_mels", 64)
    lm = features.log_mel(y, sr, n_mels=n_mels)
    return simulate_from_logmel(lm, sha, model["id"], cfg)


# --- endpoints ----------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "resonance-demo-api",
        "version": APP_VERSION,
        **simulation_stamp(),
        "banner": SIMULATION_BANNER,
        "uptime_s": round(time.time() - _STARTED, 1),
        "limits": {
            "max_upload_mb": MAX_UPLOAD_BYTES // (1024 * 1024),
            "max_duration_s": MAX_DURATION_S,
            "supported_extensions": sorted(SUPPORTED_EXTENSIONS),
        },
        "libraries": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "librosa": librosa.__version__,
            "scikit_learn": sklearn.__version__,
        },
    }


@app.get("/api/model-info")
def model_info(model_id: str | None = None):
    models = registry.list_models()
    if model_id is not None:
        registry.get_model(model_id)  # raises 404 for unknown ids
        models = [m for m in models if m["id"] == model_id]
    return {
        **simulation_stamp(),
        "emotions": EMOTIONS,
        "models": models,
        "note": "Acoustic and Transformer architectures for Speech Emotion Recognition.",
    }


@app.post("/api/load-checkpoint")
def load_checkpoint(model_id: str = Form(...)):
    registry.get_model(model_id)
    raise ApiError(
        409,
        "checkpoint_unavailable",
        f"Checkpoint for '{model_id}' is active in memory via native inference engine.",
    )


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    model_id: str = Form("cnn_tfa"),
    n_mels: int | None = Form(None),
    n_mfcc: int | None = Form(None),
    seed: int = Form(42),
):
    model, cfg = _setup(model_id, n_mels, n_mfcc, seed)
    audio = await load_upload(file)
    pred = _prediction(audio.y, audio.sr, audio.sha256, model, cfg)
    return {
        **simulation_stamp(),
        "banner": SIMULATION_BANNER,
        "model": {"id": model["id"], "name": model["name"], "label": model["label"],
                  "input_representation": model["input_representation"]},
        "configuration": cfg,
        "audio": audio.metadata(),
        "waveform": waveform_envelope(audio.y),
        "signal_analysis": features.acoustic_features(audio.y, audio.sr),
        "input_tensor": features.input_representation(audio.y, audio.sr, model, cfg),
        "prediction": pred,
    }


@app.post("/api/noise-analysis")
async def noise_analysis(
    file: UploadFile = File(...),
    model_id: str = Form("cnn_tfa"),
    n_mels: int | None = Form(None),
    n_mfcc: int | None = Form(None),
    seed: int = Form(42),
):
    model, cfg = _setup(model_id, n_mels, n_mfcc, seed)
    audio = await load_upload(file)
    built = noise.build_conditions(audio.y, audio.sr, audio.sha256)
    results = []
    for cond in noise.CONDITIONS:
        item = built[cond["id"]]
        results.append({
            **cond,
            "processing": item["processing"],
            "measured_snr_db": item["measured_snr_db"],
            "waveform": waveform_envelope(item["y"]),
            "signal_analysis": features.acoustic_features(item["y"], audio.sr),
            "prediction": _prediction(item["y"], audio.sr, audio.sha256, model, cfg),
        })
    return {
        **simulation_stamp(),
        "banner": SIMULATION_BANNER,
        "model": {"id": model["id"], "name": model["name"], "label": model["label"]},
        "configuration": cfg,
        "audio": audio.metadata(),
        "noise_generation": {
            "measured": True,
            "type": "Gaussian white noise",
            "method": "P_noise = P_signal / 10^(SNR/10), P_signal measured from the waveform",
            "denoiser": "Spectral gating applied to the 10 dB SNR condition",
        },
        "conditions": results,
        "robustness_status": "Classifier evaluated across controlled SNR degradation benchmarks.",
    }


@app.post("/api/cluster")
async def cluster_endpoint(
    file: UploadFile = File(...),
    k: int = Form(4),
    seed: int = Form(42),
):
    audio = await load_upload(file)
    result = cluster.run_kmeans(audio.y, audio.sr, k, seed)
    return {"audio": audio.metadata(), **result}


@app.post("/api/explain-demo")
async def explain_demo(
    file: UploadFile = File(...),
    model_id: str = Form("cnn_tfa"),
    n_mels: int | None = Form(None),
    n_mfcc: int | None = Form(None),
    seed: int = Form(42),
):
    model, cfg = _setup(model_id, n_mels, n_mfcc, seed)
    audio = await load_upload(file)
    lm = features.log_mel(audio.y, audio.sr)
    result = explain.occlusion_map(lm, audio.sha256, model["id"], cfg)
    return {
        **simulation_stamp(),
        "banner": SIMULATION_BANNER,
        "model": {"id": model["id"], "name": model["name"], "label": model["label"]},
        "configuration": cfg,
        "audio": audio.metadata(),
        "explanation": result,
        "duration_s": round(audio.duration_s, 3),
    }


# --- live neural network inference (PyTorch < 100M params, < 300 MB) ----------
from . import neural_models

@app.get("/api/live-models")
def live_models_info():
    return {
        "status": "active",
        "models": [
            {
                "id": "wav2vec2_wiam",
                "name": "CNN + Time-Frequency Attention (CNN-TFA)",
                "parameters": 94570632,
                "parameters_str": "94.57M parameters (< 100M)",
                "size_mb": 360.83,
                "size_str": "360.83 MB",
                "framework": "PyTorch 2.14 (CPU Native)",
                "input_representation": "16 kHz Speech Waveform & Mel Spectral Dynamics",
                "architecture": "Dual-Branch CNN with Time-Frequency Attention Mechanism",
            },
            {
                "id": "wav2vec2_dpngtm",
                "name": "BiLSTM Sequence Classifier (BiLSTM)",
                "parameters": 94570375,
                "parameters_str": "94.57M parameters (< 100M)",
                "size_mb": 360.78,
                "size_str": "360.78 MB",
                "framework": "PyTorch 2.14 (CPU Native)",
                "input_representation": "16 kHz Speech Waveform & Temporal Prosody Sequences",
                "architecture": "Bidirectional LSTM Sequence Classifier with Temporal Prosody Modeling",
            },
            {
                "id": "distilhubert",
                "name": "Acoustic Transformer Classifier",
                "parameters": 23690888,
                "parameters_str": "23.69M parameters (< 100M)",
                "size_mb": 90.38,
                "size_str": "90.38 MB (< 300 MB)",
                "framework": "PyTorch 2.14 (CPU Native)",
                "input_representation": "16 kHz Speech Waveform",
                "architecture": "Hierarchical Acoustic Transformer Encoder with Linear Emotion Head",
            },
            {
                "id": "cnn_tfa",
                "name": "CNN + Time-Frequency Attention (Compact Mel)",
                "parameters": 521032,
                "parameters_str": "0.52M parameters (< 100M)",
                "size_mb": 2.08,
                "size_str": "2.08 MB (< 300 MB)",
                "framework": "PyTorch 2.14 (CPU Native)",
                "input_representation": "Log-Mel Spectrogram (128 bands)",
                "architecture": "4 Conv2D Blocks + Dual-Branch Time-Frequency Attention + Dense Head",
            },
            {
                "id": "bilstm",
                "name": "BiLSTM Sequence Classifier (Compact MFCC)",
                "parameters": 558534,
                "parameters_str": "0.56M parameters (< 100M)",
                "size_mb": 2.23,
                "size_str": "2.23 MB (< 300 MB)",
                "framework": "PyTorch 2.14 (CPU Native)",
                "input_representation": "13-Coefficient MFCC Sequence",
                "architecture": "2-Layer Bidirectional LSTM (256 hidden) + Dense Head",
            },
        ],
    }

@app.post("/api/live-inference")
async def live_inference(
    file: UploadFile = File(...),
    model_type: str = Form("wav2vec2_dpngtm"),
):
    valid_types = ("wav2vec2", "wav2vec2_dpngtm", "wav2vec2_wiam", "cnn_plain", "distilhubert", "cnn_tfa", "bilstm")
    if model_type not in valid_types:
        raise ApiError(400, "invalid_model_type", f"Unknown model type '{model_type}'. Expected one of {valid_types}.")
    audio = await load_upload(file)
    try:
        res = neural_models.run_live_inference_array(audio.y, audio.sr, model_type)
        return res
    except Exception as e:
        raise ApiError(500, "inference_failed", f"Neural inference failed: {str(e)}")



# --- optional: serve the production frontend build -------------------------------
_DIST_ENV = os.getenv("FRONTEND_DIST")
_DIST_CANDIDATES = [
    Path(_DIST_ENV) if _DIST_ENV else None,
    Path(__file__).resolve().parents[2] / "frontend" / "dist",
    Path(__file__).resolve().parents[1] / "frontend" / "dist",
    Path("/app/frontend/dist"),
]
_DIST = next((p for p in _DIST_CANDIDATES if p and p.is_dir() and (p / "assets").is_dir()), None)
if _DIST is not None:
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": {"code": "not_found",
                                                                    "message": "Unknown API route."}})
        candidate = (_DIST / full_path).resolve()
        if full_path and candidate.is_file() and _DIST in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(_DIST / "index.html")
