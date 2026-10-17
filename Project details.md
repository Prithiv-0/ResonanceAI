# you asked

give a super detailed description of this project so i that i can export this to antigravity

---

# chatgpt response

# RESONANCE — Complete Project Description for Antigravity

## 1. Project Identity

**Project Name:** Resonance

**Full Title:**  
**Resonance: Unified Speech Emotion Recognition**

**Domain:**  
Neural Networks and Deep Learning / Speech Processing / Affective Computing

**Primary Task:**  
Speech Emotion Recognition (SER)

**Core Models:**
- CNN using **Mel Spectrograms**
- BiLSTM using **MFCC sequences**

**Main Goal:**  
To perform a controlled comparison between spectral CNN-based modelling and temporal BiLSTM-based modelling for speech emotion recognition, while additionally studying the effect of emotion intensity and controlled audio degradation.

The project is **not intended to invent a new CNN or BiLSTM architecture**. Its contribution is the **controlled experimental framework**, unified multi-source dataset organization, speaker-independent evaluation, intensity analysis and robustness analysis.

---

# 2. Project Overview

Resonance is a speech emotion recognition system designed to identify one of six emotional states from spoken audio:

1. Anger
2. Disgust
3. Fear
4. Happiness
5. Sadness
6. Neutral

The project combines two established speech-emotion datasets:

- **RAVDESS**
- **CREMA-D**

These datasets are converted into a common six-emotion experimental setup.

The system has two parallel deep-learning approaches:

### CNN branch

```text
Speech Audio
↓
Preprocessing
↓
Mel Spectrogram
↓
CNN
↓
Emotion Classification
```

The CNN learns **local time-frequency patterns** from the Mel spectrogram.

### BiLSTM branch

```text
Speech Audio
↓
Preprocessing
↓
MFCC Sequence
↓
BiLSTM
↓
Emotion Classification
```

The BiLSTM learns **temporal dependencies across sequential speech frames**.

Both models use the same broad task and evaluation framework so their performance can be compared fairly.

---

# 3. Main Research Idea

The central question is not simply:

> "Can we classify emotions from speech?"

That has already been extensively studied.

The more specific research question is:

> **How do a spectral CNN and a temporal BiLSTM behave when they are evaluated under the same multi-source, speaker-independent speech-emotion recognition framework, and how do emotion intensity and audio degradation affect their performance?**

The project therefore examines three major factors:

### Architecture

```text
CNN vs BiLSTM
```

### Emotion intensity

```text
Normal vs Strong
```

for RAVDESS, while retaining CREMA-D's native:

```text
Low / Medium / High / Unspecified
```

### Audio quality

```text
Clean
Noisy
Denoised
```

This makes Resonance an experimental comparison study rather than simply another speech-classification implementation.

---

# 4. Research Gap

Recent SER research increasingly uses:

- Hybrid CNN-RNN architectures
- CNN-BiLSTM-Transformer systems
- Transformers
- Mamba/state-space models
- Large pretrained speech encoders
- Multimodal fusion
- Attention mechanisms
- Cross-corpus evaluation
- Noise-robust modelling
- Explainability frameworks

These approaches can improve capability, but they also make it difficult to determine **which individual architecture or representation is responsible for a performance change**.

Resonance intentionally uses a simpler architecture comparison.

The study fixes:

- the task
- emotion classes
- dataset organization
- speaker-independent splitting
- evaluation metrics
- experimental conditions

and compares:

```text
Mel Spectrogram → CNN
```

against:

```text
MFCC Sequence → BiLSTM
```

The project then extends the comparison by examining:

- emotion intensity
- controlled noise
- denoising
- source-dataset variation

The project therefore does **not** claim that intensity-aware SER is unexplored. Instead, the intended contribution is:

> **A focused, controlled experimental comparison of CNN and BiLSTM behavior across a unified multi-source dataset, emotion intensity and audio degradation conditions.**

