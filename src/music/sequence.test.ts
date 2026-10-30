import { describe, expect, it } from 'vitest'
import { fromPitchClasses } from './pitchClassSet.ts'
import {
  clearSequence,
  currentTones,
  insertStep,
  moveStep,
  removeStep,
  replaceStep,
  selectStep,
  singleStep,
  transposeSequence,
  type Sequence,
} from './sequence.ts'

const C = fromPitchClasses([0, 4, 7])
const AM = fromPitchClasses([9, 0, 4])
const F = fromPitchClasses([5, 9, 0])
const G = fromPitchClasses([7, 11, 2])

const CAFG: Sequence = { steps: [C, AM, F, G], current: 1 }

describe('sequence', () => {
  it('starts as a single step', () => {
    expect(singleStep(C)).toEqual({ steps: [C], current: 0 })
    expect(currentTones(CAFG)).toBe(AM)
  })

  it('replaces the tones of the current step', () => {
    expect(replaceStep(CAFG, G)).toEqual({ steps: [C, G, F, G], current: 1 })
  })

  it('inserts a copy of the current step after it and selects it', () => {
    expect(insertStep(CAFG)).toEqual({ steps: [C, AM, AM, F, G], current: 2 })
  })

  it('inserts given tones after the current step', () => {
    expect(insertStep(singleStep(C), F)).toEqual({ steps: [C, F], current: 1 })
  })

  it('removes the current step and selects the previous one', () => {
    expect(removeStep(CAFG)).toEqual({ steps: [C, F, G], current: 0 })
    expect(removeStep({ steps: [C, AM], current: 0 })).toEqual({ steps: [AM], current: 0 })
  })

  it('keeps one empty step when removing the last one', () => {
    expect(removeStep(singleStep(C))).toEqual({ steps: [0], current: 0 })
  })

  it('clears the sequence to the current step', () => {
    expect(clearSequence(CAFG)).toEqual({ steps: [AM], current: 0 })
  })

  it('selects a step, wrapping around', () => {
    expect(selectStep(CAFG, 3).current).toBe(3)
    expect(selectStep(CAFG, 4).current).toBe(0)
    expect(selectStep(CAFG, -1).current).toBe(3)
  })

  it('moves a step, keeping it selected', () => {
    expect(moveStep(CAFG, 1, 3)).toEqual({ steps: [C, F, G, AM], current: 3 })
    expect(moveStep({ ...CAFG, current: 0 }, 3, 0)).toEqual({ steps: [G, C, AM, F], current: 1 })
  })

  it('transposes all steps', () => {
    expect(transposeSequence(CAFG, 7).steps).toEqual([
      G,
      fromPitchClasses([4, 7, 11]),
      C,
      fromPitchClasses([2, 6, 9]),
    ])
  })
})
