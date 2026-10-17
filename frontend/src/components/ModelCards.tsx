import { useSession } from '../state/session'
import type { ModelInfo } from '../types'
import { Badge, StatusBadge } from './ui'

export function ModelCard({ model, selected, onSelect, compact }: { model: ModelInfo; selected: boolean; onSelect: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={`model-card-${model.id}`}
      className={`flex h-full flex-col rounded-md border p-3 text-left transition-colors ${
        selected ? 'border-brand-700 bg-brand-50 ring-1 ring-brand-700' : 'border-navy-200 bg-white hover:border-navy-300 hover:bg-navy-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label">{model.label}</span>
        <Badge tone={model.role === 'proposed' ? 'brand' : 'steel'}>{model.role}</Badge>
      </div>
      <div className="mt-1 text-[14px] font-semibold text-navy-950">{model.name}</div>
      <div className="mt-0.5 text-xs text-navy-600">Input: {model.input_representation}</div>
      {!compact && (
        <>
          <p className="mt-2 text-xs text-navy-700">{model.purpose}</p>
          <div className="mt-auto flex flex-wrap gap-1 pt-3">
            {model.status_labels.map((s) => (
              <StatusBadge key={s.label} state={s.state}>{s.label}</StatusBadge>
            ))}
          </div>
        </>
      )}
      {compact && (
        <div className="mt-2 flex flex-wrap gap-1">
          <StatusBadge state="pending">Checkpoint unavailable</StatusBadge>
        </div>
      )}
    </button>
  )
}

/** Four selectable model cards. Selection is shared application-wide. */
export function ModelCards({ compact }: { compact?: boolean }) {
  const { models, state, patch, backendError } = useSession()
  if (models.length === 0) {
    return <p className="text-xs text-navy-500">{backendError ? 'Model registry unavailable (backend offline).' : 'Loading model registry…'}</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Model selection">
      {models.map((m) => (
        <ModelCard
          key={m.id}
          model={m}
          compact={compact}
          selected={(state.modelId === m.id) || (!models.some((x) => x.id === state.modelId) && m === models[0])}
          onSelect={() => patch({ modelId: m.id })}
        />
      ))}
    </div>
  )
}
