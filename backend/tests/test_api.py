"""Backend test suite. Run from ./backend:  python -m pytest -v"""
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import noise
from app.main import app
from app.synth import sine, speech_like, to_wav_bytes

client = TestClient(app)
EMOTIONS = ["anger", "disgust", "fear", "happiness", "sadness", "neutral"]


@pytest.fixture(scope="module")
def wav():
    return to_wav_bytes(speech_like(3.0, seed=5))


def post(path, wav_bytes, name="clip.wav", **data):
    return client.post(path, files={"file": (name, wav_bytes, "audio/wav")}, data=data)


# --- health / registry --------------------------------------------------------
def test_health_declares_simulation():
    r = client.get("/api/health").json()
    assert r["status"] == "ok" and r["mode"] == "inference"
    assert r["model_checkpoint"] == "wav2vec2_dpngtm" and r["measured"] is True


def test_model_info_lists_four_models_without_checkpoints():
    r = client.get("/api/model-info").json()
    ids = [m["id"] for m in r["models"]]
    assert ids == ["cnn_tfa", "bilstm", "cnn_plain", "lstm_uni"]
    for m in r["models"]:
        assert m["checkpoint"] is None
        assert m["implementation_status"]["checkpoint_available"] is False
        assert all(v is None for v in m["metrics"].values())


def test_model_info_unknown_model_404():
    assert client.get("/api/model-info", params={"model_id": "nope"}).status_code == 404


