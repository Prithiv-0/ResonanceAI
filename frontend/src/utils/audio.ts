import type { ClientAudioMeta } from '../types'

export const SUPPORTED_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.mpeg', '.mpg']

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export function isSupportedAudioName(name: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(extensionOf(name))
}

/** Reads the native sample rate and channel count from a RIFF/WAVE header, if present. */
function readWavHeader(buf: ArrayBuffer): { sampleRate: number; channels: number } | null {
  if (buf.byteLength < 28) return null
  const v = new DataView(buf)
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3))
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null
  let off = 12
  while (off + 8 <= buf.byteLength) {
    const id = tag(off)
    const size = v.getUint32(off + 4, true)
    if (id === 'fmt ') return { channels: v.getUint16(off + 10, true), sampleRate: v.getUint32(off + 12, true) }
    off += 8 + size + (size % 2)
  }
  return null
}

export function peaks(data: Float32Array, buckets = 600): number[][] {
  const n = data.length
  const b = Math.min(buckets, n)
  const out: number[][] = []
  for (let i = 0; i < b; i++) {
    const a = Math.floor((i * n) / b)
    const z = Math.max(a + 1, Math.floor(((i + 1) * n) / b))
    let lo = Infinity
    let hi = -Infinity
    for (let j = a; j < z; j++) {
      const s = data[j]
      if (s < lo) lo = s
      if (s > hi) hi = s
    }
    out.push([lo, hi])
  }
  return out
}

/** Real in-browser decode: extracts duration, sample rate and a waveform envelope. */
export async function decodeAudioFile(file: File, origin: 'upload' | 'synthetic'): Promise<ClientAudioMeta> {
  const bytes = await file.arrayBuffer()
  const Ctx: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) throw new Error('This browser does not support Web Audio decoding.')
  const header = readWavHeader(bytes)
  const ctx = new Ctx()
  try {
    const buffer = await ctx.decodeAudioData(bytes.slice(0))
    return {
      name: file.name,
      size: file.size,
      mime: file.type || 'audio/*',
      durationS: buffer.duration,
      sampleRate: header?.sampleRate ?? buffer.sampleRate,
      sampleRateSource: header ? 'wav-header' : 'decoder',
      channels: header?.channels ?? buffer.numberOfChannels,
      origin,
      waveform: peaks(buffer.getChannelData(0)),
    }
  } catch {
    throw new Error(`"${file.name}" could not be decoded as audio. The file may be corrupted or not a real audio file.`)
  } finally {
    void ctx.close()
  }
}

export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  w(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}

export interface SynthOptions {
  durationS: number
  f0: number
  vibrato: number
  syllableRate: number
  level: number
}

export const SYNTHETIC_PRESETS: Record<string, SynthOptions & { label: string }> = {
  anger: { label: 'Anger Sample', durationS: 3.5, f0: 220, vibrato: 0.12, syllableRate: 4.8, level: 0.85 },
  disgust: { label: 'Disgust Sample', durationS: 3.5, f0: 130, vibrato: 0.05, syllableRate: 2.5, level: 0.50 },
  fear: { label: 'Fear Sample', durationS: 3.2, f0: 210, vibrato: 0.22, syllableRate: 5.2, level: 0.65 },
  happiness: { label: 'Happiness Sample', durationS: 3.6, f0: 240, vibrato: 0.15, syllableRate: 4.2, level: 0.80 },
  sadness: { label: 'Sadness Sample', durationS: 4.0, f0: 115, vibrato: 0.03, syllableRate: 1.8, level: 0.35 },
  neutral: { label: 'Neutral Sample', durationS: 3.5, f0: 155, vibrato: 0.06, syllableRate: 3.0, level: 0.50 },
  low: { label: 'Low pitch, slow', durationS: 4, f0: 110, vibrato: 0.04, syllableRate: 2.2, level: 0.35 },
  mid: { label: 'Mid pitch', durationS: 4, f0: 170, vibrato: 0.08, syllableRate: 3.5, level: 0.5 },
  high: { label: 'High pitch, fast', durationS: 4, f0: 240, vibrato: 0.18, syllableRate: 5, level: 0.8 },
}

export function makeEmotionSampleFile(emotion: string): File {
  const p = SYNTHETIC_PRESETS[emotion] ?? SYNTHETIC_PRESETS.neutral
  const wav = encodeWav(synthSpeechLike(p), 16000)
  return new File([wav], `speech_sample_${emotion}.wav`, { type: 'audio/wav' })
}

/**
 * Speech-LIKE test signal (harmonics with formant shaping and syllable-rate modulation).
 * This is a synthetic signal, not speech and not emotional content.
 */
export function synthSpeechLike(o: SynthOptions, sr = 16000): Float32Array {
  const n = Math.floor(o.durationS * sr)
  const out = new Float32Array(n)
  const formants: [number, number][] = [[700, 120], [1200, 150], [2600, 250]]
  let phase = 0
  let seed = 12345
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296 - 0.5
  }
  let peak = 1e-9
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const f0 = o.f0 * (1 + o.vibrato * Math.sin(2 * Math.PI * 0.7 * t) + 0.5 * o.vibrato * Math.sin(2 * Math.PI * 2.3 * t))
    phase += (2 * Math.PI * f0) / sr
    let s = 0
    for (let h = 1; h < 30; h++) {
      const f = f0 * h
      if (f > sr * 0.475) break
      let g = 0.03
      for (const [fc, bw] of formants) g += Math.exp(-0.5 * ((f - fc) / bw) ** 2)
      s += g * Math.sin(h * phase)
    }
    const env = Math.pow(Math.max(0, Math.min(1, Math.sin(2 * Math.PI * o.syllableRate * t) + 0.3)), 0.7)
    const pause = Math.sin(2 * Math.PI * 0.35 * t + 1) > -0.6 ? 1 : 0
    s = s * env * pause + 0.002 * rand()
    out[i] = s
    if (Math.abs(s) > peak) peak = Math.abs(s)
  }
  for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * o.level
  return out
}

export function makeSyntheticFile(preset: keyof typeof SYNTHETIC_PRESETS = 'mid'): File {
  const p = SYNTHETIC_PRESETS[preset]
  const wav = encodeWav(synthSpeechLike(p), 16000)
  return new File([wav], `synthetic_${preset}_pitch.wav`, { type: 'audio/wav' })
}

export function fileSignature(f: { name: string; size: number }): string {
  return `${f.name}:${f.size}`
}
