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
  const [transition, setTransition] = useState<(StepTransition & { to: PitchClassSet }) | null>(null)
  // the tones of the last render, i.e. of the previous step when it changes
  const lastTones = useRef(tones)

  useEffect(() => {
    const from = lastTones.current
    if (from === tones || durationMs <= 0) {
      return
    }
    const voices = voiceLeading(from, tones)
    const start = performance.now()
    let frame = 0
    const tick = () => {
      const progress = Math.min((performance.now() - start) / durationMs, 1)
      setTransition(progress < 1 ? { voices, progress, to: tones } : null)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    tick()
    return () => cancelAnimationFrame(frame)
    // only a change of the step starts a transition
  }, [step])

  useEffect(() => {
    lastTones.current = tones
  })

  return transition && transition.to === tones
    ? { voices: transition.voices, progress: transition.progress }
    : undefined
}
