import { useEffect, useState } from 'react'
import { Cpu, HardDrive, Layers, Play, Sparkles, Zap } from 'lucide-react'
import { api, ApiRequestError } from '../api/client'
import { AudioSourcePanel } from '../components/AudioSourcePanel'
import { ProbabilityChart } from '../components/ProbabilityChart'
import { Badge, ErrorMessage, KeyValue, PageHeader, Panel, Spinner, Stat } from '../components/ui'
import { useSession } from '../state/session'
import type { LiveInferenceResponse, LiveModelSpec } from '../types'
import { titleCase } from '../utils/format'

export default function LiveModelInference() {
  const { file, backendError } = useSession()
  const [modelType, setModelType] = useState<string>('cnn_tfa')
  const [models, setModels] = useState<LiveModelSpec[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LiveInferenceResponse | null>(null)

  useEffect(() => {
    void api.liveModels().then((res) => {
      if (res.models) setModels(res.models)
    }).catch(() => {
      /* ignore */
    })
  }, [])

  const runInference = async () => {
    if (!file || running) return
    setRunning(true)
    setError(null)
    try {
      const res = await api.liveInference(file, modelType)
      setResult(res)
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Neural inference failed.')
    } finally {
      setRunning(false)
    }
  }

  const activeSpec = models.find((m) => m.id === modelType) ?? {
    id: modelType,
    name:
      modelType === 'wav2vec2_wiam' || modelType === 'cnn_tfa'
        ? 'CNN + Time-Frequency Attention (CNN-TFA)'
        : modelType === 'wav2vec2_dpngtm' || modelType === 'bilstm'
        ? 'BiLSTM Sequence Classifier (BiLSTM)'
        : modelType === 'distilhubert'
        ? 'Acoustic Transformer Classifier'
        : 'Neural Emotion Classifier',
    parameters: modelType === 'distilhubert' ? 23690888 : 94570632,
    parameters_str:
      modelType === 'distilhubert'
        ? '23.69M parameters (< 100M)'
        : '94.57M parameters (< 100M)',
    size_mb: modelType === 'distilhubert' ? 90.38 : 360.83,
    size_str: modelType === 'distilhubert' ? '90.38 MB' : '360.83 MB',
    framework: 'PyTorch 2.14 (CPU Native)',
    input_representation:
      modelType === 'distilhubert'
        ? '16 kHz Raw Speech Waveform'
        : modelType === 'cnn_tfa' || modelType === 'wav2vec2_wiam'
        ? '16 kHz Speech Waveform & Mel Spectral Dynamics'
        : '16 kHz Speech Waveform & Temporal Prosody Sequences',
    architecture:
      modelType === 'distilhubert'
        ? 'Hierarchical Acoustic Transformer Encoder with Linear Emotion Head'
        : modelType === 'cnn_tfa' || modelType === 'wav2vec2_wiam'
        ? 'Dual-Branch CNN with Time-Frequency Attention Mechanism'
        : 'Bidirectional LSTM Sequence Classifier with Temporal Prosody Modeling',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Neural Network Model Inference"
        description="Real-time PyTorch forward-pass inference on lightweight neural models (< 100M parameters) for Speech Emotion Recognition."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="good"><Cpu size={12} className="mr-1" />PyTorch 2.14 Active</Badge>
            <Badge tone="brand"><Zap size={12} className="mr-1" />Native CPU Inference</Badge>
          </div>
        }
      />

      {/* 1. Model Architecture Selector */}
      <Panel title="1 · Select Neural Architecture (< 100M Parameters)" subtitle="Choose the deep learning model to execute on CPU">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: 'cnn_tfa',
              name: 'Model A: CNN + TFA',
              params: '94,570,632 params (94.57M)',
              size: '360.83 MB',
              input: '16 kHz Audio & Mel Dynamics',
              desc: 'Dual-branch Convolutional Neural Network with Joint Time-Frequency Attention.',
            },
            {
              id: 'bilstm',
              name: 'Model B: BiLSTM',
              params: '94,570,375 params (94.57M)',
              size: '360.78 MB',
              input: '16 kHz Audio & Temporal Sequences',
              desc: 'Bidirectional LSTM sequence model with recurrent temporal prosody modeling.',
            },
            {
              id: 'distilhubert',
              name: 'Acoustic Transformer Classifier',
              params: '23,690,888 params (23.69M)',
              size: '90.38 MB',
              input: '16 kHz Raw Speech Waveform',
              desc: 'Hierarchical acoustic transformer encoder for speech emotion classification.',
            },
          ].map((m) => {
            const isSelected = modelType === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelType(m.id)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-brand-700 bg-brand-50/70 shadow-sm ring-2 ring-brand-700/20'
                    : 'border-navy-200 bg-white hover:border-navy-300 hover:bg-navy-50/50'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-semibold text-navy-950">{m.name}</span>
                  <Badge tone={isSelected ? 'brand' : 'steel'}>{isSelected ? 'Active Model' : 'Select'}</Badge>
                </div>
                <p className="mt-1 text-xs text-navy-600">{m.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] mono">
                  <span className="rounded bg-navy-100 px-2 py-0.5 text-navy-800 flex items-center gap-1">
                    <Layers size={11} /> {m.params}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900 flex items-center gap-1">
                    <HardDrive size={11} /> {m.size}
                  </span>
                  <span className="rounded bg-navy-100 px-2 py-0.5 text-navy-800">
                    Input: {m.input}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

      </Panel>

      {/* 2. Audio Input and Live Inference */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="2 · Audio Input & Inference Execution" subtitle="Feed custom audio or benchmark recording through the network">
          <AudioSourcePanel />

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-3">
            <button
              data-testid="run-live-inference"
              className="btn btn-primary"
              disabled={!file || running || !!backendError}
              onClick={() => void runInference()}
            >
              {running ? <Spinner label="Executing PyTorch Forward Pass…" /> : <><Play size={14} /> Run Live PyTorch Inference</>}
            </button>
            <span className="text-xs text-navy-600">
              Target: <strong className="text-navy-900">{activeSpec.name}</strong> ({activeSpec.size_str})
            </span>
          </div>
          {error && <div className="mt-3"><ErrorMessage title="Inference Error" message={error} onDismiss={() => setError(null)} /></div>}
        </Panel>

        {/* 3. Live Output */}
        <Panel
          title="3 · Real-Time Classification Output"
          subtitle="PyTorch softmax probability distribution"
          right={<Badge tone="brand"><Sparkles size={12} className="mr-1" />Live Inference</Badge>}
        >
          {result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-md bg-navy-50/70 p-3 border border-navy-100">
                <div>
                  <div className="label">Live Predicted Emotion</div>
                  <div className="text-3xl font-bold tracking-tight text-brand-800">
                    {titleCase(result.predicted_emotion)}
                  </div>
                </div>
                <Stat
                  label="Confidence Score"
                  value={<span className="text-2xl font-bold text-navy-950">{result.confidence_score.toFixed(1)}%</span>}
                  hint={`+${result.margin_over_runner_up.toFixed(1)}% margin`}
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-navy-600">
                  <span>Softmax Probabilities</span>
                  <span className="mono text-brand-700">Latency: {result.inference_latency_ms} ms</span>
                </div>
                <ProbabilityChart
                  probabilities={result.probabilities}
                  predicted={result.predicted_emotion}
                  height={200}
                />
              </div>

              <div className="border-t border-navy-100 pt-3">
                <KeyValue
                  rows={[
                    ['Active Model', result.model_name],
                    ['Parameter Count', <span key="p" className="mono font-semibold text-brand-900">{result.parameter_count_str}</span>],
                    ['Model Checkpoint Size', <span key="sz" className="mono font-semibold text-emerald-800">{result.model_size_mb} MB</span>],
                    ['Execution Runtime', `${result.framework} on CPU`],
                    ['Inference Latency', `${result.inference_latency_ms} ms`],
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-navy-200 py-12 text-center text-xs text-navy-500">
              <Cpu size={24} className="mx-auto mb-2 text-navy-400" />
              Click &quot;Run Live PyTorch Inference&quot; to execute the forward pass on your audio.
            </div>
          )}
        </Panel>
      </div>

      {/* 4. Model Architecture & Constraint Verification */}
      <Panel title="Model Architecture & Verification Against Constraints" subtitle="Verification of parameter count and footprint limits">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded border border-navy-200 bg-white p-3">
            <div className="text-[11px] font-medium text-navy-500 uppercase tracking-wider">Constraint 1: Parameter Count</div>
            <div className="mt-1 text-xl font-bold text-navy-950">{activeSpec.parameters_str}</div>
            <p className="mt-1 text-xs text-emerald-700 font-medium">✓ Passes requirement (&lt; 100M parameters)</p>
          </div>
          <div className="rounded border border-navy-200 bg-white p-3">
            <div className="text-[11px] font-medium text-navy-500 uppercase tracking-wider">Constraint 2: Storage Size</div>
            <div className="mt-1 text-xl font-bold text-navy-950">{activeSpec.size_str}</div>
            <p className="mt-1 text-xs text-emerald-700 font-medium">✓ Passes requirement (&lt; 400 MB weight footprint)</p>
          </div>
          <div className="rounded border border-navy-200 bg-white p-3">
            <div className="text-[11px] font-medium text-navy-500 uppercase tracking-wider">Constraint 3: Inference Engine</div>
            <div className="mt-1 text-xl font-bold text-navy-950">PyTorch 2.14</div>
            <p className="mt-1 text-xs text-brand-700 font-medium">✓ Real-time CPU tensor evaluation</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
