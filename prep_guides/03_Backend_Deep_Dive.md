# 03. Backend Deep Dive

Backend root: `backend/app/`. Run from `backend/` with `py -m uvicorn app.main:app --port 8000`.

Files covered here: `config.py`, `errors.py`, `audio_io.py`, `registry.py`, `simulation.py`, `synth.py`, `main.py`. (`features/noise/cluster` → file `04`; `neural_models/explain` → files `05`, `06`.)

---

## 3.1 `config.py`: central configuration

| Constant | Value | Purpose |
|---|---|---|
| `APP_VERSION` | `1.0.0-demo` | shown in health + UI |
| `EMOTIONS` | anger, disgust, fear, happiness, sadness, neutral | **fixed class order** used by every module |
| `MAX_UPLOAD_BYTES` | 25 MB (env `RESONANCE_MAX_UPLOAD_MB`) | upload cap |
| `MAX_DURATION_S` | 60 s (env) | longest clip accepted |
| `MIN_DURATION_S` | 0.5 s | shortest clip |
| `SUPPORTED_EXTENSIONS` | .wav .mp3 .flac .ogg .mpeg .mpg | allow-list |
| `ANALYSIS_SR` | 16,000 | all analysis sample rate |
| `CORS_ORIGINS` | localhost/127.0.0.1 on ports 5173, 4173, 8000 (env override) | browser access control |

`simulation_stamp()` returns the **provenance fields** attached to many responses: `mode`, `model_checkpoint`, `measured`, `note`. These exist so the front end (and a reader) can see how a number was produced. *(Currently the values are `inference`/`wav2vec2_dpngtm`/`True`. See `15` for how to describe that accurately.)*

**Concept: environment-variable configuration.** Limits can be changed without editing code: `set RESONANCE_MAX_UPLOAD_MB=50`.

**CORS (Cross-Origin Resource Sharing):** browsers block a page at `localhost:5173` from calling an API at `localhost:8000` unless the API sends `Access-Control-Allow-Origin`. The middleware in `main.py` does this for the whitelisted origins. In dev, the Vite proxy makes the browser think it's same-origin anyway. Test `test_cors_allows_dev_origin` checks it.

---

## 3.2 `errors.py`: structured errors

```python
class ApiError(Exception):
    status_code, code, message
    def to_dict(self): return {"error": {"code": ..., "message": ...}}
```

`main.py` registers handlers so *every* failure is JSON with the same shape:

| Exception | HTTP | Body |
|---|---|---|
| `ApiError` | its own status | `{"error": {code, message}}` |
| `RequestValidationError` (FastAPI) | 422 | `invalid_request` + readable message (first error only) |
| Any other `Exception` | 500 | `internal_error` |

Error codes you should know: `no_file`(400), `empty_file`(400), `unsupported_file_type`(415), `file_too_large`(413), `audio_too_long`(413), `undecodable_audio`(422), `audio_too_short`(422), `silent_audio`(422), `invalid_setting`(422), `invalid_k`(422), `too_few_frames`(422), `unknown_model`(404), `checkpoint_unavailable`(409), `invalid_model_type`(400), `inference_failed`(500).

The frontend `ApiRequestError` ([client.ts](../frontend/src/api/client.ts)) mirrors this (`code`, `message`, `status`).

---

## 3.3 `audio_io.py`: safe upload & decoding

### `load_upload(file)` step by step
1. **No file / no name** → 400 `no_file`.
2. **Extension allow-list** → else 415.
3. **Stream to a temp file** (`tempfile.mkstemp`, prefix `resonance_`) in **1 MB chunks**, updating a SHA-256 hash as it goes. If total size > limit → 413 *immediately* (no giant file ever fully lands in memory). Zero bytes → 400.
4. `_decode(...)`, then **always** `os.remove(tmp)` in `finally`.

### `_decode(path, ...)`
1. `soundfile.info()` → native sample rate, channels, container (e.g. `WAV/PCM_16`), duration. If soundfile can't read (e.g. some MPEG), fall back to librosa (`channels` is then assumed 1).
2. Duration > 60 s → 413 `audio_too_long`.
3. `librosa.load(path, sr=16000, mono=True)` → resample + downmix.
4. After decoding: duration < 0.5 s → 422; **non-finite or max |y| < 1e-6** → 422 `silent_audio`.
5. Return a `LoadedAudio` dataclass (float32 array, sr, filename, size, **sha256**, duration, native SR, channels, container) with a `.metadata()` method for JSON.

### `waveform_envelope(y, buckets=600)`
Down-samples the waveform to 600 `[min, max]` pairs for plotting, preserving peaks (plain decimation would lose them).

