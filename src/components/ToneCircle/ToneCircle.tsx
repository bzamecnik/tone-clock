import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { FLAT_NAMES, type PitchClassNames } from '../../music/pitchClassNames.ts'
import {
  EMPTY,
  OCTAVE_SIZE,
  has,
  mod,
  toggle,
  transpose,
  type PitchClassSet,
} from '../../music/pitchClassSet.ts'
import { suggestTonic } from '../../music/pitchClassSetNamer.ts'
import { chordPath } from './chordPath.ts'
import {
  BEAD_RADIUS,
  VIEW_RADIUS,
  beadLayout,
  clientToView,
  markerLayout,
  pitchClassAt,
  pointAngle,
  type Point,
} from './geometry.ts'
import { applyDrop, rotationSteps } from './gestures.ts'
import './ToneCircle.css'

const BEADS = beadLayout()
const MARKERS = markerLayout()
const VIEW_BOX = `${-VIEW_RADIUS} ${-VIEW_RADIUS} ${2 * VIEW_RADIUS} ${2 * VIEW_RADIUS}`

/**
 * Arrow keys rotate the circle: right/up clockwise (up a semitone). Left and
 * right rotate the tones; up and down rotate the tonic if it can be changed,
 * otherwise the tones too. Delete clears the tones.
 */
const TRANSPOSE_KEYS: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
}
const TONIC_KEYS: Record<string, number> = {
  ArrowUp: 1,
  ArrowDown: -1,
}

const CLEAR_KEYS = new Set(['Delete', 'Backspace'])

/** Whether a key event belongs to a form field rather than to the circle. */
function isFromFormField(event: globalThis.KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
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
      kind: 'marker'
      pointerId: number
      source: number
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
  /** Tonic of the current key, marked by a triangle outside its bead. */
  tonic?: number
  /**
   * Called with the new tonic (null = no key) when the user changes the key.
   * Makes the key markers interactive: a marker per tone, clicking an empty
   * one selects that key, clicking the filled one unselects it.
   */
  onTonicChange?: (tonic: number | null) => void
  /**
   * Handle the circle's keys (arrows) anywhere on the page, not only when the
   * circle has focus. Keys typed into form fields are left alone.
   */
  windowKeys?: boolean
  className?: string
}

export function ToneCircle({
  value,
  defaultValue = EMPTY,
  onChange,
  names = FLAT_NAMES,
  tonic,
  onTonicChange,
  windowKeys = false,
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
    const target = event.target as Element
    const bead = target.closest('[data-pitch-class]')
    const marker = target.closest('[data-tonic]')
    const point = toViewPoint(event)
    if (marker) {
      setDrag({ kind: 'marker', pointerId: event.pointerId, source: Number(marker.getAttribute('data-tonic')) })
    } else if (bead) {
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
    } else if (drag.kind === 'rotate' && point) {
      change(transpose(drag.startTones, rotationSteps(drag.startAngle, pointAngle(point))))
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    setDrag(null)
    if (drag.kind === 'marker') {
      toggleTonic(drag.source)
    } else if (drag.kind === 'bead') {
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

  function handleCircleKeyDown(event: Pick<KeyboardEvent, 'key' | 'preventDefault'>) {
    const tonicOffset = TONIC_KEYS[event.key]
    const offset = TRANSPOSE_KEYS[event.key] ?? (onTonicChange ? undefined : tonicOffset)
    if (tonicOffset !== undefined && onTonicChange) {
      event.preventDefault()
      // the first press only picks a tonic
      onTonicChange(tonic === undefined ? suggestTonic(tones) : mod(tonic + tonicOffset, OCTAVE_SIZE))
    } else if (offset !== undefined) {
      event.preventDefault()
      change(transpose(tones, offset))
    } else if (CLEAR_KEYS.has(event.key)) {
      event.preventDefault()
      change(EMPTY)
    }
  }

  // the window listener is attached once and calls the latest handler
  const keyDownRef = useRef(handleCircleKeyDown)
  useEffect(() => {
    keyDownRef.current = handleCircleKeyDown
  })
  useEffect(() => {
    if (!windowKeys) {
      return
    }
    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isFromFormField(event)) {
        return
      }
      keyDownRef.current(event)
    }
    window.addEventListener('keydown', handleWindowKeyDown)
    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [windowKeys])

  function toggleTonic(pitchClass: number) {
    onTonicChange?.(pitchClass === tonic ? null : pitchClass)
  }

  function handleMarkerKeyDown(event: KeyboardEvent, pitchClass: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleTonic(pitchClass)
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
      onKeyDown={windowKeys ? undefined : handleCircleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {BEADS.map(({ pitchClass, center }) => {
        const active = has(tones, pitchClass)
        const name = names[pitchClass]
        const beadClasses = [
          'tone-circle__bead',
          active && 'tone-circle__bead--active',
        ]
        return (
          <g
            key={pitchClass}
            className={beadClasses.filter(Boolean).join(' ')}
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
      {MARKERS.map(({ pitchClass, tip, base, hitCenter, hitRadius }) => {
        const active = pitchClass === tonic
        if (!active && !onTonicChange) {
          return null
        }
        const className = active ? 'tone-circle__marker tone-circle__marker--active' : 'tone-circle__marker'
        const points = [tip, ...base].map(({ x, y }) => `${x},${y}`).join(' ')
        const interactive = onTonicChange && {
          role: 'button',
          // a single tab stop; the arrow keys move the key
          tabIndex: active || (tonic === undefined && pitchClass === 0) ? 0 : -1,
          'aria-label': `Key ${FLAT_NAMES[pitchClass]}`,
          'aria-pressed': active,
          'data-tonic': pitchClass,
          onKeyDown: (event: KeyboardEvent) => handleMarkerKeyDown(event, pitchClass),
        }
        return (
          <g key={pitchClass} className={className} aria-hidden={interactive ? undefined : true} {...interactive}>
            <circle className="tone-circle__marker-hit" cx={hitCenter.x} cy={hitCenter.y} r={hitRadius} />
            <polygon points={points} />
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
