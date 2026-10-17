import { useEffect, useRef } from 'react'

const RAMP: [number, number, number][] = [
  [11, 27, 51],
  [44, 74, 120],
  [26, 158, 168],
  [232, 246, 240],
]

function ramp(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(x))
  const f = x - i
  const c = RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * f))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

/**
 * Spectrogram-style heat map (rows = mel bins, low→high; values 0–255).
 * Optionally overlays a coarse importance grid (rows = frequency patches, low→high).
 */
export function SpectrogramView({
  values,
  importance,
  height = 220,
  label,
}: {
  values: number[][] | null
  importance?: number[][] | null
  height?: number
  label: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const box = wrap.current
    if (!canvas || !box) return
    const draw = () => {
      const w = box.clientWidth
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = height * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#f5f7fa'
      ctx.fillRect(0, 0, w, height)
      if (!values) return
      const rows = values.length
      const cols = values[0].length
      const cw = w / cols
      const ch = height / rows
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = ramp(values[r][c] / 255)
          ctx.fillRect(c * cw, height - (r + 1) * ch, cw + 0.6, ch + 0.6)
        }
      }
      if (importance) {
        const fr = importance.length
        const tc = importance[0].length
        for (let r = 0; r < fr; r++) {
          for (let c = 0; c < tc; c++) {
            const v = importance[r][c]
            if (v <= 0.02) continue
            ctx.fillStyle = `rgba(234,138,22,${(0.15 + 0.6 * v).toFixed(3)})`
            const x0 = (c / tc) * w
            const y0 = height - ((r + 1) / fr) * height
            ctx.fillRect(x0, y0, w / tc, height / fr)
          }
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 0.5
        for (let r = 1; r < fr; r++) {
          ctx.beginPath()
          ctx.moveTo(0, (r / fr) * height)
          ctx.lineTo(w, (r / fr) * height)
          ctx.stroke()
        }
        for (let c = 1; c < tc; c++) {
          ctx.beginPath()
          ctx.moveTo((c / tc) * w, 0)
          ctx.lineTo((c / tc) * w, height)
          ctx.stroke()
        }
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(box)
    return () => ro.disconnect()
  }, [values, importance, height])

  return (
    <div ref={wrap} className="w-full overflow-hidden rounded border border-navy-200" role="img" aria-label={label}>
      <canvas ref={ref} className="block" data-testid="spectrogram-canvas" />
    </div>
  )
}

export function RampLegend({ left, right, amber }: { left: string; right: string; amber?: boolean }) {
  const stops = amber
    ? 'linear-gradient(to right, rgba(234,138,22,0.15), rgba(234,138,22,0.75))'
    : 'linear-gradient(to right, rgb(11,27,51), rgb(44,74,120), rgb(26,158,168), rgb(232,246,240))'
  return (
    <div className="flex items-center gap-2 text-[11px] text-navy-600">
      <span>{left}</span>
      <span className="h-2.5 w-40 rounded-sm border border-navy-200" style={{ background: stops }} />
      <span>{right}</span>
    </div>
  )
}
