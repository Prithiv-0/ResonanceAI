# 02. Audio & DSP Fundamentals (with your project's numbers)

This file teaches the signal-processing theory behind everything in `features.py`, `noise.py`, `cluster.py` and the neural-network inputs. Every concept is tied to a specific number or file in the project.

---

## 2.1 What is digital audio?

Sound is air pressure varying over time. A microphone converts it to voltage; an ADC **samples** it at regular intervals.

- **Sample rate (SR):** samples per second. Resonance standardises on **16,000 Hz** (`ANALYSIS_SR` in [config.py](../backend/app/config.py)).
- **Nyquist theorem:** to capture frequency *f* you need SR > 2f. At 16 kHz you capture up to **8 kHz**, enough for speech (most speech energy and all key formants are below 8 kHz). CD music uses 44.1 kHz because humans hear to ~20 kHz.
- **Bit depth:** precision of each sample. The browser recorder writes **16-bit PCM**; librosa then converts to **float32 in [-1, 1]**.
- **Mono vs stereo:** `librosa.load(..., mono=True)` averages channels.
- **Duration** = samples / SR. A 3 s clip = 48,000 samples.
- **Resampling:** converting an 8 kHz or 44.1 kHz file to 16 kHz (`librosa.load(sr=16000)` does this on load). Pretrained models such as Wav2Vec2 *require* 16 kHz.

### File formats
| Format | Notes |
|---|---|
| WAV | Uncompressed PCM. Simplest. Header holds SR and channels (the frontend parses it: `readWavHeader` in [audio.ts](../frontend/src/utils/audio.ts)) |
| FLAC | Lossless compression |
| MP3 / MPEG / OGG | Lossy. Decoded via libsndfile or librosa's fallback |

---

## 2.2 Time domain → frequency domain

### Fourier transform
Any signal is a sum of sinusoids. The **DFT** tells you how much of each frequency is present:

`X[k] = Σ_{n=0}^{N-1} x[n] · e^{-j2πkn/N}`

Bin *k* corresponds to frequency `k · SR / N`.

### Why the short-time Fourier transform (STFT)?
Speech changes every few milliseconds. A single DFT over the whole file loses *when* things happen. The **STFT** slides a window across the signal:

`X(t, f) = Σ_n x[n] · w[n − t·H] · e^{-j2πfn/N}`

Parameters (all appear in your code):

| Parameter | Meaning | Values in Resonance |
|---|---|---|
| `n_fft` (N) | window length in samples | 1024 (features, neural, mel), 512 (clustering, spectral gate) |
| `hop_length` (H) | step between windows | 256 (features.py), 320 (`log_mel`), 512 (neural CNN/BiLSTM), 160 (cluster), 128 (spectral gate) |
| window `w` | tapers the frame edges (Hann by default) | librosa default |

**Worked numbers (n_fft = 1024 at 16 kHz):**
- Window duration = 1024 / 16000 = **64 ms**
- Frequency resolution = 16000 / 1024 = **15.6 Hz per bin**
- Number of bins = 1024/2 + 1 = **513**
- With hop 512 (**32 ms**), a 3 s clip → `1 + 48000 // 512 = 94` frames (librosa pads the edges, `center=True`).

**Time–frequency trade-off (uncertainty principle):** long windows → fine frequency resolution but blurry timing; short windows → the reverse. 20–40 ms windows are the speech-processing convention (speech is quasi-stationary on that scale), which is why the clustering uses 512 samples = **32 ms**.

The magnitude `|X(t,f)|` as an image is a **spectrogram**.

---

## 2.3 The mel scale and the mel spectrogram

Human pitch perception is roughly **logarithmic** above ~1 kHz: the step from 100→200 Hz sounds like the step from 1000→2000 Hz. The **mel scale** models this:

`m = 2595 · log10(1 + f / 700)`

Examples: 1000 Hz → 1000 mel; 4000 Hz → ~2146 mel; 8000 Hz → ~2840 mel.

A **mel filterbank** is a set of overlapping triangular filters spaced evenly on the mel axis. Each filter sums the STFT power in its band:

`Mel[m, t] = Σ_f H_m(f) · |X(t,f)|²`

With `n_mels = 128` you reduce 513 linear bins to 128 perceptually-spaced bands: dense at low frequency, coarse at high.

