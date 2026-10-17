# Resonance: Complete Study & Presentation Prep Library

This folder teaches **every part of the Resonance project** well enough that you can explain it, demo it, and defend it in front of your professor. Nothing in the code base was changed. These are documents only.

---

## How to use this library

| Step | What to do | Files |
|---|---|---|
| 1. Orientation (30 min) | Understand what the project is and how the pieces connect | `01` |
| 2. Theory foundation (2–3 h) | Learn the audio and ML theory the project rests on | `02`, `05` (theory sections) |
| 3. Code walkthroughs (3–4 h) | Learn what each file does, line by line | `03`, `04`, `08` |
| 4. Your three emphasis areas (3–4 h) | Model architecture, XAI, GAN, plus Testing | `05`, `06`, `07`, `09` |
| 5. Context (1 h) | Datasets, metrics, data collector | `10`, `11` |
| 6. Run it (1 h) | Start the app, practise the demo, know the failure fixes | `12` |
| 7. Presentation prep (2 h) | Slides, speaker notes, demo script | `13` |
| 8. Viva drill (2 h) | Read answers aloud until fluent | `14` |
| 9. **Before you present** | **Read `15` completely** | `15` |
| Reference | Formulas and glossary | `16` |

---

## File index

| # | File | What it teaches |
|---|---|---|
| 01 | [Project overview & architecture](01_Project_Overview_and_Architecture.md) | Goal, stack, data flow, folder map, every page and endpoint at a glance |
| 02 | [Audio & DSP fundamentals](02_Audio_and_DSP_Fundamentals.md) | Sampling, STFT, mel scale, MFCC, pitch, RMS/ZCR/centroid, SNR, with numbers from *your* config |
| 03 | [Backend deep dive](03_Backend_Deep_Dive.md) | `main.py`, `audio_io.py`, `config.py`, `registry.py`, `errors.py`, `simulation.py`, `synth.py` |
| 04 | [Features, noise & clustering](04_Features_Noise_Clustering.md) | `features.py`, `noise.py`, `cluster.py` with theory and worked examples |
| 05 | [Neural model architectures](05_Neural_Model_Architectures.md) | **Emphasis.** NN theory, CNN-TFA, BiLSTM, baselines, Wav2Vec2/DistilHuBERT, parameter maths |
| 06 | [Explainable AI (XAI)](06_Explainable_AI.md) | **Emphasis.** XAI theory, occlusion code walk, Grad-CAM, attention, evaluation |
| 07 | [GAN augmentation](07_GAN_Augmentation.md) | **Emphasis.** GAN theory from scratch, the project's design, quality gates, evaluation |
| 08 | [Frontend deep dive](08_Frontend_Deep_Dive.md) | React app, session state, API client, audio utils, every page and component |
| 09 | [Testing guide](09_Testing_Guide.md) | **Emphasis.** All 3 test layers, every test explained, what each proves |
| 10 | [Datasets, metrics & evaluation](10_Datasets_Metrics_Evaluation.md) | RAVDESS, CREMA-D, speaker-independent splits, precision/recall/F1 with worked maths |
| 11 | [Studio Booth data collector](11_Collector_Studio_Booth.md) | The data-collection sub-project |
| 12 | [Running, demo & troubleshooting](12_Running_Demo_Troubleshooting.md) | Commands, ports, pre-demo checklist, fixes for common failures |
| 13 | [Presentation script & slides](13_Presentation_Script_and_Slides.md) | Slide-by-slide content and speaker notes, 6-minute live demo script |
| 14 | [Viva Q&A bank](14_Viva_QA_Bank.md) | 80+ likely questions with model answers |
| 15 | [Honest status & safe claims](15_Honest_Status_and_Safe_Claims.md) | **Must-read.** What is real, what is simulated, exactly how to phrase it |
| 16 | [Glossary & formula sheet](16_Glossary_and_Formulas.md) | One-page reference |

---

## The single most important thing to know

Resonance contains **real engineering** and some **placeholder content**. Examiners reward a student who clearly knows the difference.

**Real (measured):** upload handling, decoding, acoustic features, noise injection at exact SNR, spectral-gating denoiser, K-Means/PCA/silhouette, the FastAPI backend, the React app, session persistence, and a substantial test suite.

**Real inference, borrowed models:** Wav2Vec2 and DistilHuBERT emotion classifiers downloaded from Hugging Face run for real, but they were trained by others.

**Implemented but untrained:** your own CNN-TFA and BiLSTM networks. The architectures are real PyTorch code. The saved weights are random.

**Placeholder / pending:** benchmark accuracy tables, noise-robustness F1 figures, GAN training and its results, and a real XAI method on a trained network.

File `15` tells you how to say all of this confidently, in a way that makes the project look *more* credible, not less.

---

## Suggested 3-day schedule

**Day 1:** `01` → `02` → `03` → `04`. Run the app (`12`) and click through every page while reading.
**Day 2:** `05` → `06` → `07` → `09` → `10`. Run `pytest -v` and read each test as it runs.
**Day 3:** `08` → `15` → `13` → `14`. Rehearse the demo twice, with a timer.

## Suggested 1-day crash plan
`01` (30 min) → `15` (30 min) → skim `05`, `06`, `07`, `09` summaries (1.5 h) → `13` (1 h) → `14` (1 h) → rehearse demo (1 h).
