import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SHARP_NAMES } from '../../music/pitchClassNames.ts'
import { fromPitchClasses } from '../../music/pitchClassSet.ts'
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
})