This framing is already established in the project's literature survey. 

---

# 5. Dataset Design

## 5.1 RAVDESS

The project uses the **speech portion** of RAVDESS.

Original characteristics:

- 1,440 speech files
- 24 professional actors
- 12 male
- 12 female
- 8 original emotion categories

For Resonance, only the six emotions shared with CREMA-D are retained:

- Anger
- Disgust
- Fear
- Happy
- Sad
- Neutral

Therefore, RAVDESS samples corresponding to:

- Calm
- Surprised

are excluded from the unified six-class task.

This leaves:

**1,056 RAVDESS samples**

RAVDESS also has explicit intensity information:

```text
Normal
Strong
```

for applicable emotions.

Neutral does not have a strong condition.

The project preserves this intensity information for the intensity experiment. 

---

# 6. CREMA-D

CREMA-D contributes:

- 7,442 clips
- 91 actors
- 48 male
- 43 female

It contains the same six emotion categories required by Resonance:

- Anger
- Disgust
- Fear
- Happy
- Sad
- Neutral

CREMA-D also contains native emotion-level annotations:

```text
Low
Medium
High
Unspecified
```

These labels are retained.

### Critical methodological rule

RAVDESS:

```text
Normal / Strong
```

and CREMA-D:

```text
Low / Medium / High / Unspecified
```

must **not** be treated as interchangeable intensity scales.

They come from different source datasets and different annotation protocols. 

---

# 7. Unified Dataset

The unified clean Resonance dataset contains:

```text
1,056 RAVDESS
+
7,442 CREMA-D
----------------
8,498 samples
```

The unified dataset has:

- 8,498 clean samples
- 115 source speakers
- 6 emotion classes

The source identity and metadata are retained.

The project is therefore not claiming:

> "We collected a new 8,498-sample speech corpus."

Instead:

> Resonance is a **derived dataset artifact** that contributes unified metadata, label mapping, preprocessing organization and experimental protocol.

This distinction is important for the project presentation and documentation. 

---

# 8. Derived Noisy Dataset

A third experimental dataset is derived from the clean Resonance recordings.

The clean recordings remain as the reference.

Copies are modified by injecting controlled artificial noise.

Every noisy recording remains linked to its clean counterpart.

The metadata preserves:

- original clean audio path
- noisy audio path
- noise type
- SNR
- emotion
- speaker ID
- source dataset

The planned noise types are:

### 1. White / Gaussian Noise

Simulates random broadband disturbance.

### 2. Background / Babble Noise

Simulates interference from surrounding speech/environmental activity.

### 3. Traffic Noise

Represents realistic environmental background noise.

### SNR levels

```text
20 dB
10 dB
5 dB
```

This gives controlled degradation from relatively mild to severe noise.  

---

# 9. Unified Metadata

A metadata CSV should retain information such as:

```text
sample_id
source_dataset
speaker_id
emotion
intensity
gender
split
```

For noisy samples:

```text
clean_audio_path
noisy_audio_path
noise_type
snr
```

Example:

```text
sample_id: RAV_00001
dataset: RAVDESS
speaker_id: 12
emotion: Fear
intensity: Normal
split: train
```

Another:

```text
sample_id: RAV_00002
dataset: RAVDESS
speaker_id: 12
emotion: Fear
intensity: Strong
split: train
```

The DataPort design explicitly recommends retaining source filename and speaker identity for reproducibility. 

---

# 10. Speaker-Independent Data Splitting

This is an important part of the project.

A speaker must not appear in more than one of the following:

```text
Training
Validation
Testing
```

The split is **speaker-disjoint**.

### Training

Contains speakers used for model learning.

### Validation

Contains completely different speakers used for:

- hyperparameter tuning
- model selection
- early stopping if applicable

### Test

Contains speakers that are completely unseen during training and validation.

This prevents the model from learning speaker identity instead of emotion.

Conceptually:

