import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EMOTIONS } from '../types'
import type { Emotion } from '../types'
import { titleCase } from '../utils/format'

/** Horizontal bar chart of the six emotion probabilities (percent), fixed class order. */
export function ProbabilityChart({
  probabilities,
  predicted,
  height = 220,
}: {
  probabilities: Record<Emotion, number>
  predicted: Emotion
  height?: number
}) {
  const data = EMOTIONS.map((e) => ({ emotion: titleCase(e), key: e, value: probabilities[e] ?? 0 }))
  return (
    <div style={{ height }} data-testid="probability-chart" role="img" aria-label="Emotion probability distribution chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }} barCategoryGap={6}>
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={{ stroke: '#d6dce7' }} />
          <YAxis type="category" dataKey="emotion" width={72} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: '#f5f7fa' }} formatter={(v) => [`${Number(v).toFixed(2)} %`, 'Emotion probability']} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.key === predicted ? '#0b6f78' : '#aebfd6'} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 11, fill: '#2c4a78' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
