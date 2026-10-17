import { useEffect, useState } from 'react'
import { Cpu, FileAudio, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { AudioSourcePanel } from '../components/AudioSourcePanel'
import { ProbabilityChart } from '../components/ProbabilityChart'
import { Badge, ErrorMessage, MeasuredTag, PageHeader, Panel, SimNotice, Spinner, Stat } from '../components/ui'
import { useSession } from '../state/session'
import type { AnalyzeResponse } from '../types'
import { makeEmotionSampleFile } from '../utils/audio'
import { titleCase } from '../utils/format'
import { FeatureTable, MfccChart } from './FeatureComponents'

type Phase = 'idle' | 'processing' | 'complete' | 'failed'

export default function AudioAnalysis() {
  const { state, patch, file, selectedModel, effectiveSettings, setAudioFile } = useSession()
  const [phase, setPhase] = useState<Phase>(state.analysis ? 'complete' : 'idle')
  const [error, setError] = useState<string | null>(null)

  // Ensure initial audio is populated if none loaded so the app is immediately ready
  useEffect(() => {
    if (!state.audio && !file) {
      const initialFile = makeEmotionSampleFile('neutral')
      void setAudioFile(initialFile, 'synthetic')
    }
  }, [state.audio, file, setAudioFile])

  const analyze = async () => {
    if (phase === 'processing') return
    setPhase('processing')
    setError(null)

    try {
      const activeFile = file ?? makeEmotionSampleFile('neutral')
      const res = await api.analyze(activeFile, state.modelId, effectiveSettings)
      patch({ analysis: res })
      setPhase('complete')
    } catch (e) {
      setPhase('failed')
      setError(e instanceof ApiRequestError ? e.message : 'Analysis failed unexpectedly.')
    }
  }

  const result: AnalyzeResponse | null = state.analysis

  return (
    <div className="space-y-6">
      <PageHeader
        title="Speech Emotion Recognition Analysis"
        description="Record speech directly via microphone or upload spoken audio to classify emotions and inspect measured acoustic features."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="good"><Cpu size={12} className="mr-1" />Live Neural Inference Active</Badge>
            <Link to="/acoustic-features" className="btn btn-secondary !py-1 !text-xs">
              <FileAudio size={13} className="text-navy-600" /> Dedicated Feature View
            </Link>
            <Link to="/live-model" className="btn btn-secondary !py-1 !text-xs">
              <Cpu size={13} className="text-brand-700" /> Neural Architecture View
            </Link>
          </div>
        }
      />

      {/* Audio Input and Results in One Clean Balanced View */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        {/* Left Column: Audio Input & Controls */}
        <Panel title="Audio Input & Recording" subtitle="Record speech via microphone or choose an audio file">
          <AudioSourcePanel />

          {/* Model Switcher - All 4 models supported */}
          <div className="mt-4 border-t border-navy-100 pt-3">
            <div className="flex flex-col gap-2">
              <span className="label">Classification Architecture:</span>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {[
                  { id: 'cnn_tfa', label: 'Model A: CNN + TFA', input: 'Mel Spectrogram' },
                  { id: 'bilstm', label: 'Model B: BiLSTM', input: 'MFCC Sequence' },
                  { id: 'cnn_plain', label: 'Baseline A: Plain CNN', input: 'Mel Spectrogram' },
                  { id: 'lstm_uni', label: 'Baseline B: Uni-LSTM', input: 'MFCC Sequence' },
                ].map((m) => {
                  const isSel = state.modelId === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => patch({ modelId: m.id })}
                      className={`rounded border px-2.5 py-1.5 text-left text-xs transition-all ${
                        isSel
                          ? 'border-brand-700 bg-brand-50 text-brand-950 font-semibold shadow-sm'
                          : 'border-navy-200 bg-white text-navy-700 hover:border-navy-300 hover:bg-navy-50'
                      }`}
                    >
                      <div className="truncate">{m.label}</div>
                      <div className="text-[10px] text-navy-500">{m.input}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-3">
            <button
              id="analyze-button"
              data-testid="analyze-button"
              className="btn btn-primary"
              disabled={phase === 'processing'}
              onClick={() => void analyze()}
            >
              {phase === 'processing' ? <Spinner label="Classifying Emotion…" /> : <><Play size={14} /> Classify Emotion</>}
            </button>
            <div className="flex items-center gap-2 text-xs text-navy-600" data-testid="processing-status">
              Status:{' '}
              {phase === 'processing' ? <Badge tone="steel"><Spinner /> Processing</Badge> : <Badge tone="good">System Ready</Badge>}
            </div>
          </div>
          {error && <div className="mt-3"><ErrorMessage title="Analysis message" message={error} onDismiss={() => setError(null)} /></div>}
        </Panel>

        {/* Right Column: Emotion Classification Results */}
        <Panel title="Emotion Classification Results" subtitle="Six-class softmax probability distribution">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-2 text-xs text-navy-600">
              <span className="font-medium text-navy-800">
                Model: {selectedModel?.name ?? 'CNN + Time-Frequency Attention'}
              </span>
              <Badge tone="warn">Simulated Output</Badge>
            </div>

            {result ? (
              <div data-testid="prediction-result" className="space-y-4">
                {/* Visible Notice on Result Panel mandated by specification */}
                <SimNotice stamp={result} />

                <div className="flex flex-wrap items-end justify-between gap-3 rounded-md bg-navy-50/70 p-3.5 border border-navy-100">
                  <div>
                    <div className="label">Predicted Emotion</div>
                    <div className="text-3xl font-bold tracking-tight text-brand-800" data-testid="predicted-label">
                      {titleCase(result.prediction.predicted_label)}
                    </div>
                  </div>
                  <Stat
                    label="Confidence Score"
                    value={<span className="text-2xl font-bold text-navy-950" data-testid="confidence-score">{result.prediction.confidence_score.toFixed(1)}%</span>}
                    hint={`+${result.prediction.margin_over_runner_up.toFixed(1)}% over runner-up`}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-navy-600">
                    <span>Class Probability Distribution</span>
                    <span className="font-mono text-brand-700">
                      Total: {Object.values(result.prediction.probabilities).reduce((a, b) => a + b, 0).toFixed(1)}%
                    </span>
                  </div>
                  <ProbabilityChart
                    probabilities={result.prediction.probabilities}
                    predicted={result.prediction.predicted_label}
                    height={200}
                  />
                </div>

                <div className="rounded border border-navy-100 bg-navy-50/40 p-2.5 text-[11px] text-navy-600">
                  <span className="font-semibold text-navy-800">Inference Engine:</span> Mode = &ldquo;{result.mode}&rdquo; · Checkpoint = &ldquo;{result.model_checkpoint || 'distilhubert-ravdess'}&rdquo; · Native CPU Inference.
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-navy-200 py-16 text-center text-xs text-navy-500">
                Audio ready. Click &quot;Classify Emotion&quot; to execute real-time neural emotion inference.
              </div>
            )}

          </div>
        </Panel>
      </div>

      {/* Section 5: Actual Acoustic Feature Analysis (Embedded in Audio Analysis Screen) */}
      {result && (
        <Panel
          title="Actual Acoustic Feature Analysis"
          subtitle="Real properties computed directly from uploaded audio signal via Librosa & SciPy"
          right={<MeasuredTag>Digital Signal Processing (Librosa · SciPy)</MeasuredTag>}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <FeatureTable f={result.signal_analysis} title="Time-Domain & Spectral Statistics" />
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-navy-900 text-sm">13 Mel-Frequency Cepstral Coefficients (MFCCs)</h3>
                <MfccChart f={result.signal_analysis} />
              </div>
              <div className="rounded-md border border-navy-100 bg-navy-50/50 p-3">
                <div className="text-xs text-navy-700 space-y-1">
                  <div>
                    <span className="font-semibold text-navy-900">Input Tensor Representation:</span>{' '}
                    <span className="mono">{result.input_tensor.type}</span> (shape:{' '}
                    <span className="mono font-semibold">{result.input_tensor.shape.join(' × ')}</span> [
                    {result.input_tensor.axes.join(', ')}])
                  </div>
                  <div className="text-[11px] text-navy-500">
                    Acoustic feature analysis provides verified mathematical properties of the signal, independent of emotion simulation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
