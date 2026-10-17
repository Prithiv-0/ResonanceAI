import { NavLink, Outlet } from 'react-router-dom'
import { AudioWaveform, RotateCcw } from 'lucide-react'
import { NAV_ITEMS } from '../nav'
import { useSession } from '../state/session'
import { formatBytes, formatDuration } from '../utils/format'
import { DEMO_BANNER } from '../types'
import { Badge, ErrorMessage } from './ui'

export default function Layout() {
  const { state, selectedModel, health, backendError, refreshBackend, resetSession, file } = useSession()
  const a = state.audio
  const noiseLabel = state.noiseCondition === 'clean' ? 'Clean' : state.noiseCondition.replace('snr_', '').replace('db', ' dB SNR').replace('denoised', 'Denoised')

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-navy-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-5">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 py-3 text-navy-950" aria-label="Resonance home">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-700 text-white">
              <AudioWaveform size={16} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Resonance</span>
          </NavLink>
          <nav aria-label="Primary" className="-mb-px flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                data-nav-item={item.path}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-3 py-3.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'border-brand-700 text-brand-800'
                      : 'border-transparent text-navy-600 hover:border-navy-200 hover:text-navy-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div role="status" data-testid="demo-banner" className="border-t border-navy-100 bg-navy-50/70">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-5 py-1">
            <span className="text-[11px] font-semibold tracking-wide text-brand-900">{DEMO_BANNER}</span>
            <span className="hidden text-[11px] text-navy-600 md:inline">
              Dual-Branch Architecture: Spectral CNN (Mel Spectrogram) · Temporal BiLSTM (MFCC Sequence)
            </span>
          </div>
        </div>

        <div className="border-t border-navy-100 bg-navy-50">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-1 px-5 py-1.5 text-xs text-navy-700" data-testid="session-bar">
            <span>
              <span className="text-navy-500">Audio: </span>
              {a ? (
                <strong className="font-medium">
                  {a.name} · {formatDuration(a.durationS)} · {formatBytes(a.size)}
                  {!file && <span className="ml-1 font-normal text-amber-800">(re-select file to run analyses)</span>}
                </strong>
              ) : (
                <em className="text-navy-500">none loaded</em>
              )}
            </span>
            <span>
              <span className="text-navy-500">Model: </span>
              <strong className="font-medium">{selectedModel ? `${selectedModel.label} — ${selectedModel.short_name}` : '—'}</strong>
            </span>
            <span>
              <span className="text-navy-500">Noise condition: </span>
              <strong className="font-medium">{noiseLabel}</strong>
            </span>
            <span className="ml-auto flex items-center gap-3">
              {health ? <Badge tone="good">Backend online · v{health.version}</Badge> : <Badge tone="bad">Backend offline</Badge>}
              <button className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-950" onClick={resetSession} title="Clear all session data">
                <RotateCcw size={12} /> Reset session
              </button>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-6">
        {backendError && (
          <div className="mb-4">
            <ErrorMessage
              title="Backend unavailable"
              message={`${backendError} Analyses, noise injection, K-Means and tests need the backend.`}
              onDismiss={() => void refreshBackend()}
            />
          </div>
        )}
        <Outlet />
      </main>
      <footer className="border-t border-navy-100 py-4 text-center text-[11px] text-navy-500">
        Resonance — Unified Speech Emotion Recognition · Neural Networks & Deep Learning · RAVDESS & CREMA-D Benchmark
      </footer>
    </div>
  )
}
