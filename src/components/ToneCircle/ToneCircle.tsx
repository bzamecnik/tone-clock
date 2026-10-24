import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { FLAT_NAMES, type PitchClassNames } from '../../music/pitchClassNames.ts'
import { EMPTY, has, toggle, transpose, type PitchClassSet } from '../../music/pitchClassSet.ts'
import { chordPath } from './chordPath.ts'
import {
  BEAD_RADIUS,
  VIEW_RADIUS,
  beadLayout,
  clientToView,
  pitchClassAt,
  pointAngle,
  type Point,
} from './geometry.ts'
import { applyDrop, rotationSteps } from './gestures.ts'
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

/** Pointer movement (px) below which a press counts as a tap, not a drag. */
const DRAG_THRESHOLD = 4

type Drag =
  | {
      kind: 'bead'
      pointerId: number
      source: number
      startX: number
      startY: number
      moved: boolean
      point: Point | null
    }
  | {
      kind: 'rotate'
      pointerId: number
      startAngle: number
      startTones: PitchClassSet
    }

export interface ToneCircleProps {
  /** Selected pitch classes as a 12-bit mask (controlled mode). */
  value?: PitchClassSet
  /** Initially selected pitch classes (uncontrolled mode). */
  defaultValue?: PitchClassSet
  /** Called with the new set when the user toggles, moves or transposes tones. */
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
  const [drag, setDrag] = useState<Drag | null>(null)
  const isControlled = value !== undefined
  const tones = isControlled ? value : internalValue
  const chord = chordPath(tones)

  function change(newTones: PitchClassSet) {
    if (newTones === tones) {
      return
    }
    if (!isControlled) {
      setInternalValue(newTones)
    }
    onChange?.(newTones)
  }

  function toViewPoint(event: PointerEvent<SVGSVGElement>): Point | null {
    return clientToView(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY)
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || drag) {
      return
    }
    const bead = (event.target as Element).closest('[data-pitch-class]')
    const point = toViewPoint(event)
    if (bead) {
      setDrag({
        kind: 'bead',
        pointerId: event.pointerId,
        source: Number(bead.getAttribute('data-pitch-class')),
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        point,
      })
    } else if (point) {
      setDrag({
        kind: 'rotate',
        pointerId: event.pointerId,
        startAngle: pointAngle(point),
        startTones: tones,
      })
    } else {
      return
    }
    // keep receiving events when the pointer leaves the element
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const point = toViewPoint(event)
    if (drag.kind === 'bead') {
      const moved =
        drag.moved ||
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD
      setDrag({ ...drag, moved, point })
    } else if (point) {
      change(transpose(drag.startTones, rotationSteps(drag.startAngle, pointAngle(point))))
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    setDrag(null)
    if (drag.kind === 'bead') {
      const point = toViewPoint(event)
      const target = drag.moved && point ? pitchClassAt(point) : drag.source
      change(applyDrop(tones, drag.source, target))
    }
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    if (drag?.pointerId === event.pointerId) {
      setDrag(null)
    }
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

  const ghost = drag?.kind === 'bead' && drag.moved && drag.point ? drag : null
  const classes = ['tone-circle', drag?.kind === 'rotate' && 'tone-circle--rotating', className]

  return (
    <svg
      className={classes.filter(Boolean).join(' ')}
      viewBox={VIEW_BOX}
      role="group"
      aria-label="Tone circle"
      onKeyDown={handleCircleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
            data-pitch-class={pitchClass}
            onKeyDown={(event) => handleBeadKeyDown(event, pitchClass)}
          >
            <circle cx={center.x} cy={center.y} r={BEAD_RADIUS} />
            <text x={center.x} y={center.y} fontSize={BEAD_RADIUS} aria-hidden="true">
              {name}
            </text>
          </g>
        )
      })}
      {chord && (
        <path
          className={chord.closed ? 'tone-circle__chord tone-circle__chord--closed' : 'tone-circle__chord'}
          d={chord.d}
          aria-hidden="true"
        />
      )}
      {ghost && ghost.point && (
        <g
          className={
            pitchClassAt(ghost.point) === null
              ? 'tone-circle__ghost tone-circle__ghost--remove'
              : 'tone-circle__ghost'
          }
          aria-hidden="true"
        >
          <circle cx={ghost.point.x} cy={ghost.point.y} r={BEAD_RADIUS} />
          <text x={ghost.point.x} y={ghost.point.y} fontSize={BEAD_RADIUS}>
            {names[ghost.source]}
          </text>
        </g>
      )}
    </svg>
  )
}