```text
All Speakers
      │
      ├─────────────── Training Speakers
      │
      ├─────────────── Validation Speakers
      │
      └─────────────── Test Speakers
```

The DataPort specification explicitly recommends this arrangement. 

---

# 11. Common Preprocessing

The audio preprocessing pipeline is designed to make recordings compatible across the two source datasets.

Typical operations include:

### Sampling-rate normalization

All audio is converted to a consistent sample rate.

### Channel normalization

Audio is converted to a consistent channel representation.

### Amplitude normalization

Audio amplitude is normalized to reduce recording-level variation.

### Duration handling

Audio is padded or truncated to a consistent representation.

### Metadata preservation

Speaker identity, source dataset, emotion and intensity are preserved through preprocessing.

---

# 12. Two Feature Representations

The project deliberately uses two complementary acoustic representations.

## CNN input

```text
Speech
↓
Mel Spectrogram
↓
CNN
```

## BiLSTM input

```text
Speech
↓
MFCC sequence
↓
BiLSTM
```

This makes the architectural comparison meaningful because the two models are designed around different forms of acoustic representation.

---

# 13. Mel Spectrogram

The CNN uses a Mel spectrogram as its primary input.

A Mel spectrogram represents the distribution of acoustic energy across:

- time
- frequency

while mapping frequency information onto the Mel perceptual scale.

The result is effectively a two-dimensional time-frequency image.

Conceptually:

```text
             Time →
Frequency
   ↑
   │       ▓▓▓
   │    ▓▓▓▓▓▓
   │  ▓▓▓▓▓▓▓▓
   │     ▓▓▓▓
   │  ▓▓▓
   └────────────────
```

This makes it well suited to convolutional processing.

The CNN therefore treats emotional speech characteristics as patterns distributed across the time-frequency plane.

---

# 14. CNN Branch

This is the main technical contribution of the user's portion of the project.

The CNN takes:

```text
Mel Spectrogram
```

as input.

The documented baseline architecture is:

```text
Mel Spectrogram
        ↓
Conv2D — 32 filters
        ↓
Max Pooling
        ↓
Conv2D — 64 filters
        ↓
Max Pooling
        ↓
Conv2D — 128 filters
        ↓
Global Average Pooling
        ↓
Dense Layer
        ↓
Dropout
        ↓
6-Class Softmax
```

This architecture is specified in the project's DataPort description. 

---

# 15. CNN Layer Roles

## Input

The input is a Mel spectrogram.

## First convolution

The first convolutional layer learns relatively low-level local time-frequency patterns.

Examples include:

- energy changes
- frequency regions
- local spectral structures

## Max Pooling

Reduces spatial dimensions while retaining important information.

## Second convolution

Learns higher-level combinations of local spectral patterns.

## Second pooling

Further reduces the feature representation.

## Third convolution

Learns higher-level discriminative spectral patterns.

## Global Average Pooling

Converts the spatial feature maps into a compact feature representation.

## Dense layer

Combines the learned features for classification.

## Dropout

Acts as a regularization mechanism to reduce overfitting.

## Softmax

Produces six probabilities:

```text
Anger
Disgust
Fear
Happiness
Sadness
Neutral
```

---

# 16. CNN Prediction

For an input speech sample:

```text
Input Speech
     ↓
Mel Spectrogram
     ↓
CNN
     ↓
Softmax
```

Example output:

```text
Anger       0.05
Disgust     0.03
Fear        0.11
Happiness   0.72
Sadness     0.04
Neutral     0.05
```

Predicted class:

```text
Happiness
```

The exact probabilities above are only an illustration and are **not experimental results**.

---

# 17. BiLSTM Branch

The second architecture in Resonance is a BiLSTM.

It receives:

```text
MFCC sequence
```

rather than a Mel spectrogram.

Documented baseline:

```text
MFCC Sequence
      ↓
BiLSTM — 128 units
      ↓
BiLSTM — 64 units
      ↓
Dropout
      ↓
Dense
      ↓
6-Class Softmax
```

