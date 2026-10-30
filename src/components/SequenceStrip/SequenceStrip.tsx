import './SequenceStrip.css'

export interface SequenceStep {
  /** Chord name (or another short description of the tones). */
  name: string
  /** Roman numeral of the chord in the key, if any. */
  relative?: string
}

export interface SequenceStripProps {
  steps: SequenceStep[]
  current: number
  onSelect: (index: number) => void
  onAdd: () => void
  onRemove: () => void
  onClear: () => void
}

/**
 * The steps of a chord sequence in a row, by their chord names; the current
 * step is highlighted and selected by clicking. Buttons add a step after
 * the current one, remove it, or clear the sequence to the current step.
 */
export function SequenceStrip({ steps, current, onSelect, onAdd, onRemove, onClear }: SequenceStripProps) {
  return (
    <div className="sequence-strip">
      <ol className="sequence-strip__steps" aria-label="Chord sequence">
        {steps.map((step, index) => (
          <li key={index}>
            <button
              type="button"
              className="sequence-strip__step"
              aria-current={index === current ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${[step.name, step.relative].filter(Boolean).join(', ')}`}
              onClick={() => onSelect(index)}
            >
              <span className="sequence-strip__name">{step.name}</span>
              {step.relative && <span className="sequence-strip__relative">{step.relative}</span>}
            </button>
          </li>
        ))}
      </ol>
      <div className="sequence-strip__actions">
        <button type="button" aria-label="Add step" title="Add step (+)" onClick={onAdd}>
          +
        </button>
        <button type="button" aria-label="Remove step" title="Remove step (−)" onClick={onRemove}>
          −
        </button>
        <button
          type="button"
          aria-label="Clear sequence"
          title="Clear sequence"
          disabled={steps.length < 2}
          onClick={onClear}
        >
          ×
        </button>
      </div>
    </div>
  )
}
