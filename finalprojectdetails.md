# Resonance — Complete ML Application Demonstration

## Goal

Build a polished, interactive demonstration of Resonance that visually presents the complete Speech Emotion Recognition system powered by real deep-learning models.

The priority is to make the application feel like a coherent, integrated ML product.

Implement the UI, interactions, live inference pipeline, feature-analysis components, test suite and model architecture views. Run the application and ensure the platform works reliably.


## 1. Technology Stack

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts

Backend:
- Python
- FastAPI
- NumPy
- Librosa
- SciPy
- Scikit-learn

Use the existing repository if available. Preserve useful code, organize components cleanly and provide exact commands for running the frontend and backend.

## 2. Professional UI

Build a polished research-product dashboard called Resonance.

Visual direction:
- White/light background.
- Dark navy text.
- Restrained teal and muted blue accents.
- Clean typography.
- Compact, professional charts.
- Consistent spacing and alignment.
- No unnecessary gradients, animations, oversized cards or decorative AI imagery.

The application should contain the following pages or tabs:

1. Audio Analysis
2. Model Comparison
3. Noise Robustness
4. K-Means Analysis
5. Explainability
6. GAN Augmentation
7. Testing
8. Architecture and Model Information

Use a persistent top navigation bar and a consistent page layout. Avoid building eight unrelated screens; all sections should feel like one integrated application.

## 3. Model Registry and Architecture

Create a proper model registry with the intended models:

### Model A — CNN + Time-Frequency Attention
Input: Mel spectrogram.
Proposed architecture:
Mel Spectrogram → CNN → Time-Frequency Attention → Global Pooling → Classifier → Six Emotion Classes.

### Model B — BiLSTM
Input: MFCC sequence.
Proposed architecture:
MFCC Sequence → BiLSTM → Dense Classifier → Six Emotion Classes.

### Baseline A — Plain CNN
Input: Mel spectrogram.
Purpose: ablation baseline without the attention block.

### Baseline B — Unidirectional LSTM
Input: MFCC sequence.
Purpose: comparator for the BiLSTM.

Represent the four configurations as separate selectable model cards with their input representation, intended architecture, purpose and implementation status.

For the current demonstration, use status labels such as:
- Architecture defined
- Demo interface available
- Trained checkpoint unavailable
- Evaluation pending

Do not show "trained", "validated", "production-ready" or "model loaded" unless those statements are true.

The model-selection control must work and update the architecture details and experiment configuration.

## 4. Audio Analysis — Main Demo Screen

Create the strongest, most polished page first.

Include:
- Drag-and-drop audio upload (WAV, MP3, FLAC, OGG, MPEG/MPG).
- File picker.
- Audio playback.
- Filename, duration, sampling rate and file size.
- Audio waveform visualization, if feasible.
- Analyze button.
- Selected model indicator.
- Six emotion labels: anger, disgust, fear, happiness, sadness and neutral.
- Emotion probability chart.
- Predicted-label summary.
- Confidence-style score.
- Processing-status indicator.
- Clear error handling.

The platform connects directly to active pretrained Transformer Speech Emotion Recognition classifiers (Wav2Vec 2.0 fine-tuned on RAVDESS: Wiam/wav2vec2-base-finetuned-ravdess replacing the plain CNN baseline, and Dpngtm/wav2vec2-emotion-recognition, both 94.57M parameters < 100M).

Inference is fully operational:
- Real PyTorch forward-pass inference on uploaded audio or live microphone input.
- Displays calibrated emotion probability distributions across the 6 core emotional classes.
- Probabilities sum to 100% and map directly to argmax predicted emotion labels with latency diagnostics.
- Presents verified benchmark performance, evaluation metrics, and comparative architecture statistics cleanly across the platform.

The app should still perform real audio upload, decoding, playback and metadata extraction.

## 5. Actual Acoustic Feature Analysis

Where possible, compute real properties of the uploaded audio using Librosa or SciPy:

- RMS energy.
- Zero-crossing rate.
- Spectral centroid.
- MFCC statistics.
- Estimated pitch, when reliable.
- Audio duration and sample rate.

Display these in a compact feature-analysis section.

Clearly distinguish real signal-analysis features from simulated emotion predictions. These measurements are useful evidence that the audio-processing part of the application is functioning.

## 6. Model Comparison Dashboard

Build a working interface for comparing:
- Plain CNN.
- CNN + Time-Frequency Attention.
- Unidirectional LSTM.
- BiLSTM.

Display:
- Model architecture.
- Input representation.
- Intended contribution.
- Current implementation status.
- Experiment status.
- Performance metric placeholders.

For unexecuted experiments, show "Pending — model execution required" instead of invented numbers.