The purpose is to model temporal relationships between successive speech frames. 

This branch is important because it provides the comparison architecture against the CNN branch.

---

# 18. CNN vs BiLSTM

The fundamental architectural comparison is:

| Aspect | CNN | BiLSTM |
|---|---|---|
| Input | Mel Spectrogram | MFCC Sequence |
| Representation | 2D time-frequency | Sequential acoustic features |
| Main operation | Convolution | Recurrent processing |
| Primary modelling capability | Local spectral patterns | Temporal dependencies |
| Output | 6 emotions | 6 emotions |
| Evaluation | Same | Same |

The objective is not to claim that one architecture is universally better.

The objective is to determine:

> **Which architecture performs better under the same controlled conditions and how its behaviour changes with intensity and noise.**

---

# 19. Why CNN Uses Mel Spectrograms

The CNN branch is designed around the observation that emotional information can appear as local patterns in:

- frequency distribution
- energy
- spectral variation
- time-frequency structure

A Mel spectrogram transforms speech into an image-like representation.

CNNs are naturally suited to discovering localized structures from such representations.

Therefore:

```text
Speech
↓
Mel Spectrogram
↓
2D Convolution
↓
Spectral Feature Extraction
↓
Emotion Classification
```

---

# 20. Why BiLSTM Uses MFCC

MFCCs provide compact acoustic features over successive frames.

The resulting input can be represented as:

```text
Frame 1
Frame 2
Frame 3
...
Frame T
```

BiLSTM is suited to modelling dependencies across this sequence.

Thus:

```text
MFCC Frames
↓
Temporal Modelling
↓
Emotion Classification
```

This gives the project two deliberately different modelling perspectives.

---

# 21. Training

Both models are trained as supervised six-class classifiers.

The CNN training process is:

```text
Training Audio
      ↓
Mel Spectrogram
      ↓
CNN Forward Pass
      ↓
Softmax Prediction
      ↓
Loss Calculation
      ↓
Backpropagation
      ↓
Optimizer
      ↓
Updated CNN Weights
```

Training is repeated over multiple epochs.

Validation data is used for:

- tuning
- model selection
- monitoring generalization

The test set remains untouched until final evaluation.

---

# 22. CNN Hyperparameters

The documented architecture provides model structure but does not define final experimentally tuned hyperparameter values.

Therefore, recommended initial values can be:

```text
Optimizer:
Adam

Learning Rate:
0.001

Batch Size:
32

Epochs:
50

Dropout:
0.3

Loss:
Categorical Cross-Entropy

Output:
6-Class Softmax

Activation:
ReLU
```

These should be treated as **initial/proposed settings**, not claimed experimental results.

---

# 23. Hyperparameter Tuning

Possible search dimensions for the CNN include:

### Learning rate

```text
1e-2
1e-3
1e-4
```

### Batch size

```text
16
32
64
```

### Dropout

```text
0.2
0.3
0.5
```

### Mel bands

```text
64
128
256
```

### CNN filter configuration

```text
32 / 64 / 128
64 / 128 / 256
```

### Important rule

Hyperparameter tuning must use:

```text
Training + Validation
```

and must not use the test set.

The selected model is then evaluated once on the unseen test speakers.

---

# 24. Evaluation Metrics

Both architectures use the same evaluation metrics.

## Accuracy

Overall fraction of correct predictions.

## Precision

Measures how many predictions assigned to an emotion are actually correct.

## Recall

Measures how many actual instances of an emotion are successfully identified.

## F1-score

Balances precision and recall.

## Macro-F1

Computes F1 independently for each emotion and averages them.

This is especially useful when class distributions are not perfectly balanced.

The project identifies Macro-F1 as the recommended primary comparison measure. 

## Confusion Matrix

Shows:

```text
Actual emotion
vs
Predicted emotion
```

