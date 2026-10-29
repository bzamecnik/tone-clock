import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DEGREE_NAMES, FLAT_NAMES, SHARP_NAMES, relativeNames } from '../../music/pitchClassNames.ts'
import { fromPitchClasses } from '../../music/pitchClassSet.ts'
import {
  SCALE_ARC_GAP_DEGREES,
  SCALE_ARC_RADIUS,
  VIEW_RADIUS,
  arcPath,
  beadLayout,
  markerLayout,
  type Point,
} from './geometry.ts'
import { voiceLeading } from '../../music/voiceLeading.ts'
import { chordPath } from './chordPath.ts'
import { transitionFrame } from './voiceMotion.ts'
import { ToneClock } from './ToneClock.tsx'

const C_MAJOR = fromPitchClasses([0, 4, 7])

function pressedNames() {
  return beads()
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.getAttribute('aria-label'))
}

function beads() {
  return within(screen.getByRole('group', { name: 'Tone clock' }))
    .getAllByRole('button')
    .filter((b) => b.hasAttribute('data-pitch-class'))
}

function markers() {
  return screen.queryAllByRole('button', { name: /^Key / })
}

function pressedMarkers() {
  return markers()
    .filter((m) => m.getAttribute('aria-pressed') === 'true')
    .map((m) => m.getAttribute('aria-label'))
}

