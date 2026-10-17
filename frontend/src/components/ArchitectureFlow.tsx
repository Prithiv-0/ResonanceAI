import { ArrowRight, ChevronDown } from 'lucide-react'
import type { ModelInfo } from '../types'

/** Horizontal flow diagram of a model's intended architecture. */
export function ArchitectureFlow({ steps, highlight }: { steps: string[]; highlight?: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2" aria-label="Architecture flow">
      {steps.map((s, i) => {
        const hi = highlight?.includes(s)
        return (
          <li key={s} className="flex items-center">
            <span
              className={`rounded border px-2.5 py-1.5 text-[12px] font-medium ${
                hi ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-navy-200 bg-white text-navy-800'
              }`}
            >
              {s}
            </span>
            {i < steps.length - 1 && <ArrowRight size={14} className="mx-1.5 shrink-0 text-navy-400" />}
          </li>
        )
      })}
    </ol>
  )
}

/** Vertical flow variant, used in narrow columns. */
export function ArchitectureStack({ steps, highlight }: { steps: string[]; highlight?: string[] }) {
  return (
    <ol className="flex flex-col items-stretch" aria-label="Architecture stack">
      {steps.map((s, i) => {
        const hi = highlight?.includes(s)
        return (
          <li key={s} className="flex flex-col items-center">
            <span
              className={`w-full rounded border px-3 py-1.5 text-center text-[12px] font-medium ${
                hi ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-navy-200 bg-white text-navy-800'
              }`}
            >
              {s}
            </span>
            {i < steps.length - 1 && <ChevronDown size={14} className="my-0.5 text-navy-400" />}
          </li>
        )
      })}
    </ol>
  )
}

export function highlightFor(model: ModelInfo): string[] {
  return model.architecture_steps.filter((s) => /attention|bilstm/i.test(s))
}