**Why SHA-256?** It fingerprints the *content*. It is later used as the seed material for deterministic noise and simulation, so identical files always yield identical outputs, and it appears in metadata so a result can be traced to a file.

**Security thinking worth mentioning:** allow-list extension, size cap while streaming, temp-file cleanup, content actually decoded (so renaming `.txt` → `.wav` fails as `undecodable_audio`).

---

## 3.4 `registry.py`: the model registry

`_MODELS` is a list of four dictionaries, one per configuration (see `01` §1.7). Each has: `id, name, short_name, label, role, family (cnn|rnn), input_representation, input_kind, architecture_steps, purpose, intended_contribution, tunable_inputs, defaults, planned_configuration`.

- `tunable_inputs`: `n_mels ∈ {64,128,256}` for CNN family; `n_mfcc ∈ {13,20,40}` for RNN family.
- `_COMMON_TRAINING_PLAN`: Adam, lr 1e-3, batch 32, 50 epochs, dropout 0.3, cross-entropy, "speaker-independent split; Macro-F1 for model selection". This is the **planned** protocol shown in the UI.
- `STATUS_LABELS`: "Architecture defined ✓ / Demo interface available ✓ / Trained checkpoint unavailable ⏳ / Evaluation pending ⏳".
- `SIM_PROFILE`: per-model `temperature`, `bias_scale`, `noise_scale` used **only** by the simulation engine.
- `list_models()` deep-copies entries and adds `implementation_status`, `checkpoint: None`, `metrics: all None`, `metrics_note`.
- `resolve_config(model, n_mels, n_mfcc, seed)` validates settings against the tunables → 422 `invalid_setting` if illegal (e.g. `n_mels=77`). Only the relevant knob is included (`n_mels` for CNNs, `n_mfcc` for RNNs).
- `get_model(id)` → 404 `unknown_model`.

Note the important consequence: `/api/analyze` only accepts these **four** ids.

---

## 3.5 `simulation.py`: the deterministic stand-in engine

**What it is:** a function `simulate_from_logmel(lm, content_key, model_id, cfg)` that returns a valid probability distribution *without* any trained network. It exists so that the whole UI workflow (charts, noise comparison, occlusion) can be demonstrated and **tested deterministically**.

**How it works**
1. `descriptor(lm)`: four real statistics from the log-mel (normalised `a = (lm+80)/80`):
   - `loudness` = mean(a); `dynamics` = std of per-frame mean energy;
   - `brightness` = energy-weighted mean mel-band index; `flux` = mean |Δ over time|.
2. `arousal_proxy(d)` = `1.6 · tanh( (6(loud−0.5) + 6(bright−0.3) + 15(flux−0.04) + 5(dyn−0.1)) / 2 )`: a hand-tuned score in about [−1.6, 1.6].
3. **Valence** `V ~ Normal(0, 0.8)` drawn from an RNG seeded by `SHA-256("valence|content_key")`, i.e. *not* derived from the audio's acoustics, only from its hash.
4. Logits per emotion = `a_e·A + v_e·V` using the loadings table (anger: high arousal/neg valence; sadness: low arousal; happiness: positive valence…). Neutral = `0.5 − 0.7|A|`. This borrows from the **Russell circumplex model** (arousal × valence).
5. Add seeded Gaussian offsets per (content, model, config); divide by the model's temperature; softmax.
6. `_normalise_percent`: round to 2 d.p. and force the total to exactly 100.00 (remainder added to the largest entry), which is why UI sums are exactly 100.

**Why this matters when presenting:** the output *responds to the audio* (louder/brighter/more dynamic → higher arousal) but the valence component and per-model offsets are pseudo-random. It is not a classifier and has no accuracy. The docstring says so explicitly.

---

## 3.6 `synth.py`: synthetic speech-like signals

`speech_like(duration, sr, f0_base, vibrato, syllable_rate, level, seed)` builds a test signal from:
- a harmonic source whose F0 wobbles (vibrato at 0.7 Hz and 2.3 Hz),
- 29 harmonics shaped by **three formant filters** (Gaussian bumps at 700, 1200, 2600 Hz ≈ a vowel-like spectral envelope),
- a syllable-rate amplitude envelope and slow "pauses",
- a little noise, then peak-normalised to `level`.

`sine()` and `to_wav_bytes()` are helpers. Used by the pytest suite and by `scripts/make_samples.py`. The frontend has a TypeScript twin (`synthSpeechLike` in `audio.ts`) producing the "Test Signals" presets so the app works without any dataset.

**Say clearly:** these are *synthetic test signals, not speech and not emotional content.* They exist to exercise the pipeline with controllable properties (e.g. a 220 Hz sine has a known RMS and pitch, which is perfect for oracle-based tests).

