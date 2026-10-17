# 04. Features, Noise & Clustering (the genuinely measured parts)

These three modules are the **strongest, fully real** part of the project. Know them well.

---

## 4.1 `features.py`: acoustic feature extraction

### Constants
`N_FFT = 1024`, `HOP = 256`, `N_MFCC_REPORT = 13`.

### `acoustic_features(y, sr)` returns

| Key | How | Notes |
|---|---|---|
| `rms_energy` | `librosa.feature.rms` per frame → mean/std; `overall` = sqrt(mean(y²)); `overall_dbfs = 20·log10(rms)` | dBFS: 0 = full-scale; typical speech −30…−15 |
| `zero_crossing_rate` | per-frame, mean/std | |
| `spectral_centroid_hz` | per-frame, mean/std | |
| `mfcc` | 13 coefficients, `n_mels=40`; mean and std per coefficient | |
| `pitch` | `estimate_pitch` (below) | may be unreliable → `None` |
| `measured: True`, `source` | provenance | |

### `estimate_pitch(y, sr, fmin=70, fmax=400)`: line-by-line idea
```
frame = 0.04*sr (=640)   hop = 0.01*sr (=160)
frames = librosa.util.frame(...)           # (n_frames, 640)
frames -= mean per frame                    # remove DC offset
rms = sqrt(mean(frames^2))
gate = 0.15 * percentile(rms, 95)           # active = louder than gate
x = frames[active]
spec = rfft(x, n=2*frame)                   # zero-pad to avoid circular wrap
ac   = irfft(spec * conj(spec))[:, :frame]  # Wiener–Khinchin: autocorr = IFFT(power)
ac  /= ac[:, :1]                            # normalise so lag 0 = 1
seg  = ac[:, lag_min:lag_max]               # lags for 400 Hz .. 70 Hz
peak_val = seg.max(axis=1); lags = argmax + lag_min
voiced = peak_val > 0.5
f0 = sr / lags[voiced]
```
Reliability decision tree: too short → no; < 5 active frames → no; < 5 voiced frames or voiced fraction < 0.3 → no; `MAD/median > 0.35` → "inconsistent"; else report median, p10, p90, voiced fraction.

**Why this design is good:** it prefers returning "not reliable" over a wrong number. The unit tests confirm: a 220 Hz sine → reliable with median within 5 Hz; white noise → `reliable False`.

### `input_representation(y, sr, model, cfg)`
Computes the tensor the *configured* model would consume and returns only its **shape/axes** (mel: `[n_mels, frames]`; MFCC: `[frames, n_mfcc]`), using hop 256. (This is the displayed shape; the neural CNN actually uses hop 512.)

### `log_mel(y, sr, n_mels=64, hop=320)`
Mel spectrogram → dB relative to max, floored at −80 dB, `float32`. Used by the simulation and by occlusion.

---

## 4.2 `noise.py`: noise injection & denoising

### Conditions
`clean`, `snr_20db`, `snr_10db`, `snr_5db`, `denoised` (the denoised signal comes from the **10 dB** noisy signal: `DENOISE_SOURCE_SNR_DB = 10`).

### Functions
- `signal_power(y)` = mean(y²) in float64.
- `noise_seed(content_key, tag)` = first 8 bytes of SHA-256 of `"noise|<sha>|<tag>"` → seed. Same file + same condition ⇒ identical noise.
- `add_white_noise(y, snr_db, seed)`:
  ```
  p_noise = p_signal / 10**(snr/10)
  noise = rng.standard_normal(len(y)); noise *= sqrt(p_noise / power(noise))   # exact scaling
  return (y + noise).astype(float32)
  ```
- `measured_snr_db(clean, processed)` = `10·log10( P(clean) / P(processed − clean) )`. For the **denoised** signal this measures residual error vs. the clean original; it can be *lower or higher* than 10 dB depending on how much speech the gate removed.
- `spectral_gate(...)`: see `02` §2.6.
- `build_conditions(y, sr, content_key)` returns `{condition: {y, measured_snr_db, processing}}`.

