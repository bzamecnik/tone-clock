import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stepDuration, usePlayback } from './usePlayback.ts'

describe('usePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lasts the beats of a step at the tempo', () => {
    expect(stepDuration(120, 4)).toBe(2000)
    expect(stepDuration(90, 3)).toBe(2000)
  })

  it('moves on after each step while playing', () => {
    const onStep = vi.fn()
    const { rerender } = renderHook(({ playing }) => usePlayback(playing, 1000, onStep), {
      initialProps: { playing: true },
    })
    vi.advanceTimersByTime(999)
    expect(onStep).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2001)
    expect(onStep).toHaveBeenCalledTimes(3)
    rerender({ playing: false })
    vi.advanceTimersByTime(5000)
    expect(onStep).toHaveBeenCalledTimes(3)
  })

  it('times the step again from the start when restarted', () => {
    const onStep = vi.fn()
    const { rerender } = renderHook(({ restart }) => usePlayback(true, 1000, onStep, restart), {
      initialProps: { restart: 0 },
    })
    vi.advanceTimersByTime(600)
    rerender({ restart: 1 })
    vi.advanceTimersByTime(600)
    expect(onStep).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(onStep).toHaveBeenCalledTimes(1)
  })
})
