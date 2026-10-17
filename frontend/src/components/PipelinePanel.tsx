import { ArrowRight, ArrowDown } from 'lucide-react'
import { EMOTIONS } from '../types'
import { titleCase } from '../utils/format'
import { Panel } from './ui'

export interface Stage {
  title: string
  caption: string
}

export const CNN_TFA_STAGES: Stage[] = [
  { title: 'Input Audio', caption: 'Waveform' },
  { title: 'Mel Spectrogram', caption: 'Time-frequency input' },
  { title: 'CNN Feature Extraction', caption: 'Convolutional blocks' },
  { title: 'Time-Frequency Attention', caption: 'Re-weights time and frequency' },
  { title: 'Classification Head', caption: 'Pooling and dense layers' },
]

export const BILSTM_STAGES: Stage[] = [
  { title: 'Input Audio', caption: 'Waveform' },
  { title: 'MFCC Feature Sequence', caption: 'Frame-wise coefficients' },
  { title: 'BiLSTM Sequence Processing', caption: 'Forward and backward context' },
  { title: 'Classification Head', caption: 'Dense layers' },
]

/** One architecture panel. Both models use this exact layout so the panels match. */
export function PipelinePanel({ title, subtitle, stages, accent }: { title: string; subtitle: string; stages: Stage[]; accent?: number }) {
  const all = [...stages, { title: 'Six Emotion Classes', caption: 'Output' }]
  return (
    <Panel title={title} subtitle={subtitle} className="h-full" >
      <ol className="flex flex-col gap-1.5" aria-label={`${title} pipeline`} data-testid="pipeline">
        {all.map((s, i) => {
          const last = i === all.length - 1
          const hi = i === accent
          return (
            <li key={s.title} className="flex flex-col items-stretch">
              <div className={`flex items-center gap-3 rounded-md border px-3 py-2 ${hi ? 'border-brand-600 bg-brand-50' : last ? 'border-navy-300 bg-navy-50' : 'border-navy-200 bg-white'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${hi ? 'bg-brand-700 text-white' : 'bg-navy-100 text-navy-700'}`}>{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-navy-950">{s.title}</div>
                  <div className="text-[11px] text-navy-500">{s.caption}</div>
                </div>
              </div>
              {last ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {EMOTIONS.map((e) => <span key={e} className="rounded border border-navy-200 bg-white px-1.5 py-0.5 text-[11px] text-navy-700">{titleCase(e)}</span>)}
                </div>
              ) : (
                <ArrowDown size={14} className="mx-auto mt-1.5 text-navy-400" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

/** Same pipelines laid out horizontally for wide, short slots. */
export function PipelineRow({ stages }: { stages: Stage[] }) {
  const all = [...stages, { title: 'Six Emotion Classes', caption: 'Output' }]
  return (
    <ol className="flex flex-wrap items-stretch gap-y-2">
      {all.map((s, i) => (
        <li key={s.title} className="flex items-center">
          <div className="rounded-md border border-navy-200 bg-white px-2.5 py-1.5">
            <div className="text-[12px] font-semibold text-navy-950">{s.title}</div>
            <div className="text-[10px] text-navy-500">{s.caption}</div>
          </div>
          {i < all.length - 1 && <ArrowRight size={14} className="mx-1.5 shrink-0 text-navy-400" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}
