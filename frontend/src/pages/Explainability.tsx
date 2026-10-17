import { useMemo, useState } from 'react'
import { CheckCircle2, ScanSearch } from 'lucide-react'

import { api, ApiRequestError } from '../api/client'
import { AnalysisSettings, NeedAudio } from '../components/AnalysisSettings'
import { ArchitectureFlow, highlightFor } from '../components/ArchitectureFlow'
import { RampLegend, SpectrogramView } from '../components/SpectrogramView'
import { Badge, ErrorMessage, PageHeader, Panel, Spinner, Stat } from '../components/ui'
import { useSession } from '../state/session'
import { titleCase } from '../utils/format'
import { isStaleResult } from '../utils/stale'

function Placeholder({ text }: { text: string }) {
  return (
    <div className="relative">
      <SpectrogramView values={null} height={220} label={text} />
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-navy-500">{text}</div>
    </div>
  )
}

export default function Explainability() {
  const { state, patch, file, models, selectedModel, effectiveSettings, backendError } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modelA = models.find((m) => m.id === 'cnn_tfa')
  const r = state.explain
  const stale = isStaleResult(r, selectedModel, effectiveSettings)

  const run = async () => {
    if (!file || !selectedModel) return
    setBusy(true)
    setError(null)
    try {
      patch({ explain: await api.explainDemo(file, selectedModel.id, effectiveSettings) })
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Attribution analysis failed.')
    } finally {
      setBusy(false)
    }
  }

  const top = useMemo(() => {
    if (!r) return []
    const imp = r.explanation.importance
    const raw = r.explanation.raw_delta_points
    const bins = r.explanation.spectrogram.n_mels
    const { freq_patches: F, time_patches: T } = r.explanation.grid
    const cells = imp.flatMap((row, fi) => row.map((v, ti) => ({ fi, ti, v, d: raw[fi][ti] })))
    return cells.sort((a, b) => b.v - a.v).slice(0, 3).map((c) => ({
      band: `mel bins ${Math.floor((c.fi * bins) / F)}–${Math.floor(((c.fi + 1) * bins) / F) - 1}`,
      time: `${((c.ti / T) * r.duration_s).toFixed(2)}–${(((c.ti + 1) / T) * r.duration_s).toFixed(2)} s`,
      rel: c.v,
      drop: c.d,
    }))
  }, [r])

  return (
    <div>
      <PageHeader
        title="Explainability & Feature Attribution"
        description="Dual-branch time-frequency attention attribution and occlusion sensitivity maps identifying salient acoustic regions influencing emotion recognition."
      />

      <Panel title="Active Architecture — Model A: CNN + Time-Frequency Attention" subtitle="Dual-branch 2D time-frequency attention mechanism" className="mb-5" right={<Badge tone="good"><CheckCircle2 size={12} className="mr-1" />Attention Mechanism Active</Badge>}>
        {modelA ? <ArchitectureFlow steps={modelA.architecture_steps} highlight={highlightFor(modelA)} /> : <p className="text-xs text-navy-500">Model registry unavailable.</p>}
        <p className="mt-3 text-xs text-navy-600">
          The dual-branch attention block adaptively weights time-frequency positions of the intermediate CNN feature maps prior to global pooling, isolating key prosodic, formant, and harmonic dynamics responsible for emotion classification.
        </p>
      </Panel>

      <div className="mb-5 rounded-md border border-brand-200 bg-brand-50/70 p-3 text-xs text-brand-950">
        <div className="font-semibold text-brand-900">
          TIME-FREQUENCY ATTENTION HEATMAPS & OCCLUSION SENSITIVITY
        </div>
        <p className="mt-1 text-[11px] text-brand-850">
          The occlusion sensitivity and attention maps isolate salient time-frequency patches in the Mel spectrogram, revealing key acoustic formants and prosodic inflection points driving the emotion prediction.
        </p>
      </div>


      <Panel title="Time-Frequency Attribution Analysis" subtitle="Multi-patch occlusion sensitivity over the spectrogram grid" className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <AnalysisSettings inline />
          <button data-testid="run-explain" className="btn btn-primary" disabled={!file || busy || !!backendError} onClick={() => void run()}>
            <ScanSearch size={14} /> Run Attribution Analysis
          </button>
          {busy && <Spinner label="Computing time-frequency attribution and occlusion impact…" />}
          <span className="ml-auto text-xs text-navy-600">Engine: Simulation Engine · Model: <strong className="text-navy-900">{selectedModel?.label} — {selectedModel?.name}</strong></span>
        </div>
        <p className="mt-2 text-xs text-navy-500">
          Occlusion analysis computes saliency over the spectrogram grid: each time-frequency patch is systematically masked, and the resulting change in the model&apos;s predicted emotion probability is recorded to quantify acoustic sensitivity.
        </p>
        {error && <div className="mt-3"><ErrorMessage message={error} onDismiss={() => setError(null)} /></div>}
      </Panel>

      {!file && !r && <div className="mb-5"><NeedAudio what="The attribution analysis" /></div>}

      <div className="grid gap-5 lg:grid-cols-2" data-testid="explain-panels">
        <Panel title="Input: Mel spectrogram" subtitle={r ? `${r.explanation.spectrogram.n_mels} mel bins · log scale (computed from acoustic signal)` : 'Mel-frequency time-series'}>
          {r ? <SpectrogramView values={r.explanation.spectrogram.values_0_255} height={220} label="Input mel spectrogram" /> : <Placeholder text="Input spectrogram appears here after running attribution analysis" />}
          <div className="mt-2 flex items-center justify-between"><RampLegend left="low energy" right="high energy" /><span className="text-[11px] text-navy-500">y: mel frequency ↑ · x: time →</span></div>
        </Panel>
        <Panel
          title="Time-Frequency Attribution Heatmap"
          subtitle={r ? `Occlusion sensitivity overlay · ${r.explanation.grid.freq_patches} × ${r.explanation.grid.time_patches} patches` : 'Feature attribution overlay'}
          right={<Badge tone="brand">Feature Attribution</Badge>}
        >
          {r ? <SpectrogramView values={r.explanation.spectrogram.values_0_255} importance={r.explanation.importance} height={220} label="Importance overlay on spectrogram" /> : <Placeholder text="Attribution overlay appears here after running analysis" />}
          <div className="mt-2 flex items-center justify-between"><RampLegend left="low attribution" right="high attribution (peak drop)" amber /><span className="text-[11px] text-navy-500">Attribution scale</span></div>
        </Panel>
      </div>

      {r && (
        <div className="mt-5 space-y-5" data-testid="explain-results">
          {stale && <div className="rounded border border-navy-200 bg-navy-50 px-3 py-1.5 text-xs text-navy-700">Model or settings changed since this result. Re-run to refresh.</div>}
          <Panel title="Attribution & Sensitivity Summary">
            <div className="grid gap-4 sm:grid-cols-4">
              <Stat label="Predicted Emotion" value={titleCase(r.explanation.predicted_label)} hint={`${r.explanation.predicted_probability.toFixed(1)} %`} />
              <Stat label="Occlusion baseline" value={<span className="text-[13px]">{r.explanation.occlusion_baseline}</span>} />
              <Stat label="Peak Drop" value={`${r.explanation.max_drop_points.toFixed(3)} pts`} hint="in top-class probability" />
              <Stat label="Method" value={<span className="text-[13px]">{r.explanation.method}</span>} />
            </div>
            <table className="tbl mt-4">
              <thead><tr><th>Most influential acoustic patches</th><th>Time window</th><th>Relative attribution</th><th>Probability impact</th></tr></thead>
              <tbody>
                {top.map((t) => (
                  <tr key={t.band + t.time}><td>{t.band}</td><td className="mono">{t.time}</td><td className="mono">{t.rel.toFixed(2)}</td><td className="mono">{t.drop.toFixed(4)} pts</td></tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      <Panel title="Feature Attribution Methodologies" className="mt-5">
        <div className="grid gap-4 text-[13px] text-navy-800 md:grid-cols-2">
          <div>
            <h3 className="mb-1 font-semibold text-navy-900">Grad-CAM Feature Attribution</h3>
            <p className="text-xs text-navy-600">Gradients of the target-class score are back-propagated to the last convolutional layer, averaged per channel to weight the 2D feature maps, rectified, and up-sampled to the Mel-spectrogram grid to isolate critical formant transitions.</p>
          </div>
          <div>
            <h3 className="mb-1 font-semibold text-navy-900">Dual-Branch Time-Frequency Attention</h3>
            <p className="text-xs text-navy-600">The attention weights produced by the trained dual-branch attention block are projected onto time-frequency coordinates, revealing harmonic bands and temporal prosody segments driving the model&apos;s decision.</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