Include a chart layout that can later display Accuracy, Precision, Recall and Macro-F1 from genuine experiment logs.

If illustrative charts are useful for showing the planned layout, label them explicitly as sample data. Do not make them appear to be measured results.

## 7. Noise Robustness Demo

Create a page with selectable conditions:
- Clean.
- 20 dB SNR.
- 10 dB SNR.
- 5 dB SNR.
- Denoised.

Allow comparison of the illustrative emotion-probability distributions across conditions.

Implement actual synthetic noise injection into the waveform where practical. Calculate the noise scaling from the measured signal power and requested SNR.

Show the waveform or acoustic-feature changes caused by noise injection.

Keep the distinction clear:
- Waveform noise generation and feature analysis can be real.
- Emotion predictions remain simulated.
- Classifier robustness results remain pending until a trained classifier is available.

Do not claim that the project has achieved noise robustness based on the simulated predictions.

## 8. K-Means Analysis

Implement actual K-Means clustering for acoustic features extracted from the uploaded recording, if feasible.

Workflow:
1. Split the audio into short overlapping frames.
2. Extract frame-level acoustic features.
3. Standardize the feature matrix.
4. Run K-Means using a configurable number of clusters.
5. Display cluster membership over time.
6. Display cluster sizes and feature summaries.
7. Calculate a silhouette score when valid.

Use a compact time-based cluster plot and an optional two-dimensional projection.

Label this analysis "Acoustic Feature Clustering". Do not describe clusters as verified emotion classes.

If clustering cannot be executed, display a clear availability message rather than fake measured metrics.

## 9. Explainability Demo

Create an Explainability page showing the planned CNN + Time-Frequency Attention architecture alongside a time-frequency visualization.

If no trained CNN exists, the visualization must be labeled as an illustrative explanation layout.

Do not claim that it is Grad-CAM or a real model explanation.

Show:
- Input Mel spectrogram or spectrogram-style view.
- Explanation-panel layout.
- Importance legend.
- Short explanation of how an actual Grad-CAM or attention map will be generated after a trained checkpoint exists.

If you implement real occlusion analysis over a deterministic demo engine, describe it as a demonstration of the explanation workflow, not as XAI for a trained neural network.

## 10. GAN Augmentation Page

Create a dedicated page showing the proposed conditional GAN workflow:

Real training spectrograms → Conditional Generator → Synthetic candidates → Quality checks → Augmented training set → Classifier evaluation.

Include:
- A clear architecture diagram.
- Generator/discriminator role descriptions.
- Configurable experiment parameters.
- Quality-check status.
- Augmentation-ratio setting.
- Experiment status.
- Result-table structure.

Until a GAN has actually been trained, show:

"GAN training not executed; augmentation results pending."

Do not manufacture generated spectrograms and present them as actual GAN outputs. Do not show fictitious gains in Macro-F1.

## 11. Testing Dashboard

Create functional UI and testing pages.

Include a table with:
- Test ID.
- Test category.
- Test description.
- Expected outcome.
- Observed outcome.
- Execution status.

Add tests for:
- Valid audio upload.
- Unsupported file handling.
- Audio playback.
- Model selection.
- Prediction chart consistency.
- Probability normalization.
- Noise-processing control.
- K-Means output.
- Missing checkpoint handling.
- Error-message display.
- Navigation and UI interaction.

Run the tests and report only the tests that actually passed.

## 12. Backend Design

If a backend is used, implement:
- GET /api/health
- GET /api/model-info
- POST /api/analyze
- POST /api/noise-analysis
- POST /api/cluster
- POST /api/explain-demo

Return structured JSON responses.

Any simulated response must include fields identifying its source, for example:
- mode: "simulation"
- model_checkpoint: null
- measured: false
- note: "Illustrative output; no trained model connected"

Do not hide these fields from the frontend.

Use reasonable upload limits, clear exceptions, temporary files and appropriate CORS configuration.

## 13. Demo Persistence

Within the current browser session, retain:
- The uploaded filename and metadata.
- The selected model configuration.
- Analysis settings.
- The latest demonstration output.
- The selected noise condition.
- Testing results.

Avoid adding a database or complex authentication system.

## 14. Final Deliverables

Provide:
- Complete runnable frontend and backend.
- Dependency files.
- Startup scripts for Windows and Linux.
- README with exact setup instructions.
- Architecture diagram.
- Test suite.
- Actual screenshots of the working application.
- Demo checklist.
- List of implemented, simulated and pending components.

Prioritize reliable UI interactions and a polished live walkthrough.

At completion, state exactly which operations are genuine, which outputs are simulated, which tests ran, and which research experiments remain unperformed. Do not claim that any neural model has been trained or evaluated.