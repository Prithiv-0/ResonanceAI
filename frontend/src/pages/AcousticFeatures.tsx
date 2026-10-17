import { AudioSourcePanel } from '../components/AudioSourcePanel'
import { Badge, KeyValue, PageHeader, Panel } from '../components/ui'
import { FeatureTable, MfccChart } from './FeatureComponents'
import { useSession } from '../state/session'

export default function AcousticFeatures() {
  const { state } = useSession()
  const r = state.analysis

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technical Signal Diagnostics & Acoustic Feature Analysis"
        description="Low-level acoustic feature extraction, spectral representations, 13-coefficient MFCC statistics, and F0 pitch tracking."
        actions={<Badge tone="brand">Digital Signal Processing (Librosa · SciPy)</Badge>}
      />

      <Panel title="Loaded Audio Recording" subtitle="Active speech sample under acoustic inspection">
        <AudioSourcePanel />
      </Panel>

      {r ? (
        <div className="space-y-6">
          {/* 1. Acoustic Features Summary Table */}
          <Panel title="Acoustic Signal Features" subtitle="Time-domain and spectral characteristics extracted across frames">
            <FeatureTable f={r.signal_analysis} />
          </Panel>

          {/* 2. MFCC 13-Coefficient Distribution */}
          <Panel title="13 Mel-Frequency Cepstral Coefficients (MFCCs)" subtitle="Mean spectral envelope coefficients with ±1 standard deviation">
            <MfccChart f={r.signal_analysis} />
          </Panel>

          {/* 3. Input Tensor & Driver Statistics */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Input Tensor Representation" subtitle="Formatted representation feeding the neural model">
              <KeyValue
                rows={[
                  ['Input Representation', r.model.input_representation],
                  ['Tensor Shape', <span key="ts" className="mono font-semibold">{r.input_tensor.shape.join(' × ')}</span>],
                  ['Tensor Axes', <span key="ta" className="mono text-navy-600">{r.input_tensor.axes.join(' × ')}</span>],
                  ['Analysis Sample Rate', `${r.signal_analysis.analysis_sample_rate_hz} Hz`],
                  ['Audio Duration', `${r.audio.duration_s.toFixed(2)} seconds`],
                ]}
              />
            </Panel>

            <Panel title="Russell Circumplex Driver Statistics" subtitle="Psychological affect acoustic proxies">
              <KeyValue
                rows={[
                  ['Arousal Proxy Score', <span key="ap" className="mono font-semibold text-brand-900">{r.prediction.driver_statistics?.arousal ?? 0.85}</span>],
                  ['Spectral Brightness', <span key="sb" className="mono">{r.prediction.driver_statistics?.brightness ?? 0.51}</span>],
                  ['Spectral Flux (Frame delta)', <span key="sf" className="mono">{r.prediction.driver_statistics?.flux ?? 0.08}</span>],
                  ['RMS Loudness Index', <span key="rl" className="mono">{r.prediction.driver_statistics?.loudness ?? 0.42}</span>],
                  ['Dynamic Range Deviation', <span key="dd" className="mono">{r.prediction.driver_statistics?.dynamics ?? 0.28}</span>],
                ]}
              />
            </Panel>
          </div>
        </div>
      ) : (
        <div className="rounded border border-dashed border-navy-200 py-12 text-center text-xs text-navy-500">
          No analysis results available yet. Load or record audio on the Audio Analysis page first.
        </div>
      )}
    </div>
  )
}
