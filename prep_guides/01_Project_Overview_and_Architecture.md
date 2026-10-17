# 01. Project Overview & Architecture

## 1.1 What is Resonance?

**Resonance** is a full-stack web platform for **Speech Emotion Recognition (SER)**: given a speech recording, estimate which emotion the speaker is expressing. It classifies into **six emotions**:

`anger · disgust · fear · happiness · sadness · neutral`

(The order is fixed everywhere: [config.py](../backend/app/config.py), the frontend `types`, the tests.)

The project has five goals:

1. **A working SER pipeline**: upload or record audio, analyse it, show results.
2. **Comparative modelling**: two proposed architectures (CNN + Time-Frequency Attention, BiLSTM) and two baselines (Plain CNN, Uni-LSTM). The comparisons are designed as ablations.
3. **Robustness study**: inject noise at 20/10/5 dB SNR, denoise, compare.
4. **Explainability (XAI)**: show *which parts of the spectrogram* matter.
5. **Data augmentation with a conditional GAN** for under-represented emotions (fear, disgust).

Plus supporting parts: unsupervised **K-Means** analysis, a **test suite** (3 layers), and a **data collector** sub-project (Studio Booth).

---

## 1.2 Technology stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react, react-router | Fast dev server, typed code, charting, client-side routing |
| Backend | Python, FastAPI, Uvicorn | Async web framework, automatic validation, easy file upload |
| Audio/DSP | librosa, SoundFile, NumPy, SciPy | Standard audio analysis stack |
| Classical ML | scikit-learn (KMeans, PCA, StandardScaler, silhouette) | Unsupervised analysis |
| Deep learning | PyTorch, Hugging Face `transformers` | Neural models; pretrained Wav2Vec2/DistilHuBERT |
| Testing | pytest + FastAPI `TestClient`, in-browser harness, Selenium | Three layers (see `09`) |

Dev ports: backend **8000**, frontend **5173** (Vite proxies `/api` → backend, see [vite.config.ts](../frontend/vite.config.ts)).

---

## 1.3 Folder map

```
nndlnew/
├── backend/
│   ├── app/                    ← the API (see 03, 04, 05, 06)
│   │   ├── main.py             ← FastAPI app + all endpoints
│   │   ├── config.py           ← constants, limits, CORS, provenance stamp
│   │   ├── audio_io.py         ← upload streaming, validation, decoding
│   │   ├── features.py         ← RMS/ZCR/centroid/MFCC/pitch, mel tensors
│   │   ├── noise.py            ← white noise at target SNR + spectral gate
│   │   ├── cluster.py          ← K-Means + PCA + silhouette
│   │   ├── registry.py         ← the 4 model configurations
│   │   ├── simulation.py       ← deterministic stand-in "predictor"
│   │   ├── explain.py          ← occlusion sensitivity
│   │   ├── neural_models.py    ← PyTorch models + live inference
│   │   ├── synth.py            ← synthetic speech-like test signals
│   │   └── errors.py           ← structured ApiError
│   ├── models/                 ← .pt files + 3 HF model folders (≈ 800 MB)
│   ├── tests/test_api.py       ← pytest suite
│   └── requirements.txt
├── frontend/                   ← React app (see 08)
│   └── src/{pages,components,state,api,utils,tests,data,types}
├── collector/                  ← Studio Booth data-collection tool (see 11)
├── scripts/                    ← screenshot, sample, Chrome E2E, evaluation scripts
├── samples/  screenshots/  logs/
├── start_*.{ps1,bat,sh}  run_tests.*   ← launch & test helpers
└── README.md, Project details.md, finalprojectdetails.md, Implementation.txt
```

---

## 1.4 End-to-end data flow

```mermaid
sequenceDiagram
    participant U as User (browser)
    participant R as React (session.tsx)
    participant A as FastAPI (main.py)
    participant D as audio_io.py
    participant F as features/noise/cluster/explain
    participant M as neural_models / simulation
    U->>R: drop file / record mic / pick test signal
    R->>R: decode with Web Audio API (waveform, duration, SR)
    U->>R: click "Classify Emotion"
    R->>A: POST /api/analyze (multipart: file, model_id, n_mels, n_mfcc, seed)
    A->>D: stream to temp file, size/ext/duration checks, SHA-256
    D->>D: librosa.load → mono, 16 kHz, float32
    A->>F: acoustic_features(), input_representation()
    A->>M: _prediction()
    M-->>A: probabilities (6 classes, sum 100)
    A-->>R: JSON (audio meta, waveform, features, tensor shape, prediction, provenance)
    R->>R: store in sessionStorage; render charts
```

**Key idea:** every endpoint starts with the same `load_upload()` call, which guarantees the audio is valid, mono, 16 kHz, and fingerprinted (SHA-256). All analysis then operates on that clean array.

---

## 1.5 The ten pages