and helps identify which emotions are confused with one another.

---

# 25. Main Comparison

The primary experiment should compare:

```text
                 CNN       BiLSTM
Accuracy         ↑          ↑
Precision        ↑          ↑
Recall           ↑          ↑
Macro-F1         ↑          ↑
```

Macro-F1 should be emphasized as the main architecture-comparison metric.

---

# 26. Clean-Speech Experiment

The first experiment is the baseline.

Both models are evaluated on clean speech.

```text
Clean Speech
     │
 ┌───┴────┐
 ↓        ↓
 CNN    BiLSTM
 ↓        ↓
Pred.    Pred.
 └───┬────┘
     ↓
Compare
```

This establishes the normal operating performance before introducing noise.

---

# 27. Noise Robustness Experiment

The same trained model setup can be evaluated using controlled noisy speech.

For each clean utterance:

```text
Clean Speech
     ↓
Noise Injection
     ↓
Noisy Speech
     ↓
CNN / BiLSTM
     ↓
Emotion Prediction
```

Three noise types:

```text
White / Gaussian
Background / Babble
Traffic
```

Three SNR levels:

```text
20 dB
10 dB
5 dB
```

As SNR decreases, the audio becomes increasingly dominated by noise.

The objective is to measure how rapidly each architecture's performance degrades.

---

# 28. Denoising Experiment

An optional denoising stage can be introduced before feature extraction.

```text
Noisy Speech
     ↓
Signal Processing Denoising
     ↓
Mel Spectrogram / MFCC
     ↓
CNN / BiLSTM
     ↓
Prediction
```

Potential conventional denoising methods:

- Spectral gating
- Wiener filtering

The denoising stage is treated as **preprocessing**, not as a third deep-learning architecture.

The objective is:

> Determine whether conventional signal processing can recover emotion-recognition performance lost due to noise.

---

# 29. Emotion Intensity Experiment

Intensity is treated as an additional analysis dimension.

It does not replace the emotion label.

## RAVDESS

Primary intensity experiment:

```text
Normal
vs
Strong
```

For applicable emotional categories.

CNN and BiLSTM performance can then be compared separately for the two intensity levels.

## CREMA-D

Secondary analysis:

```text
Low
Medium
High
Unspecified
```

The project must not pretend that:

```text
RAVDESS Strong = CREMA-D High
```

because the annotation systems are different.

The source-native labels are retained separately. 

---

# 30. Intensity Research Question

The intensity experiment asks:

> Does stronger emotional expression make emotion classification easier?

and:

> Does increased emotional intensity affect CNN and BiLSTM differently?

A possible analysis is:

```text
CNN

Normal Macro-F1
vs
Strong Macro-F1


BiLSTM

Normal Macro-F1
vs
Strong Macro-F1
```

Then calculate the change:

```text
Δ Macro-F1
=
Strong Macro-F1 − Normal Macro-F1
```

The magnitude of this change can be compared across architectures.

---

# 31. Expected Result Presentation

Do not fabricate values.

The final results should contain:

### Overall model comparison

| Metric | CNN | BiLSTM |
|---|---:|---:|
| Accuracy | Actual result | Actual result |
| Precision | Actual result | Actual result |
| Recall | Actual result | Actual result |
| Macro-F1 | Actual result | Actual result |

### Noise experiment

| Condition | CNN Macro-F1 | BiLSTM Macro-F1 |
|---|---:|---:|
| Clean | Result | Result |
| 20 dB | Result | Result |
| 10 dB | Result | Result |
| 5 dB | Result | Result |

### Intensity experiment

| Condition | CNN | BiLSTM |
|---|---:|---:|
| Normal | Result | Result |
| Strong | Result | Result |

---

# 32. Confusion Matrix Analysis

Each model should have a six-class confusion matrix.

Classes:

```text
Anger
Disgust
Fear
Happiness
Sadness
Neutral
```

The diagonal represents correct predictions.