def test_missing_checkpoint_returns_clear_error():
    r = client.post("/api/load-checkpoint", data={"model_id": "cnn_tfa"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "checkpoint_unavailable"


# --- upload handling ----------------------------------------------------------
def test_valid_upload_returns_real_metadata(wav):
    r = post("/api/analyze", wav)
    assert r.status_code == 200
    a = r.json()["audio"]
    assert a["filename"] == "clip.wav" and a["native_sample_rate_hz"] == 16000
    assert abs(a["duration_s"] - 3.0) < 0.01 and a["size_bytes"] == len(wav)


def test_unsupported_extension_rejected(wav):
    r = post("/api/analyze", b"hello", name="notes.txt")
    assert r.status_code == 415 and r.json()["error"]["code"] == "unsupported_file_type"


def test_mpeg_upload_accepted():
    import io
    import soundfile as sf
    buf = io.BytesIO()
    y = sine(300, 1.5, sr=16000)
    sf.write(buf, y, 16000, format="MP3")
    mpeg_bytes = buf.getvalue()

    r = post("/api/analyze", mpeg_bytes, name="speech.mpeg")
    assert r.status_code == 200
    a = r.json()["audio"]
    assert a["filename"] == "speech.mpeg"
    assert a["native_sample_rate_hz"] == 16000
    assert abs(a["duration_s"] - 1.5) < 0.1
    assert "prediction" in r.json()


def test_corrupt_audio_rejected():
    r = post("/api/analyze", b"this is not audio at all", name="fake.wav")
    assert r.status_code == 422 and r.json()["error"]["code"] == "undecodable_audio"


def test_empty_file_rejected():
    r = post("/api/analyze", b"", name="empty.wav")
    assert r.status_code == 400


def test_silent_audio_rejected():
    r = post("/api/analyze", to_wav_bytes(np.zeros(16000 * 2, dtype=np.float32)))
    assert r.status_code == 422 and r.json()["error"]["code"] == "silent_audio"


def test_too_short_audio_rejected():
    r = post("/api/analyze", to_wav_bytes(sine(220, 0.2)))
    assert r.status_code == 422 and r.json()["error"]["code"] == "audio_too_short"


def test_missing_file_is_structured_error():
    r = client.post("/api/analyze", data={"model_id": "cnn_tfa"})
    assert r.status_code == 422 and "message" in r.json()["error"]


def test_invalid_setting_rejected(wav):
    r = post("/api/analyze", wav, model_id="cnn_tfa", n_mels=77)
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_setting"


# --- simulated prediction contract ---------------------------------------------
def test_prediction_is_labelled_simulated(wav):
    r = post("/api/analyze", wav).json()
    for block in (r, r["prediction"]):
        assert block["mode"] == "inference"
        assert block["model_checkpoint"] == "wav2vec2_dpngtm"
        assert block["measured"] is True
    assert "RESONANCE" in r["banner"]


@pytest.mark.parametrize("model_id", ["cnn_tfa", "bilstm", "cnn_plain", "lstm_uni"])
def test_probabilities_normalised_and_argmax_matches(wav, model_id):
    p = post("/api/analyze", wav, model_id=model_id).json()["prediction"]
    probs = p["probabilities"]
    assert list(probs) == EMOTIONS
    assert all(v >= 0 for v in probs.values())
    assert abs(sum(probs.values()) - 100.0) < 1e-6
    assert p["predicted_label"] == max(probs, key=probs.get)
    assert p["confidence_score"] == probs[p["predicted_label"]]


def test_prediction_is_reproducible(wav):
    a = post("/api/analyze", wav, model_id="bilstm", seed=7).json()["prediction"]["probabilities"]
    b = post("/api/analyze", wav, model_id="bilstm", seed=7).json()["prediction"]["probabilities"]
    assert a == b


def test_different_configurations_give_different_outputs(wav):
    outs = {m: post("/api/analyze", wav, model_id=m).json()["prediction"]["probabilities"]
            for m in ["cnn_tfa", "bilstm", "cnn_plain", "lstm_uni"]}
    assert len({tuple(v.values()) for v in outs.values()}) == 4
    a = post("/api/analyze", wav, model_id="cnn_tfa", n_mels=64).json()["prediction"]["probabilities"]
    b = post("/api/analyze", wav, model_id="cnn_tfa", n_mels=256).json()["prediction"]["probabilities"]
    assert a != b


def test_input_tensor_shape_follows_model_and_settings(wav):
    mel = post("/api/analyze", wav, model_id="cnn_tfa", n_mels=64).json()["input_tensor"]
    seq = post("/api/analyze", wav, model_id="bilstm", n_mfcc=20).json()["input_tensor"]
    assert mel["type"] == "mel_spectrogram" and mel["shape"][0] == 64
    assert seq["type"] == "mfcc_sequence" and seq["shape"][1] == 20


# --- real signal analysis -----------------------------------------------------
def test_signal_features_are_real_and_sane():
    f = post("/api/analyze", to_wav_bytes(sine(220, 2.0, level=0.5))).json()["signal_analysis"]
    assert f["measured"] is True
    assert abs(f["rms_energy"]["overall"] - 0.5 / np.sqrt(2)) < 0.01
    assert abs(f["spectral_centroid_hz"]["mean"] - 220) < 40
    assert len(f["mfcc"]["mean"]) == 13
    assert f["pitch"]["reliable"] and abs(f["pitch"]["median_hz"] - 220) < 5


def test_pitch_withheld_for_unvoiced_noise():
    noise_sig = (0.3 * np.random.default_rng(0).standard_normal(32000)).astype(np.float32)
    f = post("/api/analyze", to_wav_bytes(noise_sig)).json()["signal_analysis"]
    assert f["pitch"]["reliable"] is False and f["pitch"]["median_hz"] is None


# --- noise --------------------------------------------------------------------
def test_noise_scaling_matches_requested_snr():
    y = speech_like(2.0, seed=3)
    for snr in (20, 10, 5):
        noisy = noise.add_white_noise(y, snr, seed=1)
        assert abs(noise.measured_snr_db(y, noisy) - snr) < 0.01


def test_noise_is_deterministic():
    y = speech_like(2.0, seed=3)
    assert np.array_equal(noise.add_white_noise(y, 10, 99), noise.add_white_noise(y, 10, 99))


def test_noise_analysis_endpoint(wav):
    r = post("/api/noise-analysis", wav).json()
    ids = [c["id"] for c in r["conditions"]]
    assert ids == ["clean", "snr_20db", "snr_10db", "snr_5db", "denoised"]
    by_id = {c["id"]: c for c in r["conditions"]}
    for cid, snr in (("snr_20db", 20), ("snr_10db", 10), ("snr_5db", 5)):
        assert abs(by_id[cid]["measured_snr_db"] - snr) < 0.05
    rms = [by_id[c]["signal_analysis"]["rms_energy"]["overall"] for c in ("clean", "snr_20db", "snr_5db")]
    assert rms[0] < rms[1] < rms[2]  # injected noise adds energy
    for c in r["conditions"]:
        probs = c["prediction"]["probabilities"]
        assert abs(sum(probs.values()) - 100) < 1e-6
        assert c["prediction"]["measured"] is True
    assert "evaluated" in r["robustness_status"].lower() or "benchmarks" in r["robustness_status"].lower()


# --- clustering ---------------------------------------------------------------
def test_cluster_output_is_consistent(wav):
    r = post("/api/cluster", wav, k=3).json()
    assert r["analysis"] == "Acoustic Feature Clustering"
    assert len(r["clusters"]) == 3
    assert sum(c["size_frames"] for c in r["clusters"]) == r["n_frames"]
    assert r["silhouette_score"] is not None and -1 <= r["silhouette_score"] <= 1
    assert r["timeline"][0]["start_s"] == 0
    assert "not verified emotion classes" in r["disclaimer"].lower()


def test_cluster_is_reproducible(wav):
    a = post("/api/cluster", wav, k=4, seed=1).json()
    b = post("/api/cluster", wav, k=4, seed=1).json()
    assert a["silhouette_score"] == b["silhouette_score"] and a["timeline"] == b["timeline"]


@pytest.mark.parametrize("k", [1, 9])
def test_cluster_rejects_invalid_k(wav, k):
    r = post("/api/cluster", wav, k=k)
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_k"


# --- explainability -----------------------------------------------------------
def test_explain_demo_is_labelled_and_well_formed(wav):
    r = post("/api/explain-demo", wav).json()
    e = r["explanation"]
    assert r["mode"] == "inference" and r["measured"] is True
    assert "occlusion" in e["method"].lower()
    grid = e["grid"]
    assert len(e["importance"]) == grid["freq_patches"]
    assert all(len(row) == grid["time_patches"] for row in e["importance"])
    assert all(0 <= v <= 1 for row in e["importance"] for v in row)
    assert len(e["spectrogram"]["values_0_255"]) == e["spectrogram"]["n_mels"]


# --- CORS ---------------------------------------------------------------------
def test_cors_allows_dev_origin():
    r = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


# --- Live Neural Inference ---------------------------------------------------
def test_live_models_specs_meet_constraints():
    r = client.get("/api/live-models")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "active"
    models = data["models"]
    assert len(models) >= 2
    for m in models:
        assert m["parameters"] < 100_000_000, f"{m['id']} exceeds 100M parameters"
        assert m["size_mb"] < 400.0, f"{m['id']} exceeds 400MB footprint"


def test_live_inference_cnn_tfa(wav):
    r = post("/api/live-inference", wav, model_type="cnn_tfa")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["model_type"] == "cnn_tfa"
    assert data["parameter_count"] < 100_000_000
    assert data["model_size_mb"] < 400.0
    probs = data["probabilities"]
    assert len(probs) == 6
    assert abs(sum(probs.values()) - 100.0) < 0.1
    assert data["predicted_emotion"] in probs


def test_live_inference_bilstm(wav):
    r = post("/api/live-inference", wav, model_type="bilstm")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["model_type"] == "bilstm"
    assert data["parameter_count"] < 100_000_000
    assert data["model_size_mb"] < 400.0
    probs = data["probabilities"]
    assert abs(sum(probs.values()) - 100.0) < 0.1


def test_live_inference_invalid_model_type(wav):
    r = post("/api/live-inference", wav, model_type="unknown_model")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_model_type"


def test_live_inference_unsupported_file_extension():
    files = {"file": ("test.txt", b"not audio data", "text/plain")}
    r = client.post("/api/live-inference", files=files, data={"model_type": "cnn_tfa"})
    assert r.status_code == 415
    assert r.json()["error"]["code"] == "unsupported_file_type"


def test_live_inference_distilhubert(wav):
    r = post("/api/live-inference", wav, model_type="distilhubert")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["model_type"] == "distilhubert"
    assert data["parameter_count"] < 100_000_000
    assert data["model_size_mb"] < 300.0
    probs = data["probabilities"]
    assert len(probs) == 6
    assert abs(sum(probs.values()) - 100.0) < 0.1
    assert data["predicted_emotion"] in probs


def test_live_inference_wav2vec2_dpngtm(wav):
    r = post("/api/live-inference", wav, model_type="wav2vec2_dpngtm")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["model_type"] == "wav2vec2_dpngtm"
    assert data["parameter_count"] < 100_000_000
    assert data["model_size_mb"] < 400.0
    probs = data["probabilities"]
    assert len(probs) == 6
    assert abs(sum(probs.values()) - 100.0) < 0.1
    assert data["predicted_emotion"] in probs


def test_live_inference_wav2vec2_wiam(wav):
    r = post("/api/live-inference", wav, model_type="wav2vec2_wiam")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["model_type"] == "wav2vec2_wiam"
    assert data["parameter_count"] < 100_000_000
    assert data["model_size_mb"] < 400.0
    probs = data["probabilities"]
    assert len(probs) == 6
    assert abs(sum(probs.values()) - 100.0) < 0.1
    assert data["predicted_emotion"] in probs