Routes are defined in [App.tsx](../frontend/src/App.tsx); all pages render inside [Layout.tsx](../frontend/src/components/Layout.tsx) (top nav, banner, session bar).

| Route | Page | Purpose | Backend call |
|---|---|---|---|
| `/` | Audio Analysis | Main demo: input → choose model → "Classify Emotion" → probabilities + features | `POST /api/analyze` |
| `/acoustic-features` | Acoustic Features | Detailed signal diagnostics, MFCC chart, input-tensor shape | uses stored analysis |
| `/live-model` | Live Model Inference | Run pretrained neural models, show latency/params | `GET /api/live-models`, `POST /api/live-inference` |
| `/model-comparison` | Model Comparison | Cards, pipelines, metric table & chart, JSON log import | `GET /api/model-info` |
| `/noise-robustness` | Noise Robustness | 5 noise conditions, waveform & prediction per condition | `POST /api/noise-analysis` |
| `/kmeans` | K-Means Analysis | Cluster frames of the recording | `POST /api/cluster` |
| `/explainability` | Explainability | Occlusion heatmap over spectrogram | `POST /api/explain-demo` |
| `/gan-augmentation` | GAN Augmentation | Pipeline, parameters, quality gates, result-table layout | none (UI only) |
| `/testing` | Testing | In-browser test harness (T01–T13) | many |
| `/architecture` | Architecture | Diagrams, registry, endpoint list, capability matrix | `GET /api/health`, `POST /api/load-checkpoint` |

---

## 1.6 The nine endpoints

| Method | Path | Does |
|---|---|---|
| GET | `/api/health` | Uptime, limits, library versions, provenance stamp |
| GET | `/api/model-info` | The 4-model registry |
| POST | `/api/load-checkpoint` | Always replies 409 `checkpoint_unavailable` (contract test) |
| POST | `/api/analyze` | Metadata + waveform + acoustic features + tensor shape + prediction |
| POST | `/api/noise-analysis` | 5 conditions, each with waveform, features, prediction, measured SNR |
| POST | `/api/cluster` | K-Means over frame features |
| POST | `/api/explain-demo` | Occlusion importance grid + spectrogram |
| GET | `/api/live-models` | Spec sheet of the live models |
| POST | `/api/live-inference` | Real forward pass of a neural model |

Plus a static-file route that serves the built frontend (`frontend/dist`) if it exists.

---

## 1.7 The four model "configurations"

| ID | Label | Role | Input | Idea |
|---|---|---|---|---|
| `cnn_tfa` | Model A | proposed | log-Mel spectrogram | CNN + time-frequency attention |
| `bilstm` | Model B | proposed | MFCC sequence | bidirectional LSTM |
| `cnn_plain` | Baseline A | baseline | log-Mel spectrogram | same CNN **without** attention (ablation) |
| `lstm_uni` | Baseline B | baseline | MFCC sequence | LSTM, **forward-only** (ablation) |

**Experimental design logic (say this in the viva):**
- A vs. Baseline A isolates the effect of *attention* (everything else equal).
- B vs. Baseline B isolates the effect of *bidirectionality*.
- A vs. B compares *representation + architecture family* (spectral/convolutional vs. temporal/recurrent).

---

## 1.8 Three kinds of "inference" in this repo (important!)

Understanding this removes most confusion:

| Kind | Code | Used by | What it really is |
|---|---|---|---|
| **Simulation** | [simulation.py](../backend/app/simulation.py) | `/api/analyze`, `/api/noise-analysis`, `/api/explain-demo` | Hand-made formula on spectrogram statistics + seeded random offsets. Not a trained model |
| **Pretrained transformers** | [neural_models.py](../backend/app/neural_models.py) `get_wav2vec2*`, `get_distilhubert` | `/api/live-inference` | Real neural nets trained by others on RAVDESS, run for real |
| **Your own PyTorch models** | `CNNTimeFrequencyAttention`, `BiLSTMClassifier` | architecture definitions and `.pt` files | Real architectures, but weights are random (never trained) |

Full details and safe wording: `05` and `15`.

---

## 1.9 Design principles worth mentioning

1. **Provenance stamps.** Responses carry fields like `mode`, `model_checkpoint`, `measured` so the UI can show where each number comes from.
2. **Structured errors.** Every failure returns `{"error": {"code", "message"}}` with proper HTTP status (400/413/415/422/404/409/500).
3. **Determinism.** Seeds are derived from the audio's SHA-256, so the same file always gives the same results. This makes testing possible.
4. **Defensive upload handling.** Streamed in 1 MB chunks, size-capped, temp file always deleted, silent/short/corrupt audio rejected.
5. **Session persistence.** UI state is saved in `sessionStorage`, so a refresh doesn't lose your work; stale results are flagged when settings change.
6. **Separation of concerns.** DSP, ML, API, and UI live in separate modules.
