import { useEffect, useRef } from 'react'

/** Min/max envelope waveform on a canvas. `ymax` lets several plots share one amplitude scale. */
export function Waveform({
  peaks,
  height = 96,
  color = '#4d6f9c',
  ymax,
  ghost,
  label,
}: {
  peaks: number[][]
  height?: number
  color?: string
  ymax?: number
  /** Optional second envelope drawn faintly behind (e.g. the clean signal). */
  ghost?: number[][]
  label?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const box = wrap.current
    if (!canvas || !box) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = box.clientWidth
      canvas.width = w * dpr
      canvas.height = height * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, height)
      const mid = height / 2
      ctx.strokeStyle = '#e8ecf3'
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
      ctx.stroke()
      const peak = ymax ?? Math.max(0.05, ...peaks.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))))
      const scale = (mid - 3) / peak
      const plot = (env: number[][], style: string) => {
        ctx.fillStyle = style
        const bw = Math.max(1, w / env.length)
        env.forEach(([lo, hi], i) => {
          const x = (i / env.length) * w
          const y1 = mid - hi * scale
          const y2 = mid - lo * scale
          ctx.fillRect(x, y1, bw, Math.max(1, y2 - y1))
        })
      }
      if (ghost) plot(ghost, 'rgba(140,155,180,0.35)')
      plot(peaks, color)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(box)
    return () => ro.disconnect()
  }, [peaks, height, color, ymax, ghost])

  return (
    <div ref={wrap} className="relative w-full rounded border border-navy-100 bg-white" role="img" aria-label={label ?? 'Audio waveform'}>
      <canvas ref={ref} data-testid="waveform-canvas" className="block" />
    </div>
  )
}
