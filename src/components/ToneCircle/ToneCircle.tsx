import { FLAT_NAMES, type PitchClassNames } from '../../music/pitchClassNames.ts'
import { EMPTY, has, type PitchClassSet } from '../../music/pitchClassSet.ts'
import { BEAD_RADIUS, VIEW_RADIUS, beadLayout } from './geometry.ts'
import './ToneCircle.css'

const BEADS = beadLayout()
const VIEW_BOX = `${-VIEW_RADIUS} ${-VIEW_RADIUS} ${2 * VIEW_RADIUS} ${2 * VIEW_RADIUS}`

export interface ToneCircleProps {
  /** Selected pitch classes as a 12-bit mask. */
  value?: PitchClassSet
  /** Labels of the 12 pitch classes, starting from C. */
  names?: PitchClassNames
  className?: string
}

export function ToneCircle({ value = EMPTY, names = FLAT_NAMES, className }: ToneCircleProps) {
  return (
    <svg
      className={className ? `tone-circle ${className}` : 'tone-circle'}
      viewBox={VIEW_BOX}
      role="group"
      aria-label="Tone circle"
    >
      {BEADS.map(({ pitchClass, center }) => {
        const active = has(value, pitchClass)
        const name = names[pitchClass]
        return (
          <g
            key={pitchClass}
            className={active ? 'tone-circle__bead tone-circle__bead--active' : 'tone-circle__bead'}
            role="button"
            aria-label={name}
            aria-pressed={active}
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
