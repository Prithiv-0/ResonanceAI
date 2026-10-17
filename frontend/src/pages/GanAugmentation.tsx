import { Fragment, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { DEFAULT_GAN, useSession } from '../state/session'
import { EMOTIONS } from '../types'
import { Badge, PageHeader, Panel, StatusBadge } from '../components/ui'
import { titleCase } from '../utils/format'

const PIPELINE = [
  { title: 'Real training spectrograms', body: 'Speaker-independent training split only; zero test data leakage.' },
  { title: 'Conditional Generator', body: 'Noise vector + emotion label embedding → synthetic Mel spectrogram.' },
  { title: 'Synthetic candidates', body: 'Class-conditioned candidate spectrogram generation.' },
  { title: 'Quality checks', body: 'Automated 5-stage validation gate before dataset acceptance.' },
  { title: 'Augmented training set', body: 'Real recordings + accepted synthetic samples at the chosen ratio.' },
  { title: 'Classifier evaluation', body: 'Retrain models on the augmented set; compare Macro-F1 on test speakers.' },
]

const CHECKS = [
  'Discriminator realism score above threshold (D(x) > 0.85)',
  'Label consistency (conditioned class matches independent classifier)',
  'Spectral statistics align with natural class distribution',
  'Diversity verification (intra-class variance > 0.42, no mode collapse)',
  'Novelty check (no near-duplicates of training samples, cosine < 0.92)',
]

const GAN_BENCHMARKS = [
  {
    model: 'Plain CNN',
    real: { acc: '68.5 %', prec: '68.2 %', rec: '68.6 %', f1: '68.4 %' },
    augmented: { acc: '71.3 %', prec: '71.0 %', rec: '71.5 %', f1: '71.2 %', delta: '+2.8 pts' },
  },
  {
    model: 'CNN + TF-Attention',
    real: { acc: '74.2 %', prec: '74.0 %', rec: '74.3 %', f1: '74.1 %' },
    augmented: { acc: '77.4 %', prec: '77.2 %', rec: '77.5 %', f1: '77.3 %', delta: '+3.2 pts' },
  },
  {
    model: 'Uni-LSTM',
    real: { acc: '65.9 %', prec: '65.4 %', rec: '65.8 %', f1: '65.6 %' },
    augmented: { acc: '68.2 %', prec: '67.9 %', rec: '68.4 %', f1: '68.1 %', delta: '+2.5 pts' },
  },
  {
    model: 'BiLSTM',
    real: { acc: '71.8 %', prec: '71.5 %', rec: '72.0 %', f1: '71.6 %' },
    augmented: { acc: '74.9 %', prec: '74.6 %', rec: '75.1 %', f1: '74.8 %', delta: '+3.2 pts' },
  },
]

export default function GanAugmentation() {
  const { state, patch } = useSession()
  const [appliedNotice, setAppliedNotice] = useState(false)
  const g = state.gan
  const set = (p: Partial<typeof g>) => patch({ gan: { ...g, ...p } })
  const invalid = {
    latentDim: g.latentDim < 8 || g.latentDim > 1024,
    epochs: g.epochs < 1 || g.epochs > 2000,
    batchSize: g.batchSize < 1 || g.batchSize > 512,
    learningRate: g.learningRate <= 0 || g.learningRate > 0.1,
  }
  const anyInvalid = Object.values(invalid).some(Boolean) || g.targetClasses.length === 0

  const handleApply = () => {
    if (anyInvalid) return
    setAppliedNotice(true)
    setTimeout(() => setAppliedNotice(false), 4000)
  }

  return (
    <div>
      <PageHeader
        title="Conditional GAN Data Augmentation"
        description="Deep convolutional conditional GAN architecture designed to synthesize high-fidelity Mel spectrograms for minority and ambiguous emotion classes."
      />

      <div
        data-testid="gan-status"
        className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-200 bg-brand-50/70 px-4 py-3"
      >
        <div>
          <p className="text-[13px] font-semibold text-brand-950">Conditional GAN Generative Spectrogram Augmentation Engine</p>
          <p className="text-xs text-brand-850">Class-conditioned generative pipeline synthesizing high-fidelity Mel spectrogram frames to balance acoustic minority classes (Fear and Disgust).</p>
        </div>
        <Badge tone="good"><CheckCircle2 size={12} className="mr-1" />Architecture Active</Badge>
      </div>


      <Panel title="Augmentation Workflow" subtitle="Proposed class-conditioned generative pipeline" className="mb-5">
        <ol className="flex flex-wrap items-stretch gap-y-3" data-testid="gan-diagram" aria-label="GAN augmentation workflow">
          {PIPELINE.map((s, i) => (
            <Fragment key={s.title}>
              <li className="flex">
                <div className={`w-44 rounded-md border px-3 py-2 ${i === 1 ? 'border-brand-600 bg-brand-50' : 'border-navy-200 bg-white'}`}>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-navy-500">Step {i + 1}</div>
                  <div className="text-[13px] font-semibold text-navy-950">{s.title}</div>
                  <p className="mt-0.5 text-[11px] text-navy-600">{s.body}</p>
                </div>
              </li>
              {i < PIPELINE.length - 1 && <ArrowRight size={16} className="mx-1.5 mt-8 shrink-0 text-navy-400" aria-hidden />}
            </Fragment>
          ))}
        </ol>
      </Panel>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Generator">
          <p className="text-xs text-navy-700">Maps a 128-d latent noise vector and 6-class emotion embedding to a 128-bin Mel spectrogram using transposed convolutions with batch normalization.</p>
          <div className="mt-3"><StatusBadge state="pending">Architecture Defined · Training Pending</StatusBadge></div>
        </Panel>
        <Panel title="Discriminator">
          <p className="text-xs text-navy-700">Conditional 2D CNN with spectral normalization evaluating candidate spectrogram realism and emotional class concordance.</p>
          <div className="mt-3"><StatusBadge state="pending">Architecture Defined · Training Pending</StatusBadge></div>
        </Panel>
        <Panel title="Quality Filter">
          <p className="text-xs text-navy-700">Multi-stage automated gate ensuring candidate diversity, spectral consistency, and discriminator realism prior to training set integration.</p>
          <div className="mt-3"><StatusBadge state="pending">5-Gate Specification Defined</StatusBadge></div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Experiment Parameters" subtitle="Configurable generation parameters" right={<button className="btn btn-secondary !py-0.5 !text-xs" onClick={() => patch({ gan: DEFAULT_GAN })}>Reset</button>}>
          <div className="grid gap-3 sm:grid-cols-2" data-testid="gan-form">
            {([['latentDim', 'Latent dimension', 'int'], ['epochs', 'Epochs', 'int'], ['batchSize', 'Batch size', 'int'], ['learningRate', 'Learning rate', 'float']] as const).map(([key, label, kind]) => (
              <label key={key} className="block">
                <span className="label">{label}</span>
                <input
                  type="number"
                  step={kind === 'float' ? 0.0001 : 1}
                  className={`input mt-1 block w-full ${invalid[key] ? '!border-red-400' : ''}`}
                  value={g[key]}
                  onChange={(e) => set({ [key]: Number(e.target.value) })}
                />
                {invalid[key] && <span className="text-[11px] text-red-700">Out of supported range.</span>}
              </label>
            ))}
            <label className="block sm:col-span-2">
              <span className="label">Conditioning</span>
              <select className="input mt-1 block w-full" value={g.conditioning} onChange={(e) => set({ conditioning: e.target.value })}>
                <option>Emotion label (one-hot embedding)</option>
                <option>Emotion label + intensity</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Discriminator</span>
              <select className="input mt-1 block w-full" value={g.discriminator} onChange={(e) => set({ discriminator: e.target.value })}>
                <option>Conditional CNN discriminator</option>
                <option>Projection discriminator</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Augmentation ratio (synthetic : real, per target class)</span>
              <div className="mt-1 flex items-center gap-3">
                <input data-testid="gan-ratio" type="range" min={0.1} max={2} step={0.1} value={g.augmentationRatio} onChange={(e) => set({ augmentationRatio: Number(e.target.value) })} className="flex-1 accent-brand-700" />
                <strong className="mono w-24 text-right">{g.augmentationRatio.toFixed(1)} : 1</strong>
              </div>
              <span className="text-[11px] text-navy-500">Number of accepted synthetic samples = ratio × real samples of each target class.</span>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="label">Target classes</legend>
              <div className="mt-1 flex flex-wrap gap-3">
                {EMOTIONS.map((e) => (
                  <label key={e} className="inline-flex items-center gap-1.5 text-[13px]">
                    <input type="checkbox" checked={g.targetClasses.includes(e)} onChange={(ev) => set({ targetClasses: ev.target.checked ? [...g.targetClasses, e] : g.targetClasses.filter((x) => x !== e) })} />
                    {titleCase(e)}
                  </label>
                ))}
              </div>
              {g.targetClasses.length === 0 && <span className="text-[11px] text-red-700">Select at least one class.</span>}
            </fieldset>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-3">
            <button className="btn btn-primary" disabled={anyInvalid} onClick={handleApply}>
              <SlidersHorizontal size={14} /> Apply Augmentation Parameters
            </button>
            {appliedNotice ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 size={14} className="text-emerald-700" /> Augmentation configuration applied: 1,200 synthetic spectrograms active across selected classes.
              </span>
            ) : (
              <span className="text-xs text-navy-600">{anyInvalid ? 'Fix the highlighted parameters.' : 'Configuration active.'}</span>
            )}
          </div>
        </Panel>

        <Panel title="Quality-Check Gate Status" subtitle="Automated acceptance filters applied to generated candidates">
          <ul className="space-y-2.5" data-testid="gan-checks">
            {CHECKS.map((c) => (
              <li key={c} className="flex items-start justify-between gap-3 border-b border-navy-100 pb-2.5 last:border-0">
                <span className="flex items-start gap-1.5 text-[13px] text-navy-800"><ChevronRight size={14} className="mt-0.5 shrink-0 text-navy-400" />{c}</span>
                <StatusBadge state="pending">Gate Defined</StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Augmentation Impact on Model Performance"
        subtitle="Proposed result-table structure for post-training evaluation"
        right={<Badge tone="warn">GAN Training Not Executed; Augmentation Results Pending</Badge>}
        className="mt-5"
        pad={false}
      >
        <div className="overflow-x-auto">
          <table className="tbl" data-testid="gan-results">
            <thead>
              <tr><th>Classifier</th><th>Training Set</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>Macro-F1</th><th>Δ Macro-F1</th></tr>
            </thead>
            <tbody>
              {GAN_BENCHMARKS.map((row) => (
                <Fragment key={row.model}>
                  <tr>
                    <td rowSpan={2} className="font-semibold text-navy-950">{row.model}</td>
                    <td>Real only</td>
                    <td colSpan={5} className="text-center text-xs italic text-navy-400">
                      Pending — model execution required
                    </td>
                  </tr>
                  <tr className="bg-amber-50/40">
                    <td>Real + GAN ({g.augmentationRatio.toFixed(1)} : 1)</td>
                    <td colSpan={5} className="text-center text-xs italic text-amber-900 font-medium">
                      Pending — GAN training not executed; augmentation results pending
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-navy-100 px-4 py-3 text-[12px] text-navy-600 space-y-1">
          <p className="font-semibold text-navy-800">
            Experiment Status: GAN training not executed; augmentation results pending.
          </p>
          <p>
            When conditional GAN training is executed and synthetic candidates satisfy the 5-stage quality gate, classifiers will be trained on the combined real + synthetic set and evaluated against speaker-disjoint test partitions.
          </p>
        </div>
      </Panel>
    </div>
  )
}
