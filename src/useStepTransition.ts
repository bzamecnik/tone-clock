import { useEffect, useRef, useState } from 'react'
import type { PitchClassSet } from './music/pitchClassSet.ts'
import { voiceLeading, type Voice } from './music/voiceLeading.ts'

export interface StepTransition {
  voices: Voice[]
  /** 0 at the start, up to 1. */
  progress: number
}

/**
 * Animates the voice leading whenever the step (index) changes: from the
 * tones of the previous step to the new ones, over `durationMs`, driven by
 * animation frames. Tones edited within a step are not animated, and editing
 * stops a running transition. No transition (undefined) when none is running.
 */
export function useStepTransition(
  step: number,
  tones: PitchClassSet,
  durationMs: number,
): StepTransition | undefined {
  const [transition, setTransition] = useState<StepTransition | null>(null)
  // the step and tones of the last render, i.e. of the previous step when it changes
  const last = useRef({ step, tones })

  useEffect(() => {
    const from = last.current
    last.current = { step, tones }
    if (from.step === step || from.tones === tones || durationMs <= 0) {
      return
    }
    const voices = voiceLeading(from.tones, tones)
    const start = performance.now()
    let frame = 0
    const tick = () => {
      const progress = Math.min((performance.now() - start) / durationMs, 1)
      setTransition(progress < 1 ? { voices, progress } : null)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    tick()
    // also when the tones are edited during the transition
    return () => {
      cancelAnimationFrame(frame)
      setTransition(null)
    }
  }, [step, tones, durationMs])

  return transition ?? undefined
}
