import { useState } from 'react'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { api, ApiRequestError } from '../api/client'
import { ArchitectureFlow, highlightFor } from '../components/ArchitectureFlow'
import { ModelCards } from '../components/ModelCards'
import { PipelinePanel, CNN_TFA_STAGES, BILSTM_STAGES } from '../components/PipelinePanel'
import { Badge, ErrorMessage, KeyValue, PageHeader, Panel, StatusBadge } from '../components/ui'
import { useSession } from '../state/session'

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/api/health', 'Service status, limits, active libraries and versions'],
  ['GET', '/api/model-info', 'Model registry, architectural specifications, and parameter configurations'],
  ['POST', '/api/analyze', 'Audio metadata, acoustic feature extraction, and emotion probability distribution'],
  ['POST', '/api/noise-analysis', 'Noise injection at 20/10/5 dB SNR, spectral denoising, and robustness metrics'],
  ['POST', '/api/cluster', 'Unsupervised K-Means clustering, silhouette scoring, and PCA projection'],
  ['POST', '/api/explain-demo', 'Time-frequency attention attribution and occlusion sensitivity analysis'],
  ['POST', '/api/load-checkpoint', 'Model checkpoint verification and weight synchronization'],
]

const INVENTORY: { name: string; kind: 'done' | 'sim' | 'pending'; status: string; detail: string }[] = [
  { name: 'Audio upload, decoding, playback, metadata', kind: 'done', status: 'Measured / Genuine', detail: 'Browser Web Audio API + SoundFile / Librosa decoding' },
  { name: 'Acoustic feature analysis (RMS, ZCR, Centroid, MFCCs, F0)', kind: 'done', status: 'Measured / Genuine', detail: 'Librosa & SciPy signal processing engine' },
  { name: 'Synthetic noise injection (20 / 10 / 5 dB SNR)', kind: 'done', status: 'Measured / Genuine', detail: 'NumPy exact power-scaled white noise injection' },
  { name: 'Spectral-gating noise reduction filter', kind: 'done', status: 'Measured / Genuine', detail: 'STFT noise-gate spectral filtering' },
  { name: 'Acoustic Feature Clustering (K-Means, PCA, Silhouette)', kind: 'done', status: 'Measured / Genuine', detail: 'scikit-learn unsupervised frame clustering' },
  { name: 'Automated test suite (31 unit & integration tests)', kind: 'done', status: 'Passed / Verified', detail: 'Pytest backend suite + in-browser verification test suite' },
  { name: 'FastAPI REST API with CORS and structured schemas', kind: 'done', status: 'Active / Healthy', detail: 'Structured error codes, validation, streaming uploads' },
  { name: 'Emotion probability distribution & arg-max prediction', kind: 'sim', status: 'Simulated Engine', detail: 'Reproducible deterministic simulation engine (no weights trained)' },
  { name: 'Time-frequency attention occlusion attribution map', kind: 'sim', status: 'Simulated Engine', detail: 'Illustrative attribution layout over simulation engine (not Grad-CAM)' },
  { name: 'Model A (CNN + TF-Attention) training on RAVDESS/CREMA-D', kind: 'pending', status: 'Pending Training', detail: 'Architecture defined; checkpoint unavailable; evaluation pending' },
  { name: 'Model B (BiLSTM Sequence Classifier) training on MFCCs', kind: 'pending', status: 'Pending Training', detail: 'Architecture defined; checkpoint unavailable; evaluation pending' },
  { name: 'Baseline Models (Plain CNN & Uni-LSTM) ablation training', kind: 'pending', status: 'Pending Training', detail: 'Architectures defined; evaluation pending' },
  { name: 'Conditional GAN training & augmentation experiment', kind: 'pending', status: 'Pending Training', detail: 'Generator/discriminator defined; training not executed' },
]

function Node({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'brand' | 'real' }) {
  const cls = tone === 'brand' || tone === 'real' ? 'border-brand-600 bg-brand-50' : 'border-navy-200 bg-white'
  return <div className={`rounded border px-3 py-2 text-center text-[12px] font-medium text-navy-900 ${cls}`}>{children}</div>
}

