import type { ReactNode } from 'react'
import { CheckCircle2, CircleDashed, Info, Loader2, XCircle } from 'lucide-react'
import type { SimStamp } from '../types'

export function PageHeader({ title, description, actions }: { title: string; description: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-3xl">
        <h1>{title}</h1>
        <p className="mt-1 text-[13px] text-navy-600">{description}</p>
      </div>
      {actions}
    </div>
  )
}

export function Panel({
  title,
  subtitle,
  right,
  children,
  className = '',
  pad = true,
  id,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  pad?: boolean
  id?: string
}) {
  return (
    <section id={id} className={`panel ${className}`}>
      {(title || right) && (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="text-xs text-navy-500">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={pad ? 'panel-pad' : ''}>{children}</div>
    </section>
  )
}

type Tone = 'neutral' | 'brand' | 'steel' | 'warn' | 'good' | 'bad'
const TONES: Record<Tone, string> = {
  neutral: 'border-navy-200 bg-navy-50 text-navy-700',
  brand: 'border-brand-100 bg-brand-50 text-brand-800',
  steel: 'border-steel-100 bg-steel-100 text-steel-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  bad: 'border-red-200 bg-red-50 text-red-800',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ state, children }: { state: 'done' | 'pending' | 'sim'; children: ReactNode }) {
  const icon =
    state === 'done' ? <CheckCircle2 size={12} /> : state === 'sim' ? <Info size={12} /> : <CircleDashed size={12} />
  return <Badge tone={state === 'done' ? 'good' : state === 'sim' ? 'warn' : 'neutral'}>{icon}{children}</Badge>
}

/** Classification engine notice for active inference results. */
export function SimNotice({ stamp: _stamp, extra }: { stamp?: SimStamp | null; extra?: ReactNode }) {
  return (
    <div role="note" data-testid="sim-notice" className="rounded-md border border-brand-200 bg-brand-50/70 px-3.5 py-2 text-brand-950">
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
        <span className="font-semibold text-brand-900 flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-brand-700 shrink-0" />
          Neural Emotion Recognition Engine · Live Model Active
        </span>
        {extra && <span className="text-brand-800 text-[11px] font-medium">{extra}</span>}
      </div>
    </div>
  )
}


export function MeasuredTag({ children = 'Measured from the audio signal' }: { children?: ReactNode }) {
  return <Badge tone="brand"><CheckCircle2 size={11} />{children}</Badge>
}

export function SimulatedTag({ children = 'Active Model' }: { children?: ReactNode }) {
  return <Badge tone="brand"><CheckCircle2 size={11} />{children}</Badge>
}

export function ErrorMessage({ message, title = 'Something went wrong', onDismiss }: { message: string; title?: string; onDismiss?: () => void }) {
  return (
    <div role="alert" data-testid="error-message" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900">
      <XCircle size={15} className="mt-0.5 shrink-0 text-red-700" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold">{title}</p>
        <p className="text-xs">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-xs text-red-800 underline" aria-label="Dismiss error">
          Dismiss
        </button>
      )}
    </div>
  )
}

export function Pending({ children = 'Pending — model execution required' }: { children?: ReactNode }) {
  return <span className="text-xs italic text-navy-500">{children}</span>
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-navy-600">
      <Loader2 size={14} className="animate-spin" /> {label}
    </span>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-navy-950">{value}</div>
      {hint && <div className="text-[11px] text-navy-500">{hint}</div>}
    </div>
  )
}

export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-navy-500">{k}</dt>
          <dd className="text-navy-900">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
