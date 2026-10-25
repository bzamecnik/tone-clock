import './SegmentedToggle.css'

export interface SegmentedToggleProps<T extends string> {
  /** Visible label and accessible name of the group. */
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
  /** Keyboard shortcut switching the options, shown next to the label. */
  shortcut?: string
}

/** A row of buttons of which exactly one is pressed (like radio buttons). */
export function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  shortcut,
}: SegmentedToggleProps<T>) {
  return (
    <div className="segmented-toggle">
      <span className="segmented-toggle__label" aria-hidden="true">
        {label}
        {shortcut && <kbd>{shortcut}</kbd>}
      </span>
      <div className="segmented-toggle__buttons" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
