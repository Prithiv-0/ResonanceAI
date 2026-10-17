import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SignalAnalysis } from '../types'

export function FeatureTable({ f, title }: { f: SignalAnalysis; title?: string }) {
  const p = f.pitch
  const rows: [string, string, string][] = [
    ['Duration', `${f.duration_s.toFixed(2)} s`, 'Computed length'],
    ['Analysis Sample Rate', `${f.analysis_sample_rate_hz} Hz`, 'Mono audio standard'],
    ['RMS Energy (Mean ± SD)', `${f.rms_energy.mean.toFixed(4)} ± ${f.rms_energy.std.toFixed(4)}`, `Overall ${f.rms_energy.overall_dbfs.toFixed(1)} dBFS`],
    ['Zero-Crossing Rate', `${f.zero_crossing_rate.mean.toFixed(4)} ± ${f.zero_crossing_rate.std.toFixed(4)}`, 'Sign change density'],
    ['Spectral Centroid', `${f.spectral_centroid_hz.mean.toFixed(0)} ± ${f.spectral_centroid_hz.std.toFixed(0)} Hz`, 'Spectral brightness measure'],
    [
      'Estimated Pitch (f0)',
      p.reliable && p.median_hz ? `${p.median_hz.toFixed(1)} Hz (Range: ${p.p10_hz?.toFixed(0)}–${p.p90_hz?.toFixed(0)})` : 'Voiced tracking pending',
      p.reliable ? `Voiced frame ratio: ${(p.voiced_fraction * 100).toFixed(0)}%` : (p.reason ?? 'Aperiodic frame distribution'),
    ],
  ]
  return (
    <div>
      {title && <h3 className="mb-2 font-semibold text-navy-900">{title}</h3>}
      <table className="tbl" data-testid="feature-table">
        <thead>
          <tr><th>Feature</th><th>Value</th><th>Context</th></tr>
        </thead>
        <tbody>
          {rows.map(([k, v, n]) => (
            <tr key={k}>
              <td className="font-medium text-navy-800">{k}</td>
              <td className="mono font-semibold text-navy-950">{v}</td>
              <td className="text-xs text-navy-500">{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MfccChart({ f }: { f: SignalAnalysis }) {
  const data = f.mfcc.mean.map((m, i) => ({ name: `C${i + 1}`, mean: m, std: f.mfcc.std[i] }))
  return (
    <div className="h-44" role="img" aria-label="MFCC mean per coefficient">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 14, left: -8 }}>
          <CartesianGrid stroke="#e8ecf3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#d6dce7' }} label={{ value: 'MFCC Coefficients (1–13)', position: 'insideBottom', offset: -8, fontSize: 11, fill: '#66799a' }} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [Number(v).toFixed(2), 'Mean Value']} cursor={{ fill: '#f5f7fa' }} />
          <Bar dataKey="mean" fill="#0b6f78" isAnimationActive={false} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
