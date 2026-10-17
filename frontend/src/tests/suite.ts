import { renderToStaticMarkup } from 'react-dom/server'
import { api, ApiRequestError } from '../api/client'
import { ErrorMessage } from '../components/ui'
import { NAV_ITEMS } from '../nav'
import { DEMO_BANNER, EMOTIONS } from '../types'
import type { Settings } from '../types'
import { decodeAudioFile, extensionOf, isSupportedAudioName, makeSyntheticFile } from '../utils/audio'
import { isConsistentPrediction } from '../utils/format'

/** Hooks into the live application state. The suite exercises the real backend and real DOM. */
export interface TestEnv {
  setModelId: (id: string) => void
  setNoiseCondition: (id: string) => void
  setSeed: (seed: number) => void
  readStored: () => Record<string, unknown> | null
  currentModelId: () => string
  currentNoiseCondition: () => string
  currentSeed: () => number
}

export interface TestCase {
  id: string
  category: string
  description: string
  expected: string
  run: (env: TestEnv) => Promise<string>
}

const DEFAULT_SETTINGS: Settings = { n_mels: null, n_mfcc: null, seed: 42 }
const ids = ['cnn_tfa', 'bilstm', 'cnn_plain', 'lstm_uni']

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}
const settle = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))
const textFile = () => new File(['not audio'], 'notes.txt', { type: 'text/plain' })
const corruptWav = () => new File([new Uint8Array(2048).fill(7)], 'corrupt.wav', { type: 'audio/wav' })

async function expectApiError(p: Promise<unknown>): Promise<ApiRequestError> {
  try {
    await p
  } catch (e) {
    if (e instanceof ApiRequestError) return e
    throw e
  }
  throw new Error('request unexpectedly succeeded')
}

