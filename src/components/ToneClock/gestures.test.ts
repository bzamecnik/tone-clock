import { describe, expect, it } from 'vitest'
import { fromPitchClasses } from '../../music/pitchClassSet.ts'
import { applyDrop, rotationSteps } from './gestures.ts'

const C_MAJOR = fromPitchClasses([0, 4, 7])
const deg = Math.PI / 180

describe('applyDrop', () => {
  it('toggles a bead dropped onto itself (a tap)', () => {
    expect(applyDrop(C_MAJOR, 4, 4)).toBe(fromPitchClasses([0, 7]))
    expect(applyDrop(C_MAJOR, 2, 2)).toBe(fromPitchClasses([0, 2, 4, 7]))
  })

  it('moves an active tone onto another bead', () => {
    // C major -> C minor by dragging E to Eb
    expect(applyDrop(C_MAJOR, 4, 3)).toBe(fromPitchClasses([0, 3, 7]))
  })

  it('merges two tones when dropped onto an active bead', () => {
    expect(applyDrop(C_MAJOR, 4, 7)).toBe(fromPitchClasses([0, 7]))
  })

  it('ignores dragging an inactive bead onto another bead', () => {
    expect(applyDrop(C_MAJOR, 2, 3)).toBe(C_MAJOR)
  })

  it('clears a tone dropped off the circle', () => {
    expect(applyDrop(C_MAJOR, 4, null)).toBe(fromPitchClasses([0, 7]))
    expect(applyDrop(C_MAJOR, 2, null)).toBe(C_MAJOR)
  })
})

describe('rotationSteps', () => {
  it('snaps the rotation angle to semitones (30°), clockwise positive', () => {
    expect(rotationSteps(0, 0)).toBe(0)
    expect(rotationSteps(0, 14 * deg)).toBe(0)
    expect(rotationSteps(0, 16 * deg)).toBe(1)
    expect(rotationSteps(0, 90 * deg)).toBe(3)
    expect(rotationSteps(90 * deg, 0)).toBe(-3)
  })

  it('takes the shorter way around the circle', () => {
    expect(rotationSteps(350 * deg, 20 * deg)).toBe(1)
    expect(rotationSteps(20 * deg, 350 * deg)).toBe(-1)
  })
})
