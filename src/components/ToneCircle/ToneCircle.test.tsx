import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SHARP_NAMES } from '../../music/pitchClassNames.ts'
import { fromPitchClasses } from '../../music/pitchClassSet.ts'
import { ToneCircle } from './ToneCircle.tsx'

const C_MAJOR = fromPitchClasses([0, 4, 7])

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
})
