import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SHARP_NAMES } from '../../music/pitchClassNames.ts'
import { fromPitchClasses } from '../../music/pitchClassSet.ts'
import { beadLayout, type Point } from './geometry.ts'
import { ToneCircle } from './ToneCircle.tsx'

const C_MAJOR = fromPitchClasses([0, 4, 7])

function pressedNames() {
  return beads()
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.getAttribute('aria-label'))
}

function beads() {
  return within(screen.getByRole('group', { name: 'Tone circle' })).getAllByRole('button')
}

describe('ToneCircle', () => {
  describe('layout', () => {
    it('renders 12 beads labelled C to B in clockwise order', () => {
      render(<ToneCircle />)
      expect(beads().map((b) => b.getAttribute('aria-label'))).toEqual([
        'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
      ])
      expect(beads().map((b) => b.textContent)).toEqual([
        'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
      ])
    })

    it('marks the beads of the given set as pressed', () => {
      render(<ToneCircle value={C_MAJOR} />)
      const pressed = beads()
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.getAttribute('aria-label'))
      expect(pressed).toEqual(['C', 'E', 'G'])
      expect(screen.getByRole('button', { name: 'D' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('starts empty by default', () => {
      render(<ToneCircle />)
      expect(beads().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true)
    })

    it('accepts custom pitch class names', () => {
      render(<ToneCircle names={SHARP_NAMES} />)
      expect(screen.getByRole('button', { name: 'F#' })).toBeInTheDocument()
    })

    it('marks the tonic bead when a tonic is given', () => {
      const { rerender } = render(<ToneCircle />)
      expect(document.querySelector('.tone-circle__bead--tonic')).toBeNull()
      rerender(<ToneCircle tonic={9} />)
      const tonics = document.querySelectorAll('.tone-circle__bead--tonic')
      expect(tonics).toHaveLength(1)
      expect(tonics[0]).toHaveAttribute('aria-label', 'A')
    })

    it('renders a square SVG centered at the origin', () => {
      const { container } = render(<ToneCircle />)
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-100 -100 200 200')
    })
  })

  describe('interaction', () => {
    it('toggles a bead on click (uncontrolled)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<ToneCircle defaultValue={C_MAJOR} onChange={onChange} />)

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
      const { rerender } = render(<ToneCircle value={C_MAJOR} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: 'D' }))
      expect(onChange).toHaveBeenCalledWith(fromPitchClasses([0, 2, 4, 7]))
      expect(pressedNames()).toEqual(['C', 'E', 'G'])

      rerender(<ToneCircle value={fromPitchClasses([0, 2, 4, 7])} onChange={onChange} />)
      expect(pressedNames()).toEqual(['C', 'D', 'E', 'G'])
    })

    it('makes beads focusable and toggles them with Enter and Space', async () => {
      const user = userEvent.setup()
      render(<ToneCircle />)

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
      render(<ToneCircle defaultValue={C_MAJOR} onChange={onChange} />)

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
    render(<ToneCircle defaultValue={C_MAJOR} />)
    await user.tab()
    await user.keyboard('{Delete}')
    expect(pressedNames()).toEqual([])
    await user.keyboard(' {Backspace}')
    expect(pressedNames()).toEqual([])
  })

  describe('key (tonic)', () => {
    it('rotates the tonic with the up/down arrows when it can be changed', async () => {
      const user = userEvent.setup()
      const onTonicChange = vi.fn()
      const { rerender } = render(<ToneCircle defaultValue={C_MAJOR} tonic={9} onTonicChange={onTonicChange} />)
      await user.tab()
      await user.keyboard('{ArrowUp}')
      expect(onTonicChange).toHaveBeenLastCalledWith(10)
      rerender(<ToneCircle defaultValue={C_MAJOR} tonic={0} onTonicChange={onTonicChange} />)
      await user.keyboard('{ArrowDown}')
      expect(onTonicChange).toHaveBeenLastCalledWith(11)
      // the tones stay
      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })

    it('picks the root of the chord as the tonic when there is none yet', async () => {
      const user = userEvent.setup()
      const onTonicChange = vi.fn()
      render(<ToneCircle defaultValue={fromPitchClasses([9, 0, 4])} onTonicChange={onTonicChange} />)
      await user.tab()
      await user.keyboard('{ArrowDown}')
      expect(onTonicChange).toHaveBeenLastCalledWith(9)
    })
  })

  describe('window keys', () => {
    it('handles the arrow keys anywhere on the page when enabled', async () => {
      const user = userEvent.setup()
      render(<ToneCircle defaultValue={C_MAJOR} windowKeys />)
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['Db', 'F', 'Ab'])
    })

    it('ignores keys typed into form fields', async () => {
      const user = userEvent.setup()
      render(
        <>
          <input aria-label="Text" />
          <ToneCircle defaultValue={C_MAJOR} windowKeys />
        </>,
      )
      await user.click(screen.getByRole('textbox'))
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })

    it('handles a key only once when the circle has focus', async () => {
      const user = userEvent.setup()
      render(<ToneCircle defaultValue={C_MAJOR} windowKeys />)
      await user.tab()
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['Db', 'F', 'Ab'])
    })

    it('ignores keys outside the circle by default', async () => {
      const user = userEvent.setup()
      render(<ToneCircle defaultValue={C_MAJOR} />)
      await user.keyboard('{ArrowRight}')
      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })
  })

  describe('chord path', () => {
    function chordPathElement(container: HTMLElement) {
      return container.querySelector('.tone-circle__chord')
    }

    it('is not drawn for fewer than two tones', () => {
      const { container } = render(<ToneCircle value={fromPitchClasses([2])} />)
      expect(chordPathElement(container)).toBeNull()
    })

    it('is drawn as an open curve for two tones', () => {
      const { container } = render(<ToneCircle value={fromPitchClasses([0, 6])} />)
      const path = chordPathElement(container)
      expect(path).toHaveAttribute('d', 'M 0 -61 Q 0 0 0 61')
      expect(path).not.toHaveClass('tone-circle__chord--closed')
    })

    it('is drawn as a filled polygon for three or more tones', () => {
      const { container } = render(<ToneCircle value={C_MAJOR} />)
      expect(chordPathElement(container)).toHaveClass('tone-circle__chord--closed')
    })
  })

  describe('pointer gestures', () => {
    const BEADS = beadLayout()

    /** Renders the circle as a 200x200 px element at the page origin. */
    function renderSized(ui: ReactElement) {
      const result = render(ui)
      const svg = result.container.querySelector('svg')!
      svg.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0,
        toJSON: () => ({}),
      })
      return { ...result, svg }
    }

    // view box coordinates -> client coordinates of the 200x200 element
    const client = ({ x, y }: Point) => ({ clientX: x + 100, clientY: y + 100, pointerId: 1 })
    const beadAt = (pitchClass: number) => client(BEADS[pitchClass].center)

    it('moves a tone by dragging it onto another bead', () => {
      const onChange = vi.fn()
      const { svg } = renderSized(<ToneCircle defaultValue={C_MAJOR} onChange={onChange} />)

      fireEvent.pointerDown(screen.getByRole('button', { name: 'E' }), beadAt(4))
      fireEvent.pointerMove(svg, beadAt(3))
      fireEvent.pointerUp(svg, beadAt(3))

      expect(pressedNames()).toEqual(['C', 'Eb', 'G'])
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(fromPitchClasses([0, 3, 7]))
    })

    it('clears a tone dragged off the circle', () => {
      const { svg } = renderSized(<ToneCircle defaultValue={C_MAJOR} />)

      fireEvent.pointerDown(screen.getByRole('button', { name: 'G' }), beadAt(7))
      fireEvent.pointerMove(svg, client({ x: 0, y: 0 }))
      fireEvent.pointerUp(svg, client({ x: 0, y: 0 }))

      expect(pressedNames()).toEqual(['C', 'E'])
    })

    it('shows a ghost bead following the pointer while dragging', () => {
      const { container, svg } = renderSized(<ToneCircle defaultValue={C_MAJOR} />)
      const ghost = () => container.querySelector('.tone-circle__ghost')

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
      const { svg } = renderSized(<ToneCircle defaultValue={C_MAJOR} onChange={onChange} />)

      fireEvent.pointerDown(svg, client({ x: 0, y: -30 }))
      // a quarter turn clockwise = 3 semitones up: C major -> Eb major
      fireEvent.pointerMove(svg, client({ x: 21, y: -21 }))
      fireEvent.pointerMove(svg, client({ x: 30, y: 0 }))
      expect(pressedNames()).toEqual(['Eb', 'G', 'Bb'])
      fireEvent.pointerUp(svg, client({ x: 30, y: 0 }))

      expect(pressedNames()).toEqual(['Eb', 'G', 'Bb'])
      expect(onChange).toHaveBeenLastCalledWith(fromPitchClasses([3, 7, 10]))
    })

    it('rotates relative to the starting set and can rotate back', () => {
      const { svg } = renderSized(<ToneCircle defaultValue={C_MAJOR} />)

      fireEvent.pointerDown(svg, client({ x: 0, y: -30 }))
      fireEvent.pointerMove(svg, client({ x: 30, y: 0 }))
      fireEvent.pointerMove(svg, client({ x: 0, y: -30 }))
      fireEvent.pointerUp(svg, client({ x: 0, y: -30 }))

      expect(pressedNames()).toEqual(['C', 'E', 'G'])
    })
  })
})
