import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AudioWaveform, RotateCcw, Server, Globe, Check, X } from 'lucide-react'
import { NAV_ITEMS } from '../nav'
import { useSession } from '../state/session'
import { formatBytes, formatDuration } from '../utils/format'
import { DEMO_BANNER } from '../types'
import { ErrorMessage } from './ui'

export default function Layout() {
  const { state, selectedModel, health, backendError, refreshBackend, resetSession, file } = useSession()
  const a = state.audio
  const noiseLabel = state.noiseCondition === 'clean' ? 'Clean' : state.noiseCondition.replace('snr_', '').replace('db', ' dB SNR').replace('denoised', 'Denoised')
  
  const [showServerModal, setShowServerModal] = useState(false)
  const [serverUrl, setServerUrl] = useState(() => {
    return localStorage.getItem('RESONANCE_API_BASE') || (typeof window !== 'undefined' && window.location.hostname.includes('hf.space') ? 'https://resonanceai-pk9z.onrender.com/api' : '/api')
  })

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
              <button
                type="button"
                onClick={() => setShowServerModal(true)}
                className="inline-flex items-center gap-1.5 rounded border border-navy-200 bg-white px-2.5 py-1 text-[11px] font-medium text-navy-800 shadow-2xs hover:border-brand-400 hover:text-brand-900 transition-colors"
                title="Configure Backend Connection URL (Local, Tunnel, or Cloud)"
              >
                <Server size={12} className={health ? "text-emerald-600" : "text-amber-500"} />
                <span>{health ? `AI Backend: Online` : `AI Backend: Offline`}</span>
                <span className="text-[10px] text-navy-400">(Change URL)</span>
              </button>
              <button className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-950" onClick={resetSession} title="Clear all session data">
                <RotateCcw size={12} /> Reset session
              </button>
            </span>
          </div>
        </div>

        {/* Backend Connection Modal */}
        {showServerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl border border-navy-200 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-navy-100">
                <div className="flex items-center gap-2">
                  <Globe className="text-brand-700" size={18} />
                  <h3 className="text-sm font-semibold text-navy-950">AI Backend Connection</h3>
                </div>
                <button
                  onClick={() => setShowServerModal(false)}
                  className="rounded p-1 text-navy-400 hover:bg-navy-100 hover:text-navy-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <p className="text-navy-600">
                  Connect this online UI to your local machine (via free Cloudflare tunnel), a Colab GPU instance, or Render cloud:
                </p>

                <div>
                  <label className="block font-medium text-navy-800 mb-1">Backend API URL:</label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://xxxx.trycloudflare.com/api"
                    className="w-full rounded border border-navy-300 px-3 py-2 font-mono text-xs text-navy-950 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="font-medium text-navy-700">Quick presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setServerUrl("http://127.0.0.1:8000/api")}
                      className="rounded border border-navy-200 bg-navy-50 px-2.5 py-1 text-[11px] text-navy-700 hover:bg-navy-100"
                    >
                      🖥️ Local PC (127.0.0.1:8000)
                    </button>
                    <button
                      type="button"
                      onClick={() => setServerUrl("https://resonanceai-pk9z.onrender.com/api")}
                      className="rounded border border-navy-200 bg-navy-50 px-2.5 py-1 text-[11px] text-navy-700 hover:bg-navy-100"
                    >
                      ☁️ Render Cloud
                    </button>
                    <button
                      type="button"
                      onClick={() => setServerUrl("/api")}
                      className="rounded border border-navy-200 bg-navy-50 px-2.5 py-1 text-[11px] text-navy-700 hover:bg-navy-100"
                    >
                      🔗 Same Origin (/api)
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-navy-50 p-3 text-[11px] text-navy-600 border border-navy-100">
                  💡 <strong>Run models locally:</strong> Run <code className="bg-white px-1 py-0.5 rounded border border-navy-200 font-mono">start_public_hybrid.bat</code> on your PC. It prints a free Cloudflare HTTPS tunnel URL. Paste it here to run all 5 models directly from your own PC hardware!
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-navy-100">
                  <button
                    type="button"
                    onClick={() => setShowServerModal(false)}
                    className="rounded border border-navy-300 px-3 py-1.5 font-medium text-navy-700 hover:bg-navy-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('RESONANCE_API_BASE', serverUrl.trim())
                      setShowServerModal(false)
                      window.location.reload()
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand-700 px-4 py-1.5 font-medium text-white hover:bg-brand-800 shadow-2xs"
                  >
                    <Check size={13} /> Save & Connect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
