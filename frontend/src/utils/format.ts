export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function formatDuration(s: number): string {
  if (!Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(1).padStart(4, '0')} min` : `${sec.toFixed(2)} s`
}

export function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 2)} kHz` : `${hz} Hz`
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function sumProbabilities(p: Record<string, number>): number {
  return Object.values(p).reduce((a, b) => a + b, 0)
}

/** True when a probability map is non-negative, sums to ~100 and the label is the arg-max. */
export function isConsistentPrediction(
  probs: Record<string, number>,
  label: string,
  tolerance = 0.05,
): { ok: boolean; reason: string } {
  const values = Object.values(probs)
  if (values.some((v) => v < 0 || !Number.isFinite(v))) return { ok: false, reason: 'negative or non-finite value' }
  const total = sumProbabilities(probs)
  if (Math.abs(total - 100) > tolerance) return { ok: false, reason: `sum is ${total.toFixed(3)}, expected 100` }
  const top = Object.entries(probs).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  if (top !== label) return { ok: false, reason: `label ${label} is not arg-max (${top})` }
  return { ok: true, reason: `sum = ${total.toFixed(2)} %, arg-max = ${label}` }
}