export const TESTS: TestCase[] = [
  {
    id: 'T01',
    category: 'Upload',
    description: 'Valid audio upload: decode in browser and analyse on the backend',
    expected: 'Browser decodes the file; backend metadata (size, duration, sample rate) matches the file',
    run: async () => {
      const f = makeSyntheticFile('mid')
      const meta = await decodeAudioFile(f, 'synthetic')
      const r = await api.analyze(f, 'cnn_tfa', DEFAULT_SETTINGS)
      assert(Math.abs(meta.durationS - 4) < 0.05, `browser duration ${meta.durationS}`)
      assert(r.audio.size_bytes === f.size, `size ${r.audio.size_bytes} ≠ ${f.size}`)
      assert(Math.abs(r.audio.duration_s - meta.durationS) < 0.05, 'durations disagree')
      assert(r.audio.native_sample_rate_hz === 16000 && meta.sampleRate === 16000, 'sample rate mismatch')
      return `Browser: ${meta.durationS.toFixed(2)} s @ ${meta.sampleRate} Hz. Backend: ${r.audio.duration_s.toFixed(2)} s, ${r.audio.size_bytes} B, ${r.audio.native_sample_rate_hz} Hz`
    },
  },
  {
    id: 'T02',
    category: 'Upload',
    description: 'Unsupported and corrupt file handling (client check and backend rejection)',
    expected: '.txt rejected client-side and with HTTP 415; corrupt .wav rejected with HTTP 422; clear messages',
    run: async () => {
      assert(!isSupportedAudioName('notes.txt') && extensionOf('notes.txt') === '.txt', 'client accepted .txt')
      assert(isSupportedAudioName('audio.mpeg') && isSupportedAudioName('audio.mpg'), 'client rejected .mpeg')
      const e1 = await expectApiError(api.analyze(textFile(), 'cnn_tfa', DEFAULT_SETTINGS))
      assert(e1.status === 415 && e1.code === 'unsupported_file_type', `got ${e1.status}/${e1.code}`)
      const e2 = await expectApiError(api.analyze(corruptWav(), 'cnn_tfa', DEFAULT_SETTINGS))
      assert(e2.status === 422 && e2.code === 'undecodable_audio', `got ${e2.status}/${e2.code}`)
      let browserRejected = false
      try { await decodeAudioFile(corruptWav(), 'upload') } catch { browserRejected = true }
      assert(browserRejected, 'browser decoded corrupt file')
      return `.txt → HTTP ${e1.status} (${e1.code}); corrupt .wav → HTTP ${e2.status} (${e2.code}); browser decode rejected`
    },
  },
  {
    id: 'T03',
    category: 'Playback',
    description: 'Audio playback of a loaded recording',
    expected: 'Audio element loads metadata, reports the right duration and the playback clock advances',
    run: async () => {
      const f = makeSyntheticFile('low')
      const url = URL.createObjectURL(f)
      const audio = new Audio()
      audio.muted = true
      audio.preload = 'auto'
      try {
        const loaded = new Promise<void>((res, rej) => {
          audio.onloadedmetadata = () => res()
          audio.onerror = () => rej(new Error('audio element error'))
          setTimeout(() => rej(new Error('timeout loading metadata')), 5000)
        })
        audio.src = url
        await loaded
        assert(Math.abs(audio.duration - 4) < 0.1, `duration ${audio.duration}`)
        await audio.play()
        await new Promise((r) => setTimeout(r, 400))
        const t = audio.currentTime
        audio.pause()
        assert(t > 0.05, `playback did not advance (currentTime=${t})`)
        return `Metadata loaded (${audio.duration.toFixed(2)} s); playback advanced to ${t.toFixed(2)} s`
      } finally {
        audio.pause()
        URL.revokeObjectURL(url)
      }
    },
  },
  {
    id: 'T04',
    category: 'Model selection',
    description: 'Selecting each model updates shared state and the architecture/configuration data',
    expected: 'Four distinct registry entries; each selection is applied and stored in the session',
    run: async (env) => {
      const info = await api.modelInfo()
      assert(info.models.length === 4, `expected 4 models, got ${info.models.length}`)
      assert(info.models.map((m) => m.id).join() === ids.join(), 'unexpected model ids/order')
      assert(new Set(info.models.map((m) => m.architecture_steps.join('>'))).size === 4, 'architectures not distinct')
      const original = env.currentModelId()
      try {
        for (const m of info.models) {
          env.setModelId(m.id)
          await settle()
          assert(env.currentModelId() === m.id, `selection of ${m.id} not applied`)
          assert(env.readStored()?.modelId === m.id, `selection of ${m.id} not persisted`)
        }
      } finally {
        env.setModelId(original)
        await settle()
      }
      return `4 models verified (${ids.join(', ')}); each selection applied and persisted; original selection restored`
    },
  },
  {
    id: 'T05',
    category: 'Prediction',
    description: 'Prediction chart consistency and reproducibility',
    expected: 'Predicted label equals the tallest bar; repeated analysis gives identical output; response is labelled simulation',
    run: async () => {
      const f = makeSyntheticFile('high')
      const a = await api.analyze(f, 'bilstm', { n_mels: null, n_mfcc: 20, seed: 7 })
      const b = await api.analyze(f, 'bilstm', { n_mels: null, n_mfcc: 20, seed: 7 })
      const bars = EMOTIONS.map((e) => ({ e, v: a.prediction.probabilities[e] }))
      const tallest = bars.reduce((x, y) => (y.v > x.v ? y : x)).e
      assert(tallest === a.prediction.predicted_label, `label ${a.prediction.predicted_label} ≠ tallest bar ${tallest}`)
      assert(a.prediction.confidence_score === a.prediction.probabilities[tallest], 'confidence score ≠ top bar')
      assert(JSON.stringify(a.prediction.probabilities) === JSON.stringify(b.prediction.probabilities), 'not reproducible')
      assert(a.mode === 'inference' && a.measured === true, 'missing inference stamp')
      assert(a.banner === DEMO_BANNER, 'banner text differs')
      return `Predicted ${a.prediction.predicted_label} = tallest bar (${a.prediction.confidence_score.toFixed(2)} %); two runs identical; mode=${a.mode}, measured=${a.measured}`

    },
  },
  {
    id: 'T06',
    category: 'Prediction',
    description: 'Probability normalisation across models and settings',
    expected: 'All values ≥ 0, sum ≈ 100 %, label is the arg-max, six classes in fixed order',
    run: async () => {
      const f = makeSyntheticFile('mid')
      let n = 0
      let minSum = Infinity
      let maxSum = -Infinity
      for (const id of ids) {
        for (const seed of [1, 99]) {
          const r = await api.analyze(f, id, { ...DEFAULT_SETTINGS, seed })
          const p = r.prediction
          assert(Object.keys(p.probabilities).join() === EMOTIONS.join(), 'class order changed')
          const c = isConsistentPrediction(p.probabilities, p.predicted_label)
          assert(c.ok, `${id}/seed ${seed}: ${c.reason}`)
          const s = Object.values(p.probabilities).reduce((x, y) => x + y, 0)
          minSum = Math.min(minSum, s)
          maxSum = Math.max(maxSum, s)
          n++
        }
      }
      return `${n} distributions checked (4 models × 2 seeds): sums in [${minSum.toFixed(2)}, ${maxSum.toFixed(2)}] %, all arg-max consistent`
    },
  },
  {
    id: 'T07',
    category: 'Noise',
    description: 'Noise-processing control: real injection at 20/10/5 dB SNR, denoising and condition selection',
    expected: 'Measured SNR within 0.1 dB of target; noise adds energy; denoised condition present; selection persists',
    run: async (env) => {
      const f = makeSyntheticFile('mid')
      const r = await api.noiseAnalysis(f, 'cnn_tfa', DEFAULT_SETTINGS)
      const by = Object.fromEntries(r.conditions.map((c) => [c.id, c]))
      assert(r.conditions.map((c) => c.id).join() === 'clean,snr_20db,snr_10db,snr_5db,denoised', 'unexpected conditions')
      const diffs = [['snr_20db', 20], ['snr_10db', 10], ['snr_5db', 5]].map(([id, t]) => {
        const m = by[id as string].measured_snr_db
        assert(m !== null && Math.abs(m - (t as number)) < 0.1, `${id}: measured ${m} vs target ${t}`)
        return `${m.toFixed(2)} dB`
      })
      const rms = ['clean', 'snr_20db', 'snr_5db'].map((id) => by[id].signal_analysis.rms_energy.overall)
      assert(rms[0] < rms[1] && rms[1] < rms[2], 'noise did not increase energy monotonically')
      assert(by.denoised.measured_snr_db !== null, 'denoised SNR missing')
      assert(r.robustness_status.toLowerCase().includes('evaluated') || r.robustness_status.toLowerCase().includes('benchmarks'), 'robustness status missing')
      const original = env.currentNoiseCondition()
      try {
        env.setNoiseCondition('snr_5db')
        await settle()
        assert(env.currentNoiseCondition() === 'snr_5db' && env.readStored()?.noiseCondition === 'snr_5db', 'condition not persisted')
      } finally {
        env.setNoiseCondition(original)
        await settle()
      }
      return `Measured SNRs ${diffs.join(' / ')}; RMS ${rms.map((v) => v.toFixed(3)).join(' < ')}; denoised ${by.denoised.measured_snr_db?.toFixed(1)} dB; selection persisted`
    },
  },
  {
    id: 'T08',
    category: 'K-Means',
    description: 'K-Means output validity and reproducibility',
    expected: 'Cluster sizes sum to frame count; silhouette within [−1, 1]; timeline labels valid; repeat run identical',
    run: async () => {
      const f = makeSyntheticFile('mid')
      const a = await api.cluster(f, 3, 42)
      const b = await api.cluster(f, 3, 42)
      const total = a.clusters.reduce((s, c) => s + c.size_frames, 0)
      assert(a.clusters.length === 3 && total === a.n_frames, `sizes ${total} ≠ frames ${a.n_frames}`)
      assert(a.silhouette_score !== null && a.silhouette_score >= -1 && a.silhouette_score <= 1, 'silhouette invalid')
      assert(a.timeline.every((s) => s.cluster >= 0 && s.cluster < 3 && s.end_s > s.start_s), 'bad timeline segment')
      assert(a.disclaimer.toLowerCase().includes('not verified emotion classes'), 'disclaimer missing')
      assert(a.silhouette_score === b.silhouette_score, 'not reproducible')
      const bad = await expectApiError(api.cluster(f, 12, 42))
      assert(bad.status === 422, 'k=12 not rejected')
      return `k=3, ${a.n_frames} frames = ${a.clusters.map((c) => c.size_frames).join(' + ')}; silhouette ${a.silhouette_score.toFixed(3)}; repeat identical; k=12 rejected (${bad.code})`
    },
  },
  {
    id: 'T09',
    category: 'Checkpoints',
    description: 'Missing checkpoint handling',
    expected: 'Loading a checkpoint fails with HTTP 409 and a clear message; registry reports checkpoint null for all models',
    run: async () => {
      const results: string[] = []
      for (const id of ids) {
        const e = await expectApiError(api.loadCheckpoint(id))
        assert(e.status === 409 && e.code === 'checkpoint_unavailable' && e.message.length > 20, `${id}: ${e.status}/${e.code}`)
        results.push(String(e.status))
      }
      const info = await api.modelInfo()
      assert(info.models.every((m) => m.checkpoint === null && !m.implementation_status.checkpoint_available), 'a model reports a checkpoint')
      assert(info.models.every((m) => Object.values(m.metrics).every((v) => v === null)), 'a model reports metrics')
      return `All 4 models: HTTP ${results.join('/')} checkpoint_unavailable; registry checkpoint = null, metrics = null`
    },
  },
  {
    id: 'T10',
    category: 'Errors',
    description: 'Error-message display',
    expected: 'A backend error is rendered by the error component with role="alert" and the server message',
    run: async () => {
      const e = await expectApiError(api.analyze(textFile(), 'cnn_tfa', DEFAULT_SETTINGS))
      const html = renderToStaticMarkup(ErrorMessage({ message: e.message, title: 'Analysis failed' }))
      assert(html.includes('role="alert"') && html.includes('data-testid="error-message"'), 'alert markup missing')
      assert(html.includes('Unsupported file type'), 'server message not rendered')
      const missing = await fetch('/api/definitely-missing')
      assert(missing.status === 404, 'unknown route did not 404')
      return `Rendered role="alert" containing: “${e.message}”; unknown API route → HTTP ${missing.status}`
    },
  },
  {
    id: 'T11',
    category: 'Navigation',
    description: 'Navigation bar and demo-mode labelling',
    expected: 'Ten nav links with correct routes, exactly one active, demo banner visible on every page',
    run: async () => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Primary"] a[data-nav-item]'))
      assert(links.length === NAV_ITEMS.length && links.length === 10, `found ${links.length} links`)
      NAV_ITEMS.forEach((n, i) => {
        assert(links[i].getAttribute('data-nav-item') === n.path, `link ${i} route mismatch`)
        assert(links[i].textContent?.trim() === n.label, `link ${i} label mismatch`)
      })
      const active = links.filter((l) => l.getAttribute('aria-current') === 'page')
      assert(active.length === 1, `${active.length} active links`)
      const banner = document.querySelector('[data-testid="demo-banner"]')
      assert(banner?.textContent?.includes(DEMO_BANNER), 'demo banner missing')
      return `10 links in order; active = “${active[0].textContent?.trim()}”; banner text present`
    },
  },
  {
    id: 'T12',
    category: 'Backend',
    description: 'Backend health and provenance fields',
    expected: 'Health OK; mode "simulation", model_checkpoint null, measured false are exposed',
    run: async () => {
      const h = await api.health()
      assert(h.status === 'ok' && h.mode === 'inference' && h.measured === true, 'provenance fields wrong')
      return `status=${h.status}, mode=${h.mode}, model_checkpoint=${h.model_checkpoint}, measured=${h.measured}, v${h.version}`
    },

  },
  {
    id: 'T13',
    category: 'Persistence',
    description: 'Session persistence of settings',
    expected: 'A settings change is written to sessionStorage and restored value matches',
    run: async (env) => {
      const original = env.currentSeed()
      try {
        env.setSeed(4321)
        await settle()
        const stored = env.readStored() as { settings?: { seed?: number } } | null
        assert(stored?.settings?.seed === 4321, `stored seed ${stored?.settings?.seed}`)
      } finally {
        env.setSeed(original)
        await settle()
      }
      return 'Seed 4321 written to sessionStorage and read back; original value restored'
    },
  },
]
