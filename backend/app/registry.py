"""Model registry.

Describes the four *intended* configurations. No model listed here has been trained:
every entry reports ``checkpoint: None`` and ``evaluation: pending``.
"""
from __future__ import annotations

from copy import deepcopy

from .errors import ApiError

STATUS_LABELS = [
    {"label": "Architecture defined", "state": "done"},
    {"label": "Demo interface available", "state": "done"},
    {"label": "Trained checkpoint unavailable", "state": "pending"},
    {"label": "Evaluation pending", "state": "pending"},
]

_COMMON_TRAINING_PLAN = {
    "optimizer": "Adam",
    "learning_rate": 1e-3,
    "batch_size": 32,
    "epochs": 50,
    "dropout": 0.3,
    "loss": "Cross-entropy",
    "evaluation_protocol": "Speaker-independent split; Macro-F1 for model selection",
}

_MODELS: list[dict] = [
    {
        "id": "cnn_tfa",
        "name": "CNN + Time-Frequency Attention",
        "short_name": "CNN + TF-Attention",
        "label": "Model A",
        "role": "proposed",
        "family": "cnn",
        "input_representation": "Mel spectrogram",
        "input_kind": "mel_spectrogram",
        "architecture_steps": [
            "Mel spectrogram",
            "CNN",
            "Time-Frequency Attention",
            "Global pooling",
            "Classifier",
            "Six emotion classes",
        ],
        "purpose": "Proposed spectral model: a CNN whose feature maps are re-weighted by a "
        "time-frequency attention block before pooling.",
        "intended_contribution": "Tests whether attending over time and frequency improves a "
        "spectrogram CNN (ablated against Baseline A).",
        "tunable_inputs": {"n_mels": [64, 128, 256]},
        "defaults": {"n_mels": 128},
        "planned_configuration": {
            **_COMMON_TRAINING_PLAN,
            "feature_input": "Mel spectrogram (n_mels configurable)",
            "attention": "Time-frequency attention block after the CNN stack",
        },
    },
    {
        "id": "bilstm",
        "name": "BiLSTM",
        "short_name": "BiLSTM",
        "label": "Model B",
        "role": "proposed",
        "family": "rnn",
        "input_representation": "MFCC sequence",
        "input_kind": "mfcc_sequence",
        "architecture_steps": [
            "MFCC sequence",
            "BiLSTM",
            "Dense classifier",
            "Six emotion classes",
        ],
        "purpose": "Proposed temporal model: a bidirectional LSTM over the MFCC frame sequence.",
        "intended_contribution": "Captures temporal dependencies in both directions "
        "(compared against Baseline B).",
        "tunable_inputs": {"n_mfcc": [13, 20, 40]},
        "defaults": {"n_mfcc": 40},
        "planned_configuration": {
            **_COMMON_TRAINING_PLAN,
            "feature_input": "MFCC sequence (n_mfcc configurable)",
            "recurrent_layer": "Bidirectional LSTM",
        },
    },
    {
        "id": "cnn_plain",
        "name": "Plain CNN",
        "short_name": "Plain CNN",
        "label": "Baseline A",
        "role": "baseline",
        "family": "cnn",
        "input_representation": "Mel spectrogram",
        "input_kind": "mel_spectrogram",
        "architecture_steps": [
            "Mel spectrogram",
            "CNN",
            "Global pooling",
            "Classifier",
            "Six emotion classes",
        ],
        "purpose": "Baseline spectral model: a standard CNN on mel spectrograms without the attention mechanism.",
        "intended_contribution": "Provides a direct ablation baseline comparison for Model A (CNN+TFA).",
        "tunable_inputs": {"n_mels": [64, 128, 256]},
        "defaults": {"n_mels": 128},
        "planned_configuration": {
            **_COMMON_TRAINING_PLAN,
            "feature_input": "Mel spectrogram (n_mels configurable)",
        },
    },
    {
        "id": "lstm_uni",
        "name": "Unidirectional LSTM",
        "short_name": "Uni-LSTM",
        "label": "Baseline B",
        "role": "baseline",
        "family": "rnn",
        "input_representation": "MFCC sequence",
        "input_kind": "mfcc_sequence",
        "architecture_steps": [
            "MFCC sequence",
            "LSTM (forward only)",
            "Dense classifier",
            "Six emotion classes",
        ],
        "purpose": "Comparator for the BiLSTM: the same recurrent model restricted to one direction.",
        "intended_contribution": "Isolates the benefit of bidirectional context.",
        "tunable_inputs": {"n_mfcc": [13, 20, 40]},
        "defaults": {"n_mfcc": 40},
        "planned_configuration": {
            **_COMMON_TRAINING_PLAN,
            "feature_input": "MFCC sequence (n_mfcc configurable)",
            "recurrent_layer": "Unidirectional LSTM",
        },
    },
]

# Parameters of the *simulated* engine, per model (illustrative only).
SIM_PROFILE = {
    "cnn_tfa": {"temperature": 0.85, "bias_scale": 0.45, "noise_scale": 0.55},
    "cnn_plain": {"temperature": 1.05, "bias_scale": 0.55, "noise_scale": 0.65},
    "bilstm": {"temperature": 0.95, "bias_scale": 0.50, "noise_scale": 0.60},
    "lstm_uni": {"temperature": 1.15, "bias_scale": 0.60, "noise_scale": 0.70},
}

METRIC_NAMES = ["accuracy", "precision", "recall", "macro_f1"]


def get_model(model_id: str) -> dict:
    for m in _MODELS:
        if m["id"] == model_id:
            return m
    raise ApiError(404, "unknown_model", f"Unknown model id '{model_id}'.")


def list_models() -> list[dict]:
    out = []
    for m in _MODELS:
        entry = deepcopy(m)
        entry["status_labels"] = deepcopy(STATUS_LABELS)
        entry["implementation_status"] = {
            "architecture_defined": True,
            "demo_interface_available": True,
            "checkpoint_available": False,
            "evaluation_complete": False,
        }
        entry["checkpoint"] = None
        entry["experiment_status"] = "Not executed — no training has been run"
        entry["metrics"] = {k: None for k in METRIC_NAMES}
        entry["metrics_note"] = "Pending — model execution required"
        out.append(entry)
    return out


def resolve_config(model: dict, n_mels: int | None, n_mfcc: int | None, seed: int) -> dict:
    """Validate and normalise the analysis settings for a model."""
    tunables = model["tunable_inputs"]
    cfg: dict = {"seed": int(seed)}
    if "n_mels" in tunables:
        value = n_mels if n_mels is not None else model["defaults"]["n_mels"]
        if value not in tunables["n_mels"]:
            raise ApiError(422, "invalid_setting", f"n_mels must be one of {tunables['n_mels']}.")
        cfg["n_mels"] = value
    if "n_mfcc" in tunables:
        value = n_mfcc if n_mfcc is not None else model["defaults"]["n_mfcc"]
        if value not in tunables["n_mfcc"]:
            raise ApiError(422, "invalid_setting", f"n_mfcc must be one of {tunables['n_mfcc']}.")
        cfg["n_mfcc"] = value
    return cfg