### Log compression
Loudness perception is also logarithmic, and raw power spans many orders of magnitude. So:

`LogMel = 10 · log10(Mel / ref)` (decibels)

In your code: `librosa.power_to_db(S, ref=np.max)` makes the loudest bin **0 dB**, and `top_db=80` floors everything at **−80 dB** (see `log_mel` in [features.py](../backend/app/features.py) and the explanation in [explain.py](../backend/app/explain.py): the display maps `[-80, 0] → [0, 255]`).

### Normalisation for the CNN
`neural_models.py` z-scores the log-mel per utterance: `(S − mean) / std`. This stabilises training but removes absolute loudness. That's a known design trade-off (loudness is informative about arousal).

**Result:** a `(n_mels × frames)` "image", e.g. **128 × 94**, the input to the 2-D CNN.

---

## 2.4 MFCCs (Mel-Frequency Cepstral Coefficients)

Pipeline:

```
waveform → STFT → power spectrum → mel filterbank → log → DCT → keep first K coefficients
```

- The **DCT** (discrete cosine transform) decorrelates the log-mel energies and compacts the information.
- Low coefficients describe the **spectral envelope** (vocal-tract shape, i.e. timbre/vowel quality); high ones describe fine detail/pitch ripples, and are discarded.
- **MFCC 0** ≈ overall energy; MFCC 1 ≈ spectral tilt; and so on.