### Worked example
Signal with RMS 0.2 → `P = 0.04`. At 10 dB: `P_noise = 0.04 / 10 = 0.004` → noise RMS ≈ 0.0632. At 5 dB: `0.04/3.162 = 0.01265` → noise RMS ≈ 0.1125. At 20 dB: `0.0004` → RMS 0.02.

### What the page shows
Waveform per condition, measured SNR, feature changes (RMS rises monotonically with noise: tested), and a prediction per condition.

### Limitations to mention proactively
1. **White noise only.** Real environments have coloured, non-stationary noise (babble, traffic). Suggest MUSAN/DEMAND.
2. **SNR over the whole clip**, including silent gaps; speech-active SNR would be higher.
3. **Spectral gating** assumes the quietest 15 % of frames are noise-only.
4. The prediction per condition currently comes from the stand-in engine (see `15`), so the page demonstrates the *noise pipeline*; it is **not** evidence of classifier robustness.

---

## 4.3 `cluster.py`: acoustic feature clustering

### Purpose
Unsupervised exploration: *without labels*, how do the frames of one recording group? It is explicitly **not** emotion classification (the UI and API disclaim "not verified emotion classes").

### Pipeline (matches the UI's 4 numbered steps)
1. **Framing:** `FRAME=512` (32 ms), `HOP=160` (10 ms) → ~69 % overlap.
2. **Features per frame (12):** `rms_db, zcr, centroid, bandwidth, rolloff, flatness, mfcc_1..6`.
3. **Clean:** drop frames with non-finite values; require `n ≥ 10·k` frames else 422 `too_few_frames`.
4. **Standardise** with `StandardScaler`.
5. **KMeans(n_clusters=k, n_init=10, random_state=seed)**, with *k* between 2 and 8.
6. **Relabel** clusters so that cluster 0 has the lowest mean energy (stable, interpretable ordering).
7. **Silhouette** on up to 3000 sampled frames (full O(n²) would be slow).
8. **Timeline:** run-length encode consecutive frames of the same cluster → segments `{start_s, end_s, cluster}`.
9. **Cluster summary:** size, fraction, duration, and mean of 4 *unstandardised* features per cluster.
10. **PCA(2)** for a scatter plot (subsampled to ~500 points) + explained-variance ratios.

### Outputs the UI shows
Cluster count, frames, **silhouette**, **inertia**, PCA variance covered, colour timeline, per-cluster table, PCA scatter.

### Interpreting results (what to say)
- Low-energy cluster ≈ pauses/silence; high-energy, low-flatness cluster ≈ voiced vowels; high ZCR/high flatness cluster ≈ fricatives (/s/, /sh/).
- Clusters usually track **phonetic/energy structure**, not emotion. That is exactly why the disclaimer matters.
- Silhouette of ~0.2–0.5 is typical for speech frames; very high values (> 0.7) are unusual for real speech. *(A script in the repo quotes 0.72–0.76; treat that as unverified unless you reproduced it.)*

### Theory reminders
- K-Means objective: `min Σ_k Σ_{x∈C_k} ||x − μ_k||²`; it finds convex, similarly-sized clusters; it needs *k* in advance; random restarts reduce bad local minima (`n_init`).
- Choosing *k*: elbow method on inertia, silhouette vs. *k*, domain knowledge.
- PCA: eigen-decomposition of the covariance matrix; each component is a linear combination of the 12 features; "variance covered" tells you how faithful the 2-D picture is.

### Tests (all in `test_api.py`)
cluster sizes sum to `n_frames`; silhouette in [−1, 1]; first timeline segment starts at 0; disclaimer text present; same seed → identical silhouette and timeline; `k=1` and `k=9` → 422 `invalid_k`.

---

## 4.4 Self-test questions
1. Why standardise before K-Means? *(Different units/scales.)*
2. Why `n_init=10`? *(Avoid poor local optima from random initial centroids.)*
3. Why sort clusters by energy? *(Stable labels across runs, easy to read.)*
4. How is the SNR guaranteed to be exact? *(Noise is rescaled to the target power after drawing.)*
5. Why does the pitch tracker use a 0.5 threshold on the normalised autocorrelation? *(Strong periodicity ⇒ voiced; weak ⇒ unvoiced/noise.)*
6. Why are clusters not emotions? *(They are unsupervised acoustic groups; no label information is used.)*
