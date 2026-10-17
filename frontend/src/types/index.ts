export const EMOTIONS = ['anger', 'disgust', 'fear', 'happiness', 'sadness', 'neutral'] as const
export type Emotion = (typeof EMOTIONS)[number]

export const DEMO_BANNER = 'RESONANCE — SPEECH EMOTION RECOGNITION PLATFORM'

/** Provenance fields the backend attaches to classification payloads. */
export interface SimStamp {
  mode: 'inference'
  model_checkpoint: string | null
  measured: boolean
  note: string
}


export interface ModelInfo {
  id: string
  name: string
  short_name: string
  label: string
  role: 'proposed' | 'baseline'
  family: 'cnn' | 'rnn'
  input_representation: string
  input_kind: 'mel_spectrogram' | 'mfcc_sequence'
  architecture_steps: string[]
  purpose: string
  intended_contribution: string
  tunable_inputs: { n_mels?: number[]; n_mfcc?: number[] }
  defaults: { n_mels?: number; n_mfcc?: number }
  planned_configuration: Record<string, string | number>
  status_labels: { label: string; state: 'done' | 'pending' }[]
  implementation_status: {
    architecture_defined: boolean
    demo_interface_available: boolean
    checkpoint_available: boolean
    evaluation_complete: boolean
  }
  checkpoint: null
  experiment_status: string
  metrics: Record<'accuracy' | 'precision' | 'recall' | 'macro_f1', number | null>
  metrics_note: string
}

export interface ModelInfoResponse extends SimStamp {
  emotions: string[]
  models: ModelInfo[]
}

export interface Health extends SimStamp {
  status: string
  version: string
  banner: string
  uptime_s: number
  limits: { max_upload_mb: number; max_duration_s: number; supported_extensions: string[] }
  libraries: Record<string, string>
}

export interface AudioMetadata {
  filename: string
  size_bytes: number
  duration_s: number
  native_sample_rate_hz: number
  analysis_sample_rate_hz: number
  channels: number
  container: string
  sha256: string
  measured: true
}

export interface PitchInfo {
  reliable: boolean
  median_hz: number | null
  p10_hz?: number
  p90_hz?: number
  voiced_fraction: number
  reason: string | null
}

export interface SignalAnalysis {
  measured: true
  source: string
  duration_s: number
  analysis_sample_rate_hz: number
  rms_energy: { mean: number; std: number; overall: number; overall_dbfs: number }
  zero_crossing_rate: { mean: number; std: number }
  spectral_centroid_hz: { mean: number; std: number }
  mfcc: { n_coefficients: number; mean: number[]; std: number[] }
  pitch: PitchInfo
}

export interface Prediction extends SimStamp {
  model_id: string
  probabilities: Record<Emotion, number>
  predicted_label: Emotion
  confidence_score: number
  margin_over_runner_up: number
  score_meaning: string
  engine: string
  driver_statistics: Record<string, number>
}

export interface Settings {
  n_mels: number | null
  n_mfcc: number | null
  seed: number
}

export interface AnalyzeResponse extends SimStamp {
  banner: string
  model: { id: string; name: string; label: string; input_representation: string }
  configuration: Record<string, number>
  audio: AudioMetadata
  waveform: number[][]
  signal_analysis: SignalAnalysis
  input_tensor: { type: string; shape: number[]; axes: string[]; measured: true }
  prediction: Prediction
}

export interface NoiseCondition {
  id: string
  label: string
  target_snr_db: number | null
  processing: string
  measured_snr_db: number | null
  waveform: number[][]
  signal_analysis: SignalAnalysis
  prediction: Prediction
}

export interface NoiseResponse extends SimStamp {
  banner: string
  model: { id: string; name: string; label: string }
  configuration: Record<string, number>
  audio: AudioMetadata
  noise_generation: { measured: true; type: string; method: string; denoiser: string }
  conditions: NoiseCondition[]
  robustness_status: string
}

export interface ClusterResponse {
  analysis: string
  disclaimer: string
  measured: true
  source: string
  audio: AudioMetadata
  parameters: { k: number; seed: number; frame_ms: number; hop_ms: number; features: string[]; standardized: boolean; n_init: number }
  n_frames: number
  silhouette_score: number | null
  silhouette_note: string | null
  inertia: number
  duration_s: number
  timeline: { start_s: number; end_s: number; cluster: number }[]
  clusters: { cluster: number; size_frames: number; fraction: number; duration_s: number; feature_means: Record<string, number> }[]
  projection: {
    method: string
    explained_variance: number[]
    points: { x: number; y: number; cluster: number }[]
    n_points_shown: number
  }
}

export interface ExplainResponse extends SimStamp {
  banner: string
  model: { id: string; name: string; label: string }
  configuration: Record<string, number>
  audio: AudioMetadata
  duration_s: number
  explanation: {
    method: string
    disclaimer: string
    predicted_label: Emotion
    predicted_probability: number
    occlusion_baseline: string
    grid: { freq_patches: number; time_patches: number }
    importance: number[][]
    raw_delta_points: number[][]
    max_drop_points: number
    spectrogram: { n_mels: number; columns: number; values_0_255: number[][]; scale: string }
  }
}

/** What the browser itself learned from decoding the file (real). */
export interface ClientAudioMeta {
  name: string
  size: number
  mime: string
  durationS: number
  sampleRate: number
  sampleRateSource: 'wav-header' | 'decoder'
  channels: number
  origin: 'upload' | 'synthetic'
  waveform: number[][]
}

export type TestStatus = 'not-run' | 'running' | 'passed' | 'failed'
export interface TestResult {
  status: TestStatus
  observed: string
  ranAt?: string
  durationMs?: number
}

export interface GanConfig {
  latentDim: number
  epochs: number
  batchSize: number
  learningRate: number
  conditioning: string
  discriminator: string
  augmentationRatio: number
  targetClasses: string[]
}

export interface ComparisonLog {
  source: string
  metrics: Record<string, { accuracy: number; precision: number; recall: number; macro_f1: number }>
}

export interface LiveModelSpec {
  id: string
  name: string
  parameters: number
  parameters_str: string
  size_mb: number
  size_str: string
  framework: string
  input_representation: string
  architecture: string
}

export interface LiveInferenceResponse {
  status: string
  model_type: string
  model_name: string
  architecture_details: string
  parameter_count: number
  parameter_count_str: string
  model_size_mb: number
  framework: string
  inference_latency_ms: number
  predicted_emotion: Emotion
  confidence_score: number
  margin_over_runner_up: number
  probabilities: Record<Emotion, number>
  attention_preview?: number[][] | null
}
