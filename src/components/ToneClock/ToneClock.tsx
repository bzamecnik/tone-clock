import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
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
import { isDiatonic, keyLevel } from '../../music/keyLevel.ts'
import { suggestTonic } from '../../music/pitchClassSetNamer.ts'
import { useWindowKeys } from '../../useWindowKeys.ts'
import { chordPath } from './chordPath.ts'
import {
  BEAD_RADIUS,
  SCALE_ARC_GAP_DEGREES,
  SCALE_ARC_RADIUS,
  SCALE_ARC_WIDTH,
  VIEW_RADIUS,
  arcPath,
  arcRuns,
  beadLayout,
  clientToView,
  markerLayout,
  nearestPitchClass,
  orderStep,
  pitchClassAt,
  positionOf,
  type Bead,
  type CircleOrder,
  type Marker,
  pointAngle,
  type Point,
} from './geometry.ts'
import { applyDrop, rotationSteps } from './gestures.ts'
import './ToneClock.css'

export type { CircleOrder } from './geometry.ts'

/** Beads and key markers of both orders, in the order around the circle. */
const LAYOUTS = Object.fromEntries(
  (['semitones', 'fifths'] as const).map((order) => {
    const byPosition = <T extends { pitchClass: number }>(items: T[]) =>
      [...items].sort((a, b) => positionOf(a.pitchClass, order) - positionOf(b.pitchClass, order))
    return [order, { beads: byPosition(beadLayout(order)), markers: byPosition(markerLayout(order)) }]
  }),
) as Record<CircleOrder, { beads: Bead[]; markers: Marker[] }>
const VIEW_BOX = `${-VIEW_RADIUS} ${-VIEW_RADIUS} ${2 * VIEW_RADIUS} ${2 * VIEW_RADIUS}`

/**
 * Arrow keys rotate the circle by one step: right/up clockwise. Left and
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

/** Pointer movement (px) below which a press counts as a tap, not a drag. */
const DRAG_THRESHOLD = 4

interface Press {
  startX: number
  startY: number
  moved: boolean
}

/** Whether a press has turned into a drag (stays so once it has). */
function hasMoved(press: Press, event: { clientX: number; clientY: number }): boolean {
  return press.moved || Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > DRAG_THRESHOLD
}

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
      startX: number
      startY: number
      moved: boolean
      /** Last tonic reported while dragging. */
      current: number | null
    }
  | {
      kind: 'rotate'
      pointerId: number
      startAngle: number
      startTones: PitchClassSet
    }

interface BeadLabelsProps {
  center: Point
  pitchClass: number
  names: PitchClassNames
  secondaryNames?: PitchClassNames
}

/** The label of a bead, with an optional smaller secondary label below it. */
function BeadLabels({ center, pitchClass, names, secondaryNames }: BeadLabelsProps) {
  if (!secondaryNames) {
    return (
      <text className="tone-clock__label" x={center.x} y={center.y} fontSize={BEAD_RADIUS} aria-hidden="true">
        {names[pitchClass]}
      </text>
    )
  }
  return (
    <>
      <text
        className="tone-clock__label"
        x={center.x}
        y={center.y - 0.2 * BEAD_RADIUS}
        fontSize={0.85 * BEAD_RADIUS}
        aria-hidden="true"
      >
        {names[pitchClass]}
      </text>
      <text
        className="tone-clock__secondary-label"
        x={center.x}
        y={center.y + 0.5 * BEAD_RADIUS}
        fontSize={0.5 * BEAD_RADIUS}
        aria-hidden="true"
      >
        {secondaryNames[pitchClass]}
      </text>
    </>
  )
}

export interface ToneClockProps {
  /** Selected pitch classes as a 12-bit mask (controlled mode). */
  value?: PitchClassSet
  /** Initially selected pitch classes (uncontrolled mode). */
  defaultValue?: PitchClassSet
  /** Called with the new set when the user toggles, moves or transposes tones. */
  onChange?: (value: PitchClassSet) => void
  /** Labels of the 12 pitch classes, starting from C. */
  names?: PitchClassNames
  /** Optional smaller labels shown below the main ones (e.g. scale degrees). */
  secondaryNames?: PitchClassNames
  /**
   * Order of the tones around the circle: chromatic ("semitones", default) or
   * the circle of "fifths". Rotating by one step (arrow keys, dragging)
   * transposes by the interval between neighbors.
   */
  order?: CircleOrder
  /**
   * Color the beads by how "inside" the key (tonic) they are, from green
   * (degree 2) via yellow (the tritone 4-7) to red (b6). See keyLevel.
   */
  keyColors?: boolean
  /** Root of the chord, outlined on its bead. */
  root?: number
  /**
   * Tonic of the current key, marked by a triangle outside its bead. The
   * diatonic scale of the key is marked by arcs inside the beads.
   */
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

export function ToneClock({
  value,
  defaultValue = EMPTY,
  onChange,
  names = FLAT_NAMES,
  secondaryNames,
  order = 'semitones',
  keyColors = false,
  root,
  tonic,
  onTonicChange,
  windowKeys = false,
  className,
}: ToneClockProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [drag, setDrag] = useState<Drag | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const isControlled = value !== undefined
  const tones = isControlled ? value : internalValue
  const chord = chordPath(tones, order)
  const step = orderStep(order)
  const { beads, markers } = LAYOUTS[order]
  const colorTonic = keyColors ? tonic : undefined
  const scaleArcs =
    tonic === undefined
      ? []
      : arcRuns(beads.filter((b) => isDiatonic(b.pitchClass, tonic)).map((b) => b.position))

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
      setDrag({
        kind: 'marker',
        pointerId: event.pointerId,
        source: Number(marker.getAttribute('data-tonic')),
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        current: tonic ?? null,
      })
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
      setDrag({ ...drag, moved: hasMoved(drag, event), point })
    } else if (drag.kind === 'marker') {
      const moved = hasMoved(drag, event)
      // the key follows the pointer around the circle
      const current = moved && point ? nearestPitchClass(point, order) : drag.current
      if (current !== drag.current) {
        onTonicChange?.(current)
      }
      setDrag({ ...drag, moved, current })
    } else if (drag.kind === 'rotate' && point) {
      change(transpose(drag.startTones, step * rotationSteps(drag.startAngle, pointAngle(point))))
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    setDrag(null)
    if (drag.kind === 'marker') {
      if (!drag.moved) {
        toggleTonic(drag.source)
      }
    } else if (drag.kind === 'bead') {
      const point = toViewPoint(event)
      const target = drag.moved && point ? pitchClassAt(point, order) : drag.source
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
      onTonicChange(tonic === undefined ? suggestTonic(tones) : mod(tonic + step * tonicOffset, OCTAVE_SIZE))
    } else if (offset !== undefined) {
      event.preventDefault()
      change(transpose(tones, step * offset))
    } else if (CLEAR_KEYS.has(event.key)) {
      event.preventDefault()
      change(EMPTY)
    }
  }

