import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fromPitchClasses } from './music/pitchClassSet.ts'
import { voiceLeading } from './music/voiceLeading.ts'
import { useStepTransition } from './useStepTransition.ts'

const C = fromPitchClasses([0, 4, 7])
const AM = fromPitchClasses([9, 0, 4])
const C7 = fromPitchClasses([0, 4, 7, 10])

describe('useStepTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function renderTransition(duration = 400) {
    return renderHook(({ step, tones }) => useStepTransition(step, tones, duration), {
      initialProps: { step: 0, tones: C },
    })
  }

  it('has no transition at first', () => {
    expect(renderTransition().result.current).toBeUndefined()
  })

  it('moves the voices from the previous step to the new one over the duration', () => {
    const { result, rerender } = renderTransition()
    rerender({ step: 1, tones: AM })
    expect(result.current).toEqual({ voices: voiceLeading(C, AM), progress: 0 })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current?.progress).toBeCloseTo(0.5, 1)
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBeUndefined()
  })

  it('does not animate tones edited within a step', () => {
    const { result, rerender } = renderTransition()
    rerender({ step: 0, tones: C7 })
    expect(result.current).toBeUndefined()
  })

  it('stops a transition when the tones are edited during it', () => {
    const { result, rerender } = renderTransition()
    rerender({ step: 1, tones: AM })
    rerender({ step: 1, tones: C7 })
    expect(result.current).toBeUndefined()
    // and does not come back with the same tones again
    rerender({ step: 1, tones: AM })
    expect(result.current).toBeUndefined()
  })

  it('does not animate with no duration (reduced motion)', () => {
    const { result, rerender } = renderTransition(0)
    rerender({ step: 1, tones: AM })
    expect(result.current).toBeUndefined()
  })
})
