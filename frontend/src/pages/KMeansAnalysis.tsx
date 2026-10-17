import { useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { Shapes } from 'lucide-react'
import { api, ApiRequestError } from '../api/client'
import { NeedAudio } from '../components/AnalysisSettings'
import { Badge, ErrorMessage, MeasuredTag, PageHeader, Panel, Spinner, Stat } from '../components/ui'
import { useSession } from '../state/session'

export const CLUSTER_COLORS = ['#2c4a78', '#0f8791', '#a07a2c', '#8a5a7a', '#6c8ab1', '#5f8a5a', '#b0654f', '#7f8a99']

export default function KMeansAnalysis() {
  const { state, patch, file, backendError } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const r = state.cluster
  const k = state.clusterK
  const stale = r && (r.parameters.k !== k || r.audio.filename !== state.audio?.name)

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      patch({ cluster: await api.cluster(file, k, state.settings.seed) })
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Clustering failed.')
    } finally {
      setBusy(false)
    }
  }

  const byCluster = r
    ? Array.from({ length: r.parameters.k }, (_, c) => ({ c, pts: r.projection.points.filter((p) => p.cluster === c) }))
    : []

  return (
    <div>
      <PageHeader
        title="K-Means Analysis"
        description="Acoustic Feature Clustering: overlapping frames of your recording are described by acoustic features, standardised and clustered with real K-Means."
      />

      <Panel title="Acoustic Feature Clustering" subtitle="Real computation on the uploaded recording" right={<MeasuredTag>Measured · scikit-learn KMeans</MeasuredTag>} className="mb-5">
        <div className="mb-3 rounded border border-steel-100 bg-steel-100/50 px-3 py-2 text-xs text-navy-800" data-testid="cluster-disclaimer">
          Clusters are unsupervised groupings of acoustic frames. They are <strong>not verified emotion classes</strong> and must not be read as emotions.
        </div>
        <ol className="mb-4 grid gap-1 text-xs text-navy-600 sm:grid-cols-2 lg:grid-cols-4">
          {['32 ms frames, 10 ms hop (overlapping)', '12 frame features: energy, ZCR, centroid, bandwidth, roll-off, flatness, MFCC 1–6', 'Standardise (zero mean, unit variance)', 'K-Means, n_init = 10, fixed seed'].map((s, i) => (
            <li key={s} className="flex gap-2"><span className="mono text-brand-700">{i + 1}.</span>{s}</li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 text-[13px]">
            <span className="label">Clusters (k)</span>
            <input id="cluster-k" data-testid="cluster-k" type="range" min={2} max={8} value={k} onChange={(e) => patch({ clusterK: Number(e.target.value) })} className="accent-brand-700" />
            <strong className="mono w-4 text-navy-950">{k}</strong>
          </label>
          <button data-testid="run-cluster" className="btn btn-primary" disabled={!file || busy || !!backendError} onClick={() => void run()}>
            <Shapes size={14} /> Run K-Means
          </button>
          {busy && <Spinner label="Extracting frame features and clustering…" />}
        </div>
        {error && <div className="mt-3"><ErrorMessage title="Clustering unavailable" message={error} onDismiss={() => setError(null)} /></div>}
      </Panel>

      {!file && !r && <NeedAudio what="K-Means clustering" />}

      {r && (
        <div className="space-y-5" data-testid="cluster-results">
          {stale && <div className="rounded border border-navy-200 bg-navy-50 px-3 py-1.5 text-xs text-navy-700">Settings changed since this result. Re-run to refresh.</div>}

          <Panel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Stat label="Clusters" value={r.parameters.k} />
              <Stat label="Frames" value={r.n_frames} hint={`${r.duration_s.toFixed(2)} s`} />
              <Stat label="Silhouette score" value={<span data-testid="silhouette">{r.silhouette_score === null ? 'n/a' : r.silhouette_score.toFixed(3)}</span>} hint={r.silhouette_note ?? 'range −1 … 1; higher = better separated'} />
              <Stat label="Inertia" value={r.inertia.toFixed(0)} hint="standardised space" />
              <Stat label="PCA variance (2 comps)" value={`${(r.projection.explained_variance.reduce((a, b) => a + b, 0) * 100).toFixed(0)}%`} />
            </div>
          </Panel>

          <Panel title="Cluster membership over time" subtitle="Each coloured segment is a run of consecutive frames in one cluster">
            <div className="relative h-10 w-full overflow-hidden rounded border border-navy-200" data-testid="cluster-timeline" role="img" aria-label="Cluster membership timeline">
              {r.timeline.map((s, i) => (
                <div
                  key={i}
                  title={`Cluster ${s.cluster}: ${s.start_s.toFixed(2)}–${s.end_s.toFixed(2)} s`}
                  className="absolute top-0 h-full"
                  style={{ left: `${(s.start_s / r.duration_s) * 100}%`, width: `${((s.end_s - s.start_s) / r.duration_s) * 100}%`, background: CLUSTER_COLORS[s.cluster % CLUSTER_COLORS.length] }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-navy-500">
              <span>0 s</span><span>{(r.duration_s / 2).toFixed(1)} s</span><span>{r.duration_s.toFixed(1)} s</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-navy-700">
              {r.clusters.map((c) => (
                <span key={c.cluster} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CLUSTER_COLORS[c.cluster % CLUSTER_COLORS.length] }} /> Cluster {c.cluster}
                </span>
              ))}
              <span className="text-navy-500">(cluster 0 = lowest mean frame energy)</span>
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Panel title="Cluster sizes and feature summaries" subtitle="Means of the unstandardised frame features">
              <div className="overflow-x-auto">
                <table className="tbl" data-testid="cluster-table">
                  <thead>
                    <tr><th>Cluster</th><th>Frames</th><th>Share</th><th>Energy (dB)</th><th>ZCR</th><th>Centroid (Hz)</th><th>Flatness</th></tr>
                  </thead>
                  <tbody>
                    {r.clusters.map((c) => (
                      <tr key={c.cluster}>
                        <td><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: CLUSTER_COLORS[c.cluster % CLUSTER_COLORS.length] }} />{c.cluster}</td>
                        <td className="mono">{c.size_frames}</td>
                        <td className="min-w-24">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded bg-navy-100"><div className="h-1.5 rounded bg-steel-600" style={{ width: `${c.fraction * 100}%` }} /></div>
                            <span className="mono w-10 text-right">{(c.fraction * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="mono">{c.feature_means.rms_db?.toFixed(1)}</td>
                        <td className="mono">{c.feature_means.zero_crossing_rate?.toFixed(3)}</td>
                        <td className="mono">{c.feature_means.spectral_centroid_hz?.toFixed(0)}</td>
                        <td className="mono">{c.feature_means.spectral_flatness?.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-navy-500">Total frames in table: {r.clusters.reduce((a, c) => a + c.size_frames, 0)} of {r.n_frames}.</p>
            </Panel>

            <Panel title="Two-dimensional projection" subtitle={`${r.projection.method} · ${r.projection.n_points_shown} frames shown`} right={<Badge>optional view</Badge>}>
              <div className="h-60" data-testid="cluster-scatter" role="img" aria-label="PCA projection of frames coloured by cluster">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 6, right: 8, bottom: 14, left: -12 }}>
                    <CartesianGrid stroke="#e8ecf3" />
                    <XAxis type="number" dataKey="x" name="PC1" tickLine={false} axisLine={{ stroke: '#d6dce7' }} label={{ value: `PC1 (${(r.projection.explained_variance[0] * 100).toFixed(0)}%)`, position: 'insideBottom', offset: -8, fontSize: 11, fill: '#66799a' }} />
                    <YAxis type="number" dataKey="y" name="PC2" tickLine={false} axisLine={false} />
                    <ZAxis range={[18, 18]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    {byCluster.map(({ c, pts }) => (
                      <Scatter key={c} name={`Cluster ${c}`} data={pts} fill={CLUSTER_COLORS[c % CLUSTER_COLORS.length]} fillOpacity={0.7} isAnimationActive={false} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