  useWindowKeys(handleCircleKeyDown, windowKeys)

  function handleMouseDown(event: MouseEvent<SVGSVGElement>) {
    // keys go to the whole page: clicks need not focus a bead or marker,
    // which would only show a focus ring after the next arrow key press
    if (windowKeys) {
      event.preventDefault()
      const focused = document.activeElement
      if (focused instanceof HTMLElement && !event.currentTarget.contains(focused)) {
        focused.blur()
      }
    }
  }

  // a focused marker follows the key when it moves (roving tab stop)
  useEffect(() => {
    const focused = document.activeElement
    if (tonic === undefined || !focused?.hasAttribute('data-tonic') || !svgRef.current?.contains(focused)) {
      return
    }
    svgRef.current.querySelector<SVGElement>(`[data-tonic="${tonic}"]`)?.focus()
  }, [tonic])

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
  const grabbing = drag?.kind === 'rotate' || (drag?.kind === 'marker' && drag.moved)
  const classes = [
    'tone-clock',
    grabbing && 'tone-clock--rotating',
    colorTonic !== undefined && 'tone-clock--key-colors',
    className,
  ]

  return (
    <svg
      className={classes.filter(Boolean).join(' ')}
      viewBox={VIEW_BOX}
      role="group"
      aria-label="Tone clock"
      ref={svgRef}
      onKeyDown={windowKeys ? undefined : handleCircleKeyDown}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* below the beads, so that it does not cover the root outline */}
      {chord && (
        <path
          className={chord.closed ? 'tone-clock__chord tone-clock__chord--closed' : 'tone-clock__chord'}
          d={chord.d}
          aria-hidden="true"
        />
      )}
      {tonic !== undefined && scaleArcs.length > 0 && (
        <g className="tone-clock__scale-arc" strokeWidth={SCALE_ARC_WIDTH} aria-hidden="true">
          <title>{`Tones of the key of ${FLAT_NAMES[tonic]} (diatonic scale)`}</title>
          {scaleArcs.map((run) => (
            <path key={run.start} d={arcPath(run, SCALE_ARC_RADIUS, SCALE_ARC_GAP_DEGREES)} />
          ))}
        </g>
      )}
      {beads.map(({ pitchClass, center }) => {
        const active = has(tones, pitchClass)
        const name = names[pitchClass]
        const beadClasses = [
          'tone-clock__bead',
          active && 'tone-clock__bead--active',
          pitchClass === root && 'tone-clock__bead--root',
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
            data-level={colorTonic === undefined ? undefined : keyLevel(pitchClass, colorTonic)}
            onKeyDown={(event) => handleBeadKeyDown(event, pitchClass)}
          >
            <circle cx={center.x} cy={center.y} r={BEAD_RADIUS} />
            <BeadLabels center={center} pitchClass={pitchClass} names={names} secondaryNames={secondaryNames} />
          </g>
        )
      })}
      {markers.map(({ pitchClass, tip, base, hitCenter, hitRadius }) => {
        const active = pitchClass === tonic
        if (!active && !onTonicChange) {
          return null
        }
        const className = active ? 'tone-clock__marker tone-clock__marker--active' : 'tone-clock__marker'
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
          <g
            key={pitchClass}
            className={className}
            aria-hidden={interactive ? undefined : true}
            data-level={colorTonic === undefined ? undefined : keyLevel(pitchClass, colorTonic)}
            {...interactive}
          >
            {interactive && <title>{`${active ? 'Unselect' : 'Select'} the key of ${FLAT_NAMES[pitchClass]}`}</title>}
            <circle className="tone-clock__marker-hit" cx={hitCenter.x} cy={hitCenter.y} r={hitRadius} />
            <polygon points={points} />
          </g>
        )
      })}
      {ghost && ghost.point && (
        <g
          className={
            pitchClassAt(ghost.point, order) === null
              ? 'tone-clock__ghost tone-clock__ghost--remove'
              : 'tone-clock__ghost'
          }
          aria-hidden="true"
        >
          <circle cx={ghost.point.x} cy={ghost.point.y} r={BEAD_RADIUS} />
          <BeadLabels
            center={ghost.point}
            pitchClass={ghost.source}
            names={names}
            secondaryNames={secondaryNames}
          />
        </g>
      )}
    </svg>
  )
}
