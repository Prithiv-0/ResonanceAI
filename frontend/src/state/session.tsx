import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import type {
  AnalyzeResponse,
  ClientAudioMeta,
  ClusterResponse,
  ComparisonLog,
  ExplainResponse,
  GanConfig,
  Health,
  ModelInfo,
  NoiseResponse,
  Settings,
  TestResult,
} from '../types'
import { decodeAudioFile, extensionOf, isSupportedAudioName, makeEmotionSampleFile, SUPPORTED_EXTENSIONS } from '../utils/audio'

const STORAGE_KEY = 'resonance.session.v1'

/** Everything here survives a page reload within the browser session (sessionStorage). */
export interface PersistedState {
  audio: ClientAudioMeta | null
  modelId: string
  scenarioId: string
  settings: Settings
  analysis: AnalyzeResponse | null
  noiseCondition: string
  noise: NoiseResponse | null
  clusterK: number
  cluster: ClusterResponse | null
  explain: ExplainResponse | null
  tests: Record<string, TestResult>
  gan: GanConfig
  comparisonLog: ComparisonLog | null
}

export const DEFAULT_GAN: GanConfig = {
  latentDim: 128,
  epochs: 200,
  batchSize: 64,
  learningRate: 0.0002,
  conditioning: 'Emotion label (one-hot embedding)',
  discriminator: 'Conditional CNN discriminator',
  augmentationRatio: 0.5,
  targetClasses: ['fear', 'disgust'],
}

const DEFAULTS: PersistedState = {
  audio: null,
  modelId: 'cnn_tfa',
  scenarioId: 'anger',
  settings: { n_mels: null, n_mfcc: null, seed: 42 },
  analysis: null,
  noiseCondition: 'clean',
  noise: null,
  clusterK: 4,
  cluster: null,
  explain: null,
  tests: {},
  gan: DEFAULT_GAN,
  comparisonLog: null,
}

function load(): PersistedState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedState>) }
  } catch {
    /* corrupted storage: fall back to defaults */
  }
  return DEFAULTS
}

interface SessionContextValue {
  state: PersistedState
  getCurrentState: () => PersistedState
  patch: (p: Partial<PersistedState>) => void
  /** Race-safe update for individual test results (tests run sequentially but asynchronously). */
  setTestResult: (id: string, r: TestResult) => void
  clearTests: () => void
  resetSession: () => void

  /** In-memory File (cannot be persisted). Null after a reload until the user re-selects it. */
  file: File | null
  fileUrl: string | null
  audioError: string | null
  audioBusy: boolean
  setAudioFile: (file: File, origin: 'upload' | 'synthetic') => Promise<boolean>
  clearAudio: () => void

  models: ModelInfo[]
  selectedModel: ModelInfo | null
  health: Health | null
  backendError: string | null
  refreshBackend: () => Promise<void>
  effectiveSettings: Settings
}

const Ctx = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(load)
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [audioBusy, setAudioBusy] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  const stateRef = useRef<PersistedState>(state)
  stateRef.current = state

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full: non-fatal */
    }
  }, [state])

  const getCurrentState = useCallback(() => stateRef.current, [])

  const patch = useCallback((p: Partial<PersistedState>) => {
    setState((s) => {
      const next = { ...s, ...p }
      stateRef.current = next
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* storage full */
      }
      return next
    })
  }, [])

  const setTestResult = useCallback(
    (id: string, r: TestResult) => setState((s) => ({ ...s, tests: { ...s.tests, [id]: r } })),
    [],
  )
  const clearTests = useCallback(() => setState((s) => ({ ...s, tests: {} })), [])

  const refreshBackend = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([api.health(), api.modelInfo()])
      setHealth(h)
      setModels(m.models)
      setBackendError(null)
    } catch (e) {
      setHealth(null)
      setBackendError(e instanceof Error ? e.message : 'Backend unreachable.')
    }
  }, [])

  useEffect(() => {
    void refreshBackend()
  }, [refreshBackend])

  const swapUrl = useCallback((next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = next
    setFileUrl(next)
  }, [])

  const setAudioFile = useCallback(
    async (f: File, origin: 'upload' | 'synthetic') => {
      setAudioError(null)
      if (!isSupportedAudioName(f.name)) {
        setAudioError(
          `Unsupported file type "${extensionOf(f.name) || 'unknown'}". Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}.`,
        )
        return false
      }
      if (f.size === 0) {
        setAudioError(`"${f.name}" is empty.`)
        return false
      }
      setAudioBusy(true)
      try {
        const meta = await decodeAudioFile(f, origin)
        setFile(f)
        swapUrl(URL.createObjectURL(f))
        // New recording: previous results belong to a different file.
        setState((s) => ({ ...s, audio: meta, analysis: null, noise: null, cluster: null, explain: null }))
        return true
      } catch (e) {
        setAudioError(e instanceof Error ? e.message : 'Decoding failed.')
        return false
      } finally {
        setAudioBusy(false)
      }
    },
    [swapUrl],
  )

  useEffect(() => {
    if (!file && !state.audio) {
      try {
        const defaultSample = makeEmotionSampleFile(state.scenarioId || 'anger')
        void setAudioFile(defaultSample, 'synthetic')
      } catch {
        /* audioContext not ready or non-critical */
      }
    } else if (!file && state.audio?.origin === 'synthetic') {
      try {
        const defaultSample = makeEmotionSampleFile(state.scenarioId || 'anger')
        setFile(defaultSample)
        swapUrl(URL.createObjectURL(defaultSample))
      } catch {
        /* audioContext not ready or non-critical */
      }
    }
  }, [file, state.audio, state.scenarioId, setAudioFile, swapUrl])


  const clearAudio = useCallback(() => {
    setFile(null)
    swapUrl(null)
    setAudioError(null)
    setState((s) => ({ ...s, audio: null, analysis: null, noise: null, cluster: null, explain: null }))
  }, [swapUrl])

  const resetSession = useCallback(() => {
    setFile(null)
    swapUrl(null)
    setAudioError(null)
    setState(DEFAULTS)
  }, [swapUrl])

  const selectedModel = useMemo(
    () => models.find((m) => m.id === state.modelId) ?? models[0] ?? null,
    [models, state.modelId],
  )

  const effectiveSettings = useMemo<Settings>(() => {
    const m = selectedModel
    const s = state.settings
    return {
      seed: s.seed,
      n_mels: m?.tunable_inputs.n_mels
        ? m.tunable_inputs.n_mels.includes(s.n_mels ?? -1) ? s.n_mels : (m.defaults.n_mels ?? null)
        : null,
      n_mfcc: m?.tunable_inputs.n_mfcc
        ? m.tunable_inputs.n_mfcc.includes(s.n_mfcc ?? -1) ? s.n_mfcc : (m.defaults.n_mfcc ?? null)
        : null,
    }
  }, [selectedModel, state.settings])

  const value: SessionContextValue = {
    state,
    getCurrentState,
    patch,
    setTestResult,
    clearTests,
    resetSession,
    file,
    fileUrl,
    audioError,
    audioBusy,
    setAudioFile,
    clearAudio,
    models,
    selectedModel,
    health,
    backendError,
    refreshBackend,
    effectiveSettings,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSession must be used inside <SessionProvider>')
  return v
}