In the project:
- Reported in the UI: **13** coefficients, mean and std over time (`acoustic_features`, `n_mels=40` inside).
- Fed to the BiLSTM: **13** coefficients × frames, z-scored per coefficient (`neural_models.py`).
- Clustering uses MFCC **1–6** (skips coefficient 0 so energy isn't double-counted, since RMS is already a feature).
- The registry says the BiLSTM's `n_mfcc` default is **40**, but the actual PyTorch network takes **13** inputs (a discrepancy to be aware of; see `15`).

MFCC vs mel-spectrogram: MFCCs are compact and decorrelated (good for LSTMs and classical ML); mel-spectrograms keep more structure and suit CNNs.

---

## 2.5 Frame-level acoustic features (what each means)

All computed in [features.py](../backend/app/features.py) / [cluster.py](../backend/app/cluster.py) with librosa.

| Feature | Formula / idea | What it tells you about emotion |
|---|---|---|
| **RMS energy** | `sqrt(mean(x²))` per frame; overall dBFS = `20·log10(RMS)` | Loudness. High for anger/happiness, low for sadness |
| **Zero-crossing rate (ZCR)** | fraction of adjacent samples that change sign | Noisiness/high-frequency content (fricatives ↑, voiced vowels ↓) |
| **Spectral centroid** | `Σ f·|X(f)| / Σ |X(f)|`, the "centre of mass" of the spectrum | Brightness. Higher for aroused/tense speech |
| **Spectral bandwidth** | spread of the spectrum around the centroid | Richness of the spectrum |
| **Spectral roll-off** | frequency below which e.g. 85 % of energy lies | Another brightness measure |
| **Spectral flatness** | geometric mean / arithmetic mean of the spectrum (0 = tonal, 1 = noise) | Voiced vs. noise-like frames |
| **Spectral flux** | frame-to-frame spectral change (used in `simulation.py`) | Speech dynamics |
| **Pitch (F0)** | fundamental frequency of vocal-fold vibration | Pitch level and range; strongly linked to arousal |

### Pitch estimation by autocorrelation (your `estimate_pitch`)
A periodic signal correlates with itself at lag = period. Steps in the code:

1. 40 ms frames (`frame = 0.04·SR = 640` samples), 10 ms hop (160 samples); remove DC.
2. Energy gate: ignore frames below `0.15 × 95th-percentile RMS`.
3. Autocorrelation via FFT: `ac = IFFT(|FFT(x)|²)`, normalised by lag-0.
4. Search lags corresponding to **70–400 Hz** → lag 40…228 samples (`SR/400` … `SR/70`).
5. Peak > **0.5** ⇒ frame is "voiced"; `f0 = SR / lag`.
6. **Reliability checks:** need ≥ 5 voiced frames, ≥ 30 % of active frames voiced, and `MAD/median ≤ 0.35`. Otherwise it returns `reliable: false, median_hz: None` instead of a made-up number. (A good example of honest engineering. Say so.)

Known limitation: plain autocorrelation can pick **octave errors** (2× or ½× the true F0). Alternatives: `librosa.pyin`, CREPE.

---

## 2.6 Noise, SNR and denoising

### SNR
`SNR_dB = 10 · log10(P_signal / P_noise)`  where `P = mean(x²)`.

| SNR | Power ratio | Feels like |
|---|---|---|
| 20 dB | 100 : 1 | Quiet room |
| 10 dB | 10 : 1 | Noticeable background |
| 5 dB | ~3.2 : 1 | Hard to hear speech |
| 0 dB | 1 : 1 | Noise as loud as the signal |

### Generating noise at a target SNR (your `add_white_noise`)
1. Measure `P_signal = mean(y²)`.
2. Target `P_noise = P_signal / 10^(SNR/10)`.
3. Draw Gaussian noise, then **rescale** so its measured power equals `P_noise` exactly (`noise *= sqrt(P_noise / mean(noise²))`). This is why the test can assert measured SNR within 0.01 dB.
4. Output `y + noise`.

White noise = equal power at all frequencies (flat spectrum). Real noise (babble, traffic, music) is coloured and harder; mention this as a limitation.

### Spectral gating denoiser (your `spectral_gate`)
A simple spectral-subtraction relative:
1. STFT (`n_fft=512`, `hop=128`), magnitude.
2. **Estimate noise profile**: mean magnitude of the **quietest 15 %** frames (by frame energy).
3. Gain per time-frequency bin: `clip((|X| − 1.5·profile)/|X|, 0.08, 1.0)`: subtract 1.5× the noise estimate (over-subtraction), never attenuate below 0.08 (floor, limits artefacts).
4. Smooth the gain over time with `[0.25, 0.5, 0.25]` to reduce "musical noise" (random tonal blips).
5. Multiply, inverse STFT.

Assumption: the quietest frames contain only noise. If speech has no pauses the estimate is poor.

---

## 2.7 Clustering theory (for `cluster.py`; details in `04`)

- **K-Means:** choose *k* centroids; repeat (assign each point to nearest centroid; recompute centroids as cluster means) until stable. Minimises **inertia** = Σ squared distance to own centroid. Sensitive to initial centres, hence `n_init=10`.
- **Standardisation** is essential: features like centroid (Hz, in the thousands) would otherwise dominate ZCR (0–1).
- **Silhouette score:** for each point, `s = (b − a)/max(a, b)` where *a* = mean distance to its own cluster, *b* = mean distance to the nearest other cluster. Range −1…1; higher = better separated.
- **PCA:** projects the 12-D standardised features onto the 2 directions of greatest variance for plotting.

---

## 2.8 From audio to model input: summary table

| Consumer | Representation | Settings | Shape (3 s) |
|---|---|---|---|
| UI "acoustic features" | RMS, ZCR, centroid, 13 MFCC stats, pitch | n_fft 1024, hop 256 | scalars/vectors |
| Own CNN-TFA | log-Mel, z-scored | n_fft 1024, hop 512, 128 mels | 1 × 128 × 94 |
| Own BiLSTM | 13 MFCC, z-scored per coeff | n_fft 1024, hop 512 | 94 × 13 |
| Wav2Vec2 / DistilHuBERT | raw waveform (feature-extractor normalises) | 16 kHz, 3 s pad/trim | 48,000 samples |
| K-Means | 12 frame features, standardised | frame 512, hop 160 | ~300 × 12 for 3 s |
| Simulation & occlusion | log-Mel in dB | n_mels 64–256, hop 320 | n_mels × frames |

> **Inconsistent hop sizes** (160/256/320/512) arise because each module was built for its own purpose. Be ready to explain this; it is not an error by itself, but the UI's "input tensor shape" (hop 256) is not the same tensor the neural CNN consumes (hop 512).

---

## 2.9 Self-test questions
1. Why 16 kHz? *(Speech < 8 kHz; Nyquist; pretrained models expect it.)*
2. How many frames in a 3 s clip at hop 512? *(94.)*
3. Why log-mel rather than linear spectrogram? *(Perceptual scale and dynamic-range compression.)*
4. Why does the clustering skip MFCC 0? *(Energy is already a feature.)*
5. What is the noise power for a signal of power 0.04 at 10 dB SNR? *(0.004.)*
6. Why can the pitch tracker return `None`? *(Reliability gates; no fabricated values.)*