Off-diagonal values indicate confusion.

This can reveal patterns such as:

```text
Fear ↔ Sadness
Anger ↔ Disgust
Neutral ↔ Sadness
```

However, **do not state that these are actual project results until the trained model confirms them**.

---

# 33. Research Questions

The finalized research questions are:

### RQ1

Which architecture, CNN or BiLSTM, provides better overall emotion classification performance?

### RQ2

Does model performance differ between normal and strong emotional expressions in RAVDESS?

### RQ3

How much does controlled noise at different SNR levels reduce emotion recognition performance?

### RQ4

Does denoising recover performance under noisy conditions?

### RQ5

Does the combined RAVDESS + CREMA-D dataset provide a more diverse evaluation environment than using a single dataset?

These questions are already included in the project's literature-survey document. 

---

# 34. Standard Paper

The selected standard paper is:

**Andreas Triantafyllopoulos, Anton Batliner and Björn W. Schuller**

**“Charting 15 Years of Progress in Deep Learning for Speech Emotion Recognition: A Replication Study”**

Published in:

**IEEE Transactions on Affective Computing, 2026**

DOI:

**10.1109/TAFFC.2026.3680663**

It is particularly relevant because the paper focuses on:

- architecture benchmarking
- fair baselines
- hyperparameter tuning
- comparison methodology
- historical progress in SER

This makes it directly relevant to Resonance's controlled CNN-versus-BiLSTM methodology. 

---

# 35. Why This Standard Paper Matters

The standard paper's methodological lesson is:

> Performance comparisons can be misleading when architectures are compared using different baselines, different tuning strategies or inconsistent experimental conditions.

Resonance applies the same principle at a smaller student-project scale:

```text
Same task
+
Same emotion classes
+
Same speaker-independent protocol
+
Same evaluation metrics
+
Comparable tuning procedure
↓
Fair CNN vs BiLSTM comparison
```

---

# 36. Project Architecture at a High Level

The complete project can therefore be represented as:

```text
                    RAVDESS
                       +
                   CREMA-D
                       ↓
              Six Common Emotions
                       ↓
            Speaker-Independent Split
                       ↓
                Audio Preprocessing
                       ↓
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
      Mel Spectrogram           MFCC
             │                   │
             ▼                   ▼
            CNN               BiLSTM
             │                   │
             ▼                   ▼
      Emotion Prediction   Emotion Prediction
             │                   │
             └─────────┬─────────┘
                       ↓
              Comparative Evaluation
                       ↓
           ┌───────────┼───────────┐
           │           │           │
           ▼           ▼           ▼
         Clean       Noisy     Intensity
                                  │
                                  ↓
                            RAVDESS:
                         Normal / Strong
                                  +
                            CREMA-D:
                    Low / Medium / High /
                       Unspecified
                       ↓
              Accuracy / Precision
               Recall / Macro-F1
                Confusion Matrix
```

---

# 37. CNN-Specific Architecture

For the CNN part alone:

```text
                 Speech Audio
                     ↓
              Audio Preprocessing
                     ↓
               Mel Spectrogram
                     ↓
             ┌───────────────┐
             │ Conv2D – 32   │
             └───────┬───────┘
                     ↓
                Max Pooling
                     ↓
             ┌───────────────┐
             │ Conv2D – 64   │
             └───────┬───────┘
                     ↓
                Max Pooling
                     ↓
             ┌───────────────┐
             │ Conv2D – 128  │
             └───────┬───────┘
                     ↓
          Global Average Pooling
                     ↓
                Dense Layer
                     ↓
                  Dropout
                     ↓
              6-Class Softmax
                     ↓
        ┌──────┬──────┬──────┬──────┬──────┬──────┐
        ↓      ↓      ↓      ↓      ↓      ↓
      Anger Disgust  Fear   Happy   Sad   Neutral
```

---

# 38. CNN Contribution Specifically

The user's contribution can be described as:

> The CNN branch of Resonance develops a Mel spectrogram-based convolutional speech emotion recognition pipeline. It includes audio preprocessing, feature extraction, CNN architecture development, hyperparameter tuning, training, evaluation and robustness analysis. The CNN is evaluated under the same speaker-independent experimental framework as the BiLSTM so that spectral and temporal modelling can be compared fairly.

The existing project contribution document assigns to Prithiv:

- CNN architecture
- Mel spectrogram pipeline
- dataset integration
- preprocessing
- CNN training/tuning
- literature papers A1–A5
- research-gap synthesis. 

---

# 39. Software / Folder Organization

A logical implementation structure is:

```text
Resonance/
│
├── audio/
│   ├── RAVDESS/
│   └── CREMA-D/
│
├── metadata/
│   ├── resonance_metadata.csv
│   ├── train.csv
│   ├── validation.csv
│   └── test.csv
│
├── features/
│   ├── mel_spectrograms/
│   └── mfcc/
│
├── noisy/
│   ├── white_noise/
│   ├── babble_noise/
│   └── traffic_noise/
│
├── models/
│   ├── cnn/
│   └── bilstm/
│
├── notebooks/
│
├── scripts/
│   ├── preprocessing/
│   ├── feature_extraction/
│   ├── training/
│   └── evaluation/
│
└── README.md
```

The recommended data organization in the DataPort document includes the audio, metadata and Mel/MFCC feature directories. 

---

# 40. Reproducibility

The project should preserve:

- original source filenames
- speaker identifiers
- source datasets
- label mappings
- feature-extraction parameters
- dataset splits
- model configurations
- preprocessing parameters
- noise parameters
- SNR levels

This allows every sample to be traced back to its source.

The project should also respect the original licenses and citation requirements of RAVDESS and CREMA-D. 

---

# 41. Limitations

The project has several known limitations.

### Different recording conditions

RAVDESS and CREMA-D were created using different collection protocols.

Therefore, source-specific recording characteristics may remain.

### Acted speech

Both source datasets contain acted emotional speech rather than completely natural conversational emotion.

### Intensity mismatch

The two datasets do not use identical intensity annotation schemes.

### Artificial noise

The noisy dataset uses controlled artificial noise rather than representing every type of real-world acoustic interference.

### Dataset imbalance

The unified dataset is dominated by CREMA-D because CREMA-D contributes 7,442 samples compared with 1,056 RAVDESS samples after common-label filtering.

### Speaker leakage

Poor splitting could produce artificially high performance, which is why speaker-independent splitting is essential.

These limitations are explicitly described in the DataPort documentation. 

---

# 42. Intended Applications

The framework can be relevant to:

- Emotion-aware human-computer interaction
- Voice interfaces
- Affective computing
- Call and conversational analytics
- Emotion-aware multimedia systems
- Speech emotion research
- Benchmarking acoustic deep-learning architectures

The project should be presented primarily as an **academic research/experimental framework**, not as a production-ready clinical or commercial emotion detector. 

---

# 43. What Resonance Is NOT

This is useful for Antigravity so it does not accidentally build the wrong system.

### It is NOT:

- A speech-to-text system
- A sentiment-analysis system
- A multimodal emotion detector
- A facial emotion recognition system
- A chatbot
- A voice assistant
- A Transformer project
- A Mamba project
- A new CNN architecture
- A new BiLSTM architecture
- A newly collected speech corpus

### It IS:

> **A unified, speaker-independent speech emotion recognition experiment comparing a CNN operating on Mel spectrograms with a BiLSTM operating on MFCC sequences, with additional intensity and noise robustness analysis.**

---

# 44. Desired Final System Behaviour

Given a speech file:

```text
input.wav
```

the system should:

### Step 1

Load audio.

### Step 2

Normalize/preprocess.

### Step 3

Generate:

```text
Mel Spectrogram
```

for CNN.

### Step 4

Generate:

```text
MFCC Sequence
```

for BiLSTM.

### Step 5

Run both models.

### Step 6

Generate six-class probabilities.

Example:

```text
CNN

Anger       0.02
Disgust     0.04
Fear        0.12
Happy       0.70
Sadness     0.05
Neutral     0.07

Prediction: Happy
```

and independently:

```text
BiLSTM

Anger       ...
Disgust     ...
Fear        ...
Happy       ...
Sadness     ...
Neutral     ...

Prediction: Happy
```

### Step 7

Store predictions.

### Step 8

For evaluation datasets, compare predictions against ground truth.

### Step 9

Generate:

- Accuracy
- Precision
- Recall
- Macro-F1
- Confusion Matrix

### Step 10

Compare CNN and BiLSTM results.

---

# 45. Final Research Contribution

The strongest way to describe the contribution is:

> **Resonance provides a controlled multi-source evaluation of spectral CNN and temporal BiLSTM speech emotion recognition using a unified six-emotion dataset derived from RAVDESS and CREMA-D. It preserves speaker and source metadata, enforces speaker-independent evaluation, and extends the comparison with source-native emotion-intensity analysis and controlled noise robustness experiments.**

The CNN-specific contribution is:

> **A Mel spectrogram-based CNN pipeline that provides a transparent spectral baseline for comparison against temporal BiLSTM modelling.**

The project's novelty should therefore be framed around:

```text
Unified Dataset
        +
Controlled Architecture Comparison
        +
Speaker-Independent Evaluation
        +
Intensity Analysis
        +
Noise Robustness
```

rather than claiming novelty in CNN itself or claiming that speech-emotion intensity has never been studied.

---

# 46. One-Paragraph Description for Antigravity

Use this as the **highest-level project prompt/context**:

> Resonance is a university Neural Networks and Deep Learning project for Speech Emotion Recognition. The system combines the speech portions of RAVDESS and CREMA-D into a unified six-emotion classification task containing Anger, Disgust, Fear, Happiness, Sadness and Neutral. After excluding RAVDESS-only Calm and Surprised samples, the clean unified dataset contains 8,498 samples: 1,056 from RAVDESS and 7,442 from CREMA-D. Speaker identity and source metadata must be retained, and training, validation and test sets must be speaker-independent to prevent speaker leakage. The system compares two established deep-learning approaches under the same experimental protocol: a CNN operating on Mel spectrograms and a BiLSTM operating on MFCC sequences. The CNN baseline consists of Conv2D layers with 32, 64 and 128 filters, max pooling, global average pooling, a dense layer, dropout and six-class softmax. The BiLSTM baseline consists of BiLSTM layers with 128 and 64 units, dropout, dense and six-class softmax. The CNN is responsible for modelling local time-frequency spectral patterns, while the BiLSTM models temporal dependencies across MFCC frames. Both models are evaluated using Accuracy, Precision, Recall, Macro-F1 and confusion matrices. Macro-F1 is the primary comparison metric. The project also creates a derived noisy dataset by adding white/Gaussian, background/babble and traffic noise at 20 dB, 10 dB and 5 dB SNR while maintaining a clean-to-noisy mapping. Clean, noisy and optionally denoised conditions are compared. RAVDESS provides explicit Normal and Strong intensity labels, while CREMA-D provides Low, Medium, High and Unspecified native intensity labels; these scales must not be treated as equivalent. The primary intensity analysis compares CNN and BiLSTM performance on RAVDESS Normal versus Strong conditions, with CREMA-D intensity analysed separately using its native labels. The research gap is not that CNN/BiLSTM or intensity-aware SER are individually unexplored; rather, Resonance provides a controlled multi-source experimental comparison that isolates spectral versus temporal architecture behaviour while simultaneously examining intensity and controlled audio degradation. The project is intended as an academic research framework and must not be represented as a newly collected speech corpus, clinical diagnostic system, or novel neural architecture.