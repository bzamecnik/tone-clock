import { useState, type KeyboardEvent } from 'react'
import { FLAT_NAMES, type PitchClassNames } from '../../music/pitchClassNames.ts'
import { EMPTY, has, toggle, transpose, type PitchClassSet } from '../../music/pitchClassSet.ts'
import { BEAD_RADIUS, VIEW_RADIUS, beadLayout } from './geometry.ts'
import './ToneCircle.css'

const BEADS = beadLayout()
const VIEW_BOX = `${-VIEW_RADIUS} ${-VIEW_RADIUS} ${2 * VIEW_RADIUS} ${2 * VIEW_RADIUS}`

/** Arrow keys rotate the circle: right/up clockwise (up a semitone). */
const TRANSPOSE_KEYS: Record<string, number> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
}

export interface ToneCircleProps {
  /** Selected pitch classes as a 12-bit mask (controlled mode). */
  value?: PitchClassSet
  /** Initially selected pitch classes (uncontrolled mode). */
  defaultValue?: PitchClassSet
  /** Called with the new set when the user toggles or transposes tones. */
  onChange?: (value: PitchClassSet) => void
  /** Labels of the 12 pitch classes, starting from C. */
  names?: PitchClassNames
  className?: string
}

export function ToneCircle({
  value,
  defaultValue = EMPTY,
  onChange,
  names = FLAT_NAMES,
  className,
}: ToneCircleProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isControlled = value !== undefined
  const tones = isControlled ? value : internalValue

  function change(newTones: PitchClassSet) {
    if (!isControlled) {
      setInternalValue(newTones)
    }
    onChange?.(newTones)
  }

  function handleCircleKeyDown(event: KeyboardEvent) {
    const offset = TRANSPOSE_KEYS[event.key]
    if (offset !== undefined) {
      event.preventDefault()
      change(transpose(tones, offset))
    }
  }

  function handleBeadKeyDown(event: KeyboardEvent, pitchClass: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      change(toggle(tones, pitchClass))
    }
  }

  return (
    <svg
      className={className ? `tone-circle ${className}` : 'tone-circle'}
      viewBox={VIEW_BOX}
      role="group"
      aria-label="Tone circle"
      onKeyDown={handleCircleKeyDown}
    >
      {BEADS.map(({ pitchClass, center }) => {
        const active = has(tones, pitchClass)
        const name = names[pitchClass]
        return (
          <g
            key={pitchClass}
            className={active ? 'tone-circle__bead tone-circle__bead--active' : 'tone-circle__bead'}
            role="button"
            tabIndex={0}
            aria-label={name}
            aria-pressed={active}
            onClick={() => change(toggle(tones, pitchClass))}
            onKeyDown={(event) => handleBeadKeyDown(event, pitchClass)}
          >
            <circle cx={center.x} cy={center.y} r={BEAD_RADIUS} />
            <text x={center.x} y={center.y} fontSize={BEAD_RADIUS} aria-hidden="true">
              {name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