describe('ToneClock', () => {
  describe('layout', () => {
    it('renders 12 beads labelled C to B in clockwise order', () => {
      render(<ToneClock />)
      expect(beads().map((b) => b.getAttribute('aria-label'))).toEqual([
        'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
      ])
      expect(beads().map((b) => b.textContent)).toEqual([
        'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
      ])
    })

    it('marks the beads of the given set as pressed', () => {
      render(<ToneClock value={C_MAJOR} />)
      const pressed = beads()
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.getAttribute('aria-label'))
      expect(pressed).toEqual(['C', 'E', 'G'])
      expect(screen.getByRole('button', { name: 'D' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('starts empty by default', () => {
      render(<ToneClock />)
      expect(beads().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true)
    })

    it('accepts custom pitch class names', () => {
      render(<ToneClock names={SHARP_NAMES} />)
      expect(screen.getByRole('button', { name: 'F#' })).toBeInTheDocument()
    })

    it('marks the root bead when a root is given', () => {
      const { container, rerender } = render(<ToneClock value={C_MAJOR} />)
      expect(container.querySelector('.tone-clock__bead--root')).toBeNull()
      rerender(<ToneClock value={C_MAJOR} root={0} />)
      const roots = container.querySelectorAll('.tone-clock__bead--root')
      expect(roots).toHaveLength(1)
      expect(roots[0]).toHaveAttribute('aria-label', 'C')
    })

    it('shows secondary labels below the primary ones', () => {
      const { container } = render(<ToneClock names={FLAT_NAMES} secondaryNames={relativeNames(DEGREE_NAMES, 9)} />)
      const a = screen.getByRole('button', { name: 'A' })
      expect(a.querySelector('.tone-clock__label')).toHaveTextContent('A')
      expect(a.querySelector('.tone-clock__secondary-label')).toHaveTextContent(/^1$/)
      expect(container.querySelectorAll('.tone-clock__secondary-label')).toHaveLength(12)
    })

    it('renders a square SVG centered at the origin', () => {
      const { container } = render(<ToneClock />)
      const r = VIEW_RADIUS
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', `${-r} ${-r} ${2 * r} ${2 * r}`)
    })
  })

  describe('interaction', () => {
    it('toggles a bead on click (uncontrolled)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<ToneClock defaultValue={C_MAJOR} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: 'Bb' }))
      expect(pressedNames()).toEqual(['C', 'E', 'G', 'Bb'])
      expect(onChange).toHaveBeenLastCalledWith(fromPitchClasses([0, 4, 7, 10]))

      await user.click(screen.getByRole('button', { name: 'E' }))
      expect(pressedNames()).toEqual(['C', 'G', 'Bb'])
      expect(onChange).toHaveBeenLastCalledWith(fromPitchClasses([0, 7, 10]))
    })

    it('reports changes but shows the given value when controlled', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const { rerender } = render(<ToneClock value={C_MAJOR} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: 'D' }))
      expect(onChange).toHaveBeenCalledWith(fromPitchClasses([0, 2, 4, 7]))
      expect(pressedNames()).toEqual(['C', 'E', 'G'])

      rerender(<ToneClock value={fromPitchClasses([0, 2, 4, 7])} onChange={onChange} />)
      expect(pressedNames()).toEqual(['C', 'D', 'E', 'G'])
    })

    it('makes beads focusable and toggles them with Enter and Space', async () => {
      const user = userEvent.setup()
      render(<ToneClock />)

      await user.tab()
      expect(screen.getByRole('button', { name: 'C' })).toHaveFocus()
      await user.keyboard('{Enter}')
      await user.tab()
      expect(screen.getByRole('button', { name: 'Db' })).toHaveFocus()
      await user.keyboard(' ')
      expect(pressedNames()).toEqual(['C', 'Db'])
      await user.keyboard(' ')
      expect(pressedNames()).toEqual(['C'])
    })

    it('transposes the set with the arrow keys (rotation)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<ToneClock defaultValue={C_MAJOR} onChange={onChange} />)

      await user.tab()
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['Db', 'F', 'Ab'])
      expect(onChange).toHaveBeenLastCalledWith(fromPitchClasses([1, 5, 8]))

      // C major down a semitone -> B major
      await user.keyboard('{ArrowLeft}{ArrowLeft}')
      expect(pressedNames()).toEqual(['Eb', 'Gb', 'B'])
    })
  })

  it('clears all tones with Delete or Backspace', async () => {
    const user = userEvent.setup()
    render(<ToneClock defaultValue={C_MAJOR} />)
    await user.tab()
    await user.keyboard('{Delete}')
    expect(pressedNames()).toEqual([])
    await user.keyboard(' {Backspace}')
    expect(pressedNames()).toEqual([])
  })

  describe('key (tonic)', () => {
    it('shows only the tonic marker when the key cannot be changed', () => {
      const { container, rerender } = render(<ToneClock />)
      expect(container.querySelectorAll('.tone-clock__marker')).toHaveLength(0)
      rerender(<ToneClock tonic={9} />)
      expect(container.querySelectorAll('.tone-clock__marker--active')).toHaveLength(1)
      expect(markers()).toEqual([])
    })

    it('shows a toggleable key marker for every tone', () => {
      render(<ToneClock tonic={9} onTonicChange={() => {}} />)
      expect(markers()).toHaveLength(12)
      expect(markers()[0]).toHaveAttribute('aria-label', 'Key C')
      expect(pressedMarkers()).toEqual(['Key A'])
    })

    it('tells what clicking a marker does in a tooltip', () => {
      render(<ToneClock tonic={9} onTonicChange={() => {}} />)
      const tooltip = (name: string) => screen.getByRole('button', { name }).querySelector('title')
      expect(tooltip('Key C')).toHaveTextContent(/^Select the key of C$/)
      expect(tooltip('Key A')).toHaveTextContent(/^Unselect the key of A$/)
    })

    it('names the keys by the given key names (flats by default)', () => {
      const { container, rerender } = render(<ToneClock tonic={6} onTonicChange={() => {}} />)
      expect(pressedMarkers()).toEqual(['Key Gb'])
      rerender(<ToneClock tonic={6} onTonicChange={() => {}} keyNames={SHARP_NAMES} />)
      expect(pressedMarkers()).toEqual(['Key F#'])
      const marker = screen.getByRole('button', { name: 'Key F#' })
      expect(marker.querySelector('title')).toHaveTextContent(/^Unselect the key of F#$/)
      expect(container.querySelector('.tone-clock__scale-arc > title')).toHaveTextContent(
        'Tones of the key of F# (diatonic scale)',
      )
    })

    it('selects a key by clicking its marker and unselects it by clicking again', async () => {
      const user = userEvent.setup()
      const onTonicChange = vi.fn()
      const { rerender } = render(<ToneClock onTonicChange={onTonicChange} />)
      await user.click(screen.getByRole('button', { name: 'Key D' }))
      expect(onTonicChange).toHaveBeenLastCalledWith(2)

      rerender(<ToneClock tonic={2} onTonicChange={onTonicChange} />)
      await user.click(screen.getByRole('button', { name: 'Key E' }))
      expect(onTonicChange).toHaveBeenLastCalledWith(4)
      await user.click(screen.getByRole('button', { name: 'Key D' }))
      expect(onTonicChange).toHaveBeenLastCalledWith(null)
    })

    it('moves the focus along with the key', async () => {
      const user = userEvent.setup()
      function Stateful() {
        const [tonic, setTonic] = useState<number | null>(0)
        return <ToneClock tonic={tonic ?? undefined} onTonicChange={setTonic} windowKeys />
      }
      render(<Stateful />)
      screen.getByRole('button', { name: 'Key C' }).focus()
      await user.keyboard('{ArrowUp}')
      expect(screen.getByRole('button', { name: 'Key Db' })).toHaveFocus()
      await user.keyboard('{Enter}')
      // no key: the focus stays on the (now empty) marker, the tab stop
      expect(screen.getByRole('button', { name: 'Key Db' })).toHaveFocus()
    })

    it('makes only the active (or first) marker a tab stop, toggled by Enter/Space', async () => {
      const user = userEvent.setup()
      const onTonicChange = vi.fn()
      const { rerender } = render(<ToneClock onTonicChange={onTonicChange} />)
      expect(markers().filter((m) => m.tabIndex === 0)).toHaveLength(1)
      screen.getByRole('button', { name: 'Key C' }).focus()
      await user.keyboard('{Enter}')
      expect(onTonicChange).toHaveBeenLastCalledWith(0)

      rerender(<ToneClock tonic={7} onTonicChange={onTonicChange} />)
      expect(markers().filter((m) => m.tabIndex === 0).map((m) => m.getAttribute('aria-label'))).toEqual([
        'Key G',
      ])
      screen.getByRole('button', { name: 'Key G' }).focus()
      await user.keyboard(' ')
      expect(onTonicChange).toHaveBeenLastCalledWith(null)
    })

    it('rotates the tonic with the up/down arrows when it can be changed', async () => {
      const user = userEvent.setup()
      const onTonicChange = vi.fn()
      const { rerender } = render(<ToneClock defaultValue={C_MAJOR} tonic={9} onTonicChange={onTonicChange} />)
      await user.tab()
      await user.keyboard('{ArrowUp}')
      expect(onTonicChange).toHaveBeenLastCalledWith(10)
      rerender(<ToneClock defaultValue={C_MAJOR} tonic={0} onTonicChange={onTonicChange} />)
      await user.keyboard('{ArrowDown}')
      expect(onTonicChange).toHaveBeenLastCalledWith(11)
      // the tones stay
      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })

    it('picks the root of the chord as the tonic when there is none yet', async () => {
      const user = userEvent.setup()
      const onTonicChange = vi.fn()
      render(<ToneClock defaultValue={fromPitchClasses([9, 0, 4])} onTonicChange={onTonicChange} />)
      await user.tab()
      await user.keyboard('{ArrowDown}')
      expect(onTonicChange).toHaveBeenLastCalledWith(9)
    })
  })

  describe('window keys', () => {
    it('handles the arrow keys anywhere on the page when enabled', async () => {
      const user = userEvent.setup()
      render(<ToneClock defaultValue={C_MAJOR} windowKeys />)
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['Db', 'F', 'Ab'])
    })

    it('ignores keys typed into form fields', async () => {
      const user = userEvent.setup()
      render(
        <>
          <input aria-label="Text" />
          <ToneClock defaultValue={C_MAJOR} windowKeys />
        </>,
      )
      await user.click(screen.getByRole('textbox'))
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })

    it('handles a key only once when the circle has focus', async () => {
      const user = userEvent.setup()
      render(<ToneClock defaultValue={C_MAJOR} windowKeys />)
      await user.tab()
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['Db', 'F', 'Ab'])
    })

    it('does not focus beads or markers on mouse presses, releasing the focus', async () => {
      const user = userEvent.setup()
      render(
        <>
          <input aria-label="Text" />
          <ToneClock defaultValue={C_MAJOR} tonic={0} onTonicChange={() => {}} windowKeys />
        </>,
      )
      await user.click(screen.getByRole('textbox'))
      await user.click(screen.getByRole('button', { name: 'D' }))
      expect(document.body).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Key C' }))
      expect(document.body).toHaveFocus()
      // the arrow keys now go to the circle
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['Db', 'Eb', 'F', 'Ab'])
    })

    it('ignores keys outside the circle by default', async () => {
      const user = userEvent.setup()
      render(<ToneClock defaultValue={C_MAJOR} />)
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })
  })

  describe('key colors', () => {
    const level = (name: string) => screen.getByRole('button', { name }).getAttribute('data-level')

    it('marks each bead with its level in the key', () => {
      const { container } = render(<ToneClock tonic={0} keyColors />)
      expect(container.querySelector('svg')).toHaveClass('tone-clock--key-colors')
      expect(level('D')).toBe('3')
      expect(level('F')).toBe('0')
      expect(level('Ab')).toBe('-3')
    })

    it('gives the key markers the levels of their tones', () => {
      const { rerender } = render(<ToneClock tonic={0} onTonicChange={() => {}} keyColors />)
      const markerLevel = (name: string) => screen.getByRole('button', { name }).getAttribute('data-level')
      expect(markerLevel('Key D')).toBe('3')
      expect(markerLevel('Key Ab')).toBe('-3')
      rerender(<ToneClock tonic={0} onTonicChange={() => {}} />)
      expect(markerLevel('Key D')).toBeNull()
    })

    it('is off without a key or when not enabled', () => {
      const { container, rerender } = render(<ToneClock keyColors />)
      expect(container.querySelector('svg')).not.toHaveClass('tone-clock--key-colors')
      expect(level('D')).toBeNull()
      rerender(<ToneClock tonic={0} />)
      expect(level('D')).toBeNull()
    })
  })

  describe('scale arc', () => {
    const arcs = (container: HTMLElement) => container.querySelectorAll('.tone-clock__scale-arc path')

    it('marks the diatonic scale of the key with arcs inside the beads', () => {
      const { container, rerender } = render(<ToneClock tonic={0} />)
      // B-C, D, E-F, G, A
      expect(arcs(container)).toHaveLength(5)
      expect(arcs(container)[0]).toHaveAttribute(
        'd',
        arcPath({ start: 2, length: 1 }, SCALE_ARC_RADIUS, SCALE_ARC_GAP_DEGREES),
      )
      // one arc on the circle of fifths: F C G D A E B
      rerender(<ToneClock tonic={0} order="fifths" />)
      expect(arcs(container)).toHaveLength(1)
    })

    it('is not shown without a key', () => {
      const { container } = render(<ToneClock />)
      expect(arcs(container)).toHaveLength(0)
    })

    it('explains itself in a tooltip', () => {
      const { container } = render(<ToneClock tonic={2} />)
      expect(container.querySelector('.tone-clock__scale-arc > title')).toHaveTextContent(
        'Tones of the key of D (diatonic scale)',
      )
    })
  })

  describe('circle of fifths', () => {
    it('arranges the beads and key markers in fifths, clockwise', () => {
      render(<ToneClock order="fifths" onTonicChange={() => {}} />)
      const fifths = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F']
      expect(beads().map((b) => b.getAttribute('aria-label'))).toEqual(fifths)
      expect(markers().map((m) => m.getAttribute('aria-label'))).toEqual(fifths.map((n) => `Key ${n}`))
    })

    it('rotates by a fifth per step with the arrow keys', async () => {
      const user = userEvent.setup()
      const onTonicChange = vi.fn()
      render(<ToneClock defaultValue={C_MAJOR} order="fifths" tonic={0} onTonicChange={onTonicChange} />)
      await user.tab()
      await user.keyboard('{ArrowRight}')
      // C major -> G major
      expect(pressedNames()).toEqual(['G', 'D', 'B'])
      await user.keyboard('{ArrowLeft}{ArrowLeft}')
      expect(pressedNames()).toEqual(['C', 'A', 'F'])
      await user.keyboard('{ArrowUp}')
      expect(onTonicChange).toHaveBeenLastCalledWith(7)
      await user.keyboard('{ArrowDown}')
      expect(onTonicChange).toHaveBeenLastCalledWith(5)
    })

    it('draws the chord path in the order around the circle', () => {
      const { container } = render(<ToneClock value={C_MAJOR} order="fifths" />)
      expect(container.querySelector('.tone-clock__chord')).toHaveAttribute(
        'd',
        chordPath(C_MAJOR, 'fifths')!.d,
      )
    })
  })

  describe('chord path', () => {
    function chordPathElement(container: HTMLElement) {
      return container.querySelector('.tone-clock__chord')
    }

    it('is not drawn for fewer than two tones', () => {
      const { container } = render(<ToneClock value={fromPitchClasses([2])} />)
      expect(chordPathElement(container)).toBeNull()
    })

    it('is drawn as an open curve for two tones', () => {
      const { container } = render(<ToneClock value={fromPitchClasses([0, 6])} />)
      const path = chordPathElement(container)
      expect(path).toHaveAttribute('d', 'M 0 -61 Q 0 0 0 61')
      expect(path).not.toHaveClass('tone-clock__chord--closed')
    })

    it('is drawn below the beads, not covering the root outline', () => {
      const { container } = render(<ToneClock value={C_MAJOR} root={0} />)
      const path = chordPathElement(container)!
      const firstBead = container.querySelector('[data-pitch-class]')!
      expect(path.compareDocumentPosition(firstBead) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('is drawn as a filled polygon for three or more tones', () => {
      const { container } = render(<ToneClock value={C_MAJOR} />)
      expect(chordPathElement(container)).toHaveClass('tone-clock__chord--closed')
    })
  })

  describe('pointer gestures', () => {
    const BEADS = beadLayout()

    const SIZE = 2 * VIEW_RADIUS

    /** Renders the circle at the page origin, 1 px per view box unit. */
    function renderSized(ui: ReactElement) {
      const result = render(ui)
      const svg = result.container.querySelector('svg')!
      svg.getBoundingClientRect = () => ({
        left: 0, top: 0, right: SIZE, bottom: SIZE, width: SIZE, height: SIZE, x: 0, y: 0,
        toJSON: () => ({}),
      })
      return { ...result, svg }
    }

    // view box coordinates -> client coordinates of the sized element
    const client = ({ x, y }: Point) => ({
      clientX: x + VIEW_RADIUS,
      clientY: y + VIEW_RADIUS,
      pointerId: 1,
    })
    const beadAt = (pitchClass: number) => client(BEADS[pitchClass].center)

    it('moves a tone by dragging it onto another bead', () => {
      const onChange = vi.fn()
      const { svg } = renderSized(<ToneClock defaultValue={C_MAJOR} onChange={onChange} />)

      fireEvent.pointerDown(screen.getByRole('button', { name: 'E' }), beadAt(4))
      fireEvent.pointerMove(svg, beadAt(3))
      fireEvent.pointerUp(svg, beadAt(3))

      expect(pressedNames()).toEqual(['C', 'Eb', 'G'])
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(fromPitchClasses([0, 3, 7]))
    })

    it('clears a tone dragged off the circle', () => {
      const { svg } = renderSized(<ToneClock defaultValue={C_MAJOR} />)

      fireEvent.pointerDown(screen.getByRole('button', { name: 'G' }), beadAt(7))
      fireEvent.pointerMove(svg, client({ x: 0, y: 0 }))
      fireEvent.pointerUp(svg, client({ x: 0, y: 0 }))

      expect(pressedNames()).toEqual(['C', 'E'])
    })

    it('shows a ghost bead following the pointer while dragging', () => {
      const { container, svg } = renderSized(<ToneClock defaultValue={C_MAJOR} />)
      const ghost = () => container.querySelector('.tone-clock__ghost')

      fireEvent.pointerDown(screen.getByRole('button', { name: 'E' }), beadAt(4))
      expect(ghost()).toBeNull()
      fireEvent.pointerMove(svg, client({ x: 30, y: 10 }))
      expect(ghost()).not.toBeNull()
      expect(ghost()!.querySelector('circle')).toHaveAttribute('cx', '30')
      fireEvent.pointerUp(svg, client({ x: 30, y: 10 }))
      expect(ghost()).toBeNull()
    })

    it('transposes by dragging around the circle inside the ring', () => {
      const onChange = vi.fn()
      const { svg } = renderSized(<ToneClock defaultValue={C_MAJOR} onChange={onChange} />)

      fireEvent.pointerDown(svg, client({ x: 0, y: -30 }))
      // a quarter turn clockwise = 3 semitones up: C major -> Eb major
      fireEvent.pointerMove(svg, client({ x: 21, y: -21 }))
      fireEvent.pointerMove(svg, client({ x: 30, y: 0 }))
      expect(pressedNames()).toEqual(['Eb', 'G', 'Bb'])
      fireEvent.pointerUp(svg, client({ x: 30, y: 0 }))

      expect(pressedNames()).toEqual(['Eb', 'G', 'Bb'])
      expect(onChange).toHaveBeenLastCalledWith(fromPitchClasses([3, 7, 10]))
    })

    describe('key markers', () => {
      const MARKERS = markerLayout()
      const markerAt = (pitchClass: number) => client(MARKERS[pitchClass].hitCenter)

      it('moves the key while dragging its marker around the circle', () => {
        const onTonicChange = vi.fn()
        const { svg } = renderSized(
          <ToneClock defaultValue={C_MAJOR} tonic={9} onTonicChange={onTonicChange} />,
        )
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Key A' }), markerAt(9))
        fireEvent.pointerMove(svg, markerAt(10))
        expect(onTonicChange).toHaveBeenLastCalledWith(10)
        // anywhere in the direction of a tone, e.g. near the center
        fireEvent.pointerMove(svg, client({ x: 10, y: 0 }))
        expect(onTonicChange).toHaveBeenLastCalledWith(3)
        fireEvent.pointerUp(svg, client({ x: 10, y: 0 }))
        expect(onTonicChange).toHaveBeenLastCalledWith(3)
        expect(pressedNames()).toEqual(['C', 'E', 'G'])
      })

      it('does not report the same key twice while dragging', () => {
        const onTonicChange = vi.fn()
        const { svg } = renderSized(<ToneClock tonic={9} onTonicChange={onTonicChange} />)
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Key A' }), markerAt(9))
        fireEvent.pointerMove(svg, client({ ...MARKERS[9].hitCenter, y: MARKERS[9].hitCenter.y + 6 }))
        fireEvent.pointerUp(svg, client({ ...MARKERS[9].hitCenter, y: MARKERS[9].hitCenter.y + 6 }))
        expect(onTonicChange).not.toHaveBeenCalled()
      })

      it('toggles the key when the marker is tapped without moving', () => {
        const onTonicChange = vi.fn()
        const { svg } = renderSized(<ToneClock tonic={9} onTonicChange={onTonicChange} />)
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Key A' }), markerAt(9))
        fireEvent.pointerUp(svg, markerAt(9))
        expect(onTonicChange).toHaveBeenCalledExactlyOnceWith(null)
      })
    })

    it('transposes by fifths when rotating the circle of fifths', () => {
      const { svg } = renderSized(<ToneClock defaultValue={C_MAJOR} order="fifths" />)
      fireEvent.pointerDown(svg, client({ x: 0, y: -30 }))
      // a quarter turn clockwise = 3 fifths up: C major -> A major
      fireEvent.pointerMove(svg, client({ x: 30, y: 0 }))
      fireEvent.pointerUp(svg, client({ x: 30, y: 0 }))
      expect(pressedNames()).toEqual(['A', 'E', 'Db'])
    })

    it('moves tones and the key to the beads under the pointer on the circle of fifths', () => {
      const onTonicChange = vi.fn()
      const FIFTHS = beadLayout('fifths')
      const { svg } = renderSized(
        <ToneClock defaultValue={C_MAJOR} order="fifths" tonic={0} onTonicChange={onTonicChange} />,
      )
      // drag E onto the bead next to it, counterclockwise: A
      fireEvent.pointerDown(screen.getByRole('button', { name: 'E' }), client(FIFTHS[4].center))
      fireEvent.pointerMove(svg, client(FIFTHS[9].center))
      fireEvent.pointerUp(svg, client(FIFTHS[9].center))
      expect(pressedNames()).toEqual(['C', 'G', 'A'])

      const marker = markerLayout('fifths')
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Key C' }), client(marker[0].hitCenter))
      fireEvent.pointerMove(svg, client(marker[7].hitCenter))
      expect(onTonicChange).toHaveBeenLastCalledWith(7)
      fireEvent.pointerUp(svg, client(marker[7].hitCenter))
    })

    it('rotates relative to the starting set and can rotate back', () => {
      const { svg } = renderSized(<ToneClock defaultValue={C_MAJOR} />)

      fireEvent.pointerDown(svg, client({ x: 0, y: -30 }))
      fireEvent.pointerMove(svg, client({ x: 30, y: 0 }))
      fireEvent.pointerMove(svg, client({ x: 0, y: -30 }))
      fireEvent.pointerUp(svg, client({ x: 0, y: -30 }))

      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })
  })

  describe('transition between chords', () => {
    const A_MINOR = fromPitchClasses([9, 0, 4])
    const voices = voiceLeading(C_MAJOR, A_MINOR)
    const litBeads = () =>
      beads()
        .filter((b) => b.classList.contains('tone-clock__bead--active'))
        .map((b) => b.getAttribute('aria-label'))
    const movingVoices = () => document.querySelectorAll('.tone-clock__voice')

    it('lights the held tones and draws the moving voices on their way', () => {
      render(<ToneClock value={A_MINOR} transition={{ voices, progress: 0.5 }} />)
      expect(litBeads()).toEqual(['C', 'E'])
      expect(movingVoices()).toHaveLength(1)
      // the state of the buttons is the new chord already
      expect(pressedNames()).toEqual(['C', 'E', 'A'])
    })

    it('morphs the chord path', () => {
      render(<ToneClock value={A_MINOR} transition={{ voices, progress: 0.5 }} />)
      expect(document.querySelector('.tone-clock__chord')).toHaveAttribute(
        'd',
        transitionFrame(voices, 0.5, 'semitones').path!.d,
      )
    })

    it('shows the new chord when the transition is over', () => {
      render(<ToneClock value={A_MINOR} transition={{ voices, progress: 1 }} />)
      expect(litBeads()).toEqual(['C', 'E', 'A'])
      expect(movingVoices()).toHaveLength(0)
      expect(document.querySelector('.tone-clock__chord')).toHaveAttribute('d', chordPath(A_MINOR)!.d)
    })
  })
})
