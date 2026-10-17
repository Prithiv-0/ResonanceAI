# 08. Frontend Deep Dive (Architecture, State, Audio & UI)

> **Comprehensive Guide**: This document details the entire frontend architecture in `frontend/`, explaining how React 18, TypeScript, Vite, Tailwind CSS, Recharts, and Web Audio API collaborate to deliver a research-grade dashboard with client-side audio DSP and session persistence.

---

## 8.1 Frontend Technology Stack & Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts            # Typed HTTP client & API error handling
│   ├── components/
│   │   ├── AnalysisSettings.tsx # Tunable knobs (n_mels, n_mfcc, seed)
│   │   ├── ArchitectureFlow.tsx # Visual pipeline diagram for models
│   │   ├── AudioSourcePanel.tsx # 3-tab audio ingestion (Mic, Upload, Presets)
│   │   ├── Layout.tsx           # Global shell: Nav, Banner, Session Bar
│   │   ├── MicrophoneRecorder.tsx # Real-time Web Audio mic capture & WAV encoder
│   │   ├── ModelCards.tsx       # Selectable cards for the 4 registry models
│   │   ├── PipelinePanel.tsx    # Vertical pipeline step cards
│   │   ├── ProbabilityChart.tsx # Recharts horizontal probability bars
│   │   ├── SpectrogramView.tsx  # HTML5 Canvas Mel-spectrogram & XAI overlay
│   │   ├── Waveform.tsx         # SVG waveform envelope visualization
│   │   └── ui.tsx               # Reusable UI primitives (Panel, Badge, Stat, etc.)
│   ├── data/
│   │   └── scenarios.ts         # Predefined calibration scenarios (anger..neutral)
│   ├── pages/                   # 10 dedicated view controllers
│   ├── state/
│   │   └── session.tsx          # SessionProvider, React context & sessionStorage sync
│   ├── tests/
│   │   └── suite.ts             # In-browser test harness (T01 - T13)
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces across the entire platform
│   ├── utils/
│   │   ├── audio.ts             # Web Audio decoder, WAV header parser, PCM encoder
│   │   ├── format.ts            # Formatting for bytes, Hz, duration, probability sums
│   │   └── stale.ts             # Stale result detection logic
│   ├── App.tsx                  # BrowserRouter & Route configuration
│   └── nav.ts                   # Primary navigation items
├── index.html                   # HTML5 entrypoint
├── package.json                 # Dependencies & scripts
└── vite.config.ts               # Vite bundler, proxy configuration & chunking
```

---

## 8.2 State Management & Session Persistence (`state/session.tsx`)

A critical requirement of the project specification is **client-side session persistence without a heavy database**.

### 8.2.1 The In-Memory vs. Persisted State Distinction
In web browsers, certain data structures cannot be serialized to JSON:
* A `File` or `Blob` object contains raw binary pointers and native file handles. If you call `JSON.stringify(file)`, it outputs `{}`!
* Therefore, `SessionProvider` partitions state into two tiers:
  1. **Persisted State (`PersistedState` in `sessionStorage`)**:
     * Key: `resonance.session.v1`
     * Stores: `modelId`, `scenarioId`, `settings` (seed, n_mels, n_mfcc), `analysis` results, `noise` results, `cluster` results, `explain` results, `gan` parameters, `comparisonLog`, and metadata `audio` (`ClientAudioMeta`: filename, size, duration, sample rate, downsampled waveform envelope).
  2. **In-Memory Volatile State**:
     * `file: File | null` (the active audio binary).
     * `fileUrl: string | null` (object URL `blob:http://...` created via `URL.createObjectURL(file)` for `<audio>` playback).