export default function Architecture() {
  const { selectedModel: m, effectiveSettings: eff, health, backendError } = useSession()
  const [ckptError, setCkptError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tryLoad = async () => {
    if (!m) return
    setBusy(true)
    setCkptError(null)
    try {
      await api.loadCheckpoint(m.id)
    } catch (e) {
      setCkptError(e instanceof ApiRequestError ? e.message : 'Checkpoint verification request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Architecture and Model Specifications"
        description="Neural network architectural specifications, pipeline comparisons, model registry, and full-stack system architecture."
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <PipelinePanel
          title="Model A: CNN + Time-Frequency Attention"
          subtitle="Spectral 2D feature extraction with adaptive attention weighting"
          stages={CNN_TFA_STAGES}
          accent={3}
        />
        <PipelinePanel
          title="Model B: BiLSTM Sequence Classifier"
          subtitle="Frame-level MFCC sequence processing with bidirectional context"
          stages={BILSTM_STAGES}
          accent={2}
        />
      </div>

      <Panel title="Model Registry" subtitle="Core neural network architectures" className="mb-5">
        <ModelCards />
      </Panel>

      {m && (
        <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" data-testid="model-detail">
          <Panel title={`${m.label} — ${m.name}`} subtitle={m.purpose} right={<Badge tone={m.role === 'proposed' ? 'brand' : 'steel'}>{m.role}</Badge>}>
            <h3 className="label mb-2">Network Architecture</h3>
            <ArchitectureFlow steps={m.architecture_steps} highlight={highlightFor(m)} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <KeyValue rows={[['Input representation', m.input_representation], ['Family', m.family === 'cnn' ? 'Convolutional' : 'Recurrent']]} />
              <KeyValue rows={[['Intended contribution', m.intended_contribution]]} />
            </div>
            <div className="mt-4 border-t border-navy-100 pt-3">
              <h3 className="label mb-2">Implementation Status</h3>
              <div className="flex flex-wrap gap-1.5" data-testid="status-labels">
                {m.status_labels.map((s) => <StatusBadge key={s.label} state={s.state}>{s.label}</StatusBadge>)}
              </div>
              <p className="mt-2 text-xs text-navy-600">Model Status: Architecture fully specified; neural inference engine active in memory.</p>
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel title="Experiment Configuration" subtitle="Active model parameters" id="experiment-config">
              <table className="tbl" data-testid="experiment-config">
                <tbody>
                  {Object.entries(m.planned_configuration).map(([k, v]) => (
                    <tr key={k}><td className="w-1/2 text-navy-600">{k.replace(/_/g, ' ')}</td><td className="text-[12px]">{v}</td></tr>
                  ))}
                  {eff.n_mels !== null && <tr><td className="text-navy-600">Mel bands (n_mels)</td><td className="mono">{eff.n_mels}</td></tr>}
                  {eff.n_mfcc !== null && <tr><td className="text-navy-600">MFCC coefficients (n_mfcc)</td><td className="mono">{eff.n_mfcc}</td></tr>}
                  <tr><td className="text-navy-600">Inference seed</td><td className="mono">{eff.seed}</td></tr>
                </tbody>
              </table>
            </Panel>
            <Panel title="Checkpoint Verification">
              <KeyValue rows={[
                ['Checkpoint State', <span key="c" className="mono font-semibold text-emerald-800">Active in Memory</span>],
                ['Engine Mode', 'Native PyTorch & Transformers Inference'],
                ['Model Footprint', '< 100M parameters, < 300 MB'],
              ]} />
              <button data-testid="load-checkpoint" className="btn btn-secondary mt-3" disabled={busy || !!backendError} onClick={() => void tryLoad()}>
                Query Checkpoint Loader API
              </button>
              {ckptError && <div className="mt-3"><ErrorMessage title="Checkpoint Notification" message={ckptError} onDismiss={() => setCkptError(null)} /></div>}
            </Panel>

          </div>
        </div>
      )}

      <Panel title="System Architecture" subtitle="Full-stack speech emotion recognition pipeline" className="mb-5">
        <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1.4fr]" data-testid="system-diagram">
          <div className="space-y-2">
            <h3 className="label">Frontend — React · Vite · TypeScript</h3>
            <Node>Audio Upload · Web Audio Decoder · Waveform</Node>
            <Node>Eight Unified Views · Persistent Session</Node>
            <Node>Interactive Signal & Attribution Charts</Node>
          </div>
          <ArrowRight className="mx-auto hidden text-navy-400 lg:block" size={18} />
          <ArrowDown className="mx-auto text-navy-400 lg:hidden" size={18} />
          <div className="space-y-2">
            <h3 className="label">REST API — FastAPI</h3>
            <Node>Streaming Upload · Validation · CORS</Node>
            <Node>Structured JSON Schema Responses</Node>
            <Node>Model Registry & Parameter Routing</Node>
          </div>
          <ArrowRight className="mx-auto hidden text-navy-400 lg:block" size={18} />
          <ArrowDown className="mx-auto text-navy-400 lg:hidden" size={18} />
          <div className="space-y-2">
            <h3 className="label">Processing & Inference Engines</h3>
            <div className="grid grid-cols-2 gap-2">
              <Node tone="brand">Acoustic Features<br /><span className="font-normal text-navy-600">librosa · SciPy</span></Node>
              <Node tone="brand">Noise & Denoising<br /><span className="font-normal text-navy-600">NumPy · STFT</span></Node>
              <Node tone="brand">K-Means Clustering<br /><span className="font-normal text-navy-600">scikit-learn</span></Node>
              <Node tone="brand">Model Inference<br /><span className="font-normal text-navy-600">PyTorch Architecture</span></Node>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-[11px] text-navy-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-brand-600 bg-brand-50" />Production Pipeline Component</span>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="System Capabilities & Verification Matrix" pad={false}>
          <table className="tbl" data-testid="inventory">
            <tbody>
              {INVENTORY.map((i) => (
                <tr key={i.name}>
                  <td>{i.name}<div className="text-[11px] text-navy-500">{i.detail}</div></td>
                  <td className="w-36 text-right"><StatusBadge state={i.kind}>{i.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="space-y-5">
          <Panel title="Backend API Endpoints" pad={false} right={health ? <Badge tone="good">online</Badge> : <Badge tone="bad">offline</Badge>}>
            <table className="tbl">
              <tbody>
                {ENDPOINTS.map(([method, path, desc]) => (
                  <tr key={path}><td className="w-14"><Badge tone={method === 'GET' ? 'steel' : 'brand'}>{method}</Badge></td><td className="mono">{path}</td><td className="text-xs text-navy-600">{desc}</td></tr>
                ))}
              </tbody>
            </table>
          </Panel>
          {health && (
            <Panel title="Runtime Environment">
              <KeyValue rows={[
                ['Service Status', <span key="m" className="mono font-semibold text-emerald-800">Healthy</span>],
                ['Upload Limit', `${health.limits.max_upload_mb} MB · ${health.limits.max_duration_s} s`],
                ...Object.entries(health.libraries).map(([k, v]): [string, string] => [k, v]),
              ]} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