---

## 3.7 `main.py`: the API

### Setup
- `FastAPI(title="Resonance Demo API", version=APP_VERSION)`, CORS middleware (GET/POST/OPTIONS), start time for uptime.
- Exception handlers (see 3.2).
- `_setup(model_id, n_mels, n_mfcc, seed)` → `(model, cfg)` via the registry (validates).
- `_prediction(y, sr, sha, model, cfg)`:
  - If `model.id` is one of `wav2vec2_wiam / wav2vec2_dpngtm / distilhubert` → try the real neural path (but the registry never contains those ids, so this branch is not reached from `/api/analyze`).
  - Otherwise compute log-mel with the config's `n_mels` and call `simulate_from_logmel`.

### Endpoint-by-endpoint

**`GET /api/health`** → status, service, version, provenance stamp, banner, uptime, limits, library versions (python, numpy, scipy, librosa, scikit-learn).

**`GET /api/model-info?model_id=`** → emotions + the four models (with `implementation_status`, `metrics: null`...). Unknown id → 404.

**`POST /api/load-checkpoint`** (form: `model_id`) → validates the id, then always raises **409 `checkpoint_unavailable`**. It is a *contract endpoint* that the UI and tests use to prove "missing-checkpoint handling" works.

**`POST /api/analyze`** (form: `file`, `model_id=cnn_tfa`, `n_mels`, `n_mfcc`, `seed=42`)
```
_setup → load_upload → _prediction
returns { stamp, banner, model{id,name,label,input_representation}, configuration,
          audio (metadata), waveform (600 min/max pairs),
          signal_analysis (features.acoustic_features),
          input_tensor (features.input_representation → type, shape, axes),
          prediction }
```

**`POST /api/noise-analysis`** → `noise.build_conditions` (clean, 20/10/5 dB, denoised), then for each: waveform envelope, feature analysis, and a prediction. Also returns `noise_generation` (method text) and `robustness_status`.

**`POST /api/cluster`** (form: `file`, `k=4`, `seed=42`) → `cluster.run_kmeans`.

**`POST /api/explain-demo`** → `explain.occlusion_map` on a log-mel; returns the importance grid + spectrogram bytes (0–255) + metadata.

**`GET /api/live-models`** → a *hard-coded* list of five specs (ids `wav2vec2_wiam`, `wav2vec2_dpngtm`, `distilhubert`, `cnn_tfa`, `bilstm`) with parameter counts, sizes, input representation, architecture strings.

**`POST /api/live-inference`** (form: `file`, `model_type`) → validates `model_type` against 7 allowed strings (400 `invalid_model_type`), loads audio, calls `neural_models.run_live_inference_array`, wraps failures as 500 `inference_failed`.

**Static serving:** if `frontend/dist` exists, `/assets` is mounted and every non-`/api` path returns `index.html` (single-page-app fallback). Path traversal is guarded (`_DIST in candidate.parents`).

### FastAPI concepts to be able to explain
- **Pydantic/type-hint validation:** `file: UploadFile = File(...)`, `k: int = Form(4)` automatically parse and validate multipart form data.
- **`async def` endpoints** with `await file.read()` stream uploads without blocking. (CPU-bound librosa/torch work inside async handlers does occupy the event loop; for a single-user demo that is fine.)
- **Dependency-free design:** each endpoint is a thin controller; logic lives in modules.

---

## 3.8 Request lifecycle example: `/api/noise-analysis`

1. Browser sends `multipart/form-data` (file + model_id + seed).
2. `_setup` validates model/settings.
3. `load_upload` streams, hashes, decodes → `y` (16 kHz mono).
4. `build_conditions`: for SNR in {20,10,5}: `add_white_noise(y, snr, seed=hash(content,cond))`; measures actual SNR; spectral-gates the 10 dB version → `denoised`.
5. For each of 5 conditions: envelope (600 pts), acoustic features, prediction.
6. JSON returns ~5× the single-analysis payload.

Compute cost ≈ 5 × (feature extraction + prediction). Worth knowing if asked about latency.

---

## 3.9 Self-test questions
1. Where is the 25 MB limit enforced and why while streaming? *(`load_upload`; avoids loading huge files into RAM.)*
2. What is the point of `/api/load-checkpoint` if it always fails? *(A tested contract demonstrating missing-checkpoint handling.)*
3. Why is the same file always giving the same prediction? *(SHA-256-seeded RNG.)*
4. Which module owns the class order? *(`config.EMOTIONS`.)*
5. How does the server stop a renamed `.txt` file? *(Extension list, then real decoding → 422.)*
