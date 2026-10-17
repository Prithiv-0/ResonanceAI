import type { ModelInfo, Settings } from '../types'

/** True when a stored result no longer matches the currently selected model/settings. */
export function isStaleResult(
  result: { model: { id: string }; configuration: Record<string, number> } | null,
  model: ModelInfo | null,
  eff: Settings,
): boolean {
  if (!result || !model) return false
  if (result.model.id !== model.id) return true
  if (result.configuration.seed !== eff.seed) return true
  if ('n_mels' in result.configuration && result.configuration.n_mels !== eff.n_mels) return true
  if ('n_mfcc' in result.configuration && result.configuration.n_mfcc !== eff.n_mfcc) return true
  return false
}

export const NOISE_LABELS: Record<string, string> = {
  clean: 'Clean',
  snr_20db: '20 dB SNR',
  snr_10db: '10 dB SNR',
  snr_5db: '5 dB SNR',
  denoised: 'Denoised',
}