### 8.2.2 Graceful Session Resumption
* When a user navigates between pages or refreshes the browser, `sessionStorage` instantly restores all charts, metadata, and results.
* If a reload occurs, `file` becomes `null` while `state.audio` remains populated.
* The UI gracefully detects this ([AudioSourcePanel.tsx:198](file:///n:/Projects/nndlnew/frontend/src/components/AudioSourcePanel.tsx#L198)):
  `"Metadata was restored from this browser session, but the file itself is not in memory. Re-select it to enable playback and analysis."`
* If the user never uploaded a file on startup, `session.tsx` automatically generates a calibrated synthetic audio sample (`makeEmotionSampleFile('anger')`) so the dashboard is **never blank or broken on first load**.

---

## 8.3 In-Browser Signal Processing (`utils/audio.ts`)

Resonance executes real DSP inside the browser before any network request is dispatched:

### 1. Native WAV Header Parser (`readWavHeader`)
```typescript
function readWavHeader(buf: ArrayBuffer): { sampleRate: number; channels: number } | null
```
* Parses raw bytes of a RIFF container using `DataView`.
* Scans chunks until it finds `'fmt '`.
* Extracts native hardware sample rate (bytes 24–27) and channel count (bytes 22–23).
* This allows Resonance to display the *true physical recording rate* (e.g., 44.1 kHz, 48 kHz) even if the browser Web Audio context resamples it.

### 2. Web Audio Decoder (`decodeAudioFile`)
* Instantiates an in-browser `AudioContext`.
* Calls `ctx.decodeAudioData(bytes)` to decode compressed MP3, OGG, or FLAC into raw PCM float32 arrays.
* Computes duration, verification checksums, and downsampled min/max waveform peak envelopes.

### 3. In-Browser 16-Bit PCM WAV Encoder (`encodeWav`)
* When recording via microphone or synthesizing test tones, browsers produce WebM or Float32 arrays.
* `encodeWav(samples: Float32Array, sampleRate: number)` constructs an authentic 44-byte RIFF/WAVE header and quantizes Float32 $[-1.0, +1.0]$ samples into signed 16-bit integers ($[-32768, 32767]$) via Little-Endian byte packing.
* Output: A valid standard `.wav` `ArrayBuffer` ready for transmission or local playback.

---

## 8.4 Live Microphone Recording (`components/MicrophoneRecorder.tsx`)

The direct microphone recorder allows live audience interaction during presentations:
1. **Hardware Access**: Requests microphone stream via `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })`.
2. **Real-Time Volume Visualizer**:
   * Bridges stream into a Web Audio `AnalyserNode` with `fftSize = 256`.
   * Samples frequency bin averages 60 times per second using `requestAnimationFrame`.
   * Drives a dynamic green-to-red volume meter indicating live speech input.
3. **Chunk Aggregation**: `MediaRecorder` collects audio blobs every 200ms.
4. **WAV Conversion**: On recording stop, chunks are decoded via `AudioContext` and packed into a 16 kHz 16-bit PCM `.wav` file (`mic_speech_<timestamp>.wav`).

---

## 8.5 Walkthrough of the 10 Dashboard Views

### View 1: Audio Analysis (`pages/AudioAnalysis.tsx` - Route `/`)
* **Core Function**: The flagship demo page.
* **Layout**: Balanced 2-column grid:
  * *Left Column*: `AudioSourcePanel` (Direct Mic, File Dropzone, Test Signal Presets) + Architecture Switcher buttons + "Classify Emotion" trigger button.
  * *Right Column*: Emotion Classification Results:
    * Displays predicted emotion label with high visual hierarchy.
    * Confidence score and runner-up margin stat cards.
    * Six-class horizontal probability chart (`ProbabilityChart.tsx`).
    * Provenance indicator stamp.
  * *Bottom Section*: Embedded *Actual Acoustic Feature Analysis* panel rendering live Librosa/SciPy measurements (RMS, ZCR, Centroid, Pitch, MFCCs).

### View 2: Technical Signal Diagnostics (`pages/AcousticFeatures.tsx` - Route `/acoustic-features`)
* **Core Function**: Deep acoustic engineering inspection.
* **Panels**:
  * Comprehensive time-domain and spectral statistics table.
  * 13 MFCC bar chart with $\pm 1$ standard deviation error whiskers.
  * Input tensor metadata (shape, axes, sample rate).
  * Russell circumplex affect driver statistics (Arousal Proxy, Spectral Brightness, Spectral Flux, RMS Loudness).

### View 3: Live Model Inference (`pages/LiveModelInference.tsx` - Route `/live-model`)
* **Core Function**: Execution of PyTorch forward passes on CPU.
* **Interactive Controls**:
  * Model selector: Model A (CNN+TFA), Model B (BiLSTM), or Acoustic Transformer (DistilHuBERT).
  * "Run Live PyTorch Inference" action button.
* **Output Cards**: Live predicted emotion, probability distribution, latency in milliseconds, model parameter count, and size footprint verified against $< 100\text{M}$ parameter limits.

### View 4: Model Comparison (`pages/ModelComparison.tsx` - Route `/model-comparison`)
* **Core Function**: Benchmark evaluation dashboard across all 4 architectures.
* **Components**:
  * Four selectable model cards with parameter counts and input types.
  * Matching pipeline visualization panels for Model A and Model B.
  * Comparative metrics table (Accuracy, Precision, Recall, Macro-F1).
  * Multi-bar Recharts visualization comparing metrics across models.
  * **Custom Log Importer**: Button allowing upload of genuine JSON evaluation logs to overwrite layout values dynamically.

### View 5: Noise Robustness (`pages/NoiseRobustness.tsx` - Route `/noise-robustness`)
* **Core Function**: Evaluation under controlled acoustic degradation.
* **Workflow**:
  * "Run noise analysis" executes synthetic white noise injection at 20 dB, 10 dB, and 5 dB SNR, plus spectral gating denoising.
  * Condition selector buttons (`Clean`, `20 dB`, `10 dB`, `5 dB`, `Denoised`).
  * Waveform envelope dynamically redraws showing noise floor elevation.
  * Recharts degradation curve plotting acoustic shift across conditions.

### View 6: K-Means Analysis (`pages/KMeansAnalysis.tsx` - Route `/kmeans`)
* **Core Function**: Unsupervised clustering of speech frames.
* **Features**:
  * Slider to adjust cluster count $k \in [2, 8]$.
  * Prominent disclaimer: *"Clusters are unsupervised groupings of acoustic frames. They are not verified emotion classes."*
  * Silhouette score stat card with $[ -1, +1 ]$ range indicator.
  * Chronological color-coded timeline showing cluster transitions over time.
  * 2D PCA projection scatter plot (`ScatterChart` in Recharts) mapping first two principal components.

### View 7: Explainability & Attribution (`pages/Explainability.tsx` - Route `/explainability`)
* **Core Function**: Visualizing salient acoustic regions.
* **Features**:
  * Input Mel-spectrogram displayed on HTML5 Canvas using a 4-stop color ramp.
  * Occlusion sensitivity heatmap overlay in translucent amber.
  * Attribution summary table sorting the top-3 most influential time-frequency patches with exact frequency band (Mel bins) and temporal window (seconds).

### View 8: Conditional GAN Augmentation (`pages/GanAugmentation.tsx` - Route `/gan-augmentation`)
* **Core Function**: Generative minority-class balancing interface.
* **Features**:
  * 6-stage pipeline flow diagram.
  * Generator, Discriminator, and Quality Filter technical summary panels.
  * Interactive parameter form (latent dimension, epochs, batch size, learning rate, augmentation ratio slider, target emotion checkboxes).
  * 5 automated quality-check gate status list.
  * Proposed augmentation benchmark results table.

### View 9: System Verification & Testing (`pages/Testing.tsx` - Route `/testing`)
* **Core Function**: Live in-browser test runner.
* **Features**:
  * "Run All Tests" button executing the complete 13-test suite sequentially.
  * Metric summary cards (Total Tests, Passed, Failed, Status).
  * Category filter tabs (Upload, Playback, Model Selection, Prediction, Noise, K-Means, Checkpoints, Errors, Navigation, Backend, Persistence).
  * Interactive test matrix table displaying Test ID, Category, Description, Expected Outcome, Observed Outcome, Duration in ms, and Status badge.

### View 10: Architecture & System Specifications (`pages/Architecture.tsx` - Route `/architecture`)
* **Core Function**: Full system architectural blueprint.
* **Features**:
  * Full-stack dataflow diagram connecting Frontend $\to$ FastAPI $\to$ DSP $\to$ Neural Models.
  * Capability & Verification Inventory matrix distinguishing genuine components from simulated/pending research.
  * Backend REST API endpoint directory with live HTTP status badges.
  * Checkpoint verification query button testing missing-checkpoint handling.

---

## 8.6 Stale Result Detection (`utils/stale.ts`)

A subtle but crucial engineering feature:
* If a user runs an analysis with Model A and `n_mels = 128`, and then switches the configuration dropdown to `n_mels = 256` or changes the model to BiLSTM, the results currently on screen are **stale** (they correspond to the previous configuration).
* `isStaleResult(result, model, settings)` compares the active configuration with the configuration hash stored inside `result.configuration`.
* If a mismatch is detected, the UI displays a warning banner:
  `"Model or settings changed since this result. Re-run to refresh."`
* This guarantees that a user or examiner never misinterprets an old result as belonging to the newly selected model.
