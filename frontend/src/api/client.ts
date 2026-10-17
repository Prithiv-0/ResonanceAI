import type {
  AnalyzeResponse,
  ClusterResponse,
  ExplainResponse,
  Health,
  LiveInferenceResponse,
  LiveModelSpec,
  ModelInfoResponse,
  NoiseResponse,
  Settings,
} from '../types'

function getApiBase(): string {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE as string
  }
  if (typeof window !== 'undefined') {
    const custom = (window as unknown as { __RESONANCE_API_BASE__?: string }).__RESONANCE_API_BASE__ || localStorage.getItem('RESONANCE_API_BASE')
    if (custom) return custom
    const host = window.location.hostname
    if (host.includes('hf.space') || host.includes('huggingface')) {
      return 'https://resonanceai-pk9z.onrender.com/api'
    }
  }
  return '/api'
}

const BASE: string = getApiBase()

export class ApiRequestError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status = 0) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new ApiRequestError(
      'backend_unreachable',
      'Cannot reach the Resonance backend. Start it with scripts/start-backend (default http://127.0.0.1:8000).',
    )
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error
    throw new ApiRequestError(
      err?.code ?? 'http_error',
      err?.message ?? `Request failed with HTTP ${res.status}.`,
      res.status,
    )
  }
  return body as T
}

function form(file: File, extra: Record<string, string | number | null | undefined>): FormData {
  const fd = new FormData()
  fd.append('file', file, file.name)
  for (const [k, v] of Object.entries(extra)) {
    if (v !== null && v !== undefined) fd.append(k, String(v))
  }
  return fd
}

function modelFields(modelId: string, s: Settings) {
  return { model_id: modelId, n_mels: s.n_mels, n_mfcc: s.n_mfcc, seed: s.seed }
}

export const api = {
  health: () => request<Health>('/health'),
  modelInfo: () => request<ModelInfoResponse>('/model-info'),
  analyze: (file: File, modelId: string, s: Settings) =>
    request<AnalyzeResponse>('/analyze', { method: 'POST', body: form(file, modelFields(modelId, s)) }),
  noiseAnalysis: (file: File, modelId: string, s: Settings) =>
    request<NoiseResponse>('/noise-analysis', { method: 'POST', body: form(file, modelFields(modelId, s)) }),
  cluster: (file: File, k: number, seed: number) =>
    request<ClusterResponse>('/cluster', { method: 'POST', body: form(file, { k, seed }) }),
  explainDemo: (file: File, modelId: string, s: Settings) =>
    request<ExplainResponse>('/explain-demo', { method: 'POST', body: form(file, modelFields(modelId, s)) }),
  loadCheckpoint: (modelId: string) => {
    const fd = new FormData()
    fd.append('model_id', modelId)
    return request<never>('/load-checkpoint', { method: 'POST', body: fd })
  },
  liveModels: () => request<{ status: string; models: LiveModelSpec[] }>('/live-models'),
  liveInference: (file: File, modelType = 'cnn_tfa') => {
    const fd = new FormData()
    fd.append('file', file, file.name)
    fd.append('model_type', modelType)
    return request<LiveInferenceResponse>('/live-inference', { method: 'POST', body: fd })
  },
}
