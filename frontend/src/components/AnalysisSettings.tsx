import { Link } from 'react-router-dom'
import { useSession } from '../state/session'
import { Panel } from './ui'

export function AnalysisSettings({ inline }: { inline?: boolean }) {
  const { selectedModel, effectiveSettings, state, patch } = useSession()
  if (!selectedModel) return null
  const t = selectedModel.tunable_inputs
  const set = (p: Partial<typeof state.settings>) => patch({ settings: { ...state.settings, ...p } })
  return (
    <div className={inline ? 'flex flex-wrap items-end gap-3' : 'grid gap-3 sm:grid-cols-3'}>
      {t.n_mels && (
        <label className="block">
          <span className="label">Mel bands</span>
          <select
            id="setting-n-mels"
            className="input mt-1 block w-full"
            value={effectiveSettings.n_mels ?? ''}
            onChange={(e) => set({ n_mels: Number(e.target.value) })}
          >
            {t.n_mels.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      )}
      {t.n_mfcc && (
        <label className="block">
          <span className="label">MFCC coefficients</span>
          <select
            id="setting-n-mfcc"
            className="input mt-1 block w-full"
            value={effectiveSettings.n_mfcc ?? ''}
            onChange={(e) => set({ n_mfcc: Number(e.target.value) })}
          >
            {t.n_mfcc.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      )}
      <label className="block">
        <span className="label">Inference seed</span>
        <input
          id="setting-seed"
          type="number"
          className="input mt-1 block w-full"
          value={state.settings.seed}
          min={0}
          max={999999}
          onChange={(e) => set({ seed: Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0))) })}
        />
      </label>
    </div>
  )
}

/** Shown on pages that need an uploaded recording. */
export function NeedAudio({ what }: { what: string }) {
  return (
    <Panel>
      <div className="py-6 text-center" data-testid="need-audio">
        <p className="text-[14px] font-medium text-navy-900">No audio file is loaded.</p>
        <p className="mt-1 text-xs text-navy-600">
          {what} operates on the recording selected in the session. Load one (or generate a synthetic test signal) on the{' '}
          <Link to="/" className="font-medium text-brand-700 underline">Audio Analysis</Link> page.
        </p>
      </div>
    </Panel>
  )
}
